import { describe, expect, it } from 'vitest';
import { ROUTINE_STEPS } from './routineSteps';

// This is the real source of truth for the sign-visibility timing requirement — an e2e test that
// tries to measure it via Playwright's fake clock is vulnerable to fastForward() drift over many
// chained calls (confirmed empirically: measured holds came back ~25% short over the full ~19s
// routine). Reading the actual scheduled holdMs values directly has no such drift.

function holdMsFor(pose: string): number {
  const step = ROUTINE_STEPS.find((s) => s.pose === pose);
  if (!step) throw new Error(`no ROUTINE_STEPS entry for pose "${pose}"`);
  return step.holdMs;
}

describe('ROUTINE_STEPS — sign hold timing', () => {
  it('keeps the physical sign (sign + signPoint + signWave) visible for at least 5000ms before lowering', () => {
    const holdMs = holdMsFor('sign') + holdMsFor('signPoint') + holdMsFor('signWave');
    expect(holdMs).toBeGreaterThanOrEqual(5000);
  });

  it('targets approximately 5.5-6s total sign-visible time, per the requested timing concept', () => {
    const holdMs = holdMsFor('sign') + holdMsFor('signPoint') + holdMsFor('signWave');
    expect(holdMs).toBeGreaterThanOrEqual(5500);
    expect(holdMs).toBeLessThanOrEqual(6500);
  });

  it('does not count the lowering transition toward the 5000ms minimum', () => {
    // lowering is intentionally short (a quick fade/slide-out), separate from the read/point/wave
    // beats that make up the "sign is genuinely up and readable" duration.
    expect(holdMsFor('lowering')).toBeLessThan(1000);
  });

  it('gives the sign a real raise/read beat before pointing (matches the requested ~1.5s concept)', () => {
    expect(holdMsFor('sign')).toBeGreaterThanOrEqual(1200);
  });

  it('gives the pointing gesture a real, readable beat (matches the requested ~1.5s concept)', () => {
    expect(holdMsFor('signPoint')).toBeGreaterThanOrEqual(1200);
  });

  it('gives the wave several full seconds while the sign remains up (matches the requested ~3s concept)', () => {
    expect(holdMsFor('signWave')).toBeGreaterThanOrEqual(2500);
  });

  it('every pose GaryLauncher.tsx renders the sign board for appears in ROUTINE_STEPS exactly once', () => {
    for (const pose of ['sign', 'signPoint', 'signWave', 'lowering']) {
      const matches = ROUTINE_STEPS.filter((s) => s.pose === pose);
      expect(matches, `expected exactly one "${pose}" step`).toHaveLength(1);
    }
  });
});
