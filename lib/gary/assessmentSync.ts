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
  sportsFan: 'Are you a sports fan?',
};

function buildQuestionsAndAnswers(submission: AssessmentSubmission): { question: string; answer: string }[] {
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
    const response = await fetch(SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SYNC_TOKEN}` },
      body: JSON.stringify({
        // Flat fields — these names are the Command Center's contract, not ours: its route reads
        // companyName / contactName / contactEmail / contactPhone and hard-rejects a body without
        // a companyName and at least one contact method (see app/api/easy-ai/assessments/route.ts).
        // The quiz collects no phone number (lib/validation.ts has no phone field), so email is
        // the only contact method sent and contactPhone is deliberately omitted rather than faked.
        companyName: submission.businessName,
        contactName: `${submission.firstName} ${submission.lastName}`.trim(),
        contactEmail: submission.email,
        industry: submission.industry,
        profileResult: submission.desiredOutcome,
        source: 'easyai-landing',
        submittedAt: new Date().toISOString(),
        // A stable identity for this submission so a platform-level retry of the assessment
        // function replays the original save instead of creating a second Assessment. Without
        // this the Command Center falls back to hashing submittedAt, which is regenerated on
        // every call and would make each retry look like a brand-new submission.
        idempotencyKey: `easy-ai-assessment-${submissionId}`,
        // The optional, richer payload the route persists via saveAssessmentPackage() when present.
        assessmentPackage: {
          assessmentVersion: ASSESSMENT_VERSION,
          questions: buildQuestionsAndAnswers(submission),
          categoryScores: {},
          overallResult: resultHtml,
          profileResult: submission.desiredOutcome,
          painPointsIdentified: [submission.aiChallenge, submission.timeDrain].filter(Boolean),
          suggestions: [],
          recommendedNextStep: 'Review the generated AI Action Plan and reach out to schedule a discovery call.',
          clientFacingSummary: resultHtml,
          submittedAt: new Date().toISOString(),
          source: 'easyai-landing',
        },
        submissionId,
        // The high-confidence identity signal the Command Center's lead matcher keys on
        // (lib/easy-ai/lead-intake-service.ts's findLeadMatch). Set only when this submission
        // came through a Gary handoff; the Command Center stores it on the Assessment and carries
        // it onto the record created when the founder moves that Assessment to Sales.
        funnelCorrelationId: submission.funnelCorrelationId,
        processingStatus: status,
        emailDeliveryStatus,
      }),
    });
    if (!response.ok) {
      console.error('Complete-assessment sync to Command Center failed', response.status, await response.text().catch(() => ''));
    }
  } catch (err) {
    console.error('Complete-assessment sync to Command Center threw', err);
  }
}
