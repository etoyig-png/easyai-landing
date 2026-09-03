import { prisma } from './prisma';
import type { AssessmentSubmission } from './validation';

const WINDOW_MS = 60 * 60 * 1000;
const EMAIL_COOLDOWN_MS = 10 * 60 * 1000;
const MAX_SUBMISSIONS = 3;

export type AdmissionResult = { kind: 'created' | 'duplicate'; submission: { id: string } } | { kind: 'limited' };

/** One database transaction protects both the hourly limit and duplicate-cost cooldown. */
export async function admitAssessment(data: AssessmentSubmission, identity: string): Promise<AdmissionResult> {
  return prisma.$transaction(async (tx) => {
    // Separate locks protect both invariants: every request sharing a rate-limit
    // identity serializes, and the same recipient serializes across identities.
    const emailKey = `email:${data.email.toLowerCase()}`;
    const identityKey = `identity:${identity}`;
    // PostgreSQL returns void from pg_advisory_xact_lock. Cast it so Prisma can
    // deserialize the result while the transaction-scoped lock is acquired.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${identityKey}))::text`;
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${emailKey}))::text`;
    const now = Date.now();
    const duplicate = await tx.submission.findFirst({
      where: { email: { equals: data.email, mode: 'insensitive' }, status: { in: ['pending', 'completed'] }, createdAt: { gte: new Date(now - EMAIL_COOLDOWN_MS) } },
      orderBy: { createdAt: 'desc' }, select: { id: true },
    });
    if (duplicate) return { kind: 'duplicate', submission: duplicate } as const;
    const count = await tx.submission.count({ where: { ipAddress: identity, createdAt: { gte: new Date(now - WINDOW_MS) } } });
    if (count >= MAX_SUBMISSIONS) return { kind: 'limited' } as const;
    const submission = await tx.submission.create({ data: {
      workSituation: data.workSituation, usingAiTools: data.usingAiTools, aiChallenge: data.aiChallenge,
      desiredOutcome: data.desiredOutcome, timeDrain: data.timeDrain, privacyConcern: data.privacyConcern,
      industry: data.industry, industryOther: data.industryOther, leadResponse: data.leadResponse,
      sportsFan: data.sportsFan, favoriteTeam: data.favoriteTeam,
      firstName: data.firstName, lastName: data.lastName, businessName: data.businessName,
      email: data.email, websiteUrl: data.websiteUrl, noWebsite: data.noWebsite,
      funnelCorrelationId: data.funnelCorrelationId, ipAddress: identity,
    }, select: { id: true } });
    return { kind: 'created', submission } as const;
  }, { isolationLevel: 'Serializable' });
}
