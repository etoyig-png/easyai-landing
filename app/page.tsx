import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { Iphone } from '@/components/magicui/Iphone';
import PhotographicDevice from '@/components/PhotographicDevice';
import ScrollCraftMotion from '@/components/ScrollCraftMotion';

export const metadata: Metadata = {
  title: 'Easy AI | Get Found. Get Chosen.',
  description: 'Easy AI helps your business appear when customers search Google or ask Artificial Intelligence who to call. Explore GAP, SmartSite, and AIM.',
};

export default function HomePage() {
  return (
    <div className="home-story">
      <ScrollCraftMotion />
      <section className="discovery-opening" data-sc-act="flow" aria-label="Get discovered">
        <div className="discovery-stage">
          <div className="discovery-reveal" aria-hidden="true" />
          <div className="opening-seed" aria-hidden="true" />
          <div className="discovery-orbit story-hero-plane" data-sc-parallax="-0.08" aria-hidden="true">
            <svg viewBox="0 0 600 600" className="location-grid">
              <circle cx="300" cy="300" r="245" /><ellipse cx="300" cy="300" rx="115" ry="245" /><ellipse cx="300" cy="300" rx="245" ry="95" />
            </svg>
            <svg viewBox="0 0 600 600" className="circuit-current">
              <path className="current-yellow" d="M300 50 A250 250 0 0 1 550 300 L520 330 A220 220 0 0 1 300 520" />
              <path className="current-red" d="M80 300 A220 220 0 0 1 300 80 L330 110 A190 190 0 0 1 490 300" />
              <path className="current-green" d="M300 490 A190 190 0 0 1 110 300 L140 270 A160 160 0 0 1 300 140" />
            </svg>
            <span className="location-track location-track-one"><i /></span>
            <span className="location-track location-track-two"><i /></span>
            <span className="location-track location-track-three"><i /></span>
          </div>
          <div className="discovery-search" aria-hidden="true">
            <Iphone className="search-phone">
              <span className="search-phone-label">Looking for a local expert?</span>
              <div className="search-field"><span>⌕</span><span className="typed-line">Who should you call?</span></div>
              <svg className="search-map" viewBox="0 0 260 170">
                <path className="map-road" d="M0 38H260M0 105H260M55 0V170M180 0V170M0 160L260 0" />
                <circle className="map-signal" cx="130" cy="80" r="38" />
                <path className="map-pin" d="M130 45c-18 0-30 13-30 29 0 23 30 48 30 48s30-25 30-48c0-16-12-29-30-29z" />
                <circle cx="130" cy="74" r="10" fill="#010611" />
              </svg>
              <div className="search-found"><span className="message-dot mint" />Your business. Found.</div>
              <Image className="screen-brand-mark" src="/easy-ai-logo-transparent.png" alt="" width={1430} height={290} sizes="180px" />
            </Iphone>
          </div>
          <div className="discovery-brand">
            <div className="logo-depth"><svg className="easyai-wordmark" viewBox="0 0 1400 300" role="img" aria-label="Easy AI. Business AI Solutions.">
              <title>Easy AI. Business AI Solutions.</title>
              {Array.from({ length: 40 }, (_, index) => {
                // Curve the existing artwork around the globe: larger center, receding edges.
                const position = (index + .5) / 40 * 2 - 1;
                const scale = 1 - .08 * position * position;
                const lift = 30 * position * position;
                const curveX = (value: number) => (Math.sin(value * .85) / Math.sin(.85) + 1) * 700;
                const left = curveX(index / 40 * 2 - 1);
                const right = curveX((index + 1) / 40 * 2 - 1);
                return <svg key={index} x={left} y={lift} width={right - left + .2} height={260 * scale} viewBox={`${27 + index * 1358 / 40} 10 ${1358 / 40} 216`} preserveAspectRatio="none"><image href="/easy-ai-wordmark.webp" width="1430" height="290" /></svg>;
              })}
            </svg></div>
            <h1>Get Found. Get Chosen.</h1>
            <a href="#introduction" className="story-link">Discover what’s possible <span aria-hidden="true">↗</span></a>
          </div>
        </div>
      </section>

      <section id="introduction" className="discovery-intro" data-sc-act="flow">
        <p data-sc-in>Easy AI helps your business appear when customers search Google or ask Artificial Intelligence who to call. Once they find you, we help turn website attention into conversations, captured leads, and real customer opportunities.</p>
        <div className="product-identities" aria-label="GAP, SmartSite, and AIM" data-sc-in>
          <svg width="0" height="0" className="logo-mask-definitions" aria-hidden="true" focusable="false"><defs><filter id="gap-paper-mask" colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -1 -1 -1 0 3" result="paperless" /><feComposite in="paperless" in2="SourceAlpha" operator="in" /></filter></defs></svg>
          <Image className="gap-identity" src="/gap-logo.png" alt="GAP — Google and AI Presence" width={1254} height={1254} sizes="150px" />
          <span className="smartsite-identity">SmartSite</span>
          <Image src="/aim-logo.webp" alt="AIM Digital / Voice" width={640} height={256} sizes="180px" />
        </div>
      </section>


      <div id="how-easy-ai-works">
        <section id="discovery" className="product-scene story-chapter" data-sc-act="flow">
          <div className="product-art gap-art device-art">
            <div className="color-ribbon" />
            <PhotographicDevice kind="laptop" className="laptop-device" screenClassName="laptop-screen">
              <div className="device-toolbar"><i /><i /><i /><span>Your business. Discovered.</span></div>
              <div className="gap-screen"><a href="/contact" data-open-gary className="gap-device-action" aria-label="Talk with Gary about your GAP Score"><Image src="/gap-logo.png" alt="GAP — Google and AI Presence" width={1254} height={1254} sizes="(max-width: 767px) 45vw, 260px" /><span>Explore your GAP Score ↗</span></a></div>
            </PhotographicDevice>
            <div className="floating-message message-search"><span className="message-dot" /><span className="typed-line">Who should you call?</span></div>
            <div className="floating-message message-answer"><span className="message-dot mint" />Get Found. Get Chosen.</div>
          </div>
          <div className="story-chapter-copy">
            <h2 data-sc-in>But can your next customer find you?</h2>
            <p>Customers are searching Google and increasingly asking AI who to call. But is your business showing up?</p>
            <p>If they can’t find you—or your information is missing or outdated—they could be choosing a competitor without ever knowing you were an option.</p>
            <p className="product-question">What could it mean for your business if more of those searches turned into conversations with you?</p>
            <p>Start speaking with Gary about your GAP Score and discover where you could be missing opportunities to get found and get chosen.</p>
            <a href="/contact" data-open-gary className="story-link">Talk with Gary about GAP <span aria-hidden="true">↗</span></a>
          </div>
        </section>

        <section id="engagement" className="product-scene product-scene-reverse story-chapter" data-sc-act="flow">
          <div className="product-art smartsite-art device-art" aria-hidden="true">
            <div className="color-ribbon ribbon-violet" />
            <PhotographicDevice kind="laptop" className="laptop-device" screenClassName="laptop-screen smartsite-screen">
              <div className="device-toolbar"><i /><i /><i /><span>Your website</span></div>
              <strong>SmartSite</strong>
              <div className="demo-conversation website-conversation">
                <span className="demo-step">Do you offer the service I need?</span>
                <span className="demo-step demo-reply">Let’s find the right next step together.</span>
                <span className="demo-step demo-handoff">From website visit to a real conversation.</span>
              </div>
            </PhotographicDevice>
            <div className="floating-message message-search">I have a question about your service.</div>
            <div className="floating-message message-answer"><span className="message-dot mint" />Let’s find your next step.</div>
          </div>
          <div className="story-chapter-copy">
            <h2 data-sc-in>They found you.<br />Now give them a reason to stay.</h2>
            <p>Someone found your business and clicked your website. What happens next?</p>
            <p>If they can’t find answers or figure out the next step, they may leave before you ever know they were interested.</p>
            <p className="product-question">What if your website could start a conversation, answer their questions, and give you an opportunity to follow up?</p>
            <p>Talk with Gary about SmartSite and discover how your website could turn more visits into real customer opportunities.</p>
            <a href="/contact" data-open-gary className="story-link">Explore SmartSite with Gary <span aria-hidden="true">↗</span></a>
          </div>
        </section>

        <section id="response" className="product-scene story-chapter" data-sc-act="flow">
          <div className="product-art aim-art device-art" aria-hidden="true">
            <div className="color-ribbon ribbon-mint" />
            <Iphone className="phone-device"><Image className="aim-device-logo" src="/aim-logo.webp" alt="AIM Digital / Voice" width={640} height={256} sizes="260px" /><p>AI Interaction Manager</p>
              <div className="conversation-wave">{Array.from({ length: 17 }, (_, i) => <i key={i} style={{ height: `${20 + (8 - Math.abs(8 - i)) * 9}px`, animationDelay: `${i * 70}ms` }} />)}</div>
              <div className="screen-prompt"><span className="typed-line">How can I help?</span></div>
              <div className="demo-conversation">
                <span className="demo-step">Can you help me get started?</span>
                <span className="demo-step demo-reply">Of course. What does your business need?</span>
                <span className="demo-step demo-handoff">A conversation your team can follow up.</span>
              </div>
            </Iphone>
            <div className="floating-message message-search">A question becomes a conversation.</div>
            <div className="floating-message message-answer"><span className="message-dot mint" />Keep the human connection.</div>
          </div>
          <div className="story-chapter-copy">
            <h2 data-sc-in>Be there when interest becomes a question.</h2>
            <p>A potential customer has a question. But what happens when you’re helping someone else or your business is closed?</p>
            <p>If nobody responds, they may move on before you get a chance to help.</p>
            <p className="product-question">What if you could keep that conversation going and give your team the information they need to follow up?</p>
            <p>Meet AIM, your AI Interaction Manager. Talk with Gary about helping your business respond online or by phone—while keeping the human connection.</p>
            <a href="/contact" data-open-gary className="story-link">Meet AIM with Gary <span aria-hidden="true">↗</span></a>
          </div>
        </section>
      </div>

      <section className="discovery-human story-guide">
        <div className="human-conversation" role="img" aria-label="A businesswoman having a phone conversation in her office">
          <video muted loop playsInline preload="none" poster="/business-conversation-poster.webp" data-conversation-video>
            <source data-src="/business-conversation.mp4" type="video/mp4" />
          </video>
        </div>
        <p>Technology starts the conversation.<br /><strong>People build the relationship.</strong></p>
        <Link href="/ai-trust" className="story-link">Our approach to AI + Trust ↗</Link>
        <Link href="/about" className="story-link">Meet Etoyi, founder of Easy AI ↗</Link>
      </section>
      <section id="free-assessment" className="discovery-close">
        <h2>Your next customer<br />is looking.</h2>
        <p>Let’s help them find you.</p>
        <a href="/contact" data-open-gary className="btn-green">Start speaking with Gary</a>
        <Link href="/assessment" className="story-link">Start Your Free Assessment ↗</Link>
        <Link href="/assessment?intent=consultation" className="story-link">Start Your Consultation ↗</Link>
      </section>
    </div>
  );
}
