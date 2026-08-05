import { createHmac, timingSafeEqual } from 'crypto';

export interface HandoffTokenPayload {
  sessionId: string;
  allowedFields: string[];
  expiresAt: number; // epoch ms
}

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getSecret(): string {
  const secret = process.env.GARY_HANDOFF_TOKEN_SECRET;
  if (!secret) throw new Error('GARY_HANDOFF_TOKEN_SECRET is not set.');
  return secret;
}

function sign(data: string): string {
  return createHmac('sha256', getSecret()).update(data).digest('base64url');
}

/** Builds `<base64url payload>.<base64url signature>`. No JWT library — this repo has none, and a single HMAC-signed payload needs nothing heavier. */
export function createHandoffToken(sessionId: string, allowedFields: string[]): string {
  const payload: HandoffTokenPayload = { sessionId, allowedFields, expiresAt: Date.now() + TOKEN_TTL_MS };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function hashToken(token: string): string {
  return createHmac('sha256', getSecret()).update(token).digest('base64url');
}

export type VerifyResult = { valid: true; payload: HandoffTokenPayload } | { valid: false; reason: string };

export function verifyHandoffToken(token: string): VerifyResult {
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false, reason: 'malformed token' };
  const [encodedPayload, signature] = parts;

  const expectedSignature = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return { valid: false, reason: 'invalid signature' };
  }

  let payload: HandoffTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8'));
  } catch {
    return { valid: false, reason: 'unparseable payload' };
  }

  if (typeof payload.expiresAt !== 'number' || Date.now() > payload.expiresAt) {
    return { valid: false, reason: 'expired' };
  }

  return { valid: true, payload };
}
