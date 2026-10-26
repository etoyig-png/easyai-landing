'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { mountTraceMotion } from '@/lib/trace-motion';

type ScrollCraftInstance = { destroy: () => void };
declare global {
  interface Window {
    ScrollCraft?: { mount: (root: Element, options: Record<string, never>) => ScrollCraftInstance };
  }
}

/** Progressive enhancement only: the server-rendered journey is usable without this. */
export default function ScrollCraftMotion() {
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const [requested, setRequested] = useState(false);
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let active = true;
    const root = document.querySelector('.home-story');
    const revealStatic = () => {
      if (!active || root?.hasAttribute('data-motion-ready')) return;
      root?.removeAttribute('data-opening-pending');
      root?.setAttribute('data-opening-complete', 'true');
    };
    // Never show the finished brand, then take it away for a late-loading intro.
    const deadline = window.setTimeout(revealStatic, 2500);
    const request = async () => {
      if (preference.matches) { revealStatic(); return; }
      // Start the opening only after its actual photograph can be painted.
      const image = new window.Image();
      image.src = '/devices/phone-photograph-crop.webp';
      try { await image.decode(); } catch { revealStatic(); return; }
      if (active && !preference.matches && !root?.hasAttribute('data-opening-complete')) setRequested(true);
    };
    request();
    preference.addEventListener('change', request);
    return () => { active = false; clearTimeout(deadline); preference.removeEventListener('change', request); };
  }, []);
  useEffect(() => {
    const root = document.querySelector('.home-story');
    if (!ready || !root || !window.ScrollCraft) return;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let instance: ScrollCraftInstance | undefined;
    let traces: ReturnType<typeof mountTraceMotion> | undefined;
    const scenes = Array.from(root.querySelectorAll('.product-scene, .discovery-intro, .discovery-human'));
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.classList.toggle('scene-visible', entry.isIntersecting));
    }, { threshold: 0.2 });
    scenes.forEach(scene => observer.observe(scene));
    const video = root.querySelector<HTMLVideoElement>('[data-conversation-video]');
    let videoVisible = false;
    const syncVideo = () => {
      if (!video) return;
      if (videoVisible && !preference.matches && !paused) {
        const source = video.querySelector('source');
        if (source && !source.src) { source.src = source.dataset.src!; video.load(); }
        video.play().catch(() => { /* Poster remains visible when playback is unavailable. */ });
      } else video.pause();
    };
    const videoObserver = new IntersectionObserver(entries => {
      videoVisible = entries.some(entry => entry.isIntersecting);
      syncVideo();
    }, { threshold: .15 });
    if (video) videoObserver.observe(video);
    const update = () => {
      syncVideo();
      instance?.destroy();
      traces?.destroy();
      traces = undefined;
      instance = undefined;
      root.removeAttribute('data-motion-ready');
      root.removeAttribute('data-opening-pending');
      if (preference.matches || paused) root.setAttribute('data-opening-complete', 'true');
      // Do not mount the engine for motion-off visitors, including live preference changes.
      if (!preference.matches && !paused) {
        instance = window.ScrollCraft?.mount(root, {});
        root.setAttribute('data-motion-ready', 'true');
        traces = mountTraceMotion(root);
      }
    };
    const opening = root.querySelector<HTMLElement>('.discovery-search');
    const finishOpening = (event: Event) => {
      if ((event as AnimationEvent).animationName === 'discovery-search') root.setAttribute('data-opening-complete', 'true');
    };
    root.addEventListener('animationend', finishOpening);
    const movePhone = () => {
      if (preference.matches || paused) return;
      const progress = Math.min(1, scrollY / Math.max(1, innerHeight));
      opening?.style.setProperty('--phone-scroll-x', `${Math.sin(progress * Math.PI * 3) * 22}px`);
      opening?.style.setProperty('--phone-scroll-angle', `${Math.sin(progress * Math.PI * 3) * 8}deg`);
    };
    window.addEventListener('scroll', movePhone, { passive: true });
    update();
    preference.addEventListener('change', update);
    return () => {
      root.removeEventListener('animationend', finishOpening);
      window.removeEventListener('scroll', movePhone);
      preference.removeEventListener('change', update);
      observer.disconnect();
      videoObserver.disconnect();
      video?.pause();
      scenes.forEach(scene => scene.classList.remove('scene-visible'));
      instance?.destroy();
      traces?.destroy();
      root.removeAttribute('data-motion-ready');
    };
  }, [ready, paused]);
  return requested ? <>
    <Script src="/scrollcraft/scrollcraft.js" strategy="afterInteractive" onReady={() => setReady(true)} />
    <button type="button" className="motion-toggle" onClick={() => setPaused(value => !value)} aria-pressed={paused}>
      {paused ? 'Resume motion' : 'Pause motion'}
    </button>
  </> : null;
}
