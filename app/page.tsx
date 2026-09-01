import Link from 'next/link';
import type { Metadata } from 'next';
import HeroVideo from '@/components/HeroVideo';
import ResponsiveImage from '@/components/ResponsiveImage';

export const metadata: Metadata = {
  title: 'Easy AI | Get Found, Get Chosen, Turn Attention Into Customers',
  description:
    'Easy AI helps local businesses appear when customers search Google or ask AI who to call, turn website attention into inquiries, and respond before interest fades.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Easy AI | Get Found, Get Chosen, Turn Attention Into Customers',
    description:
      'Easy AI helps local businesses appear when customers search Google or ask AI who to call, turn website attention into inquiries, and respond before interest fades.',
    url: '/',
    type: 'website',
  },
};
/* ── Inline SVG icons ───────────────────────────────────────────────────────── */
const IconClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const IconTrending = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
  </svg>
);
const IconLayers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <polygon points="12 2 22 8.5 12 15 2 8.5" />
    <polyline points="22 8.5 22 15.5 12 22 2 15.5 2 8.5" />
  </svg>
);
const IconFlow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
  </svg>
);
const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconChart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);
const IconList = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);
const IconDoc = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
  </svg>
);
const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" />
  </svg>
);
const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const IconBubble = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const IconHand = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
    <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
    <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
    <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
  </svg>
);


const IconPhone = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.68 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.32 1.85.55 2.81.68A2 2 0 0 1 22 16.92z" />
  </svg>
);
const IconPin = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
);

/* ── Data ───────────────────────────────────────────────────────────────────── */

/** Section 2 — the four places a local business quietly loses customers. Deliberately
 *  problem-only: no mention of how Easy AI solves any of them (see the secrecy rules). */
const lossPoints = [
  { icon: <IconSearch />, title: 'Hard to Find',                 body: 'Potential customers cannot choose a business they never discover.' },
  { icon: <IconFlow />,   title: 'Visitors Leave Without Acting', body: 'A website can receive attention without turning that attention into a real inquiry.' },
  { icon: <IconPhone />,  title: 'Calls Go Unanswered',           body: 'A missed call can quickly become another company’s customer.' },
  { icon: <IconClock />,  title: 'Follow-Up Happens Too Slowly',  body: 'Customer interest fades when the next step is unclear or delayed.' },
];

/** Section 7 — the customer-facing journey. High level on purpose: no architecture,
 *  no vendors, no internal routing or recommendation logic. */
const journey = [
  { num: '01', icon: <IconSearch />, label: 'Get Discovered',          body: 'Show up when nearby customers are searching, on Google and in AI-powered answers.' },
  { num: '02', icon: <IconBubble />, label: 'Create Interest',         body: 'Give visitors a clear reason to keep reading and an obvious next step to take.' },
  { num: '03', icon: <IconList />,   label: 'Capture the Opportunity', body: 'Turn interest into a real inquiry with the details your team needs to act on it.' },
  { num: '04', icon: <IconPhone />,  label: 'Respond Quickly',        body: 'Answer quickly, so an interested customer is not left waiting or calling a competitor.' },
  { num: '05', icon: <IconUser />,   label: 'Human Follow-Up',         body: 'A person takes it from there, with the context already gathered and organized.' },
];

/** Section 8 — broader services, kept intentionally result-focused. No proprietary
 *  product names, no delivery process, no pricing formulas, no specifications. */
const services = [
  { icon: <IconChart />,  title: 'Business AI Assessment and Strategy', body: 'Understand where AI realistically fits your business before spending on it.' },
  { icon: <IconLayers />, title: 'AI Tool Selection',                   body: 'Choose tools that match how you already work, and skip the ones you do not need.' },
  { icon: <IconBubble />, title: 'Custom AI Agents',                    body: 'Handle defined, repetitive customer and internal tasks with clear boundaries.' },
  { icon: <IconFlow />,   title: 'Workflow Automation',                 body: 'Remove manual handoffs so work moves without someone chasing it.' },
  { icon: <IconDoc />,    title: 'Custom Business Systems',             body: 'Fit the software to your process when off-the-shelf tools cannot.' },
  { icon: <IconHand />,   title: 'Implementation and Ongoing Support',  body: 'Get it working in the real business, then keep it working as things change.' },
];

const trustItems = [
  { icon: <IconShield />, title: 'Human Control Where It Matters', body: 'Sensitive decisions stay with people. AI supports judgment, it does not replace it.' },
  { icon: <IconUser />,   title: 'Clear Boundaries',              body: 'Customer-facing systems are given defined limits and a path to reach a real person.' },
  { icon: <IconBubble />, title: 'Reviewed for Fit and Trust',    body: 'We review recommendations for business fit, trust, data access, and human control.' },
  { icon: <IconHand />,   title: 'Not Everything Should Be Automated', body: 'We do not automate something simply because it is technically possible.' },
];

const assessmentAreas = [
  'How customers currently find you, across Google and AI search',
  'Whether your website turns interest into real inquiries',
  'How quickly inquiries and calls actually get answered',
];

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function HomePage() {
  return (
    <>
      {/* ── S1 HERO — outcome-first ──────────────────────────────────────── */}
      <section className="bg-navy-900 overflow-hidden border-b border-navy-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 max-[380px]:py-0 md:py-20 flex flex-col md:grid md:grid-cols-[2fr_1fr] lg:grid-cols-[3fr_2fr] md:items-start gap-1 max-[380px]:gap-0 md:gap-3 md:gap-x-10">

          {/* Left: copy */}
          <div>
            {/* The approved label text is long and wraps to two lines on a phone, which pushed the
                hero video down far enough to collide with Gary's fixed launcher (measured: 9px of
                overlap at 360x800, 8px at 390x844). The wording is fixed, so the height is
                reclaimed instead: a smaller size and tighter tracking below sm, returning to the
                standard eyebrow scale at sm and up. Tailwind utilities win over the
                .eyebrow-silver @layer components rule, so these override cleanly. */}
            <p className="eyebrow-silver mb-2 max-[380px]:mb-0 text-[10px] leading-[1.3] tracking-[0.1em] sm:text-xs sm:leading-normal sm:tracking-widest">
              Google + AI Visibility&nbsp;&nbsp;·&nbsp;&nbsp;Website Engagement&nbsp;&nbsp;·&nbsp;&nbsp;Customer Response
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-semibold text-white leading-tight mb-2 sm:mb-3 max-[380px]:mb-0">
              Get Found. Get Chosen. Turn Attention Into Customers.
            </h1>
            {/* The approved supporting sentence is longer than the one this hero was last
                measured against and costs several extra lines on a phone, which pushed the video
                back into Gary's launcher. The wording is fixed, so the height is reclaimed from
                the mobile type scale instead: smaller size and tighter leading below sm, full
                text-lg/relaxed from sm up where there is room. */}
            <p className="text-silver-light text-base leading-snug sm:text-lg sm:leading-relaxed mb-3 sm:mb-4 max-[380px]:mb-0 font-sans">
              Easy AI helps your business appear when customers search Google or ask Artificial Intelligence who to call. Once they find you, we help turn website attention into conversations, captured leads, and real customer opportunities.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-3 max-[380px]:mb-0">
              <Link href="/assessment" className="btn-green text-base px-7 py-2.5 sm:py-3.5">
                Start Your Free Assessment
              </Link>
              {/* Routed through the assessment rather than straight to a calendar: the assessment is
                  what makes the consultation useful, and the visitor still schedules by their own action
                  at the end. See app/assessment/page.tsx for the consultation-intent notice. */}
              <Link href="/assessment?intent=consultation" className="btn-ghost-white text-base px-7 py-2.5 sm:py-3.5">
                Book a Consultation
              </Link>
            </div>
            <p className="text-silver-dark text-xs font-sans">
              Practical AI systems designed around your business&mdash;with human control where it matters.
            </p>
          </div>

          {/* Right: video — a two-tier grid split (~67/33 at md, tightening to 60/40 at lg+),
              using fr units specifically so md:gap-x-10 is subtracted from the available width
              before the columns are sized — the previous flex-basis-percentage layout added its
              gap ON TOP of two percentages that already summed to 100%, silently overflowing the
              container's own right edge by the full gap width, which is what actually pushed the
              video visually against the viewport edge. The 60/40 split alone was too tight at
              768px specifically (md's own lower bound) — it squeezed the CTA buttons onto three
              lines each; the wider md-tier ratio keeps 768–1023px comfortable, and 1024px+ has
              enough room for the full 60/40 target. Below md the hero stacks (flex-col) and the
              video renders after the CTA/disclaimer, same source order as before — Gary's
              existing compact-mode CTA
              clearance (globals.css, the "mobile CTA overlap" fix) was measured and tuned against
              the CTA sitting at its current position, so the video must not move ahead of it and
              push it down again. hero-video-wrap keeps the video at a real, useful size on mobile
              (>=180px at 360px wide, >=200px at 390px+ — see globals.css) rather than shrinking it
              into a thumbnail; the clearance from Gary's launcher instead comes from tighter mobile
              hero spacing above (most of it scoped to a max-[380px]: tier so 390px+ keeps its
              normal rhythm) plus, only at the narrowest breakpoint, a small bounded upward nudge on
              the video itself. md:items-start on the row plus hero-video-desktop-align's own
              negative margin-top (see globals.css) lift the video to sit near the headline's upper
              half instead of vertically centered against the whole text block — a real layout
              adjustment, not a transform, so it doesn't leave dead space in document flow. Gary's
              own size/position/behavior is untouched. */}
          <div className="hero-video-wrap hero-video-desktop-align md:w-full md:mx-0 flex-shrink-0">
            <HeroVideo />
          </div>

        </div>
      </section>

      {/* ── S2 WHERE CUSTOMERS ARE LOST ──────────────────────────────────── */}
      <section className="bg-navy-900 py-20 md:py-28 border-b border-navy-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-10">
            <p className="eyebrow-silver mb-3">WHERE CUSTOMERS ARE LOST</p>
            <h2 className="text-3xl md:text-4xl font-serif font-semibold text-white mb-4">
              Your business may be losing customers before you ever speak to them.
            </h2>
            <p className="text-silver-light font-sans text-lg max-w-2xl leading-relaxed">
              Most lost customers never become a conversation. They search, they browse, they call once, and then they move on to whoever answers first.
            </p>
          </div>

          {/* Two-column on desktop: image left at ~43% of the section, the four customer-loss
              statements stacked on the right. Below md it stacks image-first, statements under.
              w-full overrides .responsive-media--landscape's clamp (Tailwind utilities beat the
              @layer components rule) so the image fills its own column instead of being sized
              against the full section width. The file and alt text are unchanged. */}
          <div className="flex flex-col md:flex-row md:items-start gap-10 md:gap-14">
            <div className="md:w-[43%] md:flex-shrink-0">
              <ResponsiveImage
                orientation="landscape"
                src="/hero-section-banner.jpeg"
                alt="Home-service professional receiving a new customer opportunity while working at a residential HVAC property."
                width={2752}
                height={1536}
                sizes="(max-width: 768px) 92vw, 550px"
                loading="lazy"
                className="w-full rounded-lg"
              />
            </div>

            <ul className="md:w-[57%] flex flex-col gap-7 md:gap-8 list-none">
              {lossPoints.map((p, i) => (
                <li
                  key={p.title}
                  className={`flex items-start gap-4${i > 0 ? ' pt-7 md:pt-8 border-t border-navy-800' : ''}`}
                >
                  <span className="text-silver flex-shrink-0 mt-0.5" aria-hidden="true">{p.icon}</span>
                  <div>
                    <h3 className="font-serif font-semibold text-white text-lg mb-1.5">{p.title}</h3>
                    <p className="font-sans text-sm text-silver-light leading-relaxed">{p.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── S3 GET DISCOVERED ────────────────────────────────────────────── */}
      <section className="bg-navy-900 py-20 md:py-28 border-b border-navy-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="eyebrow-silver mb-3">GETTING DISCOVERED</p>
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-white mb-4">
            Being found on Google and in AI search.
          </h2>
          <p className="font-sans text-silver-light leading-relaxed text-lg mb-6">
            Customers no longer look in one place. They search Google, they read reviews and map listings, and increasingly they ask an AI assistant for a recommendation. If your business information is thin, inconsistent, or missing, you can be left out of the answer entirely.
          </p>
          <p className="font-sans text-silver-light leading-relaxed">
            Easy AI works on how clearly and consistently your business shows up in the places customers actually look, so you are considered in the first place.
          </p>
          <p className="font-sans text-xs text-silver-dark mt-6 leading-relaxed">
            Visibility work improves how your business is represented. No one can guarantee rankings or placement, and we do not.
          </p>
        </div>
      </section>

      {/* ── S4 TURN INTEREST INTO OPPORTUNITIES ──────────────────────────── */}
      <section className="bg-navy-900 py-20 md:py-28 border-b border-navy-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="eyebrow-silver mb-3">WEBSITE ENGAGEMENT</p>
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-white mb-4">
            Turning website interest into real opportunities.
          </h2>
          <p className="font-sans text-silver-light leading-relaxed text-lg mb-6">
            Traffic on its own is not a result. A visitor who reads your page, cannot tell what to do next, and leaves without reaching out looks identical to a visitor who was never interested.
          </p>
          <p className="font-sans text-silver-light leading-relaxed">
            Easy AI focuses on giving an interested visitor an obvious next step and a simple way to raise their hand, so more of the attention you already receive becomes a real inquiry your team can act on.
          </p>
        </div>
      </section>

      {/* ── S5 FASTER RESPONSE ───────────────────────────────────────────── */}
      <section className="bg-navy-900 py-20 md:py-28 border-b border-navy-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="eyebrow-silver mb-3">CUSTOMER RESPONSE</p>
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-white mb-4">
            Faster response, fewer missed opportunities.
          </h2>
          <p className="font-sans text-silver-light leading-relaxed text-lg mb-6">
            Speed decides more deals than most owners realize. A call that rings out during a job, an inquiry that arrives after hours, or a quote that goes quiet for two days is usually a customer who has already called someone else.
          </p>
          <p className="font-sans text-silver-light leading-relaxed">
            Easy AI helps make sure inquiries are acknowledged quickly and consistently, and that a real person picks up the relationship when it matters.
          </p>
        </div>
      </section>

      {/* ── S6 FREE ASSESSMENT ───────────────────────────────────────────── */}
      <section className="bg-navy-900 py-20 md:py-28 border-b border-navy-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row md:items-start gap-14 md:gap-20">

          <div className="md:w-[65%]">
            <p className="eyebrow-silver mb-4">FREE BUSINESS ASSESSMENT</p>
            <h2 className="text-3xl md:text-4xl font-serif font-semibold text-white mb-6">
              See Where Your Business May Be Losing Customers.
            </h2>
            <p className="font-sans text-silver-light leading-relaxed mb-8">
              Answer a few questions about your visibility, website, customer response, follow-up, and daily operations. Easy AI will identify likely gaps and help determine the most practical next step.
            </p>
            <p className="font-sans font-semibold text-white text-sm mb-4">What it looks at:</p>
            <ul className="space-y-3 mb-10">
              {assessmentAreas.map(item => (
                <li key={item} className="flex items-start gap-3 font-sans text-silver-light text-sm">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal/20 text-teal flex items-center justify-center mt-0.5" aria-hidden="true">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/assessment" className="btn-green text-sm px-7 py-3.5 inline-flex">
              Start Your Free Assessment
            </Link>
            <p className="font-sans text-xs text-silver-dark mt-4 leading-relaxed max-w-sm">
              The assessment highlights likely gaps and a suggested starting point. It is not a guarantee of rankings, leads, or revenue.
            </p>
          </div>

          {/* Image 2 (9:16) — intrinsic 1536x2752, true portrait ratio preserved. */}
          <div className="md:w-[35%] flex items-center justify-center">
            <ResponsiveImage
              orientation="portrait"
              src="/community-trust-visual.jpeg"
              alt="Homeowner completing a service request as a professional home-service technician arrives."
              width={1536}
              height={2752}
              sizes="(max-width: 768px) 70vw, 340px"
              loading="lazy"
            />
          </div>

        </div>
      </section>

      {/* ── S7 HOW EASY AI WORKS — customer journey, high level only ─────── */}
      <section id="how-easy-ai-works" className="bg-navy-900 py-20 md:py-28 border-b border-navy-800" style={{ scrollMarginTop: '64px' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="eyebrow-silver mb-3">HOW EASY AI WORKS</p>
            <h2 className="text-3xl md:text-4xl font-serif font-semibold text-white mb-4">
              From first search to a real conversation.
            </h2>
            <p className="font-sans text-silver-light leading-relaxed max-w-2xl mx-auto">
              The same path every customer takes, whether or not anyone is managing it.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8">
            {journey.map(s => (
              <div key={s.num} className="flex flex-col">
                <div className="text-silver mb-4" aria-hidden="true">{s.icon}</div>
                <p className="font-sans text-xs font-semibold text-silver tracking-widest mb-2">{s.num}</p>
                <h3 className="font-serif font-semibold text-white text-lg mb-3">{s.label}</h3>
                <p className="font-sans text-sm text-silver-light leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>

          <p className="font-sans text-xs text-silver-dark text-center mt-12">
            Every recommendation is human-reviewed and matched to how your business actually operates.
          </p>
        </div>
      </section>

      {/* ── S8 BROADER SERVICES ──────────────────────────────────────────── */}
      <section className="bg-navy-900 py-20 md:py-28 border-b border-navy-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-10">
            <p className="eyebrow-silver mb-3">BEYOND CUSTOMER GROWTH</p>
            <h2 className="text-3xl md:text-4xl font-serif font-semibold text-white mb-4">
              When the Problem Goes Beyond Customer Growth
            </h2>
            <p className="text-silver-light font-sans text-lg max-w-2xl leading-relaxed">
              Getting found and capturing opportunities is where most businesses feel the loss first. When the bottleneck sits deeper in operations, Easy AI works there too.
            </p>
          </div>

          {/* Image 3 (16:9) — intrinsic 2752x1536. */}
          <div className="mb-12 flex justify-center">
            <ResponsiveImage
              orientation="landscape"
              src="/local-growth-showcase.jpeg"
              alt="Chiropractic practice using organized digital workflows while staff assist patients."
              width={2752}
              height={1536}
              sizes="(max-width: 768px) 70vw, 560px"
              loading="lazy"
            />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-8">
            {services.map(s => (
              <div key={s.title} className="border-l-2 border-teal pl-5">
                <div className="text-silver mb-3" aria-hidden="true">{s.icon}</div>
                <h3 className="font-serif font-semibold text-white text-lg mb-2">{s.title}</h3>
                <p className="font-sans text-sm text-silver-light leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>

          <p className="font-sans text-xs text-silver-dark mt-10">
            You keep control of every decision. We explain the options; you decide what moves forward.
          </p>
        </div>
      </section>

      {/* ── S9 AI + TRUST ────────────────────────────────────────────────── */}
      <section className="bg-navy-900 py-20 md:py-28 border-b border-navy-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-12 max-w-2xl">
            <p className="eyebrow-silver mb-3">AI + TRUST</p>
            <h2 className="text-3xl md:text-4xl font-serif font-semibold text-white mb-4">
              AI should support people, not replace judgment.
            </h2>
            <p className="font-sans text-silver-light leading-relaxed">
              Automation is easy to oversell. Easy AI reviews every recommendation for business fit, trust, data access, and human control, and says no when automating something would cost more than it returns.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {trustItems.map(t => (
              <div key={t.title} className="flex flex-col gap-3">
                <div className="text-silver" aria-hidden="true">{t.icon}</div>
                <h3 className="font-serif font-semibold text-white text-lg">{t.title}</h3>
                <p className="font-sans text-sm text-silver-light leading-relaxed">{t.body}</p>
              </div>
            ))}
          </div>

          <p className="font-sans text-xs text-silver-dark mt-12">
            If a tool is not right for your business, we will tell you, even if that means recommending nothing.
          </p>
        </div>
      </section>

      {/* ── S10 FOUNDER — existing approved brand content, preserved ──────── */}
      <section className="bg-navy-900 py-20 md:py-28 border-b border-navy-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="eyebrow-silver mb-4">EXPERIENCE BEFORE TECHNOLOGY</p>
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-white mb-6">
            Helping business owners win the customers they are already close to.
          </h2>
          <p className="font-sans text-silver-light leading-relaxed mb-4 text-lg">
            I am Etoyi, with over 30 years of experience in sales and entrepreneurship. My growing frustration with spending more time doing busywork than actually working or enjoying time with my family led me to create Easy AI.
          </p>
          <p className="font-sans text-silver-light leading-relaxed mb-10 text-lg">
            The businesses I talk with are rarely short on effort. They are losing customers in the gaps, the call that came in during a job, the visitor who could not tell what to do next, the estimate nobody followed up on. That is the work Easy AI focuses on first.
          </p>

          <blockquote className="border-l-4 border-teal pl-6 mb-10">
            <p className="font-serif text-xl md:text-2xl text-white italic leading-relaxed">
              &ldquo;You can always make more money. You cannot make more time. My goal is to help you buy some of yours back.&rdquo;
            </p>
            <footer className="font-sans text-sm text-silver-dark mt-3">Etoyi, Founder of Easy AI</footer>
          </blockquote>

          <Link href="/about" className="btn-green text-sm px-7 py-3.5 inline-flex">
            Meet Etoyi
          </Link>
        </div>
      </section>

      {/* ── S11 FINAL CTA ────────────────────────────────────────────────── */}
      <section className="bg-navy-900 py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <p className="eyebrow-silver mb-4">START HERE</p>
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-white mb-6">
            Find out where your customers are going instead.
          </h2>
          <p className="font-sans text-silver-light text-lg leading-relaxed mb-10">
            Start with the free assessment, or book a consultation and walk through it with a person. Either way, you will leave knowing which gap is costing you the most right now.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/assessment" className="btn-green text-base px-8 py-4 inline-flex">
              Start Your Free Assessment
            </Link>
            <Link href="/assessment?intent=consultation" className="btn-ghost-white text-base px-8 py-4 inline-flex">
              Book a Consultation
            </Link>
          </div>
          <p className="font-sans text-xs text-silver-dark mt-6">
            No generic tool lists. No pressure. Practical guidance built around your business.
          </p>
        </div>
      </section>
    </>
  );
}
