import { createHash } from 'crypto';
import { waitUntil } from '@vercel/functions';
import { prisma } from './prisma';
import type { ContactSubmission } from './contactValidation';
import { sendContactMessage } from './resend';
import { deliverFunnelEvent, recordFunnelEvent } from './gary/funnelEvents';
import { PROVIDER_TIMEOUT_MS, withTimeout } from './requestSafety';
import { getSiteConfig } from './siteConfig';

/** Store the form contact and its handoff together before attempting any notification. */
export async function saveContactSubmission(data: ContactSubmission) {
  const config = getSiteConfig();
  // Existing formLoadedAt identifies one form instance. Include the normalized
  // payload so editing a failed message creates a distinct logical submission.
  const contactId = `contact-form-${createHash('sha256').update(JSON.stringify([
    config.siteKey, data.formLoadedAt, data.name, data.email.toLowerCase(),
    data.phone || '', data.businessName || '', data.message,
  ])).digest('hex')}`;
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${contactId}))::text`;
    const existing = await tx.publicContact.findUnique({ where: { id: contactId } });
    const eventKey = `contact.captured:${contactId}:contact-form`;
    if (existing?.notificationStatus === 'sent') return { contactId, eventKey, state: 'sent' as const };
    // Never automatically resend an uncertain notification after Resend's 24h
    // idempotency window. Preserve it for operator reconciliation instead.
    if (existing && (Date.now() - existing.createdAt.getTime() >= 24 * 60 * 60 * 1000 ||
      (existing.notificationStatus === 'sending' && Date.now() - existing.updatedAt.getTime() < 60_000))) {
      return { contactId, eventKey, state: 'in-progress' as const };
    }
    const contact = await tx.publicContact.upsert({
      where: { id: contactId },
      update: { notificationStatus: 'sending', notificationError: null },
      create: {
        id: contactId,
        firstName: data.name,
        businessName: data.businessName || null,
        emailNormalized: data.email.toLowerCase(),
        phoneNormalized: data.phone?.replace(/[^\d+]/g, '') || null,
        reason: data.message,
        siteKey: config.siteKey,
        channel: 'contact-form',
        notificationStatus: 'sending',
      },
      select: { id: true },
    });
    await recordFunnelEvent(tx, {
      eventType: 'contact.captured',
      idempotencyKey: eventKey,
      payload: {
        // Form contacts have no Gary session. Use the durable contact ID as their
        // correlation identity, never a fabricated PublicChatSession record.
        sessionId: contact.id,
        funnelCorrelationId: contact.id,
        contactId: contact.id,
        siteKey: config.siteKey,
        channel: 'contact-form',
        firstName: data.name,
        businessName: data.businessName || null,
        emailNormalized: data.email.toLowerCase(),
        phoneNormalized: data.phone?.replace(/[^\d+]/g, '') || null,
        summary: data.message,
      },
    });
    return { contactId: contact.id, eventKey, state: 'claimed' as const };
  });
}

/** Called only after the route's validation, spam checks and durable rate limit. */
export async function notifyContactSubmission(
  data: ContactSubmission,
  stored: { contactId: string; eventKey: string },
) {
  // The transaction already committed. A notification failure must not lose the
  // contact or its downstream handoff; delivery retries use the existing outbox.
  waitUntil(deliverFunnelEvent(stored.eventKey).catch(() => {
    console.error('[contact-form] handoff attempt failed');
  }));
  try {
    await withTimeout(sendContactMessage(data, {
      idempotencyKey: `contact-notification:${stored.contactId}`,
    }), PROVIDER_TIMEOUT_MS, 'email provider');
  } catch (error) {
    await prisma.publicContact.update({
      where: { id: stored.contactId },
      data: { notificationStatus: 'failed', notificationAttempts: { increment: 1 }, notificationError: 'Notification delivery failed' },
    });
    throw error;
  }
  await prisma.publicContact.update({
    where: { id: stored.contactId },
    data: { notificationStatus: 'sent', notificationAttempts: { increment: 1 }, notifiedAt: new Date(), notificationError: null },
  });
}
