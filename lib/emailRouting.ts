/**
 * The single source of truth for every Easy AI email address and for whether a send is
 * allowed to leave this environment at all.
 *
 * Server-only by construction, not by the `server-only` package (adding that would be a new
 * dependency). Every value here comes from a non-NEXT_PUBLIC_ variable, so Next.js will not
 * inline it into client JavaScript, and lib/emailRouting.test.ts asserts that no client
 * component imports this module.
 *
 * TWO DELIBERATE DESTINATIONS, EACH WITH ONE PURPOSE.
 *
 * - EASY_AI_CONTACT_EMAIL is the PRIMARY CONTACT address. Anything a person sends to reach
 *   Easy AI lands here: Gary's contact requests, and replies to the customer-facing result
 *   email (its Reply-To). Product direction 2026-09-14: this is hello@easyaiconsult.com.
 * - EASY_AI_INTERNAL_NOTIFICATION_EMAIL is where the system tells Easy AI that an assessment
 *   was completed. That is an internal notification, not a person reaching out, and it keeps
 *   the address PR #12 routed it to. Production overrides it through
 *   ASSESSMENT_NOTIFICATION_EMAIL, so changing this constant alone does not move it.
 *
 * Every other Easy AI recipient must resolve through one of the two functions below
 * (contactRecipient, internalRecipient); no route may name an address itself.
 */

/** PRIMARY CONTACT. Gary contact requests and customer replies land here. */
export const EASY_AI_CONTACT_EMAIL = 'hello@easyaiconsult.com';

/** INTERNAL NOTIFICATIONS ONLY (assessment completed). Not a contact address. */
export const EASY_AI_INTERNAL_NOTIFICATION_EMAIL = 'info@easyaiconsult.com';

/**
 * SENDER AUTHENTICATION, READ THIS BEFORE CHANGING THE FROM ADDRESS.
 *
 * Resend is verified for the sending subdomain mail.easyaiconsult.com only. As of the audit,
 * public DNS shows a Resend DomainKeys Identified Mail (DKIM) key at
 * resend._domainkey.mail.easyaiconsult.com and NO such key on the root domain. The root
 * Sender Policy Framework (SPF) record resolves to "v=spf1 include:_spf.google.com ~all",
 * which authorizes Google Workspace and not Resend, and the Domain-based Message
 * Authentication, Reporting and Conformance (DMARC) policy is p=quarantine.
 *
 * Sending "From: info@easyaiconsult.com" through Resend today would therefore carry no
 * DKIM signature for the root domain and would fail SPF, so DMARC would quarantine it.
 *
 * The From address stays on the authenticated subdomain until easyaiconsult.com is verified
 * in Resend and its DNS records are published. Reply-To already points at the business
 * address, so replies reach the right inbox in the meantime.
 */
const AUTHENTICATED_RESULT_FROM = 'Easy AI <hello@mail.easyaiconsult.com>';
const AUTHENTICATED_NOTIFICATION_FROM = 'Easy AI Assessments <assessments@mail.easyaiconsult.com>';

/** From on the customer-facing result email. Override only with an address Resend has verified. */
export function resultFromAddress(): string {
  return process.env.RESULT_EMAIL_FROM ?? AUTHENTICATED_RESULT_FROM;
}

/** From on internal notifications and contact requests. */
export function notificationFromAddress(): string {
  return process.env.NOTIFICATION_EMAIL_FROM ?? AUTHENTICATED_NOTIFICATION_FROM;
}

/**
 * Reply-To on the customer-facing result email, so a customer answering their plan reaches a
 * monitored mailbox rather than the send-only subdomain.
 */
export function resultReplyToAddress(): string {
  return process.env.RESULT_EMAIL_REPLY_TO ?? EASY_AI_CONTACT_EMAIL;
}

/** Where the system notifies Easy AI that an assessment was completed. */
export function internalRecipient(): string {
  return process.env.ASSESSMENT_NOTIFICATION_EMAIL ?? EASY_AI_INTERNAL_NOTIFICATION_EMAIL;
}

/**
 * Where a visitor's contact request goes. This is the one destination a white-label site
 * would configure differently; CONTACT_NOTIFICATION_EMAIL overrides the Easy AI default.
 */
export function contactRecipient(): string {
  return process.env.CONTACT_NOTIFICATION_EMAIL?.trim() || EASY_AI_CONTACT_EMAIL;
}

export type DeliveryDecision =
  | { allowed: true; to: string; redirected: boolean }
  | { allowed: false; reason: string };

/**
 * PREVIEW SAFETY.
 *
 * Preview and development deployments share the production Resend key and the production
 * internal recipient, so without a guard a preview build can email real customers and the
 * real business inbox.
 *
 * Outside production, which includes preview, development, local runs and continuous
 * integration, mail is redirected to EMAIL_TEST_RECIPIENT when one is configured and is
 * otherwise refused. It is never silently dropped: a refusal returns allowed:false and the
 * caller raises a real error, so a blocked send is recorded as a failure rather than reported
 * as a success.
 *
 * VERCEL_ENV is set by Vercel itself ("production" | "preview" | "development") and cannot be
 * influenced by a request, so it cannot be spoofed by a visitor.
 */
export function resolveDelivery(intendedTo: string): DeliveryDecision {
  const environment = process.env.VERCEL_ENV;

  // ONLY a real production deployment may reach the intended recipient. An absent VERCEL_ENV
  // means local development, continuous integration, or an unknown host, and a developer
  // holding a real Resend key must never be one careless run away from emailing a customer.
  // NODE_ENV is deliberately not consulted: "production" there only describes a build mode
  // and is set by ordinary local production builds, so it is not evidence of a deployment.
  if (environment === 'production') {
    return { allowed: true, to: intendedTo, redirected: false };
  }

  const testRecipient = process.env.EMAIL_TEST_RECIPIENT?.trim();
  if (testRecipient) {
    return { allowed: true, to: testRecipient, redirected: true };
  }

  return {
    allowed: false,
    reason: `Email blocked outside production (VERCEL_ENV=${environment ?? 'unset'}): set EMAIL_TEST_RECIPIENT to receive mail from a non-production environment.`,
  };
}
