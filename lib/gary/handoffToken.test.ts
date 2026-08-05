import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHandoffToken, verifyHandoffToken } from './handoffToken';

beforeEach(() => {
  process.env.GARY_HANDOFF_TOKEN_SECRET = 'test-secret-value';
});

afterEach(() => {
  delete process.env.GARY_HANDOFF_TOKEN_SECRET;
  vi.useRealTimers();
});

describe('createHandoffToken / verifyHandoffToken', () => {
  it('round-trips a valid token', () => {
    const token = createHandoffToken('session-1', ['firstName', 'email']);
    const result = verifyHandoffToken(token);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.payload.sessionId).toBe('session-1');
      expect(result.payload.allowedFields).toEqual(['firstName', 'email']);
    }
  });

  it('rejects a tampered payload', () => {
    const token = createHandoffToken('session-1', ['firstName']);
    const [payload, signature] = token.split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({ sessionId: 'session-2', allowedFields: ['firstName'], expiresAt: Date.now() + 10000 })).toString(
      'base64url'
    );
    const tampered = `${tamperedPayload}.${signature}`;
    const result = verifyHandoffToken(tampered);
    expect(result.valid).toBe(false);
  });

  it('rejects a tampered signature', () => {
    const token = createHandoffToken('session-1', ['firstName']);
    const [payload] = token.split('.');
    const result = verifyHandoffToken(`${payload}.not-a-real-signature`);
    expect(result.valid).toBe(false);
  });

  it('rejects an expired token', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const token = createHandoffToken('session-1', ['firstName']);
    vi.setSystemTime(new Date('2026-01-01T01:00:00Z')); // 1 hour later, past the 30-minute TTL
    const result = verifyHandoffToken(token);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('expired');
  });

  it('rejects a malformed token', () => {
    expect(verifyHandoffToken('not-a-valid-token').valid).toBe(false);
  });
});
