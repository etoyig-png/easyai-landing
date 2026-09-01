'use client';

import { useState } from 'react';
import { GARY_OPEN_EVENT, type GaryOpenEventDetail } from '@/components/gary/GaryLauncher';

/**
 * Asks the already-mounted Gary launcher to open in contact mode. Deliberately does NOT render
 * its own Gary: a second instance would mean two chat sessions and two launchers on one page.
 *
 * If Gary is not on the page at all (the route gate excludes some routes, or the launcher script
 * failed), the dispatch is a no-op and the visitor would be stuck GÇö so the button detects that
 * case and reveals the static fallback instead. The fallback is also always available as plain
 * text below, so the page is never a dead end even before this runs.
 */
export default function ContactGaryButton() {
  const [garyUnavailable, setGaryUnavailable] = useState(false);

  function openGary() {
    if (typeof window === 'undefined') return;
    const launcherPresent = document.querySelector('.gary-launcher') !== null;
    window.dispatchEvent(
      new CustomEvent<GaryOpenEventDetail>(GARY_OPEN_EVENT, { detail: { intent: 'contact' } })
    );
    // Gary reveals himself on a delay, so "not in the DOM yet" is normal for the first few
    // seconds and is handled by the launcher itself. Only treat it as a real failure if the
    // panel still has not appeared shortly after the request.
    window.setTimeout(() => {
      const panelOpen = document.querySelector('[role="dialog"]') !== null;
      if (!panelOpen && !launcherPresent) setGaryUnavailable(true);
    }, 1200);
  }

  return (
    <div>
      <button
        type="button"
        onClick={openGary}
        className="btn-green px-7 py-3.5 text-base"
      >
        Contact Easy AI Through Gary
      </button>

      <p aria-live="polite" className="sr-only">
        {garyUnavailable ? 'Chat is unavailable. Use the assessment link below to reach Easy AI.' : ''}
      </p>

      {garyUnavailable && (
        <p className="mt-4 text-sm text-red-700">
          Chat is not available right now. You can still reach us by starting the{' '}
          <a href="/assessment" className="underline font-medium">free assessment</a> GÇö it reaches the
          same place and tells us what you need.
        </p>
      )}
    </div>
  );
}
