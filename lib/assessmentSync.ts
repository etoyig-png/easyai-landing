import type { Prisma } from '@prisma/client';
import type { AssessmentSubmission } from './validation';
import { prisma } from './prisma';
import { ASSESSMENT_SYNC_EVENT, assessmentSyncKey, deliverFunnelEvent, recordFunnelEvent, type FunnelEventWriter } from './gary/funnelEvents';

// Assessment synchronization is independent from Gary. It packages the completed
// public assessment for the Command Center without sharing chat prompts or state.
const ASSESSMENT_VERSION = '2026-09-dual-gap-v2';

/**
 * How long an admitted assessment's sync row waits for its own completion before the drain
 * delivers it as-is. Well beyond the assessment route's 300-second maxDuration, so it only
 * fires when completion never committed (a crash, a timeout or a storage failure).
 */
export const ASSESSMENT_RECOVERY_DELAY_MS = 15 * 60 * 1000;

interface SyncParams {
  submissionId: string;
  submission: AssessmentSubmission;
  resultHtml: string;
  status: 'completed' | 'failed';
  emailDeliveryStatus: 'sent' | 'failed' | 'not_attempted';
}

const QUESTION_LABELS: Record<string, string> = {
  workSituation: 'What best describes your work situation?',
  searchVisibility: 'How visible is your business in Google and AI answers?',
  aiChallenge: "What's your #1 AI challenge right now?",
  desiredOutcome: "What's the #1 outcome you're hoping AI can help you achieve?",
  timeDrain: 'Which area of your business eats up the most of your time?',
  privacyConcern: 'How worried are you about data privacy and security?',
  industry: 'What kind of business do you run?',
  leadResponse: 'What usually happens after a potential customer contacts your business?',
  websiteConversion: 'What usually happens after a potential customer visits your website?',
};

export function buildQuestionsAndAnswers(submission: AssessmentSubmission): { question: string; answer: string }[] {
  const entries: { question: string; answer: string }[] = [];
  for (const [key, question] of Object.entries(QUESTION_LABELS)) {
    const answer = (submission as unknown as Record<string, string | undefined>)[key];
    if (!answer) continue;
    entries.push({
      question,
      answer: key === 'industry' && submission.industryOther ? `${answer} — ${submission.industryOther}` : answer,
    });
  }
  return entries;
}

export function buildAssessmentPackage(submission: AssessmentSubmission, resultHtml: string) {
  return {
    assessmentVersion: ASSESSMENT_VERSION,
    questions: buildQuestionsAndAnswers(submission),
    categoryScores: {},
    overallResult: resultHtml,
    profileResult: submission.desiredOutcome,
    painPointsIdentified: [
      submission.searchVisibility,
      submission.websiteConversion,
      submission.leadResponse,
      submission.aiChallenge,
      submission.timeDrain,
    ].filter(Boolean),
    suggestions: [],
    recommendedNextStep: 'Use the immediate actions, then consider a verified GAP Score to compare visibility against local competitors.',
    clientFacingSummary: resultHtml,
    submittedAt: new Date().toISOString(),
    source: 'easyai-landing',
  };
}

/**
 * The exact body the Command Center's /api/easy-ai/assessments intake accepts. Without a status
 * it is the recovery body: the intake records unknown processing and email status as blank.
 */
export function buildAssessmentSyncBody(params: Omit<SyncParams, 'status' | 'emailDeliveryStatus'> & Partial<Pick<SyncParams, 'status' | 'emailDeliveryStatus'>>) {
  const { submission, submissionId, resultHtml, status, emailDeliveryStatus } = params;
  return {
    companyName: submission.businessName,
    contactName: `${submission.firstName} ${submission.lastName}`.trim(),
    contactEmail: submission.email,
    contactPhone: (submission as unknown as { phone?: string }).phone,
    profileResult: submission.desiredOutcome,
    resultSummary: resultHtml,
    idempotencyKey: `easy-ai-assessment-${submissionId}`,
    industry: submission.industry,
    source: 'easyai-landing',
    assessmentPackage: buildAssessmentPackage(submission, resultHtml),
    submissionId,
    funnelCorrelationId: submission.funnelCorrelationId,
    processingStatus: status,
    emailDeliveryStatus,
  };
}

/**
 * Records the assessment's sync row inside the admission transaction, so a stored submission
 * always has recoverable sync work. It is held back by ASSESSMENT_RECOVERY_DELAY_MS and carries
 * no result or status; completion replaces its body and makes it due at once.
 */
export async function recordAssessmentSyncIntent(db: FunnelEventWriter, submissionId: string, submission: AssessmentSubmission, now = new Date()) {
  await recordFunnelEvent(db, {
    eventType: ASSESSMENT_SYNC_EVENT,
    idempotencyKey: assessmentSyncKey(submissionId),
    payload: buildAssessmentSyncBody({ submissionId, submission, resultHtml: '' }),
    nextAttemptAt: new Date(now.getTime() + ASSESSMENT_RECOVERY_DELAY_MS),
  });
}

type CompletionClient = Pick<typeof prisma, '$transaction'>;

/**
 * Commits the submission's final status and its full sync body in ONE transaction, then makes
 * one delivery attempt. If that transaction fails, neither lands: the status update is retried
 * alone (a sent result email must never read as pending or failed), and the row recorded at
 * admission stays in the outbox, so the drain still delivers the assessment after the recovery
 * delay. A row the drain already delivered is left alone, since the Command Center would replay
 * the earlier receipt for that key anyway. Never throws: it runs after the visitor's response.
 */
export async function completeAssessmentSync(params: SyncParams, db: CompletionClient = prisma): Promise<void> {
  const key = assessmentSyncKey(params.submissionId);
  const status: Prisma.SubmissionUpdateInput = params.status === 'completed'
    ? { status: 'completed', resultHtml: params.resultHtml }
    : { status: 'failed', errorMessage: 'Result email delivery failed' };
  const payload = buildAssessmentSyncBody(params);
  try {
    await db.$transaction(async (tx) => {
      await tx.submission.update({ where: { id: params.submissionId }, data: status });
      const updated = await tx.funnelEventOutbox.updateMany({
        where: { idempotencyKey: key, deliveredAt: null },
        data: { payload: payload as never, nextAttemptAt: new Date() },
      });
      // A submission admitted before admission recorded the row has none yet.
      if (updated.count === 0) await recordFunnelEvent(tx, { eventType: ASSESSMENT_SYNC_EVENT, idempotencyKey: key, payload });
    });
  } catch (err) {
    console.error(`[assessment-sync] stage=store key=${key} recovery=admission-row`, err);
    try {
      await prisma.submission.update({ where: { id: params.submissionId }, data: status });
    } catch (statusErr) {
      console.error(`[assessment-sync] stage=status key=${key}`, statusErr);
    }
    return;
  }
  try {
    const result = await deliverFunnelEvent(key);
    if (result !== 'delivered' && result !== 'delivered-earlier') console.error(`[assessment-sync] stage=deliver key=${key} result=${result}`);
  } catch (err) {
    console.error(`[assessment-sync] stage=deliver key=${key}`, err);
  }
}
