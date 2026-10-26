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
    <div className="home-story" data-opening-pending>
      <noscript><style>{'.home-story[data-opening-pending] .discovery-brand{opacity:1!important}'}</style></noscript>
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
            <div className="logo-depth"><svg className="easyai-wordmark" viewBox="0 0 1240 280" role="img" aria-label="Easy AI. Business AI Solutions.">
              <title>Easy AI. Business AI Solutions.</title>
              {[{ sx:27, sy:10, width:552, height:220, x:0, y:0, slices:16 },
                { sx:630, sy:48, width:90, height:126, x:592, y:48, slices:4 },
                { sx:756, sy:48, width:114, height:126, x:696, y:48, slices:4 },
                { sx:904, sy:48, width:95, height:126, x:824, y:48, slices:4 },
                { sx:1030, sy:48, width:111, height:126, x:933, y:48, slices:4 },
                { sx:1206, sy:48, width:114, height:126, x:1078, y:48, slices:4 },
                { sx:1356, sy:48, width:33, height:126, x:1206, y:48, slices:4 }].flatMap((part, partIndex) => Array.from({ length:part.slices }, (_, index) => {
                  // Preserve supplied glyph pixels; close gaps, then wrap around the sphere.
                  const x = part.x + part.width * index / part.slices;
                  const position = (x + part.width / part.slices / 2) / 1240 * 2 - 1;
                  const scale = 1 - .08 * position * position;
                  const curveX = (value: number) => (Math.sin((value / 1240 * 2 - 1) * .85) / Math.sin(.85) + 1) * 620;
                  return <svg key={`${partIndex}-${index}`} x={curveX(x)} y={part.y * scale + 20 * position * position} width={curveX(x + part.width / part.slices) - curveX(x) + .2} height={part.height * scale} viewBox={`${part.sx + part.width * index / part.slices} ${part.sy} ${part.width / part.slices} ${part.height}`} preserveAspectRatio="none"><image href="/easy-ai-wordmark.webp" width="1430" height="290" /></svg>;
                }))}
              <svg x="592" y="200" width="647" height="39" viewBox="630 185 760 48" preserveAspectRatio="none"><image href="/easy-ai-wordmark.webp" width="1430" height="290" /></svg>
            </svg></div>
            <h1>Get Found. Get Chosen.</h1>
            <a href="#introduction" className="story-link">Discover what’s possible <span aria-hidden="true">↗</span></a>
          </div>
        </div>
      </section>

      <section id="introduction" className="discovery-intro" data-sc-act="flow">
        <p data-sc-in>Easy AI helps your business appear when customers search Google or ask Artificial Intelligence who to call. Once they find you, we help turn website attention into conversations, captured leads, and real customer opportunities.</p>
        <div className="product-identities" aria-label="GAP, SmartSite, and AIM" data-sc-in>
          <svg width="0" height="0" className="logo-mask-definitions" aria-hidden="true" focusable="false"><defs><filter id="gap-paper-mask" colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -1 -1 -1 0 2.85" result="paperless" /><feComposite in="paperless" in2="SourceAlpha" operator="in" /></filter></defs></svg>
          <div className="product-identity identity-gap">
            <svg className="identity-context" viewBox="0 0 360 240" aria-hidden="true"><circle cx="180" cy="120" r="100" /><circle cx="180" cy="120" r="74" /><path d="M30 155H100L150 70H255L330 135M55 55L130 120H290M70 205L220 50" /><circle cx="100" cy="155" r="6" /><circle cx="255" cy="70" r="6" /></svg>
            <Image className="gap-identity" src="/gap-logo.png" alt="GAP — Google and AI Presence" width={1254} height={1254} sizes="(max-width:767px) 300px, 300px" />
          </div>
          <div className="product-identity identity-web">
            <svg className="identity-context" viewBox="0 0 360 240" aria-hidden="true"><rect x="30" y="35" width="300" height="170" rx="20" /><path d="M30 70H330M60 110H140M60 135H115M200 115H290V160H240L220 180V160H200Z" /><circle cx="54" cy="52" r="3" /><circle cx="68" cy="52" r="3" /></svg>
            <Image className="smartsite-identity" src="/smartsite-logo.webp" alt="SmartSite" width={2048} height={682} sizes="(max-width:767px) 340px, 340px" />
          </div>
          <div className="product-identity identity-aim">
            <svg className="identity-context" viewBox="0 0 360 240" aria-hidden="true"><path d="M35 120H65L80 80L100 165L120 60L140 175L160 75L180 155L200 90L220 140H325M80 200H270L295 220V200H315V40H80Z" /></svg>
            <Image src="/aim-logo.webp" alt="AIM Digital / Voice" width={640} height={256} sizes="(max-width:767px) 360px, 360px" />
          </div>
        </div>
      </section>


      <div id="how-easy-ai-works">
        <section id="discovery" className="product-scene story-chapter" data-sc-act="flow">
          <div className="product-art gap-art device-art">
            <div className="color-ribbon" />
            <PhotographicDevice kind="laptop" className="laptop-device" screenClassName="laptop-screen">
              <div className="device-toolbar"><i /><i /><i /><span>Your business. Discovered.</span></div>
              <div className="gap-screen"><a href="/contact" data-open-gary className="gap-device-action" aria-label="Talk with Gary about your GAP Score">
                <div className="gap-report-heading"><Image src="/gap-logo.png" alt="GAP — Google and AI Presence" width={1254} height={1254} sizes="100px" /><div><strong>BrightPath Home Services</strong><span>Google + AI Presence</span></div><span className="report-period">6-month overview</span></div>
                <div className="report-summary"><div className="report-score"><span>GAP Score</span><strong>78<small>/100</small></strong><b>↑ 24 points</b></div><div><span>Search discovery</span><strong>+42%</strong><small>120 → 170 searches</small></div><div><span>Customer inquiries</span><strong>+28%</strong><small>18 → 23 inquiries</small></div></div>
                <div className="report-charts"><div><strong className="report-chart-title">Visibility growth</strong><svg className="growth-chart" viewBox="0 0 460 190" aria-hidden="true"><path className="chart-grid" d="M30 25H440M30 80H440M30 135H440" /><path className="chart-area" d="M30 140L110 119L190 94L270 73L350 42L430 15V160H30Z" /><path className="chart-line" pathLength="1" d="M30 140L110 119L190 94L270 73L350 42L430 15" /><g className="chart-labels"><text x="30" y="185">Feb</text><text x="185" y="185">Apr</text><text x="350" y="185">Jun</text><text x="415" y="185">Jul</text></g></svg></div><div><strong className="report-chart-title">Presence breakdown</strong><div className="report-bar"><span>Google</span><i style={{ width:'82%' }} /><b>82</b></div><div className="report-bar"><span>AI visibility</span><i style={{ width:'74%' }} /><b>74</b></div><div className="report-bar"><span>Consistency</span><i style={{ width:'78%' }} /><b>78</b></div></div></div>
                <span className="report-next">Explore your GAP Score ↗</span>
              </a></div>
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
              <strong><Image className="smartsite-screen-logo" src="/smartsite-logo.webp" alt="SmartSite" width={2048} height={682} sizes="350px" /></strong>
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
