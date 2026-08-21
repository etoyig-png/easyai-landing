import { createHmac, timingSafeEqual } from 'crypto';

interface Payload { sessionId: string; expiresAt: number }
export const SESSION_CAPABILITY_TTL_MS = 24 * 60 * 60 * 1000;

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
