import { prisma } from '@/lib/prisma';
import { getNotificationRecipients } from '@/lib/notificationRecipients';
import { escapeHtml } from '@/lib/htmlEscape';
import { Resend } from 'resend';

const NOTIFICATION_FROM =
  process.env.NOTIFICATION_EMAIL_FROM ?? 'Easy AI Assessments <assessments@mail.easyaiconsult.com>';

const SYNC_URL = process.env.COMMAND_CENTER_ASSESSMENT_SYNC_URL;
const SYNC_TOKEN = process.env.COMMAND_CENTER_ASSESSMENT_SYNC_TOKEN;

let resendClient: Resend | undefined;
function getResend(): Resend {
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

export interface GaryContactRequest {
  sessionId: string;
  name: string;
  businessName?: string;
  reason: string;
  preferredContact: 'email' | 'phone';
  email?: string;
  phone?: string;
}

export interface ContactDeliveryResult {
  delivered: boolean;
  emailSent: boolean;
  prospectSynced: boolean;
  alreadySubmitted: boolean;
  error?: string;
}

/**
 * Delivers a confirmed Gary contact request. Reuses the SAME two channels the assessment already
 * uses — one Resend send to the internal recipients, and the existing Command Center assessments
 * route — rather than introducing a second notification or CRM system.
 *
 * Duplicate protection is the chat session: one PublicChatSession can produce at most one contact
 * request. The session row is claimed first, so a double-tap on "confirm" or a retried request
 * returns alreadySubmitted instead of sending twice or creating a second prospect.
 *
 * Reports honestly: `delivered` is true only when the email actually sent. A Command Center that
 * is unreachable is recorded and logged but does not fake an email that never went out, and an
 * email failure is surfaced to the visitor rather than being swallowed.
 */
export async function deliverGaryContactRequest(
  request: GaryContactRequest
): Promise<ContactDeliveryResult> {
  // Claim the session first. contactRequestedAt is set in the same update that reads it, so two
  // concurrent confirmations cannot both pass this gate.
  const session = await prisma.publicChatSession.findUnique({
    where: { id: request.sessionId },
    select: { id: true, contactRequestedAt: true },
  });
  if (!session) return { delivered: false, emailSent: false, prospectSynced: false, alreadySubmitted: false, error: 'unknown session' };
  if (session.contactRequestedAt) {
    return { delivered: false, emailSent: false, prospectSynced: false, alreadySubmitted: true };
  }
  await prisma.publicChatSession.update({
    where: { id: request.sessionId },
    data: { contactRequestedAt: new Date() },
  });

  const contactValue = request.preferredContact === 'email' ? request.email ?? '' : request.phone ?? '';
  const rows: [string, string][] = [
    ['Name', request.name],
    ['Business', request.businessName || 'Not provided'],
    ['Reason', request.reason],
    ['Preferred contact', request.preferredContact],
    [request.preferredContact === 'email' ? 'Email' : 'Phone', contactValue],
    ['Source', 'Website chat (contact request)'],
  ];
  const rowsHtml = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 12px;color:#8b9aaa;font-size:13px;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:8px 12px;color:#0b1d3a;font-size:14px;">${escapeHtml(value)}</td></tr>`
    )
    .join('');

  let emailSent = false;
  let error: string | undefined;
  try {
    const recipients = getNotificationRecipients();
    if (recipients.length > 0) {
      const { error: sendError } = await getResend().emails.send({
        from: NOTIFICATION_FROM,
        to: recipients, // one send, four inboxes
        subject: `New contact request: ${request.businessName || request.name}`,
        html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;">
        <div style="background:#0b1d3a;padding:20px 24px;">
          <span style="color:#ffffff;font-size:16px;font-weight:bold;">Easy AI &mdash; New Contact Request</span>
        </div>
        <div style="padding:20px 24px;background:#f8f4ed;">
          <table style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #ede5d4;">${rowsHtml}</table>
        </div>
      </div>`,
      });
      if (sendError) throw new Error(sendError.message);
      emailSent = true;
    }
  } catch (err) {
    // No personal data and no credentials in the log line — just the failure mode.
    console.error('Gary contact notification email failed', err instanceof Error ? err.message : 'unknown');
    error = 'notification-failed';
  }

  // Command Center prospect. Same route and same bearer contract the assessment sync already
  // uses; the idempotency key is derived from the session so a retry updates rather than
  // duplicating the prospect.
  let prospectSynced = false;
  if (SYNC_URL && SYNC_TOKEN) {
    try {
      const response = await fetch(SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SYNC_TOKEN}` },
        body: JSON.stringify({
          companyName: request.businessName || request.name,
          contactName: request.name,
          ...(request.email ? { contactEmail: request.email } : {}),
          ...(request.phone ? { contactPhone: request.phone } : {}),
          source: 'easyai-landing-gary-contact',
          submittedAt: new Date().toISOString(),
          idempotencyKey: `easy-ai-gary-contact-${request.sessionId}`,
          requestedConsultation: false,
          resultSummary: request.reason,
          submissionId: request.sessionId,
        }),
      });
      prospectSynced = response.ok;
      if (!response.ok) console.error('Gary contact prospect sync rejected', response.status);
    } catch (err) {
      console.error('Gary contact prospect sync failed', err instanceof Error ? err.message : 'unknown');
    }
  }

  return { delivered: emailSent, emailSent, prospectSynced, alreadySubmitted: false, error };
}
