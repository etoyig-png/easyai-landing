import { prisma } from '@/lib/prisma';
import { admitContactMessage } from '@/lib/contactRateLimit';
import { sendContactMessage } from '@/lib/resend';
import { deliverFunnelEvent, recordFunnelEvent, type FunnelDeliveryResult, type FunnelEventInput } from './funnelEvents';
import { CONTACT_SENT_MARKER } from './contactFlow';
import type { SiteConfig } from '@/lib/siteConfig';

/**
 * The final step of the assistant's contact flow: what happens after the visitor presses
 * "Yes, send it". Everything here is server-side and ordered deliberately.
 *
 *   1. RATE LIMIT   The durable contact limiter runs before anything is stored or sent. A
 *                   storage failure inside it throws, and the pipeline fails closed. It limits
 *                   a connection; it is NOT the session idempotency mechanism.
 *
 *   2. CLAIM        One Serializable transaction that first takes the transaction-scoped
 *                   advisory lock for this session (the pattern lib/gary/handoffState.ts and
 *                   lib/contactRateLimit.ts already use), then:
 *                     - reads the session's contact (PublicContact.sourceSessionId is UNIQUE,
 *                       so the database, not the read, guarantees one row per session);
 *                     - returns 'already-processed' if its notification was already sent, or
 *                       'in-progress' if another request holds a fresh 'sending' lease;
 *                     - otherwise upserts the contact with a 'sending' lease, links the session,
 *                       and records the contact.captured outbox row (idempotencyKey UNIQUE).
 *                   Because contact and outbox row commit together, BEFORE any email, a
 *                   provider outage can never strand the opportunity: the Command Center
 *                   handoff exists the moment the contact does.
 *
 *   3. NOTIFY       The email to the configured contact address, outside the transaction.
 *
 *   4. SETTLE       The contact's notification state becomes 'sent' (+ transcript marker) or
 *                   'failed' (+ error, retryable by the visitor). Either way the durable
 *                   record and the handoff already exist.
 *
 *   5. DELIVER      One awaited, time-bounded delivery attempt of the outbox row. A failure
 *                   here is scheduled for retry by the existing outbox; it never changes what
 *                   the visitor is told about their message.
 *
 * Ownership (siteKey, channel, brand, destination) comes from SiteConfig, resolved on the
 * server. Nothing from the request body can choose which site a contact belongs to.
 *
 * Dependencies are injectable so ordering and outcomes are unit-testable without a database
 * or an email provider; production callers pass nothing and get the real ones.
 */
export interface ContactSendInput {
  name: string;
  email?: string;
  phone?: string;
  reason: string;
}

/** How long one request may hold the 'sending' lease before another request may take over. */
export const SENDING_LEASE_MS = 60_000;

export type HandoffStorage = 'created' | 'existing';

export type ContactSubmissionOutcome =
  /** Stored, handoff durably queued, notification accepted by the provider. */
  | { kind: 'sent'; contactId: string; handoff: HandoffStorage; delivery: DeliveryState }
  /** Stored, handoff durably queued, but the notification was NOT accepted. Visitor may retry. */
  | { kind: 'saved-not-notified'; contactId: string; handoff: HandoffStorage; delivery: DeliveryState }
  /** This session's notification was already sent. */
  | { kind: 'already-processed'; contactId: string }
  /** Another request for this session is mid-send; nothing was duplicated. */
  | { kind: 'in-progress' }
  | { kind: 'limited' }
  /** Nothing durable exists: limiter error, or the claim transaction (contact + handoff) rolled back. */
  | { kind: 'failed'; stage: 'rate-limit' | 'storage' };

export type DeliveryState = FunnelDeliveryResult | 'delivered-earlier' | 'not-due' | 'error';

export interface ContactRecordData {
  firstName: string;
  emailNormalized: string | null;
  phoneNormalized: string | null;
  reason: string;
  channel: string;
  siteKey: string;
  sourceSessionId: string;
  consentGivenAt: Date;
  consentText: string;
}

export interface ExistingContactState {
  id: string;
  notificationStatus: string;
  updatedAt: Date;
}

export type ClaimDecision = 'already-processed' | 'in-progress' | 'claimable';

export type ClaimResult =
  | { claim: 'claimed'; contactId: string; handoff: HandoffStorage }
  | { claim: 'already-processed'; contactId: string }
  | { claim: 'in-progress' };

export interface ContactSubmissionDeps {
  admit: typeof admitContactMessage;
  send: typeof sendContactMessage;
  /**
   * Atomically claims the session: contact upsert + session link + outbox row, under the
   * session lock. Must throw if any part fails so nothing partial is committed.
   */
  claim(sessionId: string, record: ContactRecordData, event: FunnelEventInput, now: Date): Promise<ClaimResult>;
  /** Records the notification result on the contact (and the transcript marker on success). */
  settle(contactId: string, sessionId: string, result: { status: 'sent' } | { status: 'failed'; error: string }, now: Date): Promise<void>;
  deliver: typeof deliverFunnelEvent;
  now: () => Date;
}

/** Digits and a leading plus only, the same shape the handoff path stores. */
export function normalizePhone(phone: string | undefined): string | null {
  const digits = phone ? phone.replace(/[^\d+]/g, '') : '';
  return digits ? digits : null;
}

/**
 * The claim decision, pure so it is testable on its own. Called while holding the session
 * lock, so the row it sees cannot change underneath it.
 */
export function decideClaim(existing: ExistingContactState | null, now: Date, leaseMs = SENDING_LEASE_MS): ClaimDecision {
  if (!existing) return 'claimable';
  if (existing.notificationStatus === 'sent') return 'already-processed';
  if (existing.notificationStatus === 'sending' && now.getTime() - existing.updatedAt.getTime() < leaseMs) return 'in-progress';
  // 'pending', 'failed', or a stale 'sending' lease (a request that died mid-send): retryable.
  return 'claimable';
}

/** Logs a pipeline failure by stage with the correlation id only. Never visitor details. */
function logFailure(stage: 'rate-limit' | 'storage' | 'notification' | 'settle' | 'webhook', sessionId: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[contact-pipeline] stage=${stage} sessionId=${sessionId} error=${message}`);
}

/** The production dependencies, exported so an integration test can run the real claim transaction. */
export const productionContactSubmissionDeps: ContactSubmissionDeps = {
  admit: admitContactMessage,
  send: sendContactMessage,
  deliver: deliverFunnelEvent,
  now: () => new Date(),

  claim(sessionId, record, event, now) {
    return prisma.$transaction(async (tx) => {
      // Transaction-scoped lock on this session; concurrent confirmations serialize here.
      // PostgreSQL returns void from pg_advisory_xact_lock; cast so Prisma can deserialize it.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`contact-flow:${sessionId}`}))::text`;

      const existing = await tx.publicContact.findUnique({
        where: { sourceSessionId: sessionId },
        select: { id: true, notificationStatus: true, updatedAt: true },
      });
      const decision = decideClaim(existing, now);
      if (decision === 'already-processed') return { claim: 'already-processed', contactId: existing!.id } as const;
      if (decision === 'in-progress') return { claim: 'in-progress' } as const;

      const contact = await tx.publicContact.upsert({
        where: { sourceSessionId: sessionId },
        create: { ...record, notificationStatus: 'sending', notificationAttempts: 1 },
        update: { ...record, notificationStatus: 'sending', notificationAttempts: { increment: 1 }, notificationError: null },
        select: { id: true },
      });
      await tx.publicChatSession.update({ where: { id: sessionId }, data: { identifiedContactId: contact.id } });
      const handoff = await recordFunnelEvent(tx, event);
      return { claim: 'claimed', contactId: contact.id, handoff: handoff.stored } as const;
    }, { isolationLevel: 'Serializable' });
  },

  async settle(contactId, sessionId, result, now) {
    if (result.status === 'sent') {
      await prisma.$transaction([
        prisma.publicContact.update({ where: { id: contactId }, data: { notificationStatus: 'sent', notifiedAt: now, notificationError: null } }),
        prisma.publicChatMessage.create({ data: { sessionId, role: 'system', content: CONTACT_SENT_MARKER } }),
      ]);
      return;
    }
    await prisma.publicContact.update({
      where: { id: contactId },
      data: { notificationStatus: 'failed', notificationError: result.error.slice(0, 500) },
    });
  },
};

export async function submitAssistantContact(
  params: { sessionId: string; clientIdentity: string; send: ContactSendInput; config: SiteConfig },
  deps: ContactSubmissionDeps = productionContactSubmissionDeps
): Promise<ContactSubmissionOutcome> {
  const { sessionId, clientIdentity, send, config } = params;

  // 1. Rate limit, before anything is stored or sent. Fails closed on a limiter error.
  let admission;
  try {
    admission = await deps.admit(clientIdentity);
  } catch (error) {
    logFailure('rate-limit', sessionId, error);
    return { kind: 'failed', stage: 'rate-limit' };
  }
  if (admission.kind === 'limited') return { kind: 'limited' };

  // 2. Claim: contact + session link + outbox row, atomically, under the session lock.
  const now = deps.now();
  const emailNormalized = send.email?.trim().toLowerCase() || null;
  const phoneNormalized = normalizePhone(send.phone);
  const record: ContactRecordData = {
    firstName: send.name,
    emailNormalized,
    phoneNormalized,
    reason: send.reason,
    channel: config.contact.channelKey,
    siteKey: config.siteKey,
    sourceSessionId: sessionId,
    consentGivenAt: now,
    consentText: `Confirmed "Yes, send it" in the ${config.assistant.name} contact flow.`,
  };
  // One key per session for THIS producer. The assessment handoff route already emits a
  // contact.captured event keyed `contact.captured:<sessionId>` (a conversation summary with
  // whatever contact was known). Sharing that key would make this richer event report
  // 'existing' and silently drop the visitor's details whenever they visited the assessment
  // first, so the pipeline's key is producer-scoped. The receiver dedupes by eventId; a
  // Lead/Prospect consumer must upsert by sessionId (documented in docs/gary-contact-pipeline.md).
  const event: FunnelEventInput = {
    eventType: 'contact.captured',
    idempotencyKey: `contact.captured:${sessionId}:${config.contact.channelKey}`,
    payload: {
      sessionId,
      funnelCorrelationId: sessionId,
      siteKey: config.siteKey,
      channel: config.contact.channelKey,
      firstName: send.name,
      businessName: null,
      emailNormalized,
      phoneNormalized,
      preferredContactTime: null,
      summary: send.reason,
      transcriptReference: sessionId,
      occurredAt: now.toISOString(),
    },
  };

  let claimed: ClaimResult;
  try {
    claimed = await deps.claim(sessionId, record, event, now);
  } catch (error) {
    logFailure('storage', sessionId, error);
    return { kind: 'failed', stage: 'storage' };
  }
  if (claimed.claim === 'already-processed') return { kind: 'already-processed', contactId: claimed.contactId };
  if (claimed.claim === 'in-progress') return { kind: 'in-progress' };
  const { contactId, handoff } = claimed;

  // 3. Notify. Reply-To is the visitor only when they gave an email (sendContactMessage).
  let notified = true;
  try {
    await deps.send({
      name: send.name,
      email: send.email,
      phone: send.phone,
      message: send.reason,
      channelLabel: config.contact.channelLabel,
      brandName: config.brand.name,
    });
  } catch (error) {
    notified = false;
    logFailure('notification', sessionId, error);
    try {
      await deps.settle(contactId, sessionId, { status: 'failed', error: error instanceof Error ? error.message : String(error) }, deps.now());
    } catch (settleError) {
      logFailure('settle', sessionId, settleError);
    }
  }

  // 4. Settle the successful notification. A failure here leaves the lease to expire, after
  //    which the visitor could re-send; that is the honest, recoverable direction to fail.
  if (notified) {
    try {
      await deps.settle(contactId, sessionId, { status: 'sent' }, deps.now());
    } catch (error) {
      logFailure('settle', sessionId, error);
    }
  }

  // 5. One awaited, bounded delivery attempt. Retry state lives in the outbox row.
  let delivery: DeliveryState;
  try {
    delivery = await deps.deliver(event.idempotencyKey);
  } catch (error) {
    delivery = 'error';
    logFailure('webhook', sessionId, error);
  }

  return notified
    ? { kind: 'sent', contactId, handoff, delivery }
    : { kind: 'saved-not-notified', contactId, handoff, delivery };
}
