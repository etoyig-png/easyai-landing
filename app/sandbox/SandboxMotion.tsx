'use client';

import { useEffect } from 'react';

/** Reveal-on-scroll + sticky CTA visibility for the sales sandbox. Content is server-rendered and
 * fully visible without JS; this only adds motion when the visitor allows it. */
export default function SandboxMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.sx');
    if (!root) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) root.classList.add('sx-motion');

    const reveal = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); reveal.unobserve(e.target); }
      }),
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
    );
    root.querySelectorAll('[data-reveal]').forEach((el) => reveal.observe(el));

    const hero = root.querySelector('.sx-hero');
    const bar = root.querySelector('.sx-sticky');
    const close = root.querySelector('.sx-close');
    let heroGone = false; let closeSeen = false;
    const sync = () => bar?.classList.toggle('is-on', heroGone && !closeSeen);
    const sticky = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.target === hero) heroGone = !e.isIntersecting;
        if (e.target === close) closeSeen = e.isIntersecting;
      });
      sync();
    });
    if (hero) sticky.observe(hero);
    if (close) sticky.observe(close);
    return () => { reveal.disconnect(); sticky.disconnect(); };
  }, []);
  return null;
}
