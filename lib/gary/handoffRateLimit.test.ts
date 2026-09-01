import { beforeEach, describe, expect, it } from 'vitest';
import { isHandoffRateLimited, resetHandoffRateLimits } from './handoffRateLimit';
describe('handoff rate limit', () => {
  beforeEach(resetHandoffRateLimits);
  it('allows ordinary retries and limits rapid abuse', () => {
    for (let index = 0; index < 6; index += 1) expect(isHandoffRateLimited('session', 1_000)).toBe(false);
    expect(isHandoffRateLimited('session', 1_000)).toBe(true);
  });
  it('isolates sessions and resets after the window', () => {
    for (let index = 0; index < 6; index += 1) isHandoffRateLimited('one', 1_000);
    expect(isHandoffRateLimited('two', 1_000)).toBe(false);
    expect(isHandoffRateLimited('one', 61_001)).toBe(false);
  });
});
