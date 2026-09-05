import type { AssessmentSubmission } from './validation';

// Assessment synchronization is independent from Gary. It packages the completed
// public assessment for the Command Center without sharing chat prompts or state.
const ASSESSMENT_VERSION = '2026-09-dual-gap-v2';

const SYNC_URL = process.env.COMMAND_CENTER_ASSESSMENT_SYNC_URL;
const SYNC_TOKEN = process.env.COMMAND_CENTER_ASSESSMENT_SYNC_TOKEN;

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

export async function syncCompleteAssessmentToCommandCenter(params: SyncParams): Promise<void> {
  if (!SYNC_URL || !SYNC_TOKEN) return;

  const { submission, submissionId, resultHtml, status, emailDeliveryStatus } = params;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    const response = await fetch(SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SYNC_TOKEN}` },
      body: JSON.stringify({
        firstName: submission.firstName,
        lastName: submission.lastName,
        businessName: submission.businessName,
        email: submission.email,
        phone: (submission as unknown as { phone?: string }).phone,
        industry: submission.industry,
        source: 'easyai-landing',
        assessmentPackage: buildAssessmentPackage(submission, resultHtml),
        submissionId,
        funnelCorrelationId: submission.funnelCorrelationId,
        processingStatus: status,
        emailDeliveryStatus,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) {
      console.error('Complete-assessment sync to Command Center failed', response.status, await response.text().catch(() => ''));
    }
  } catch (err) {
    console.error('Complete-assessment sync to Command Center threw', err);
  }
}
