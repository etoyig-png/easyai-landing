import { createHandoffToken, hashToken } from './handoffToken';

export const HANDOFF_TTL_MS = 30 * 60 * 1000;

interface StoredHandoff {
  signedTokenHash: string;
  allowedPrefillFields: unknown;
  expiresAt: Date;
}

/** The subset of the Prisma transaction client this resolver needs. */
export interface HandoffTransaction {
  $queryRaw(strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
  publicChatSession: {
    findUniqueOrThrow(args: { where: { id: string } }): Promise<{ status: string }>;
    update(args: unknown): Promise<unknown>;
  };
  assessmentHandoff: {
    findUnique(args: { where: { sessionId: string } }): Promise<StoredHandoff | null>;
    upsert(args: unknown): Promise<unknown>;
  };
}

export interface HandoffState {
  token: string;
  firstHandoff: boolean;
  reused: boolean;
}

/**
 * Reuses an unexpired handoff instead of rotating it on every click, so a repeated legitimate
 * call does not invalidate the token the visitor is already carrying or repeat the expensive
 * summary/funnel work gated on `firstHandoff`.
 *
 * Reuse works by regenerating the token from stored state, which is only correct while that
 * regeneration is byte-identical to the original. Rather than leaving that determinism implicit,
 * the regenerated token is checked against the stored hash: if anything about the stored state
 * has drifted (field order, timestamp precision, a partial write), the mismatch is detected here
 * and a fresh handoff is minted. The endpoint therefore never hands the visitor a token that
 * /api/gary/handoff/consume would reject.
 */
export async function resolveHandoffState(
  tx: HandoffTransaction,
  sessionId: string,
  allowedFields: string[],
  now = Date.now(),
): Promise<HandoffState> {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${sessionId}))`;
  const currentSession = await tx.publicChatSession.findUniqueOrThrow({ where: { id: sessionId } });
  const existing = await tx.assessmentHandoff.findUnique({ where: { sessionId } });

  let token: string | null = null;
  const storedFields = existing?.allowedPrefillFields;
  if (
    existing &&
    existing.expiresAt.getTime() >= now &&
    Array.isArray(storedFields) &&
    storedFields.every((field): field is string => typeof field === 'string')
  ) {
    const candidate = createHandoffToken(sessionId, storedFields, existing.expiresAt.getTime());
    if (hashToken(candidate) === existing.signedTokenHash) token = candidate;
  }

  const reused = token !== null;
  if (!token) {
    const expiresAt = new Date(now + HANDOFF_TTL_MS);
    token = createHandoffToken(sessionId, allowedFields, expiresAt.getTime());
    await tx.assessmentHandoff.upsert({
      where: { sessionId },
      create: { sessionId, signedTokenHash: hashToken(token), allowedPrefillFields: allowedFields as never, expiresAt },
      update: { signedTokenHash: hashToken(token), allowedPrefillFields: allowedFields as never, expiresAt, consumedAt: null },
    });
  }

  const firstHandoff = currentSession.status !== 'handed_off_to_assessment';
  if (firstHandoff) {
    await tx.publicChatSession.update({ where: { id: sessionId }, data: { status: 'handed_off_to_assessment', handedOffAt: new Date(now) } });
  }

  return { token, firstHandoff, reused };
}
