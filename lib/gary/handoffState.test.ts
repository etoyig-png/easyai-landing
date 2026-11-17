import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

process.env.GARY_HANDOFF_TOKEN_SECRET = 'unit-test-handoff-secret';

import { HANDOFF_TTL_MS, resolveHandoffState, type HandoffTransaction } from './handoffState';
import { createHandoffToken, hashToken, verifyHandoffToken } from './handoffToken';

const SESSION_ID = 'session-1';
const NOW = 1_760_000_000_000;
const FIELDS = ['firstName', 'businessName', 'email'];

function storedHandoff(overrides: Partial<{ fields: unknown; expiresAt: Date; signedTokenHash: string }> = {}) {
  const expiresAt = overrides.expiresAt ?? new Date(NOW + HANDOFF_TTL_MS);
  const fields = 'fields' in overrides ? overrides.fields : FIELDS;
  const signedTokenHash =
    overrides.signedTokenHash ?? hashToken(createHandoffToken(SESSION_ID, fields as string[], expiresAt.getTime()));
  return { allowedPrefillFields: fields, expiresAt, signedTokenHash };
}

function makeTx(existing: ReturnType<typeof storedHandoff> | null, sessionStatus = 'active') {
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    publicChatSession: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({ status: sessionStatus }),
      update: vi.fn().mockResolvedValue({}),
    },
    assessmentHandoff: {
      findUnique: vi.fn().mockResolvedValue(existing),
      upsert: vi.fn().mockResolvedValue({}),
    },
  };
  return tx as unknown as HandoffTransaction & typeof tx;
}

describe('handoff state resolution', () => {
  // verifyHandoffToken checks expiry against the real clock, so pin it to the same
  // instant the fixtures are built at.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it('takes the session advisory lock before reading state', async () => {
    const tx = makeTx(null);
    await resolveHandoffState(tx, SESSION_ID, FIELDS, NOW);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
  });

  describe('reusing an unexpired handoff', () => {
    it('returns a token that verifies and carries the stored session and fields', async () => {
      const tx = makeTx(storedHandoff());
      const state = await resolveHandoffState(tx, SESSION_ID, FIELDS, NOW);

      expect(state.reused).toBe(true);
      const verified = verifyHandoffToken(state.token);
      expect(verified.valid).toBe(true);
      if (!verified.valid) throw new Error('unreachable');
      expect(verified.payload.sessionId).toBe(SESSION_ID);
      expect(verified.payload.allowedFields).toEqual(FIELDS);
    });

    it('produces a token whose hash matches the already-stored hash', async () => {
      const existing = storedHandoff();
      const tx = makeTx(existing);
      const state = await resolveHandoffState(tx, SESSION_ID, FIELDS, NOW);
      expect(hashToken(state.token)).toBe(existing.signedTokenHash);
    });

    it('preserves the original expiry rather than extending it', async () => {
      const expiresAt = new Date(NOW + 90_000);
      const tx = makeTx(storedHandoff({ expiresAt }));
      const state = await resolveHandoffState(tx, SESSION_ID, FIELDS, NOW);
      const verified = verifyHandoffToken(state.token);
      if (!verified.valid) throw new Error('expected a valid token');
      expect(verified.payload.expiresAt).toBe(expiresAt.getTime());
      expect(verified.payload.expiresAt).toBeLessThan(NOW + HANDOFF_TTL_MS);
    });

    it('preserves the stored fields even when the caller now computes different ones', async () => {
      const tx = makeTx(storedHandoff());
      const state = await resolveHandoffState(tx, SESSION_ID, ['firstName'], NOW);
      const verified = verifyHandoffToken(state.token);
      if (!verified.valid) throw new Error('expected a valid token');
      expect(verified.payload.allowedFields).toEqual(FIELDS);
      expect(tx.assessmentHandoff.upsert).not.toHaveBeenCalled();
    });

    it('does not repeat the expensive summary/funnel work on a second call', async () => {
      const tx = makeTx(storedHandoff(), 'handed_off_to_assessment');
      const state = await resolveHandoffState(tx, SESSION_ID, FIELDS, NOW);
      expect(state.firstHandoff).toBe(false);
      expect(tx.publicChatSession.update).not.toHaveBeenCalled();
    });

    it('marks the very first handoff so the summary runs exactly once', async () => {
      const tx = makeTx(null);
      const state = await resolveHandoffState(tx, SESSION_ID, FIELDS, NOW);
      expect(state.firstHandoff).toBe(true);
      expect(tx.publicChatSession.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('rotating instead of silently issuing an unusable token', () => {
    it.each([
      ['a reordered stored field array', storedHandoff({ signedTokenHash: hashToken(createHandoffToken(SESSION_ID, ['email', 'firstName', 'businessName'], NOW + HANDOFF_TTL_MS)) })],
      ['a drifted stored expiry', storedHandoff({ signedTokenHash: 'hash-of-some-other-expiry' })],
      ['a non-array stored field value', storedHandoff({ fields: { firstName: true } })],
      ['a non-string entry in the stored fields', storedHandoff({ fields: ['firstName', 42] })],
      ['a partially written row with an empty hash', storedHandoff({ signedTokenHash: '' })],
    ])('mints a fresh, consumable handoff when state has drifted: %s', async (_label, existing) => {
      const tx = makeTx(existing);
      const state = await resolveHandoffState(tx, SESSION_ID, FIELDS, NOW);

      expect(state.reused).toBe(false);
      expect(tx.assessmentHandoff.upsert).toHaveBeenCalledTimes(1);

      // The token handed to the visitor must match what was just persisted, or
      // /api/gary/handoff/consume would reject it.
      const persisted = tx.assessmentHandoff.upsert.mock.calls[0][0] as {
        create: { signedTokenHash: string; allowedPrefillFields: string[]; expiresAt: Date };
      };
      expect(persisted.create.signedTokenHash).toBe(hashToken(state.token));
      expect(persisted.create.allowedPrefillFields).toEqual(FIELDS);
      expect(verifyHandoffToken(state.token).valid).toBe(true);
    });

    it('rotates an expired handoff onto a fresh full TTL', async () => {
      const tx = makeTx(storedHandoff({ expiresAt: new Date(NOW - 1) }));
      const state = await resolveHandoffState(tx, SESSION_ID, FIELDS, NOW);
      expect(state.reused).toBe(false);
      const verified = verifyHandoffToken(state.token);
      if (!verified.valid) throw new Error('expected a valid token');
      expect(verified.payload.expiresAt).toBe(NOW + HANDOFF_TTL_MS);
    });

    it('creates the first handoff when none exists', async () => {
      const tx = makeTx(null);
      const state = await resolveHandoffState(tx, SESSION_ID, FIELDS, NOW);
      expect(state.reused).toBe(false);
      expect(tx.assessmentHandoff.upsert).toHaveBeenCalledTimes(1);
      expect(hashToken(state.token)).toBe(
        hashToken(createHandoffToken(SESSION_ID, FIELDS, NOW + HANDOFF_TTL_MS)),
      );
    });
  });
});
