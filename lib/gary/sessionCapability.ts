import { createHmac, timingSafeEqual } from 'crypto';

interface Payload { sessionId: string; expiresAt: number }
export const SESSION_CAPABILITY_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * TRANSITIONAL COMPATIBILITY: the fallback to GARY_HANDOFF_TOKEN_SECRET is deliberate and is
 * retained until every environment sets GARY_SESSION_CAPABILITY_SECRET. Removing it now would
 * make Gary fail closed — and go offline — in any environment provisioned before this variable
 * existed. Sharing a value is safe because `sign()` domain-separates with a "gary-session:"
 * prefix, so a capability signature can never be confused with a handoff-token signature.
 * See SECURITY_LEDGER.md (EAI-A-01). Production configuration remains UNVERIFIED.
 */
function secret(): string {
  const value = process.env.GARY_SESSION_CAPABILITY_SECRET ?? process.env.GARY_HANDOFF_TOKEN_SECRET;
  if (!value) throw new Error('Gary session capability secret is not configured.');
  return value;
}
function sign(value: string): string {
  return createHmac('sha256', secret()).update(`gary-session:${value}`).digest('base64url');
}
export function createSessionCapability(sessionId: string, expiresAt = Date.now() + SESSION_CAPABILITY_TTL_MS): string {
  const encoded = Buffer.from(JSON.stringify({ sessionId, expiresAt } satisfies Payload)).toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}
export function verifySessionCapability(token: string, sessionId: string): boolean {
  const parts = token?.split('.') ?? [];
  if (parts.length !== 2) return false;
  const expected = Buffer.from(sign(parts[0]));
  const supplied = Buffer.from(parts[1]);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString()) as Partial<Payload>;
    return payload.sessionId === sessionId && typeof payload.expiresAt === 'number' && payload.expiresAt >= Date.now();
  } catch { return false; }
}
