'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import GaryCharacter, { type GaryPose } from './GaryCharacter';

// The chat panel (and its network/session logic) is only loaded once the visitor opens it —
// initial page rendering never downloads the heavier chat bundle. Gary's own character is plain
// a cached illustrated sprite sheet displayed after the existing launch delay, with no extra lazy
// boundary — it renders as soon as the launch delay elapses, same as before.
const GaryPanel = dynamic(() => import('./GaryPanel'), { ssr: false });

const LAUNCH_DELAY_MS = 5000;

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
  const pathname = usePathname();
  const [homeSlot, setHomeSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 767px)');
    const locate = () => setHomeSlot(mobile.matches ? document.getElementById('gary-home-slot') : null);
    locate();
    mobile.addEventListener('change', locate);
    return () => mobile.removeEventListener('change', locate);
  }, [pathname]);
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [pose, setPose] = useState<GaryPose>('seated');
  const [routineFinished, setRoutineFinished] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const [videoStarted, setVideoStarted] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  async function playGary() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    if (videoFailed) video.load();
    setVideoFailed(false);
    try { await video.play(); } catch { setVideoStarted(false); }
  }
  const launchTimer = useRef<number>();

  function runRoutine() { setVideoPlaying(true); }

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
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) {
        setPose('seated');
        setRoutineFinished(true);
        return;
      }
      runRoutine();
    }, LAUNCH_DELAY_MS);
    launchTimer.current = timer;
    return () => {
      window.clearTimeout(timer);

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
    window.clearTimeout(launchTimer.current);
    setVideoPlaying(false);
    setPose('seated');
    setRoutineFinished(true);
  }, [open]);

  // Progressive enhancement: server-rendered contact links also work without JavaScript.
  useEffect(() => {
    const openFromPage = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest('a[data-open-gary]')) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      setVisible(true);
      setOpen(true);
    };
    document.addEventListener('click', openFromPage);
    return () => document.removeEventListener('click', openFromPage);
  }, []);

  if (!visible) return null;

  const idleGlanceActive = pose === 'seated' && routineFinished && !open && !reducedMotion;
  // Message behavior follows Gary's pose, never viewport geometry. Real conditional rendering
  // fully removes the intro bubble while Gary is holding or lowering the physical sign, ensuring
  // there is exactly one white message element at every screen size.
  const showIntroBubble = !open && videoPlaying && videoStarted && !reducedMotion && videoTime >= 2 && videoTime < 8;

  const launcher = (
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
      {/* Universal top row: the speech bubble stays to the left of the green button on every
          viewport. Gary remains directly beneath the button; mobile CSS only scales the cluster
          and never rearranges it. */}
      <div className="flex items-center gap-2">
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
          {videoPlaying && !reducedMotion ? (
            <div className="gary-video-stage">
              {!videoStarted && <div className="gary-video-placeholder" aria-hidden="true"><GaryCharacter pose="seated" idleGlanceActive={false} /></div>}
              <video ref={videoRef} className="gary-concierge-video" data-started={videoStarted} src="/gary-concierge.webm?v=tracked2"
                autoPlay loop muted playsInline preload="none"
                aria-label="Gary waves, gets frustrated, and holds a sign pointing to the chat button."
                onTimeUpdate={(event) => setVideoTime(event.currentTarget.currentTime)}
                onPlaying={() => { setVideoStarted(true); setVideoFailed(false); }}
                onPause={() => setVideoStarted(false)}
                onError={() => { setVideoStarted(false); setVideoFailed(true); }} />
              {!videoStarted && <div className="gary-video-recovery">
                {videoFailed && <p role="status">Animation unavailable. You can still chat with Gary.</p>}
                <button type="button" onClick={playGary}>{videoFailed ? 'Retry Gary animation' : 'Play Gary'}</button>
              </div>}
              {showIntroBubble && (
                <div className="gary-video-bubble" data-testid="gary-speech-bubble">
                  Hey I&apos;m Gary From Accounting, Im here to help.
                </div>
              )}
            </div>
          ) : (
            <div className="gary-character-wrap" aria-hidden="true">
              <GaryCharacter pose={pose} idleGlanceActive={idleGlanceActive} />
            </div>
          )}
        </div>
      )}

      {open && <GaryPanel onClose={() => setOpen(false)} />}
    </div>
  );
  return homeSlot ? createPortal(launcher, homeSlot) : launcher;
}
