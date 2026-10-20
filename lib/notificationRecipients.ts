/**
 * Internal Easy AI operational inboxes that receive new-lead notifications.
 *
 * SERVER ONLY. Imported exclusively by lib/resend.ts, which is only reachable from API routes -
 * never from a client component. That keeps these addresses out of the browser bundle, page
 * source, and any client-side variable; a build-output scan verifies it. They are operational
 * routing addresses, not public contact details, and must never be rendered on the site.
 *
 * A single Resend send addressed to all four produces ONE email delivered to four inboxes. It
 * does not create four submissions, four prospects, or four Command Center records.
 *
 * ASSESSMENT_NOTIFICATION_EMAIL overrides this list when set (comma-separated), so an operator
 * can redirect notifications per environment — a staging deploy should not page the real inboxes.
 */
const DEFAULT_RECIPIENTS = [
  'info@easyaiconsult.com',
  'etoyi.g@easyaiconsult.com',
  'sales@easyaiconsult.com',
  'etoyi@easyaiconsult.com',
];

export function getNotificationRecipients(): string[] {
  const configured = process.env.ASSESSMENT_NOTIFICATION_EMAIL;
  if (!configured) return DEFAULT_RECIPIENTS;
  const parsed = configured
    .split(',')
    .map((address) => address.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : DEFAULT_RECIPIENTS;
}
