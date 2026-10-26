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
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const [requested, setRequested] = useState(false);
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let active = true;
    const request = async () => {
      if (preference.matches) return;
      // Start the opening only after its actual photograph can be painted.
      const image = new window.Image();
      image.src = '/devices/phone-photograph-crop.webp';
      try { await image.decode(); } catch { return; /* Keep static content if the photograph cannot load. */ }
      if (active && !preference.matches) setRequested(true);
    };
    request();
    preference.addEventListener('change', request);
    return () => { active = false; preference.removeEventListener('change', request); };
  }, []);
  useEffect(() => {
    const root = document.querySelector('.home-story');
    if (!ready || !root || !window.ScrollCraft) return;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let instance: ScrollCraftInstance | undefined;
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
      instance = undefined;
      root.removeAttribute('data-motion-ready');
      // Do not mount the engine for motion-off visitors, including live preference changes.
      if (!preference.matches && !paused) {
        instance = window.ScrollCraft?.mount(root, {});
        root.setAttribute('data-motion-ready', 'true');
      }
    };
    const opening = root.querySelector<HTMLElement>('.discovery-search');
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
      window.removeEventListener('scroll', movePhone);
      preference.removeEventListener('change', update);
      observer.disconnect();
      videoObserver.disconnect();
      video?.pause();
      scenes.forEach(scene => scene.classList.remove('scene-visible'));
      instance?.destroy();
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
