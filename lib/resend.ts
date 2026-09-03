import { Resend } from 'resend';
import type { AssessmentSubmission } from './validation';
import { escapeHtml } from './htmlEscape';

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
export const RESULT_EMAIL_CTA_URL = 'https://www.easyaiconsult.com/assessment/complete';

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
    ['Lead response', submission.leadResponse],
    ['Sports preference', submission.favoriteTeam ? `${submission.sportsFan} — ${submission.favoriteTeam}` : submission.sportsFan],
    ['Website', submission.noWebsite ? 'No website' : (submission.websiteUrl ?? '')],
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

/** Builds the full result-email HTML (logo header + Claude-generated body + CTA + footer). Pure — no network call — so it's independently testable and reusable for QA sample generation. */
export function buildResultEmailHtml(resultHtml: string): string {
  return `
      <div style="font-family:Georgia,'Playfair Display',serif;max-width:640px;margin:0 auto;background:#ffffff;">
        <div style="background:#0b1d3a;padding:28px 32px;text-align:center;">
          <img src="${RESULT_EMAIL_LOGO_URL}" width="220" height="124" alt="Easy AI logo" style="display:block;margin:0 auto;max-width:220px;width:100%;height:auto;" />
        </div>
        <div style="padding:32px;font-family:Arial,Helvetica,sans-serif;color:#0b1d3a;line-height:1.6;">
          ${resultHtml}
        </div>
        <div style="padding:24px 32px;background:#f8f4ed;text-align:center;">
          <a href="${RESULT_EMAIL_CTA_URL}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:14px;">Watch Your Next-Step Video</a>
        </div>
        <div style="padding:16px 32px;font-family:Arial,Helvetica,sans-serif;color:#8b9aaa;font-size:11px;text-align:center;">
          You're receiving this because you completed the Easy AI assessment. Easy AI Consulting.
        </div>
      </div>
    `;
}

/** Builds a readable multipart-email alternative without carrying model-supplied markup through. */
export function buildResultEmailText(resultHtml: string): string {
  const body = resultHtml
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/\s*(?:p|h[1-6]|li|div)\s*>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return `${body}\n\nWatch Your Next-Step Video: ${RESULT_EMAIL_CTA_URL}\n\nYou're receiving this because you completed the Easy AI assessment. Easy AI Consulting.`;
}

/** Sends the personalized AI Action Plan to the lead. resultHtml is the Claude-generated body content. */
export async function sendResultEmail(params: { to: string; firstName: string; businessName: string; resultHtml: string }) {
  const { to, firstName, businessName, resultHtml } = params;

  const { error } = await getResend().emails.send({
    from: RESULT_FROM,
    to,
    ...(RESULT_REPLY_TO ? { replyTo: RESULT_REPLY_TO } : {}),
    subject: `${firstName}, your AI Action Plan for ${businessName} is ready`,
    html: buildResultEmailHtml(resultHtml),
    text: buildResultEmailText(resultHtml),
  });
  if (error) throw new Error(`Resend result email failed: ${error.message}`);
}
