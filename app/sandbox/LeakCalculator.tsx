'use client';

import Link from 'next/link';
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
      <div className="sx-calc-out" aria-live="polite">
        <span className="sx-calc-label">Walking out the door every month</span>
        <strong className="sx-calc-total">{money(shown)}</strong>
        <span className="sx-calc-year">That&rsquo;s about <b>{money(monthly * 12)}</b> a year.</span>
        <Link href="/assessment" className="sx-btn sx-btn-primary">Find my leaks, free <span aria-hidden="true">→</span></Link>
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
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(target); from.current = target; return; }
    const start = performance.now(); const a = from.current; let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 450); const e = 1 - Math.pow(1 - k, 3);
      const next = Math.round(a + (target - a) * e); setV(next); from.current = next;
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}
