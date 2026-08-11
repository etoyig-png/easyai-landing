'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { hasPlayedLaunchAnimation, markLaunchAnimationPlayed } from '@/lib/gary/clientSession';
import { ROUTINE_STEPS } from '@/lib/gary/routineSteps';
import GaryCharacter, { type GaryPose } from './GaryCharacter';

// The chat panel (and its network/session logic) is only loaded once the visitor opens it —
// initial page rendering never downloads the heavier chat bundle. Gary's own character is plain
// inline SVG + CSS (no image request, negligible byte size), so it doesn't need its own lazy
// boundary — it renders as soon as the launch delay elapses, same as before.
const GaryPanel = dynamic(() => import('./GaryPanel'), { ssr: false });

const LAUNCH_DELAY_MS = 5000;

// Locked routine timing lives in lib/gary/routineSteps.ts (a plain .ts module, not this 'use
// client' component) specifically so it can be imported directly by a Vitest unit test — see that
// file's own comment for why that matters more than it might seem.

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

const SIGN_RELATED_POSES: GaryPose[] = ['sign', 'signPoint', 'signWave', 'lowering'];

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
    setEntering(false);
    setPose('seated');
    setRoutineFinished(true);
  }, [open]);

  if (!visible) return null;

  const idleGlanceActive = pose === 'seated' && routineFinished && !open && !reducedMotion;
  // Message behavior follows Gary's pose, never viewport geometry. Real conditional rendering
  // fully removes the intro bubble while Gary is holding or lowering the physical sign, ensuring
  // there is exactly one white message element at every screen size.
  const showIntroBubble = !open && !SIGN_RELATED_POSES.includes(pose);

  return (
    <div
      // gary-launcher--idle disables pointer-events on the whole container (re-enabled only on
      // the button, see globals.css) so an empty area of this box — which extends over both the
      // button and the purely decorative character/sign — never swallows a click meant for page
      // content behind/around it. Applied only while the panel is closed: GaryPanel (a DOM child
      // of this same container while open) is a fully interactive modal, and pointer-events is
      // inherited, so unconditionally disabling it here would silently break every control
      // inside the open chat panel.
      className={`gary-launcher fixed z-50${!open ? ' gary-launcher--idle' : ''}`}
      style={{
        right: 'max(1rem, env(safe-area-inset-right))',
        bottom: 'max(1rem, env(safe-area-inset-bottom))',
      }}
    >
      {/* Speech bubble sits BESIDE the button, not stacked below the character — keeps the
          launcher's total vertical footprint small enough that it doesn't sit on top of page
          content on short mobile viewports (measured and fixed: a stacked label added enough
          height to overlap the hero's own CTA button on a 375x812 viewport). On compact mobile
          it's also absolutely positioned out of this row entirely (see globals.css). */}
      <div className="flex items-center gap-2">
        {showIntroBubble && (
          <div className="gary-speech-bubble" data-testid="gary-speech-bubble">
            Hi! I&apos;m Gary from Accounting
          </div>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Chat with Gary from Accounting"
          className="gary-chat-button flex flex-shrink-0 items-center justify-center rounded-full bg-green-600 text-white shadow-lg transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-silver"
          style={{ width: 'clamp(56px, 11vw, 64px)', height: 'clamp(56px, 11vw, 64px)' }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8" aria-hidden="true">
            <path d="M4.5 3h15A2.5 2.5 0 0 1 22 5.5v10a2.5 2.5 0 0 1-2.5 2.5H9l-5.8 4.1a.75.75 0 0 1-1.18-.61V5.5A2.5 2.5 0 0 1 4.5 3Zm2.75 6.25a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm4.75 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm4.75 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Z" />
          </svg>
        </button>
      </div>

      {!open && (
        <div className="gary-decorative-cluster relative">
          {(pose === 'sign' || pose === 'signPoint' || pose === 'signWave' || pose === 'lowering') && (
            <div
              className={`gary-sign-board${pose === 'lowering' ? ' is-lowering' : ''}`}
              aria-hidden="false"
            >
              <span className="gary-sign-copy">The button. Up there.</span>
            </div>
          )}
          <div
            className={`gary-character-wrap${entering ? ' gary-entering' : ''}`}
            aria-hidden="true"
            onAnimationEnd={() => setEntering(false)}
          >
            <GaryCharacter pose={pose} idleGlanceActive={idleGlanceActive} />
          </div>
        </div>
      )}

      {open && <GaryPanel onClose={() => setOpen(false)} />}
    </div>
  );
}
