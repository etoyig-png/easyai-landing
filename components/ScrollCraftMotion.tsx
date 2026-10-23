'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

type ScrollCraftInstance = { destroy: () => void };
declare global {
  interface Window {
    ScrollCraft?: { mount: (root: Element, options: Record<string, never>) => ScrollCraftInstance };
  }
}

/** Progressive enhancement only: the server-rendered journey is usable without this. */
export default function ScrollCraftMotion() {
  const [ready, setReady] = useState(false);
  const [requested, setRequested] = useState(false);
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const request = () => { if (!preference.matches) setRequested(true); };
    request();
    preference.addEventListener('change', request);
    return () => preference.removeEventListener('change', request);
  }, []);
  useEffect(() => {
    const root = document.querySelector('.home-story');
    if (!ready || !root || !window.ScrollCraft) return;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let instance: ScrollCraftInstance | undefined;
    const update = () => {
      instance?.destroy();
      instance = undefined;
      root.removeAttribute('data-motion-ready');
      // Do not mount the engine for motion-off visitors, including live preference changes.
      if (!preference.matches) {
        instance = window.ScrollCraft?.mount(root, {});
        root.setAttribute('data-motion-ready', 'true');
      }
    };
    update();
    preference.addEventListener('change', update);
    return () => {
      preference.removeEventListener('change', update);
      instance?.destroy();
      root.removeAttribute('data-motion-ready');
    };
  }, [ready]);
  return requested ? <Script src="/scrollcraft/scrollcraft.js" strategy="afterInteractive" onReady={() => setReady(true)} /> : null;
}
