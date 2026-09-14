import { prisma } from '@/lib/prisma';
import { admitContactMessage } from '@/lib/contactRateLimit';
import { sendContactMessage } from '@/lib/resend';
import { enqueueFunnelEvent } from './funnelEvents';
import { CONTACT_SENT_MARKER } from './contactFlow';
import type { SiteConfig } from '@/lib/siteConfig';

/**
 * The final step of the assistant's contact flow: what happens after the visitor presses
 * "Yes, send it". Everything here is server-side and ordered deliberately.
 *
 *   1. RATE LIMIT      The durable contact limiter runs before anything is stored or sent.
 *                      A storage failure inside it throws, and the caller fails closed.
 *   2. DURABLE RECORD  The contact is written (or, on a retry within the same session,
 *                      updated) BEFORE the notification goes out. If the notification then
 *                      fails, Easy AI still holds the visitor's details and can follow up by
 *                      hand; the visitor is told honestly that it did not send, and a retry
 *                      updates the same row rather than creating a duplicate.
 *   3. NOTIFY          The email to the configured contact address. Success is claimed only
 *                      after the provider accepts it, per the existing reliability rule.
 *   4. MARK + HANDOFF  One request per session (system-role marker), then the Command Center
 *                      handoff through the existing funnel outbox and CRR outbox. These are
 *                      best-effort: the message already reached the inbox, so a hiccup here
 *                      must not be reported as a failure.
 *
 * Ownership (siteKey, channel, brand, destination) comes from SiteConfig, resolved on the
 * server. Nothing from the request body can choose which site a contact belongs to.
 *
 * The dependencies are injectable so the ordering and outcomes are unit-testable without a
 * database or an email provider; production callers pass nothing and get the real ones.
 */
export interface ContactSendInput {
  name: string;
  email?: string;
  phone?: string;
  reason: string;
}

export type ContactSubmissionOutcome =
  | { kind: 'sent'; contactId: string }
  | { kind: 'already-sent' }
  | { kind: 'limited' }
  | { kind: 'failed'; stage: 'rate-limit' | 'storage' | 'delivery' };

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

export interface ContactSubmissionDeps {
  db: {
    findSentMarker(sessionId: string): Promise<boolean>;
    findContactForSession(sessionId: string): Promise<{ id: string } | null>;
    createContact(data: ContactRecordData): Promise<{ id: string }>;
    updateContact(id: string, data: ContactRecordData): Promise<void>;
    linkSession(sessionId: string, contactId: string): Promise<void>;
    writeSentMarker(sessionId: string): Promise<void>;
    writeCrrOutbox(snapshot: Record<string, unknown>): Promise<void>;
  };
  admit: typeof admitContactMessage;
  send: typeof sendContactMessage;
  enqueue: typeof enqueueFunnelEvent;
  now: () => Date;
}

/** Digits and a leading plus only, the same shape the handoff path stores. */
export function normalizePhone(phone: string | undefined): string | null {
  const digits = phone ? phone.replace(/[^\d+]/g, '') : '';
  return digits ? digits : null;
}

const realDeps: ContactSubmissionDeps = {
  db: {
    async findSentMarker(sessionId) {
      const row = await prisma.publicChatMessage.findFirst({
        where: { sessionId, role: 'system', content: CONTACT_SENT_MARKER },
        select: { id: true },
      });
      return Boolean(row);
    },
    findContactForSession(sessionId) {
      return prisma.publicContact.findFirst({ where: { sourceSessionId: sessionId }, select: { id: true }, orderBy: { createdAt: 'desc' } });
    },
    createContact(data) {
      return prisma.publicContact.create({ data, select: { id: true } });
    },
    async updateContact(id, data) {
      await prisma.publicContact.update({ where: { id }, data });
    },
    async linkSession(sessionId, contactId) {
      await prisma.publicChatSession.update({ where: { id: sessionId }, data: { identifiedContactId: contactId } });
    },
    async writeSentMarker(sessionId) {
      await prisma.publicChatMessage.create({ data: { sessionId, role: 'system', content: CONTACT_SENT_MARKER } });
    },
    async writeCrrOutbox(snapshot) {
      await prisma.crrOutboxEvent.create({ data: { contactSnapshot: snapshot as never } });
    },
  },
  admit: admitContactMessage,
  send: sendContactMessage,
  enqueue: enqueueFunnelEvent,
  now: () => new Date(),
};

export async function submitAssistantContact(
  params: { sessionId: string; clientIdentity: string; send: ContactSendInput; config: SiteConfig },
  deps: ContactSubmissionDeps = realDeps
): Promise<ContactSubmissionOutcome> {
  const { sessionId, clientIdentity, send, config } = params;

  // One contact request per session. Checked first so a repeat press costs nothing.
  if (await deps.db.findSentMarker(sessionId)) return { kind: 'already-sent' };

  // 1. Rate limit, before anything is stored or sent. Fails closed on a limiter error.
  let admission;
  try {
    admission = await deps.admit(clientIdentity);
  } catch (error) {
    console.error('Assistant contact rate-limit check failed', error);
    return { kind: 'failed', stage: 'rate-limit' };
  }
  if (admission.kind === 'limited') return { kind: 'limited' };

  // 2. Durable record, before the notification. A retry in the same session updates it.
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
    consentGivenAt: deps.now(),
    consentText: `Confirmed "Yes, send it" in the ${config.assistant.name} contact flow.`,
  };
  let contactId: string;
  try {
    const existing = await deps.db.findContactForSession(sessionId);
    if (existing) {
      await deps.db.updateContact(existing.id, record);
      contactId = existing.id;
    } else {
      contactId = (await deps.db.createContact(record)).id;
    }
    await deps.db.linkSession(sessionId, contactId);
  } catch (error) {
    console.error('Assistant contact could not be stored', error);
    return { kind: 'failed', stage: 'storage' };
  }

  // 3. Notify. Reply-To is the visitor only when they gave an email (sendContactMessage).
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
    console.error('Assistant contact request delivery failed', error);
    return { kind: 'failed', stage: 'delivery' };
  }

  // 4. Mark and hand off. Best-effort: the message is already in the inbox.
  try {
    await deps.db.writeSentMarker(sessionId);
    const occurredAt = deps.now().toISOString();
    void deps.enqueue({
      eventType: 'contact.captured',
      idempotencyKey: `contact.captured:${sessionId}`,
      payload: {
        sessionId,
        funnelCorrelationId: sessionId,
        siteKey: config.siteKey,
        channel: config.contact.channelKey,
        contactId,
        firstName: send.name,
        businessName: null,
        emailNormalized,
        phoneNormalized,
        preferredContactTime: null,
        summary: send.reason,
        transcriptReference: sessionId,
        occurredAt,
      },
    });
    await deps.db.writeCrrOutbox({
      contactId,
      siteKey: config.siteKey,
      channel: config.contact.channelKey,
      firstName: send.name,
      businessName: null,
      emailNormalized,
      phoneNormalized,
      sourceSessionId: sessionId,
      reason: send.reason,
    });
  } catch (error) {
    console.error('Assistant contact request sent but handoff bookkeeping failed', error);
  }

  return { kind: 'sent', contactId };
}
