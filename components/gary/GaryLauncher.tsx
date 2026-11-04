'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { hasPlayedLaunchAnimation, markLaunchAnimationPlayed } from '@/lib/gary/clientSession';
import GaryCharacter from './GaryCharacter';
import type { GaryIntent } from './GaryPanel';
import { OPEN_GARY_EVENT } from '@/lib/gary/openGary';

// The chat panel (and its network/session logic) is only loaded once the visitor opens it —
// initial page rendering never downloads the heavier chat bundle. Video waits for reveal;
// the seated sheet gets a low-priority head start to avoid a blank cold-cache character.
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
  const [visible, setVisible] = useState(false);
  const [entering, setEntering] = useState(false);
  const [open, setOpen] = useState(false);
  // Set when a page button opened Gary for a specific purpose (the contact flow). Cleared on close
  // so a later manual open starts a normal chat.
  const [intent, setIntent] = useState<GaryIntent>(null);
  const [playIntro, setPlayIntro] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const launchTimer = useRef<number>();
  const posterTimer = useRef<number>();
  const chatButton = useRef<HTMLButtonElement>(null);

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
    let posterHint: HTMLLinkElement | undefined;
    posterTimer.current = window.setTimeout(() => {
      posterHint = document.createElement('link');
      posterHint.rel = 'preload'; posterHint.as = 'image'; posterHint.href = '/gary/gary-poses.webp';
      posterHint.setAttribute('fetchpriority', 'low');
      document.head.appendChild(posterHint);
    }, LAUNCH_DELAY_MS - 2000);
    const timer = window.setTimeout(() => {
      setVisible(true);
      setEntering(true);
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const alreadyPlayed = hasPlayedLaunchAnimation();
      if (prefersReducedMotion || alreadyPlayed) {
        if (!alreadyPlayed) markLaunchAnimationPlayed();
        return;
      }
      markLaunchAnimationPlayed();
      setPlayIntro(true);
    }, LAUNCH_DELAY_MS);
    launchTimer.current = timer;
    // Initialization is distinct from visibility: clocks/hosts can wait for the
    // existing launch timer to be registered without changing its delay.
    document.documentElement.setAttribute('data-gary-ready', 'true');
    return () => {
      document.documentElement.removeAttribute('data-gary-ready');
      window.clearTimeout(timer);
      window.clearTimeout(posterTimer.current);
      posterHint?.remove();
    };
    // Intentionally runs once on mount — the delay and once-per-session check are both evaluated
    // at that single point, not re-derived on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Page content opens Gary through one event rather than mounting a second Gary. Making him
  // visible first matters: before LAUNCH_DELAY_MS the launcher renders nothing, so an open
  // request that arrives early would otherwise flip state on an invisible component.
  useEffect(() => {
    function handleOpenRequest(event: Event) {
      const requested = (event as CustomEvent<{ intent?: string | null }>).detail?.intent;
      setVisible(true);
      setIntent(requested === 'contact' ? 'contact' : null);
      setOpen(true);
    }
    window.addEventListener(OPEN_GARY_EVENT, handleOpenRequest);
    return () => window.removeEventListener(OPEN_GARY_EVENT, handleOpenRequest);
  }, []);

  // Opening the chat interrupts whatever part of the routine is still playing (jump/wave/point/
  // frustrated/idea/sign) — the visitor responded, so there's nothing left to demonstrate.
  // Closing it always resumes the safe seated state, never mid-routine.
  useEffect(() => {
    if (!open) return;
    window.clearTimeout(launchTimer.current);
    window.clearTimeout(posterTimer.current);
    setEntering(false);
    setPlayIntro(false);
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

  // The approved video already contains its sign; never overlay a second message on it.
  const showIntroBubble = !open && (!playIntro || reducedMotion);

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
      {/* Universal top row: the speech bubble stays to the left of the green button on every
          viewport. Gary remains directly beneath the button; mobile CSS only scales the cluster
          and never rearranges it. */}
      <div className="flex items-center gap-2">
        {showIntroBubble && (
          <div className="gary-speech-bubble" data-testid="gary-speech-bubble">
            Hi! I&apos;m Gary from Accounting
          </div>
        )}
        <button
          ref={chatButton}
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Chat with Gary from Accounting"
          aria-haspopup="dialog"
          aria-expanded={open}
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
          <div
            className={`gary-character-wrap${entering ? ' gary-entering' : ''}`}
            aria-hidden="true"
            onAnimationEnd={() => setEntering(false)}
          >
            <GaryCharacter pose="seated" idleGlanceActive={false} animate={playIntro && !reducedMotion}
              onFinished={() => setPlayIntro(false)} />
          </div>
        </div>
      )}

      {open && (
        <GaryPanel
          identity={<div className="flex min-w-0 items-center gap-2">
          <div className="h-16 w-16 flex-shrink-0" data-testid="gary-chat-character">
            <GaryCharacter pose="seated" idleGlanceActive={false} />
          </div>
          <span className="text-sm font-semibold text-white">Gary from Accounting</span>
        </div>}
          initialIntent={intent}
          onClose={() => {
            setOpen(false);
            setIntent(null);
            chatButton.current?.focus();
          }}
        />
      )}
    </div>
  );
}
