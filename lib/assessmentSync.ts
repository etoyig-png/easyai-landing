import type { AssessmentSubmission } from './validation';
import { prisma } from './prisma';
import { ASSESSMENT_SYNC_EVENT, assessmentSyncKey, deliverFunnelEvent, recordFunnelEvent } from './gary/funnelEvents';

// Assessment synchronization is independent from Gary. It packages the completed
// public assessment for the Command Center without sharing chat prompts or state.
const ASSESSMENT_VERSION = '2026-09-dual-gap-v2';

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

/** The exact body the Command Center's /api/easy-ai/assessments intake accepts. */
export function buildAssessmentSyncBody(params: SyncParams) {
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
 * Records the package in the durable outbox first, then makes one delivery attempt. A Command
 * Center outage, a timeout or missing sync configuration leaves an undelivered row that the
 * drain retries and the drain health check reports, instead of a log line and a lost record.
 * Never throws: it runs after the visitor's response.
 */
export async function syncCompleteAssessmentToCommandCenter(params: SyncParams): Promise<void> {
  const key = assessmentSyncKey(params.submissionId);
  try {
    await recordFunnelEvent(prisma, { eventType: ASSESSMENT_SYNC_EVENT, idempotencyKey: key, payload: buildAssessmentSyncBody(params) });
  } catch (err) {
    console.error(`[assessment-sync] stage=store key=${key}`, err);
    return;
  }
  try {
    const result = await deliverFunnelEvent(key);
    if (result !== 'delivered' && result !== 'delivered-earlier') console.error(`[assessment-sync] stage=deliver key=${key} result=${result}`);
  } catch (err) {
    console.error(`[assessment-sync] stage=deliver key=${key}`, err);
  }
}
