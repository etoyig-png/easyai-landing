import { Resend } from 'resend';
import type { AssessmentSubmission } from './validation';
import { escapeHtml, escapeHtmlText } from './htmlEscape';
import type { ActionPlanFields } from './actionPlanValidator';
import { buildWhyQuestionText, selectWhyQuestionId } from './whyQuestions';

// Same scheduling destination used by the CTA both before and after this redesign —
// books the existing free consultation, never the $299 paid Game Plan.
export const RESULT_EMAIL_CTA_URL = 'https://easyaiconsult.com/book-consultation';

// Fixed copy — not model-authored (see lib/anthropic.ts SYSTEM_PROMPT: the CTA and the
// Step 3 explanation are explicitly outside what the language model controls).
const STEP_THREE_EXPLANATION =
  "This is a short, free conversation with Easy AI to talk through your challenges and goals, and where automation could make the most meaningful difference for your business. There's no cost and nothing to buy, just a conversation to find the best fit for you.";

// Constructed lazily (not at module load) so the API route can still be built
// and imported without RESEND_API_KEY set — the key is only required at send time.
let resendClient: Resend | undefined;
function getResend(): Resend {
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

// The bare domain (easyaiconsult.com) 308-redirects to www with a text/plain body on
// the redirect response itself — some email image proxies don't reliably follow that
// redirect to fetch the actual PNG, which was why the logo previously failed to render.
// www.easyaiconsult.com/easy-ai-logo.png returns a direct 200 image/png with no hop.
export const RESULT_EMAIL_LOGO_URL = 'https://www.easyaiconsult.com/easy-ai-logo.png';

const NOTIFICATION_FROM = process.env.NOTIFICATION_EMAIL_FROM ?? 'Easy AI Assessments <assessments@mail.easyaiconsult.com>';
const RESULT_FROM = process.env.RESULT_EMAIL_FROM ?? 'Easy AI <hello@mail.easyaiconsult.com>';
const NOTIFICATION_TO = process.env.ASSESSMENT_NOTIFICATION_EMAIL;
// mail.easyaiconsult.com is a sending-only subdomain — route lead replies to a real, monitored inbox instead.
const RESULT_REPLY_TO = process.env.RESULT_EMAIL_REPLY_TO;

/** Internal notification to the Easy AI team — a new assessment came in. */
export async function sendInternalNotification(submission: AssessmentSubmission & { id: string }) {
  if (!NOTIFICATION_TO) return; // not configured yet — don't block the request

  const rows: [string, string][] = [
    ['Business', submission.businessName],
    ['Contact', `${submission.firstName} ${submission.lastName}`],
    ['Email', submission.email],
    ['Work situation', submission.workSituation],
    ['Using AI tools?', submission.usingAiTools],
    ['#1 AI challenge', submission.aiChallenge],
    ['Desired outcome', submission.desiredOutcome],
    ['Biggest time drain', submission.timeDrain],
    ['Privacy concern level', submission.privacyConcern],
    ['Industry', submission.industryOther ? `${submission.industry} — ${submission.industryOther}` : submission.industry],
  ];

  const rowsHtml = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 12px;color:#8b9aaa;font-size:13px;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:8px 12px;color:#0b1d3a;font-size:14px;">${escapeHtml(value)}</td></tr>`
    )
    .join('');

  const { error } = await getResend().emails.send({
    from: NOTIFICATION_FROM,
    to: NOTIFICATION_TO,
    subject: `New assessment: ${submission.businessName}`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;">
        <div style="background:#0b1d3a;padding:20px 24px;">
          <span style="color:#ffffff;font-size:16px;font-weight:bold;">Easy AI — New Assessment</span>
        </div>
        <div style="padding:20px 24px;background:#f8f4ed;">
          <table style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #ede5d4;">
            ${rowsHtml}
          </table>
          <p style="color:#8b9aaa;font-size:12px;margin-top:16px;">Submission ID: ${escapeHtml(submission.id)}</p>
        </div>
      </div>
    `,
  });
  // The Resend SDK resolves with { data, error } rather than throwing on API-level
  // rejections (e.g. unverified sending domain) — without this, a rejected send
  // would silently look like success to every caller.
  if (error) throw new Error(`Resend internal notification failed: ${error.message}`);
}

/**
 * Builds the full "YOUR 3-STEP AI ACTION PLAN" email HTML. Structure, order, title,
 * WHY-question selection, Step 3 heading/explanation, and the CTA are all fixed here
 * in code — never controlled by the language model (see lib/anthropic.ts). `fields`
 * supplies only the 12 narrative strings; each is HTML-escaped at render time since
 * they are plain text, not model-authored markup. Pure — no network call — so it's
 * independently testable and reusable for QA sample generation.
 */
export function buildResultEmailHtml(fields: ActionPlanFields, submission: Pick<AssessmentSubmission, 'businessName' | 'desiredOutcome'>): string {
  const t = (value: string) => escapeHtmlText(value);
  const whyQuestionId = selectWhyQuestionId(submission.desiredOutcome);
  const whyQuestionText = buildWhyQuestionText(whyQuestionId, submission.businessName);

  return `
      <div style="font-family:Georgia,'Playfair Display',serif;max-width:640px;margin:0 auto;background:#ffffff;">
        <div style="padding:28px 32px 12px 32px;background:#ffffff;">
          <img src="${RESULT_EMAIL_LOGO_URL}" width="200" height="113" alt="Easy AI logo" style="display:block;margin:0;max-width:200px;width:100%;height:auto;" />
        </div>
        <div style="padding:0 32px 32px 32px;font-family:Arial,Helvetica,sans-serif;color:#0b1d3a;line-height:1.6;">
          <h1 style="font-size:21px;letter-spacing:0.4px;margin:8px 0 20px 0;">YOUR 3-STEP AI ACTION PLAN</h1>
          <p>${t(fields.opening)}</p>

          <h2 style="font-size:17px;margin:28px 0 8px 0;">CHALLENGE 1: ${t(fields.challengeOneHeadline)}</h2>
          <p>${t(fields.challengeOneStory)}</p>
          <h3 style="font-size:15px;margin:20px 0 8px 0;">STEP 1, YOUR ACTION: ${t(fields.actionOneHeadline)}</h3>
          <p><strong>Do This Now:</strong> ${t(fields.actionOneDoNow)}</p>
          <p><strong>Automation Opportunity:</strong> ${t(fields.actionOneAutomationOpportunity)}</p>

          <h2 style="font-size:17px;margin:28px 0 8px 0;">CHALLENGE 2: ${t(fields.challengeTwoHeadline)}</h2>
          <p>${t(fields.challengeTwoStory)}</p>
          <h3 style="font-size:15px;margin:20px 0 8px 0;">STEP 2, YOUR ACTION: ${t(fields.actionTwoHeadline)}</h3>
          <p><strong>Do This Now:</strong> ${t(fields.actionTwoDoNow)}</p>
          <p><strong>Automation Opportunity:</strong> ${t(fields.actionTwoAutomationOpportunity)}</p>

          <h2 style="font-size:17px;margin:28px 0 8px 0;">HOW EASY AI HELPS</h2>
          <p>${t(fields.easyAiSummary)}</p>

          <p><strong>${whyQuestionText}</strong></p>

          <h2 style="font-size:17px;margin:28px 0 8px 0;">STEP 3: LET'S TALK IT THROUGH AND FIND YOUR BEST FIT</h2>
          <p>${STEP_THREE_EXPLANATION}</p>
        </div>
        <div style="padding:24px 32px;background:#f8f4ed;text-align:center;">
          <a href="${RESULT_EMAIL_CTA_URL}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:14px;">Find My Best Fit</a>
        </div>
        <div style="padding:16px 32px;font-family:Arial,Helvetica,sans-serif;color:#8b9aaa;font-size:11px;text-align:center;">
          You're receiving this because you completed the Easy AI assessment. Easy AI Consulting.
        </div>
      </div>
    `;
}

/** Sends the personalized AI Action Plan to the lead. fields is the Claude-generated (or fallback) structured content. */
export async function sendResultEmail(params: {
  to: string;
  firstName: string;
  businessName: string;
  fields: ActionPlanFields;
  submission: Pick<AssessmentSubmission, 'businessName' | 'desiredOutcome'>;
}) {
  const { to, firstName, businessName, fields, submission } = params;

  const { error } = await getResend().emails.send({
    from: RESULT_FROM,
    to,
    ...(RESULT_REPLY_TO ? { replyTo: RESULT_REPLY_TO } : {}),
    subject: `${firstName}, your AI Action Plan for ${businessName} is ready`,
    html: buildResultEmailHtml(fields, submission),
  });
  if (error) throw new Error(`Resend result email failed: ${error.message}`);
}
