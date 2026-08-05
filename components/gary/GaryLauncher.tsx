'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { hasPlayedLaunchAnimation, markLaunchAnimationPlayed } from '@/lib/gary/clientSession';

// The chat panel (and its network/session logic) is only loaded once the visitor opens it —
// initial page rendering never downloads the heavier chat bundle.
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
  const [playAttentionRoutine, setPlayAttentionRoutine] = useState(false);
  const [open, setOpen] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(true);
      if (!hasPlayedLaunchAnimation() && !reducedMotion) {
        setPlayAttentionRoutine(true);
        markLaunchAnimationPlayed();
        window.setTimeout(() => setPlayAttentionRoutine(false), 4000);
      }
    }, LAUNCH_DELAY_MS);
    return () => window.clearTimeout(timer);
    // Intentionally runs once on mount — the 5s delay and once-per-session check are both
    // read at that single evaluation, not re-derived on every reducedMotion change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open) setPlayAttentionRoutine(false); // pause animation while chat is open
  }, [open]);

  if (!visible) return null;

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
        {playAttentionRoutine && (
          <div className="animate-bounce rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-navy-900 shadow-lg">
            The button. Up there.
          </div>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Chat with Gary from Accounting"
          className={`flex min-h-[56px] min-w-[56px] items-center justify-center rounded-full bg-navy-900 text-2xl text-white shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-silver ${
            playAttentionRoutine && !reducedMotion ? 'animate-bounce' : ''
          }`}
        >
          <span aria-hidden="true">🤖</span>
        </button>
      </div>
      {open && <GaryPanel onClose={() => setOpen(false)} />}
    </>
  );
}
