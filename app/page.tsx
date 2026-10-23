import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
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
          <div className="discovery-orbit story-hero-plane" data-sc-parallax="-0.12" aria-hidden="true" />
          <div className="discovery-search" aria-hidden="true">
            <span className="search-symbol">⌕</span><span>Who should you call?</span>
            <div className="discovery-result"><span className="result-pin">◎</span><div><strong>Your business</strong><small>Ready for your next customer.</small></div><span>↗</span></div>
          </div>
          <div className="discovery-brand">
            <Image className="easyai-wordmark" src="/easy-ai-logo-transparent.png" alt="Easy AI. Business AI Solutions." width={1430} height={290} sizes="(max-width: 767px) 75vw, 480px" priority />
            <h1>Get Found.<br /><span>Get Chosen.</span></h1>
            <a href="#introduction" className="story-link">Discover what’s possible <span aria-hidden="true">↗</span></a>
          </div>
        </div>
      </section>

      <section id="introduction" className="discovery-intro" data-sc-act="flow">
        <p data-sc-in>Easy AI helps your business appear when customers search Google or ask Artificial Intelligence who to call. Once they find you, we help turn website attention into conversations, captured leads, and real customer opportunities.</p>
      </section>
      <nav className="story-nav" aria-label="Explore Easy AI">
        <a href="#discovery">GAP</a><a href="#engagement">SmartSite</a><a href="#response">AIM</a><a href="#free-assessment">Start here ↗</a>
      </nav>

      <div id="how-easy-ai-works">
        <section id="discovery" className="product-scene story-chapter" data-sc-act="flow">
          <div className="product-art gap-art" aria-hidden="true" data-sc-parallax="0.07">
            <div className="discovery-rings"><span /><span /><span /></div>
            <strong>GAP<span className="product-subtitle">Google + AI Presence</span></strong>
            <span className="art-caption">Be part of the answer.</span>
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
          <div className="product-art smartsite-art" aria-hidden="true">
            <div className="site-window"><div className="window-bar"><i /><i /><i /></div><strong>Smart<span>Site</span></strong><p>More than a website.<br />A conversation that converts.</p><div className="site-conversation" data-sc-in>Let’s talk about what you need. <span>↗</span></div></div>
            <span className="art-caption">Make the visit matter.</span>
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
          <div className="product-art aim-art" aria-hidden="true">
            <strong>AIM<span className="product-subtitle">AI Interaction Manager</span></strong>
            <div className="conversation-wave">{Array.from({ length: 17 }, (_, i) => <i key={i} style={{ height: `${20 + (8 - Math.abs(8 - i)) * 9}px` }} />)}</div>
            <span className="art-caption">A conversation. A connection.</span>
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
        <p>Technology starts the conversation.<br /><strong>People build the relationship.</strong></p>
        <Link href="/ai-trust" className="story-link">Our approach to AI + Trust ↗</Link>
        <Link href="/about" className="story-link">Meet Etoyi, founder of Easy AI ↗</Link>
      </section>
      <section id="free-assessment" className="discovery-close">
        <h2>Your next customer<br />is looking.</h2>
        <p>Let’s help them find you.</p>
        <a href="/contact" data-open-gary className="btn-green">Start speaking with Gary</a>
        <Link href="/assessment" className="story-link">Start Your Free Assessment ↗</Link>
        <Link href="/assessment?intent=consultation" className="story-link">Book a Consultation ↗</Link>
      </section>
    </div>
  );
}
