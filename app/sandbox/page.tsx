import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import GaryCharacter from '@/components/gary/GaryCharacter';
import LeakCalculator from './LeakCalculator';
import SandboxMotion from './SandboxMotion';
import './sandbox.css';

/**
 * SALES SANDBOX — a conversion-first redesign concept, kept off the live homepage.
 * One job: move a visitor to the free assessment (primary) or a Gary conversation (secondary).
 * No invented results or testimonials: every number on this page comes from the visitor.
 */
export const metadata: Metadata = {
  title: 'Stop Losing Customers You Never Meet',
  description: 'Easy AI gets your business found on Google and AI, turns visits into conversations, and answers every inquiry. Get your free GAP Score.',
  robots: { index: false, follow: false },
};

const searches = [
  'electrician near me', 'who should I call for AC repair?', 'best roofer open now',
  'plumber that answers on weekends', 'ChatGPT, who fixes furnaces nearby?', 'emergency HVAC tonight',
  'top-rated contractor in my area', 'who does same-day estimates?',
];

const receipt = [
  { time: '7:14 AM', what: 'Google: “electrician near me”', result: 'Not listed' },
  { time: '11:02 AM', what: 'AI: “who should I call?”', result: 'Competitor named' },
  { time: '6:48 PM', what: 'Website visit, 2 pages', result: 'Left. No contact' },
  { time: '9:31 PM', what: 'Phone call', result: 'Voicemail' },
];

const leaks = [
  {
    n: '01', tag: 'They can’t find you', logo: { src: '/gap-logo.png', alt: 'GAP — Google and AI Presence', w: 1254, h: 1254, cls: 'is-square' },
    fix: 'GAP puts you in front of customers on Google, in local search and in AI answers.',
    cta: 'Get my GAP Score', href: '/assessment', color: 'gold',
  },
  {
    n: '02', tag: 'They find you, then leave', logo: { src: '/smartsite-logo.webp', alt: 'SmartSite', w: 2048, h: 682, cls: '' },
    fix: 'SmartSite turns your website into a conversation that captures the lead before they bounce.',
    cta: 'Ask Gary about SmartSite', href: '/contact', gary: true, color: 'coral',
  },
  {
    n: '03', tag: 'Nobody picks up', logo: { src: '/aim-logo.webp?v=1983', alt: 'AIM Digital / Voice', w: 1983, h: 793, cls: '' },
    fix: 'AIM answers online and by phone, day or night, then hands your team a ready-to-call lead.',
    cta: 'Ask Gary about AIM', href: '/contact', gary: true, color: 'mint',
  },
];

const steps = [
  { n: '1', t: 'Take the free assessment', b: 'A few questions about your business. No credit card.' },
  { n: '2', t: 'See exactly where you leak', b: 'Your GAP Score and a human-reviewed list of what’s costing you most.' },
  { n: '3', t: 'We fix the biggest leak first', b: 'Or you do it yourself. Your call. No pressure.' },
];

export default function SalesSandboxPage() {
  return (
    <div className="sx">
      <SandboxMotion />

      {/* ───────────── HERO ───────────── */}
      <section className="sx-hero">
        <div className="sx-hero-glow" aria-hidden="true" />
        <div className="sx-wrap sx-hero-grid">
          <div className="sx-hero-copy">
            <p className="sx-eyebrow"><span className="sx-pulse" aria-hidden="true" />Gary from Accounting ran your numbers</p>
            <h1 className="sx-h1">
              You&rsquo;re losing customers <span className="sx-strike">you&rsquo;ll never meet.</span>
            </h1>
            <p className="sx-lead">They searched. They asked AI. They called. You weren&rsquo;t there. Easy AI makes sure you are.</p>
            <div className="sx-ctas">
              <Link href="/assessment" className="sx-btn sx-btn-primary sx-btn-xl">Get my free GAP Score <span aria-hidden="true">→</span></Link>
              <a href="/contact" data-open-gary className="sx-btn sx-btn-ghost">Talk to Gary</a>
            </div>
            <ul className="sx-assure">
              <li>Free</li><li>No credit card</li><li>Reviewed by a real person</li>
            </ul>
          </div>

          <div className="sx-receipt-stage" aria-label="Example: a day of missed customer opportunities">
            <div className="sx-gary" aria-hidden="true"><GaryCharacter pose="signPoint" idleGlanceActive={false} /></div>
            <div className="sx-receipt">
              <div className="sx-receipt-head">
                <Image src="/easy-ai-logo-transparent.png" alt="" width={1430} height={290} sizes="120px" />
                <span>MISSED OPPORTUNITY RECEIPT</span>
                <small>Prepared by Gary · Accounting</small>
              </div>
              <ol className="sx-receipt-lines">
                {receipt.map((r, i) => (
                  <li key={r.time} style={{ ['--i' as string]: i }}>
                    <span className="sx-r-time">{r.time}</span>
                    <span className="sx-r-what">{r.what}</span>
                    <span className="sx-r-res">{r.result}</span>
                  </li>
                ))}
              </ol>
              <div className="sx-receipt-total" style={{ ['--i' as string]: receipt.length }}>
                <span>Customers lost today</span><b>4</b>
              </div>
              <p className="sx-receipt-foot">One example day. Your total is waiting below.</p>
              <div className="sx-receipt-tear" aria-hidden="true" />
            </div>
          </div>
        </div>

        <div className="sx-marquee" aria-hidden="true">
          <div className="sx-marquee-track">
            {[...searches, ...searches].map((s, i) => <span key={i}><i>⌕</i>{s}</span>)}
          </div>
        </div>
      </section>

      {/* ───────────── THREE LEAKS ───────────── */}
      <section className="sx-section" id="leaks">
        <div className="sx-wrap">
          <header className="sx-head" data-reveal>
            <p className="sx-kicker">Three leaks. Three fixes.</p>
            <h2 className="sx-h2">Where your customers go missing.</h2>
          </header>
          <div className="sx-leaks">
            {leaks.map((l, i) => (
              <article key={l.n} className={`sx-leak sx-${l.color}`} data-reveal style={{ ['--d' as string]: `${i * 110}ms` }}>
                <span className="sx-leak-n">{l.n}</span>
                <h3>{l.tag}</h3>
                <div className={`sx-leak-logo ${l.logo.cls}`}>
                  <Image src={l.logo.src} alt={l.logo.alt} width={l.logo.w} height={l.logo.h} sizes="220px" quality={90} />
                </div>
                <p>{l.fix}</p>
                {l.gary
                  ? <a href={l.href} data-open-gary className="sx-leak-cta">{l.cta} <span aria-hidden="true">→</span></a>
                  : <Link href={l.href} className="sx-leak-cta">{l.cta} <span aria-hidden="true">→</span></Link>}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── CALCULATOR ───────────── */}
      <section className="sx-section sx-calc-section" id="math">
        <div className="sx-wrap">
          <header className="sx-head" data-reveal>
            <p className="sx-kicker">The math Gary does all day</p>
            <h2 className="sx-h2">What is the leak costing you?</h2>
          </header>
          <LeakCalculator />
        </div>
      </section>

      {/* ───────────── HOW IT WORKS ───────────── */}
      <section className="sx-section" id="how">
        <div className="sx-wrap">
          <header className="sx-head" data-reveal>
            <p className="sx-kicker">Simple on purpose</p>
            <h2 className="sx-h2">Three steps to getting chosen.</h2>
          </header>
          <ol className="sx-steps">
            {steps.map((s, i) => (
              <li key={s.n} data-reveal style={{ ['--d' as string]: `${i * 120}ms` }}>
                <span className="sx-step-n">{s.n}</span>
                <h3>{s.t}</h3>
                <p>{s.b}</p>
              </li>
            ))}
          </ol>
          <div className="sx-center" data-reveal>
            <Link href="/assessment" className="sx-btn sx-btn-primary sx-btn-xl">Start step 1, free <span aria-hidden="true">→</span></Link>
          </div>
        </div>
      </section>

      {/* ───────────── TRUST ───────────── */}
      <section className="sx-section sx-trust">
        <div className="sx-wrap sx-trust-grid">
          <div className="sx-trust-media" data-reveal>
            <Image src="/business-conversation-poster.webp" alt="A business owner on the phone with a customer" width={960} height={540} sizes="(max-width: 900px) 100vw, 560px" />
          </div>
          <div data-reveal>
            <p className="sx-kicker">AI starts the conversation</p>
            <h2 className="sx-h2">People close the deal.</h2>
            <ul className="sx-checks">
              <li>A human reviews every recommendation before you see it.</li>
              <li>No generic tool lists. Only what fits your business.</li>
              <li>You decide what happens next. Nothing is automatic.</li>
            </ul>
            <div className="sx-trust-links">
              <Link href="/about">Meet Etoyi, the founder →</Link>
              <Link href="/ai-trust">Our AI + Trust approach →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── CLOSE ───────────── */}
      <section className="sx-close">
        <div className="sx-wrap sx-center">
          <h2 className="sx-h1 sx-close-h">Your next customer is searching <em>right now.</em></h2>
          <p className="sx-lead">Make sure they find you, not your competitor.</p>
          <div className="sx-ctas sx-ctas-center">
            <Link href="/assessment" className="sx-btn sx-btn-primary sx-btn-xl">Get my free GAP Score <span aria-hidden="true">→</span></Link>
            <Link href="/assessment?intent=consultation" className="sx-btn sx-btn-ghost">Book a consultation</Link>
          </div>
        </div>
      </section>

      {/* Sticky conversion bar — appears once the hero scrolls away */}
      <div className="sx-sticky" role="region" aria-label="Get your free GAP Score">
        <span>Find out what you&rsquo;re missing.</span>
        <Link href="/assessment" className="sx-btn sx-btn-primary">Free GAP Score →</Link>
      </div>
    </div>
  );
}
