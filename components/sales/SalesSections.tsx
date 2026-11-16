import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import LeakCalculator from './LeakCalculator';
import MissedOpportunityReceipt from './MissedOpportunityReceipt';
import SalesMotion from './SalesMotion';
import './sales.css';

const searches = [
  { platform: 'Google', query: 'emergency HVAC near me' },
  { platform: 'ChatGPT', query: 'who fixes furnaces nearby?' },
  { platform: 'Claude', query: 'best emergency HVAC open tonight?' },
  { platform: 'Gemini', query: 'electrician near me' },
  { platform: 'Perplexity', query: 'top-rated roofer in my area' },
  { platform: 'Google', query: 'plumber that answers on weekends' },
  { platform: 'Copilot', query: 'who does same-day estimates?' },
  { platform: 'Siri', query: 'call an AC repair company' },
];

const leaks = [
  {
    n: '01', tag: 'They can’t find you', logo: { src: '/gap-logo.png', alt: 'GAP — Google and AI Presence', w: 1254, h: 1254, cls: 'is-square' },
    fix: 'GAP puts you in front of customers on Google, in local search and in AI answers.',
    cta: 'Start Your Journey Now', href: '/assessment', color: 'gold',
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

export function SalesOpening() {
  return <div className="sx" id="sales-opening">
    <SalesMotion rootId="sales-opening" />
      <div className="sx-marquee" aria-hidden="true">
        <div className="sx-marquee-track">
          {[0, 1].map((copy) => (
            <div className="sx-marquee-group" key={copy}>
              {searches.map((search, index) => (
                <span key={index}><i>⌕</i><strong className="sx-search-platform">{search.platform}</strong> “{search.query}”</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <section className="sx-section sx-search-cta" aria-labelledby="sales-search-heading">
        <div className="sx-wrap sx-search-grid">
          <MissedOpportunityReceipt />
          <div data-reveal>
            <h2 className="sx-h2" id="sales-search-heading">Does your company show up when customers search?</h2>
            <div className="sx-ctas">
              <Link href="/assessment" className="btn-green sx-btn sx-btn-primary sx-btn-xl">Start Your Journey Now <span aria-hidden="true">→</span></Link>
            </div>
            <ul className="sx-assure">
              <li>Free</li><li>No credit card</li><li>Reviewed by a real person</li>
            </ul>
          </div>
        </div>
      </section>

  </div>;
}

export default function SalesSections({ closingBrand }: { closingBrand: ReactNode }) {
  return (
    <div className="sx" id="sales-sections">
      <SalesMotion />
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
                  : <Link href={l.href} className="btn-green sx-btn sx-btn-primary">{l.cta} <span aria-hidden="true">→</span></Link>}
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
            <Link href="/assessment" className="btn-green sx-btn sx-btn-primary sx-btn-xl">Start Your Journey Now <span aria-hidden="true">→</span></Link>
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

      {closingBrand}
      {/* ───────────── CLOSE ───────────── */}
      <section className="sx-close" id="free-assessment">
        <div className="sx-wrap sx-center">
          <h2 className="sx-h1 sx-close-h">Your next customer is searching <em>right now.</em></h2>
          <p className="sx-lead">Make sure they find you, not your competitor.</p>
          <div className="sx-ctas sx-ctas-center">
            <Link href="/assessment" className="btn-green sx-btn sx-btn-primary sx-btn-xl">Start Your Journey Now <span aria-hidden="true">→</span></Link>
          </div>
        </div>
      </section>

      <div className="sx-sticky is-on" role="region" aria-label="Persistent free assessment">
        <span>Does your company show up when customers search?</span>
        <Link href="/assessment" className="btn-green sx-btn sx-btn-primary">Start Your Journey Now <span aria-hidden="true">→</span></Link>
      </div>
    </div>
  );
}
