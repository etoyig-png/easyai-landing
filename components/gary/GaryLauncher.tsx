'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { hasPlayedLaunchAnimation, markLaunchAnimationPlayed } from '@/lib/gary/clientSession';
import GaryCharacter, { type GaryPose } from './GaryCharacter';

// The chat panel (and its network/session logic) is only loaded once the visitor opens it —
// initial page rendering never downloads the heavier chat bundle. Gary's own character is plain
// inline SVG + CSS (no image request, negligible byte size), so it doesn't need its own lazy
// boundary — it renders as soon as the launch delay elapses, same as before.
const GaryPanel = dynamic(() => import('./GaryPanel'), { ssr: false });

const LAUNCH_DELAY_MS = 5000;

// Locked routine timing (ms). Each entry is how long that pose holds before the next one starts.
// jump -> wave -> point (the "waiting to see whether the visitor responds" beat) -> frustrated
// -> a brief neutral pause -> idea -> sign (held long enough to actually read) -> lowering ->
// back to seated. Total run time is under 12s, matching a one-time attention beat rather than
// something that lingers.
const ROUTINE_STEPS: Array<{ pose: GaryPose; holdMs: number }> = [
  { pose: 'jump', holdMs: 700 },
  { pose: 'wave', holdMs: 1600 },
  { pose: 'point', holdMs: 2600 },
  { pose: 'frustrated', holdMs: 1400 },
  { pose: 'seated', holdMs: 600 },
  { pose: 'idea', holdMs: 700 },
  { pose: 'sign', holdMs: 2800 },
  { pose: 'lowering', holdMs: 600 },
];

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const handler = () => setReduced(query.matches);
    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }, []);
  return reduced;
}

export default function GaryLauncher() {
  const [visible, setVisible] = useState(false);
  const [entering, setEntering] = useState(false);
  const [open, setOpen] = useState(false);
  const [pose, setPose] = useState<GaryPose>('seated');
  const [routineFinished, setRoutineFinished] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const timers = useRef<number[]>([]);

  function clearScheduledTimers() {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }

  function runRoutine() {
    let elapsed = 0;
    ROUTINE_STEPS.forEach((step) => {
      const id = window.setTimeout(() => setPose(step.pose), elapsed);
      timers.current.push(id);
      elapsed += step.holdMs;
    });
    // Step 20: after lowering the sign, Gary sits beneath the chat button — the routine's own
    // last pose ('lowering') is transient, so explicitly land back on 'seated' rather than
    // leaving the sign-lowering pose as the permanent resting state.
    const finishId = window.setTimeout(() => {
      setPose('seated');
      setRoutineFinished(true);
    }, elapsed);
    timers.current.push(finishId);
  }

  // Runs once, LAUNCH_DELAY_MS after mount: reveal the button + Gary, then either play the full
  // locked routine (first time this session, motion allowed) or go straight to the seated
  // resting state (repeat page load this session, or prefers-reduced-motion).
  //
  // Reduced motion is read directly from matchMedia here rather than through the reducedMotion
  // state/closure above: this effect has an empty dependency array (runs once, at mount), so its
  // callback closure would otherwise permanently capture whatever reducedMotion happened to be
  // during the very first render — always false, since usePrefersReducedMotion's own effect
  // hasn't had a chance to run and update state yet at that point. That stale-false capture is
  // realistic, not just a test artifact: it means a real visitor with the OS/browser reduced-
  // motion setting on would still see the full routine every time, which is exactly what this
  // whole effect exists to prevent — an actual behavioral bug caught by testing this with
  // page.emulateMedia(), not just a lint nitpick.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(true);
      setEntering(true);
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const alreadyPlayed = hasPlayedLaunchAnimation();
      if (prefersReducedMotion || alreadyPlayed) {
        setPose('seated');
        setRoutineFinished(true);
        if (!alreadyPlayed) markLaunchAnimationPlayed();
        return;
      }
      markLaunchAnimationPlayed();
      runRoutine();
    }, LAUNCH_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      clearScheduledTimers();
    };
    // Intentionally runs once on mount — the delay and once-per-session check are both evaluated
    // at that single point, not re-derived on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Opening the chat interrupts whatever part of the routine is still playing (jump/wave/point/
  // frustrated/idea/sign) — the visitor responded, so there's nothing left to demonstrate.
  // Closing it always resumes the safe seated state, never mid-routine.
  useEffect(() => {
    if (!open) return;
    clearScheduledTimers();
    setPose('seated');
    setRoutineFinished(true);
  }, [open]);

  if (!visible) return null;

  const idleGlanceActive = pose === 'seated' && routineFinished && !open && !reducedMotion;

  return (
    <div
      className="fixed z-50 flex flex-col items-end gap-1.5"
      style={{
        right: 'max(1rem, env(safe-area-inset-right))',
        bottom: 'max(1rem, env(safe-area-inset-bottom))',
      }}
    >
      {/* Name label sits BESIDE the button, not stacked below the character — keeps the
          launcher's total vertical footprint small enough that it doesn't sit on top of page
          content on short mobile viewports (measured and fixed: a stacked label added enough
          height to overlap the hero's own CTA button on a 375x812 viewport). */}
      <div className="flex items-center gap-2">
        {!open && (
          <span className="whitespace-nowrap rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-navy-900 shadow-sm">
            Gary from Accounting
          </span>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Chat with Gary from Accounting"
          className="flex flex-shrink-0 items-center justify-center rounded-full bg-navy-900 text-white shadow-lg transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-silver"
          style={{ width: 'clamp(44px, 9vw, 56px)', height: 'clamp(44px, 9vw, 56px)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>

      {!open && (
        <div className="relative">
          <p
            className={`gary-sign-text absolute right-0 top-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-navy-900 shadow-lg ${pose === 'sign' ? 'is-visible' : ''}`}
          >
            The button. Up there.
          </p>
          <div className={`gary-character-wrap${entering ? ' gary-entering' : ''}`} aria-hidden="true">
            <GaryCharacter pose={pose} idleGlanceActive={idleGlanceActive} />
          </div>
        </div>
      )}

      {open && <GaryPanel onClose={() => setOpen(false)} />}
    </div>
  );
}
