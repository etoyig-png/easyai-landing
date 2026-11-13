'use client';

import { useEffect, useRef, useState } from 'react';

const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

/** Visitor-supplied numbers only — nothing here is a claim about Easy AI results. */
export default function LeakCalculator() {
  const [jobValue, setJobValue] = useState(450);
  const [missed, setMissed] = useState(5);
  const [close, setClose] = useState(30);
  const monthly = Math.round(jobValue * missed * (close / 100) * 4.33);
  const shown = useCountUp(monthly);

  return (
    <div className="sx-calc" data-reveal>
      <div className="sx-calc-inputs">
        <Field label="Average job or sale" value={jobValue} min={50} max={5000} step={50} onChange={setJobValue} format={money} />
        <Field label="Missed calls, searches or inquiries per week" value={missed} min={1} max={40} step={1} onChange={setMissed} format={(n) => String(n)} />
        <Field label="How many of those you'd normally win" value={close} min={5} max={80} step={5} onChange={setClose} format={(n) => `${n}%`} />
      </div>
      <div className="sx-calc-out">
        <span className="sx-calc-label">Walking out the door every month</span>
        <strong className="sx-calc-total" aria-hidden="true">{money(shown)}</strong>
        <span className="sx-sr-only" aria-live="polite">{money(monthly)} per month.</span>
        <span className="sx-calc-year">That&rsquo;s about <b>{money(monthly * 12)}</b> a year.</span>
        <small>These are your numbers, not our promise. Gary just does the math.</small>
      </div>
    </div>
  );
}

function Field({ label, value, min, max, step, onChange, format }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (n: number) => void; format: (n: number) => string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="sx-field">
      <span className="sx-field-top"><span>{label}</span><b>{format(value)}</b></span>
      <input type="range" min={min} max={max} step={step} value={value}
        style={{ ['--p' as string]: `${pct}%` }}
        onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function useCountUp(target: number) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let paused = document.querySelector('.motion-toggle')?.getAttribute('aria-pressed') === 'true';
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      if (preference.matches || paused) { setV(target); from.current = target; return; }
      const start = performance.now();
      const initial = from.current;
      const tick = (time: number) => {
        const progress = Math.min(1, (time - start) / 450);
        const next = Math.round(initial + (target - initial) * (1 - Math.pow(1 - progress, 3)));
        setV(next);
        from.current = next;
        if (progress < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const onPause = (event: Event) => { paused = Boolean((event as CustomEvent<boolean>).detail); update(); };
    update();
    preference.addEventListener('change', update);
    document.addEventListener('easyai:motion-paused', onPause);
    return () => {
      cancelAnimationFrame(raf);
      preference.removeEventListener('change', update);
      document.removeEventListener('easyai:motion-paused', onPause);
    };
  }, [target]);
  return v;
}
