'use client';

import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import { usePathname } from 'next/navigation';

// Keep the existing privacy-sensitive route exclusions.
const EXCLUDED_PREFIXES = ['/assessment', '/book-consultation'];
const POST_LOAD_DELAY_MS = 5000;
type Launcher = ComponentType<{ initialOpen?: boolean }>;

function isExcludedRoute(pathname: string): boolean {
  return EXCLUDED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** Small routing/timer gate only. Gary's renderer and media live in the deferred import. */
export default function GaryRouteGate() {
  const pathname = usePathname();
  const excluded = isExcludedRoute(pathname ?? '');
  const [LauncherComponent, setLauncher] = useState<Launcher | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const pendingOpen = useRef(false);

  const loadLauncher = useCallback(async (isCurrent: () => boolean = () => true) => {
    setLoadFailed(false);
    try {
      const launcherModule = await import('./GaryLauncher');
      if (isCurrent()) setLauncher(() => launcherModule.default);
    } catch {
      if (isCurrent()) setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    if (excluded || LauncherComponent) return;
    let cancelled = false;
    let afterLoad: number | undefined;
    let delay: number | undefined;
    const start = () => {
      // A new task lets the complete load event finish before starting the five seconds.
      afterLoad = window.setTimeout(() => {
        delay = window.setTimeout(() => {
          if (!cancelled) void loadLauncher(() => !cancelled);
        }, POST_LOAD_DELAY_MS);
      }, 0);
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener('load', start);
      window.clearTimeout(afterLoad);
      window.clearTimeout(delay);
    };
  }, [excluded, LauncherComponent, loadLauncher]);

  useEffect(() => {
    if (excluded) { pendingOpen.current = false; return; }
    if (LauncherComponent) return;
    const queueChat = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('a[data-open-gary]')) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      pendingOpen.current = true;
    };
    document.addEventListener('click', queueChat);
    return () => document.removeEventListener('click', queueChat);
  }, [excluded, LauncherComponent]);

  if (excluded) return null;
  if (LauncherComponent) return <LauncherComponent initialOpen={pendingOpen.current} />;
  return loadFailed
    ? <button type="button" className="gary-invitation fixed bottom-4 right-4 z-50" onClick={() => void loadLauncher()}>Retry Gary</button>
    : null;
}
