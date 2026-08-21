import { describe, expect, it } from 'vitest';
import { createSessionCapability, verifySessionCapability } from './sessionCapability';

process.env.GARY_SESSION_CAPABILITY_SECRET = 'unit-test-secret';
describe('session capability', () => {
  it('authorizes only its session', () => {
    const token = createSessionCapability('one');
    expect(verifySessionCapability(token, 'one')).toBe(true);
    expect(verifySessionCapability(token, 'two')).toBe(false);
  });
  it.each(['', 'malformed', 'a.b.c'])('rejects missing/malformed tokens', (token) => expect(verifySessionCapability(token, 'one')).toBe(false));
  it('rejects forged and expired tokens', () => {
    const token = createSessionCapability('one');
    expect(verifySessionCapability(`${token.slice(0, -1)}x`, 'one')).toBe(false);
    expect(verifySessionCapability(createSessionCapability('one', Date.now() - 1), 'one')).toBe(false);
  });
});
