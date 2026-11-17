import { Resend } from 'resend';
import type { AssessmentSubmission } from './validation';
import type { ContactSubmission } from './contactValidation';
import { websiteNotificationValue } from './websiteStatus';
import { escapeHtml } from './htmlEscape';
import {
  internalRecipient,
  notificationFromAddress,
  resolveDelivery,
  resultFromAddress,
  resultReplyToAddress,
} from './emailRouting';

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


/**
 * Internal notification that a new assessment came in. Delivered to the one Easy AI business
 * inbox, with the lead as Reply-To so the notification can be answered directly.
 */
export async function sendInternalNotification(submission: AssessmentSubmission & { id: string }) {
  const delivery = resolveDelivery(internalRecipient());
  if (!delivery.allowed) throw new Error(delivery.reason);

  const rows: [string, string][] = [
    ['Business', submission.businessName],
    ['Contact', `${submission.firstName} ${submission.lastName}`],
    ['Email', submission.email],
    ['Work situation', submission.workSituation],
    ['Google and AI visibility', submission.searchVisibility],
    ['#1 AI challenge', submission.aiChallenge],
    ['Desired outcome', submission.desiredOutcome],
    ['Biggest time drain', submission.timeDrain],
    ['Privacy concern level', submission.privacyConcern],
    ['Industry', submission.industryOther ? `${submission.industry} — ${submission.industryOther}` : submission.industry],
    ['Lead response', submission.leadResponse],
    ['Website conversion', submission.websiteConversion],
    ['Website', websiteNotificationValue(submission)],
  ];

  const rowsHtml = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 12px;color:#8b9aaa;font-size:13px;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:8px 12px;color:#0b1d3a;font-size:14px;">${escapeHtml(value)}</td></tr>`
    )
    .join('');

  const { error } = await getResend().emails.send({
    from: notificationFromAddress(),
    to: delivery.to,
    // The lead, so replying to this notification answers the customer rather than the
    // send-only subdomain. The address is schema-validated before it reaches here and is
    // never used as From.
    replyTo: submission.email,
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

/**
 * Sends the personalized Customer Opportunity Action Plan to the lead. resultHtml is the
 * Claude-generated body content. The customer's address is only ever the recipient: From is
 * always an authenticated Easy AI sender, and Reply-To is the one business inbox.
 */
export async function sendResultEmail(params: { to: string; firstName: string; businessName: string; resultHtml: string }) {
  const { to, firstName, businessName, resultHtml } = params;
  const delivery = resolveDelivery(to);
  if (!delivery.allowed) throw new Error(delivery.reason);

  const { error } = await getResend().emails.send({
    from: resultFromAddress(),
    to: delivery.to,
    replyTo: resultReplyToAddress(),
    subject: `${firstName}, your Customer Opportunity Action Plan for ${businessName} is ready`,
    html: buildResultEmailHtml(resultHtml),
    text: buildResultEmailText(resultHtml),
  });
  if (error) throw new Error(`Resend result email failed: ${error.message}`);
}

/**
 * Contact and consultation requests from the public form. Delivered to the one Easy AI
 * business inbox with the visitor as Reply-To.
 *
 * The visitor never appears in From: that would be an unauthenticated sender on a domain we
 * do not control, and it is how open relays and spoofed mail happen. From is always an
 * authenticated Easy AI address, and every visitor value is HTML-escaped before rendering.
 */
export async function sendContactMessage(submission: ContactSubmission) {
  const delivery = resolveDelivery(internalRecipient());
  if (!delivery.allowed) throw new Error(delivery.reason);

  const rows: [string, string][] = [
    ['Name', submission.name],
    ['Email', submission.email],
    ...(submission.phone ? ([['Phone', submission.phone]] as [string, string][]) : []),
    ...(submission.businessName ? ([['Business', submission.businessName]] as [string, string][]) : []),
  ];

  const rowsHtml = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 12px;color:#8b9aaa;font-size:13px;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:8px 12px;color:#0b1d3a;font-size:14px;">${escapeHtml(value)}</td></tr>`
    )
    .join('');

  const { error } = await getResend().emails.send({
    from: notificationFromAddress(),
    to: delivery.to,
    replyTo: submission.email,
    subject: `Contact form: ${submission.name}`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;">
        <div style="background:#0b1d3a;padding:20px 24px;">
          <span style="color:#ffffff;font-size:16px;font-weight:bold;">Easy AI, New Contact Message</span>
        </div>
        <div style="padding:20px 24px;background:#f8f4ed;">
          <table style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #ede5d4;">
            ${rowsHtml}
          </table>
          <p style="color:#0b1d3a;font-size:14px;margin-top:16px;white-space:pre-wrap;">${escapeHtml(submission.message)}</p>
        </div>
      </div>
    `,
  });
  if (error) throw new Error(`Resend contact message failed: ${error.message}`);
}
