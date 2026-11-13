'use client';

import { useEffect } from 'react';

/** Enhances server content; never imports Gary or calls an API. */
export default function SalesMotion() {
  useEffect(() => {
    const root = document.getElementById('sales-sections');
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let paused = document.querySelector('.motion-toggle')?.getAttribute('aria-pressed') === 'true';
    const syncMotion = () => {
      root.classList.toggle('sx-motion', !preference.matches && !paused);
      if (preference.matches || paused) {
        root.querySelectorAll('.sx-receipt.is-printing').forEach((receipt) => {
          receipt.classList.remove('is-printing');
          receipt.classList.add('is-printed');
        });
      }
    };
    const onPause = (event: Event) => {
      paused = Boolean((event as CustomEvent<boolean>).detail);
      syncMotion();
    };
    syncMotion();
    preference.addEventListener('change', syncMotion);
    document.addEventListener('easyai:motion-paused', onPause);

    const reveal = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        if (entry.target.hasAttribute('data-sales-receipt-trigger')) {
          entry.target.querySelector('[data-sales-receipt]')?.classList.add(root.classList.contains('sx-motion') ? 'is-printing' : 'is-printed');
        } else entry.target.classList.add('is-in');
        reveal.unobserve(entry.target);
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
    root.querySelectorAll('[data-reveal], [data-sales-receipt-trigger]').forEach((element) => reveal.observe(element));

    const finishReceipt = (event: AnimationEvent) => {
      if (event.animationName !== 'sx-line' || !(event.target instanceof Element) || !event.target.matches('.sx-receipt-total')) return;
      const receipt = event.target.closest('.sx-receipt');
      receipt?.classList.remove('is-printing');
      receipt?.classList.add('is-printed');
    };
    root.addEventListener('animationend', finishReceipt);

    // Toy's latest direction: visible immediately; hide only at the large bottom CTA.
    const bar = root.querySelector<HTMLElement>('.sx-sticky');
    const close = root.querySelector('.sx-close .sx-btn');
    let lastVisible: boolean | undefined;
    const setBarVisible = (visible: boolean) => {
      if (lastVisible === visible) return;
      lastVisible = visible;
      bar?.classList.toggle('is-on', visible);
      if (bar) {
        bar.inert = !visible;
        bar.setAttribute('aria-hidden', String(!visible));
      }
    };
    setBarVisible(true);
    const scrollFrame = root.closest('.site-scroll-frame');
    const syncSticky = () => {
      if (!close) return;
      const viewportBottom = scrollFrame?.getBoundingClientRect().bottom ?? window.innerHeight;
      setBarVisible(close.getBoundingClientRect().top >= viewportBottom);
    };
    const sticky = new IntersectionObserver(syncSticky);
    if (close) sticky.observe(close);
    // Fast jumps can move a target from below to above without an intersection event.
    let stickyFrame = 0;
    const requestSticky = () => {
      if (!stickyFrame) stickyFrame = requestAnimationFrame(() => { stickyFrame = 0; syncSticky(); });
    };
    const scroller = scrollFrame ?? window;
    scroller.addEventListener('scroll', requestSticky, { passive: true });
    syncSticky();
    return () => {
      reveal.disconnect();
      sticky.disconnect();
      scroller.removeEventListener('scroll', requestSticky);
      cancelAnimationFrame(stickyFrame);
      preference.removeEventListener('change', syncMotion);
      document.removeEventListener('easyai:motion-paused', onPause);
      root.removeEventListener('animationend', finishReceipt);
      root.classList.remove('sx-motion');
      setBarVisible(true);
    };
  }, []);
  return null;
}
