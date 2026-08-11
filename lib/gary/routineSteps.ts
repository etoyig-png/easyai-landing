import type { GaryPose } from '@/components/gary/GaryCharacter';

// Locked routine timing (ms). Each entry is how long that pose holds before the next one starts.
// jump -> wave -> point (the "waiting to see whether the visitor responds" beat) -> frustrated
// -> a brief neutral pause -> idea -> sign (raise/read beat) -> signPoint (points toward the
// chat button) -> signWave (sign stays up while Gary waves) -> lowering -> back to seated.
// The physical sign itself (rendered for 'sign' | 'signPoint' | 'signWave' | 'lowering' in
// GaryLauncher.tsx) stays continuously visible for sign+signPoint+signWave = 1500+1500+3000 =
// 6000ms before lowering starts, comfortably past the 5000ms minimum a visitor needs to actually
// read it.
//
// Pulled out of GaryLauncher.tsx (a 'use client' component with JSX) into its own plain .ts
// module specifically so GaryLauncher.test.ts can import and assert on these real values
// directly — this project's Vitest config has no JSX/TSX transform plugin wired up, so importing
// a .tsx file from a .test.ts file fails outright. A fake-clock Playwright test that instead
// tries to *measure* this duration by chaining many small page.clock.fastForward() calls is also
// vulnerable to drift over the routine's ~19s span (confirmed empirically: measured holds came
// back ~25% short of these real values), so this direct unit test is the actual source of truth.
export const ROUTINE_STEPS: Array<{ pose: GaryPose; holdMs: number }> = [
  { pose: 'jump', holdMs: 700 },
  { pose: 'wave', holdMs: 1600 },
  { pose: 'point', holdMs: 1200 },
  { pose: 'wait', holdMs: 1400 },
  { pose: 'frustrated', holdMs: 1400 },
  { pose: 'seated', holdMs: 600 },
  { pose: 'idea', holdMs: 700 },
  { pose: 'sign', holdMs: 1500 },
  { pose: 'signPoint', holdMs: 1500 },
  { pose: 'signWave', holdMs: 3000 },
  { pose: 'lowering', holdMs: 600 }
];
