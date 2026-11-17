import { createHash } from 'crypto';
import { prisma } from './prisma';

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_CONTACT_MESSAGES_PER_WINDOW = 3;

/**
 * Rate limit for the public contact form.
 *
 * WHY THIS EXISTS AT ALL: isRateLimited() in lib/rateLimit.ts counts rows in the assessment
 * Submission table, and isGaryRateLimited() counts chat messages. A contact message creates
 * neither, so both of those would have counted zero contact traffic forever. A visitor with
 * no assessment history could have sent contact messages without limit. This counts the thing
 * it is actually limiting.
 *
 * PRIVACY: only a one-way SHA-256 hash of the client identity is stored. The raw address is
 * never written to this table, because recognising the same caller inside the window is all
 * the limiter needs.
 */
function hashIdentity(identity: string): string {
  return createHash('sha256').update(identity).digest('hex');
}

export type ContactAdmission = { kind: 'accepted' } | { kind: 'limited' };

/**
 * Counts this caller's recent attempts and records the current one, atomically.
 *
 * CONCURRENCY: the count and the insert happen inside one Serializable transaction that first
 * takes a transaction-scoped PostgreSQL advisory lock on the caller's hash. Requests sharing
 * an identity therefore serialize on that lock, so two simultaneous requests cannot both read
 * "2 so far" and both proceed. This is the same mechanism admitAssessment() already uses, not
 * a new invention. Process memory is deliberately not used: Vercel Functions do not share it.
 *
 * The attempt is recorded BEFORE the provider is called, so a failing provider cannot be
 * hammered by retries. A caller who burns their budget on failed sends has still used it.
 *
 * Throws on a storage failure rather than returning a verdict, so the caller fails closed
 * instead of treating a broken limiter as permission to send.
 */
export async function admitContactMessage(identity: string): Promise<ContactAdmission> {
  if (!identity) return { kind: 'limited' };
  const ipHash = hashIdentity(identity);

  return prisma.$transaction(async (tx) => {
    // PostgreSQL returns void from pg_advisory_xact_lock. Cast it so Prisma can deserialize
    // the result while the transaction-scoped lock is held.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`contact:${ipHash}`}))::text`;

    const count = await tx.contactRateLimitEvent.count({
      where: { ipHash, createdAt: { gte: new Date(Date.now() - WINDOW_MS) } },
    });
    if (count >= MAX_CONTACT_MESSAGES_PER_WINDOW) return { kind: 'limited' } as const;

    await tx.contactRateLimitEvent.create({ data: { ipHash } });
    return { kind: 'accepted' } as const;
  }, { isolationLevel: 'Serializable' });
}
