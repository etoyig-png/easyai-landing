import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { Iphone } from '@/components/magicui/Iphone';
import PhotographicDevice from '@/components/PhotographicDevice';
import ScrollCraftMotion from '@/components/ScrollCraftMotion';
import continentOutlines from '@/public/data/continent-traces.json';
import { globeVector, projectGlobe } from '@/lib/trace-motion';

export const metadata: Metadata = {
  title: 'Easy AI | Get Found. Get Chosen.',
  description: 'Easy AI helps your business appear when customers search Google or ask Artificial Intelligence who to call. Explore GAP, SmartSite, and AIM.',
};

function RevealSentences({ text }: { text: string }) {
  return <>{text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence, index) =>
    <span className="story-sentence" data-story-reveal key={index}>{sentence.trim()}{' '}</span>
  )}</>;
}

function AimLogo({ id, className = '' }: { id: string; className?: string }) {
  return <svg className={'aim-logo-crisp ' + className} viewBox="0 0 1983 793" role="img" aria-label="AIM Digital / Voice">
    <defs><clipPath id={id}><path d="M0 0H1983V590H940V793H0Z" /></clipPath></defs>
    <image className="aim-artwork" href="/aim-logo.webp?v=1983" width="1983" height="793" clipPath={'url(#' + id + ')'} />
    <text className="aim-subtitle" x="950" y="680" textLength="890" lengthAdjust="spacingAndGlyphs"><tspan fill="#27c4ff">Digital</tspan><tspan fill="#d6e4ef"> / </tspan><tspan fill="#ac55ff">Voice</tspan></text>
  </svg>;
}

export default function HomePage() {
  return (
    <div className="home-story" data-opening-pending>
      <noscript><style>{'.home-story[data-opening-pending] .discovery-brand{opacity:1!important}'}</style></noscript>
      <ScrollCraftMotion />
      <section className="discovery-lead" aria-labelledby="opening-headline">
        <h1 id="opening-headline">Are customers finding your business? We help more of them find you.</h1>
        <Link href="/assessment" className="btn-green">Start Your Free Assessment</Link>
        <p>Get found. Get discovered. Get more prospects.</p>
      </section>

      <section id="introduction" className="discovery-intro" data-sc-act="flow">
        <h2 data-story-reveal>Here’s how.</h2>
        <div className="product-identities" aria-label="GAP, AIM, and SmartSite">
          <svg width="0" height="0" className="logo-mask-definitions" aria-hidden="true" focusable="false"><defs><filter id="gap-paper-mask" colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -1 -1 -1 0 2.85" result="paperless" /><feComposite in="paperless" in2="SourceAlpha" operator="in" /></filter><filter id="brand-radiance" colorInterpolationFilters="sRGB"><feComponentTransfer><feFuncR type="gamma" amplitude="1" exponent=".55" offset="0" /><feFuncG type="gamma" amplitude="1" exponent=".55" offset="0" /><feFuncB type="gamma" amplitude="1" exponent=".55" offset="0" /></feComponentTransfer></filter></defs></svg>
          <div className="identity-entry"><a href="#discovery" aria-label="Explore GAP" className="product-identity identity-gap">
            <canvas aria-hidden="true" className="identity-traces" width="360" height="240" data-light-trace="product" data-trace-color="#ffe28a" />
            <svg className="identity-context" viewBox="0 0 360 240" aria-hidden="true"><ellipse cx="180" cy="120" rx="158" ry="104" /></svg>
            <span className="gap-lockup">
              <svg className="gap-identity" viewBox="0 330 1254 510" role="img" aria-label="GAP">
                <defs><clipPath id="gap-artwork-only"><path d="M0 0H1254V720H470V1254H0Z" /></clipPath></defs>
                <image className="gap-artwork" href="/gap-logo.png" width="1254" height="1254" clipPath="url(#gap-artwork-only)" />
                <text className="gap-subtitle" x="490" y="778" textLength="690" lengthAdjust="spacingAndGlyphs">Google + AI Presence</text>
              </svg>
            </span>
          </a></div>
          <div className="identity-entry"><a href="#response" aria-label="Explore AIM" className="product-identity identity-aim">
            <canvas aria-hidden="true" className="identity-traces" width="360" height="240" data-light-trace="product" data-trace-color="#bbff91" />
            <svg className="identity-context" viewBox="0 0 360 240" aria-hidden="true"><rect x="22" y="16" width="316" height="208" rx="70" /></svg>
            <AimLogo id="aim-plate-artwork" />
          </a></div>
          <div className="identity-entry"><a href="#engagement" aria-label="Explore SmartSite" className="product-identity identity-web">
            <canvas aria-hidden="true" className="identity-traces" width="360" height="240" data-light-trace="product" data-trace-color="#ff9a80" />
            <svg className="identity-context" viewBox="0 0 360 240" aria-hidden="true"><rect x="22" y="16" width="316" height="208" rx="32" /></svg>
            <Image quality={90} className="smartsite-identity" src="/smartsite-logo.webp" alt="SmartSite" width={2048} height={682} sizes="(max-width:767px) 340px, 340px" />
          </a></div>
        </div>
      </section>


      <div id="how-easy-ai-works">
        <section id="discovery" className="product-scene story-chapter" data-sc-act="flow">
          <div className="product-story-visual">
            <div className="product-section-identity" data-story-reveal><span className="gap-lockup">
              <svg className="gap-identity" viewBox="0 330 1254 510" role="img" aria-label="GAP">
                <defs><clipPath id="gap-story-artwork"><path d="M0 0H1254V720H470V1254H0Z" /></clipPath></defs>
                <image className="gap-artwork" href="/gap-logo.png" width="1254" height="1254" clipPath="url(#gap-story-artwork)" />
                <text className="gap-subtitle" x="490" y="778" textLength="690" lengthAdjust="spacingAndGlyphs">Google + AI Presence</text>
              </svg>
            </span></div>
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
            <div className="floating-message message-search" data-story-reveal><span className="message-dot" /><span className="typed-line">Who should you call?</span></div>
            <div className="floating-message message-answer" data-story-reveal><span className="message-dot mint" />Get Found. Get Chosen.</div>
          </div>
          </div>
          <div className="story-chapter-copy" data-story-reveal>
            <h2><RevealSentences text="But can your next customer find you?" /></h2>
            <p><RevealSentences text="Customers are searching Google and increasingly asking AI who to call. But is your business showing up?" /></p>
            <p><RevealSentences text="If they can’t find you—or your information is missing or outdated—they could be choosing a competitor without ever knowing you were an option." /></p>
            <p className="product-question"><RevealSentences text="What could it mean for your business if more of those searches turned into conversations with you?" /></p>
            <p><RevealSentences text="Start speaking with Gary about your GAP Score and discover where you could be missing opportunities to get found and get chosen." /></p>
            <a href="/contact" data-open-gary className="story-link">Talk with Gary about GAP <span aria-hidden="true">↗</span></a>
          </div>
        </section>

        <section id="response" className="product-scene story-chapter" data-sc-act="flow">
          <div className="product-story-visual">
            <div className="product-section-identity" data-story-reveal><AimLogo id="aim-story-artwork" /></div>
          <div className="product-art aim-art device-art" aria-hidden="true">
            <div className="color-ribbon ribbon-mint" />
            <Iphone className="phone-device"><AimLogo id="aim-phone-artwork" className="aim-device-logo" /><p>AI Interaction Manager</p>
              <div className="conversation-wave">{Array.from({ length: 17 }, (_, i) => <i key={i} style={{ height: `${20 + (8 - Math.abs(8 - i)) * 9}px`, animationDelay: `${i * 70}ms` }} />)}</div>
              <div className="screen-prompt"><span className="typed-line">How can I help?</span></div>
              <div className="demo-conversation">
                <span className="demo-step">Can you help me get started?</span>
                <span className="demo-step demo-reply">Of course. What does your business need?</span>
                <span className="demo-step demo-handoff">A conversation your team can follow up.</span>
              </div>
            </Iphone>
            <div className="floating-message message-search" data-story-reveal>A question becomes a conversation.</div>
            <div className="floating-message message-answer" data-story-reveal><span className="message-dot mint" />Keep the human connection.</div>
          </div>
          </div>
          <div className="story-chapter-copy" data-story-reveal>
            <h2><RevealSentences text="Be there when interest becomes a question." /></h2>
            <p><RevealSentences text="A potential customer has a question. But what happens when you’re helping someone else or your business is closed?" /></p>
            <p><RevealSentences text="If nobody responds, they may move on before you get a chance to help." /></p>
            <p className="product-question"><RevealSentences text="What if you could keep that conversation going and give your team the information they need to follow up?" /></p>
            <p><RevealSentences text="Meet AIM, your AI Interaction Manager. Talk with Gary about helping your business respond online or by phone—while keeping the human connection." /></p>
            <a href="/contact" data-open-gary className="story-link">Meet AIM with Gary <span aria-hidden="true">↗</span></a>
          </div>
        </section>

        <section id="engagement" className="product-scene product-scene-reverse story-chapter" data-sc-act="flow">
          <div className="product-story-visual">
            <div className="product-section-identity" data-story-reveal><Image quality={90} src="/smartsite-logo.webp" alt="SmartSite" width={2048} height={682} sizes="340px" /></div>
          <div className="product-art smartsite-art device-art" aria-hidden="true">
            <div className="color-ribbon ribbon-violet" />
            <PhotographicDevice kind="laptop" className="laptop-device" screenClassName="laptop-screen smartsite-screen">
              <div className="device-toolbar"><i /><i /><i /><span>Your website</span></div>
              <strong><Image quality={90} className="smartsite-screen-logo" src="/smartsite-logo.webp" alt="SmartSite" width={2048} height={682} sizes="350px" /></strong>
              <div className="demo-conversation website-conversation">
                <span className="demo-step">Do you offer the service I need?</span>
                <span className="demo-step demo-reply">Let’s find the right next step together.</span>
                <span className="demo-step demo-handoff">From website visit to a real conversation.</span>
              </div>
            </PhotographicDevice>
            <div className="floating-message message-search" data-story-reveal>I have a question about your service.</div>
            <div className="floating-message message-answer" data-story-reveal><span className="message-dot mint" />Let’s find your next step.</div>
          </div>
          </div>
          <div className="story-chapter-copy" data-story-reveal>
            <h2><RevealSentences text="They found you. Now give them a reason to stay." /></h2>
            <p><RevealSentences text="Someone found your business and clicked your website. What happens next?" /></p>
            <p><RevealSentences text="If they can’t find answers or figure out the next step, they may leave before you ever know they were interested." /></p>
            <p className="product-question"><RevealSentences text="What if your website could start a conversation, answer their questions, and give you an opportunity to follow up?" /></p>
            <p><RevealSentences text="Talk with Gary about SmartSite and discover how your website could turn more visits into real customer opportunities." /></p>
            <a href="/contact" data-open-gary className="story-link">Explore SmartSite with Gary <span aria-hidden="true">↗</span></a>
          </div>
        </section>
      </div>

      <section className="discovery-opening" data-sc-act="flow" aria-label="Get discovered">
        <div className="discovery-stage">
          <div className="discovery-reveal" aria-hidden="true" />
          <div className="opening-seed" aria-hidden="true" />
          <div className="discovery-orbit story-hero-plane" data-sc-parallax="-0.08" aria-hidden="true">
            <div className="globe-surface" />
            <svg viewBox="0 0 600 600" className="globe-map-static">
              {continentOutlines.map((outline, index) => {
                let connected = false;
                const path = outline.map(([longitude, latitude]) => {
                  const point = projectGlobe(globeVector(longitude, latitude),25);
                  if (point.z <= 0) { connected = false; return ''; }
                  const command = connected ? 'L' : 'M'; connected = true;
                  return `${command}${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
                }).join('');
                return <path key={index} d={path} />;
              })}
            </svg>
            <canvas aria-hidden="true" className="globe-traces" width="600" height="600" data-light-trace="globe" />
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
              <title>Easy AI. Business AI Solutions.</title><g className="wordmark-artwork">
              {[{ sx:27, sy:10, width:552, height:220, x:0, y:0 },
                { sx:630, sy:48, width:90, height:126, x:592, y:48 },
                { sx:756, sy:48, width:114, height:126, x:696, y:48 },
                { sx:904, sy:48, width:95, height:126, x:824, y:48 },
                { sx:1030, sy:48, width:111, height:126, x:933, y:48 },
                { sx:1206, sy:48, width:114, height:126, x:1078, y:48 },
                { sx:1356, sy:48, width:33, height:126, x:1206, y:48 }].map((part,index) => (
                  <svg key={index} x={part.x} y={part.y} width={part.width} height={part.height} viewBox={`${part.sx} ${part.sy} ${part.width} ${part.height}`} preserveAspectRatio="none"><image href="/easy-ai-wordmark.webp" width="1430" height="290" /></svg>
                ))}
              </g><text className="wordmark-subtitle" x="915.5" y="229" textAnchor="middle" textLength="647" lengthAdjust="spacing">BUSINESS AI SOLUTIONS</text>
            </svg></div>
            <p className="brand-tagline">Get Found. Get Chosen.</p>
            <a href="#free-assessment" className="story-link">Discover what’s possible <span aria-hidden="true">↗</span></a>
          </div>
        </div>
      </section>

      <section className="discovery-assessment" aria-label="Free business assessment">
        <Link href="/assessment" className="btn-green">Start Your Free Assessment</Link>
        <a href="/contact" data-open-gary className="gary-invitation">
          Need more information? Talk to Gary <span className="gary-invitation-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" focusable="false"><path d="m5 5 14 14M5 19h14V5" /></svg></span>
        </a>
        <p className="gary-invitation-note">See AIM, our AI Interaction Manager, in action with Gary.</p>
        <div id="gary-home-slot" className="gary-home-slot" />
      </section>

      <section className="discovery-human story-guide">
        <div className="human-conversation" role="img" aria-label="Two people discussing a tablet outdoors at a construction site">
          <video muted loop playsInline preload="none" poster="/construction-conversation-poster.webp" data-conversation-video>
            <source data-src="/construction-conversation.mp4" type="video/mp4" />
          </video>
        </div>
        <p><span className="story-sentence" data-story-reveal>Technology starts the conversation.</span><strong className="story-sentence" data-story-reveal>People build the relationship.</strong></p>
        <Link href="/ai-trust" className="story-link">Our approach to AI + Trust ↗</Link>
        <Link href="/about" className="story-link">Meet Etoyi, founder of Easy AI ↗</Link>
      </section>
      <section id="free-assessment" className="discovery-close">
        <h2 data-story-reveal>Your next customer<br />is looking.</h2>
        <p data-story-reveal>Let’s help them find you.</p>
        <Link href="/assessment" className="btn-green">Start Your Free Assessment</Link>
        <a href="/contact" data-open-gary className="story-link">Need more information? Talk to Gary <span aria-hidden="true">↘</span></a>
        <Link href="/assessment?intent=consultation" className="story-link">Start Your Consultation ↗</Link>
      </section>
    </div>
  );
}
