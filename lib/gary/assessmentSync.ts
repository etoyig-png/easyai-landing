import type { AssessmentSubmission } from '../validation';

// Mirrors the shape of Command Center's existing AssessmentPackage type
// (lib/easy-ai/assessment-package-store.ts) closely enough to POST directly into its already-
// authenticated /api/easy-ai/assessments route — see that route for the exact contract. This
// module does not redefine that type; it builds a plain object matching it by convention,
// since the two repos don't share a package.

const ASSESSMENT_VERSION = '2026-08-easyai-quiz-v1';

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
  usingAiTools: 'Are you regularly using AI tools?',
  aiChallenge: "What's your #1 AI challenge right now?",
  desiredOutcome: "What's the #1 outcome you're hoping AI can help you achieve?",
  timeDrain: 'Which area of your business eats up the most of your time?',
  privacyConcern: 'How worried are you about data privacy and security?',
  industry: 'What kind of business do you run?',
  leadResponse: 'What usually happens after a potential customer contacts your business?',
  sportsFan: 'Are you a sports fan?',
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
    painPointsIdentified: [submission.aiChallenge, submission.timeDrain].filter(Boolean),
    suggestions: [],
    recommendedNextStep: 'Review the generated AI Action Plan and watch the next-step video.',
    clientFacingSummary: resultHtml,
    submittedAt: new Date().toISOString(),
    source: 'easyai-landing',
  };
}

/**
 * Sends the COMPLETE assessment — every question/answer, contact and business info, the
 * generated result, IDs, version, and processing/delivery status — to Command Center's
 * existing /api/easy-ai/assessments route (already shared between the public site and the
 * internal Assessment Inbox; see that route for the assessmentPackage contract). This is
 * separate from, and does not replace, notifyCommandCenter()'s existing status-only ping —
 * that call is untouched. Best-effort: logs and returns on failure, never throws, so a sync
 * hiccup can never affect the visitor-facing email flow that already completed successfully.
 */
export async function syncCompleteAssessmentToCommandCenter(params: SyncParams): Promise<void> {
  if (!SYNC_URL || !SYNC_TOKEN) return; // not configured yet — don't block anything

  const { submission, submissionId, resultHtml, status, emailDeliveryStatus } = params;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    const response = await fetch(SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SYNC_TOKEN}` },
      body: JSON.stringify({
        // Flat fields — same shape the existing route already accepts for the always-created
        // AssessmentSubmission row (see app/api/easy-ai/assessments/route.ts).
        firstName: submission.firstName,
        lastName: submission.lastName,
        businessName: submission.businessName,
        email: submission.email,
        phone: (submission as unknown as { phone?: string }).phone,
        industry: submission.industry,
        source: 'easyai-landing',
        // The optional, richer payload the route persists via saveAssessmentPackage() when present.
        assessmentPackage: buildAssessmentPackage(submission, resultHtml),
        submissionId,
        funnelCorrelationId: (submission as unknown as { funnelCorrelationId?: string }).funnelCorrelationId,
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
