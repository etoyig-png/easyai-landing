import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import HeroVideo from '@/components/HeroVideo';

export const metadata: Metadata = {
  title: 'Easy AI | Practical AI Guidance for Small and Midsize Businesses',
  description: 'Easy AI helps business owners find trustworthy AI tools, software, and workflows that reduce busywork, improve operations, and help them buy back their time.',
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

/* ── Data ───────────────────────────────────────────────────────────────────── */
const problems = [
  { icon: <IconClock />,    title: 'Wasted Time',           body: 'Reduce repetitive administrative work and unnecessary manual steps.' },
  { icon: <IconTrending />, title: 'Missed Revenue',        body: 'Improve slow follow-up, inconsistent sales activity, and overlooked opportunities.' },
  { icon: <IconLayers />,   title: 'Software Waste',        body: 'Identify overlapping, underused, or overpriced tools.' },
  { icon: <IconFlow />,     title: 'Operational Friction',  body: 'Create simpler workflows that help your team work faster and more consistently.' },
];

const steps = [
  { num: '01', icon: <IconSearch />, label: 'Discover',           body: 'We learn how your business operates, where work piles up, which tasks drain your time, and what you have already tried.' },
  { num: '02', icon: <IconChart />,  label: 'Analyze',            body: 'We examine your workflows and research AI tools and software matched to your actual problems, not generic recommendations.' },
  { num: '03', icon: <IconList />,   label: 'Prioritize',         body: 'We compare each solution by potential impact, effort, cost, and fit, then focus on the strongest quick wins.' },
  { num: '04', icon: <IconDoc />,    label: 'Present Your Plan',  body: 'You receive clear recommendations, expected business impact, and practical next steps. If you want additional support, Easy AI can help with implementation.' },
];

const deliverables = [
  { title: 'Business Findings',       body: 'A clear summary of the workflow problems, inefficiencies, and opportunities we identified.' },
  { title: 'Matched Solutions',        body: 'AI tools and software researched specifically for your business needs, budget, and current workflow.' },
  { title: 'Priority Recommendations', body: 'The strongest opportunities ranked by value, cost, effort, and ease of adoption.' },
  { title: 'Next Steps',              body: 'A practical path forward, including what to address first, what can wait, and where implementation support may help.' },
];

const trustItems = [
  { icon: <IconShield />, title: 'Independent Guidance',   body: 'We recommend solutions based on your needs, not vendor pressure.' },
  { icon: <IconUser />,   title: 'Human Oversight',        body: 'Important decisions remain in human hands.' },
  { icon: <IconBubble />, title: 'Clear Reasoning',        body: 'We explain why a solution was recommended, what it may improve, and where its limitations are.' },
  { icon: <IconHand />,   title: 'Responsible Adoption',   body: 'We consider security, privacy, employee impact, and customer trust before recommending implementation.' },
];

const assessmentItems = [
  'A clearer view of your biggest operational challenges',
  'Areas where AI or better software may create value',
  'A focused starting point for your consultation',
];

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function HomePage() {
  return (
    <>
      {/* ── S1 HERO ──────────────────────────────────────────────────────── */}
      <section className="bg-navy-900 overflow-hidden border-b border-navy-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-20 flex flex-col md:flex-row md:items-center gap-10 md:gap-16">

          {/* Left: copy */}
          <div className="md:w-[65%] flex-shrink-0">
            <p className="eyebrow-silver mb-4">INDEPENDENT AI ADVISORY</p>
            <h1 className="text-4xl md:text-5xl font-serif font-semibold text-white leading-tight mb-6">
              Find the AI tools your business can actually trust and truly needs.
            </h1>
            <p className="text-silver-light text-lg leading-relaxed mb-8 font-sans">
              Easy AI identifies where your business is losing time and money, then recommends the right AI tools, software, and workflows without the hype, guesswork, or unnecessary technology.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Link href="/assessment" className="btn-green text-base px-7 py-3.5">
                Start Your Free Business Assessment
              </Link>
              <a href="#how-easy-ai-works" className="btn-ghost-white text-base px-7 py-3.5">
                See How Easy AI Works
              </a>
            </div>
            <p className="text-silver-dark text-xs font-sans">
              Independent recommendations&nbsp;&nbsp;·&nbsp;&nbsp;Human-reviewed&nbsp;&nbsp;·&nbsp;&nbsp;Built around your business
            </p>
          </div>

          {/* Right: video – 25% width */}
          <div className="md:w-[35%] flex-shrink-0">
            <HeroVideo />
          </div>

        </div>
      </section>

      {/* ── S2 BUSINESS PROBLEMS ─────────────────────────────────────────── */}
      <section className="bg-navy-900 py-20 md:py-28 border-b border-navy-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-10">
            <p className="eyebrow-silver mb-3">WHERE EASY AI CREATES VALUE</p>
            <h2 className="text-3xl md:text-4xl font-serif font-semibold text-white mb-4">
              Your business does not need more software. It needs fewer problems.
            </h2>
            <p className="text-silver-light font-sans text-lg max-w-2xl leading-relaxed">
              Most businesses already have too many tools and too little clarity. Easy AI finds where work is slowing down, money is leaking, and better technology can make a measurable difference.
            </p>
          </div>

          {/* HVAC image – 25% size */}
          <div className="mb-12 flex justify-center">
            <Image
              src="/easy-ai-work-smarter-hvac.png"
              alt="HVAC professional using AI-assisted scheduling, documents, email, and task management."
              width={2048}
              height={1143}
              className="w-1/4 h-auto object-contain"
              sizes="(max-width: 768px) 50vw, 25vw"
              loading="lazy"
            />
          </div>

          {/* 4 value items */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {problems.map(p => (
              <div key={p.title} className="flex flex-col gap-3">
                <div className="text-silver">{p.icon}</div>
                <h3 className="font-serif font-semibold text-white text-lg">{p.title}</h3>
                <p className="font-sans text-sm text-silver-light leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── S3 ASSESSMENT ────────────────────────────────────────────────── */}
      <section className="bg-navy-900 py-20 md:py-28 border-b border-navy-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row md:items-start gap-14 md:gap-20">

          {/* Left: copy */}
          <div className="md:w-[65%]">
            <p className="eyebrow-silver mb-4">START WITH CLARITY</p>
            <h2 className="text-3xl md:text-4xl font-serif font-semibold text-white mb-6">
              Before we recommend anything, we learn how your business actually works.
            </h2>
            <p className="font-sans text-silver-light leading-relaxed mb-8">
              Our free Business AI Assessment identifies where your company may be losing time, money, and efficiency. Your answers help us prepare a more focused discovery conversation without forcing generic technology into your business.
            </p>
            <p className="font-sans font-semibold text-white text-sm mb-4">What you receive:</p>
            <ul className="space-y-3 mb-10">
              {assessmentItems.map(item => (
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
              Start Your Free Business Assessment
            </Link>
            <p className="font-sans text-xs text-silver-dark mt-4 leading-relaxed max-w-sm">
              No generic tool lists. No automatic sales pitch. Every recommendation starts with your business.
            </p>
          </div>

          {/* Right: electrician image – 25% size */}
          <div className="md:w-[35%] flex items-center justify-center">
            <Image
              src="/easy-ai-business-electrician.png"
              alt="Electrician using a smartphone while AI organizes scheduling, follow-up, and business tasks."
              width={941}
              height={1672}
              className="w-1/4 md:w-1/2 h-auto object-contain mx-auto"
              sizes="(max-width: 768px) 25vw, 15vw"
              loading="lazy"
            />
          </div>

        </div>
      </section>

      {/* ── S4 HOW IT WORKS ──────────────────────────────────────────────── */}
      <section id="how-easy-ai-works" className="bg-navy-900 py-20 md:py-28 border-b border-navy-800" style={{ scrollMarginTop: '64px' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="eyebrow-silver mb-3">A CLEAR PATH FORWARD</p>
            <h2 className="text-3xl md:text-4xl font-serif font-semibold text-white mb-4">
              From business problem to practical recommendations.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map(s => (
              <div key={s.num} className="flex flex-col">
                <div className="text-silver mb-4" aria-hidden="true">{s.icon}</div>
                <p className="font-sans text-xs font-semibold text-silver tracking-widest mb-2">{s.num}</p>
                <h3 className="font-serif font-semibold text-white text-lg mb-3">{s.label}</h3>
                <p className="font-sans text-sm text-silver-light leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>

          <p className="font-sans text-xs text-silver-dark text-center mt-12">
            Every recommendation is researched, human-reviewed, and selected for your business.
          </p>
        </div>
      </section>

      {/* ── S5 WHAT YOU RECEIVE ──────────────────────────────────────────── */}
      <section className="bg-navy-900 py-20 md:py-28 border-b border-navy-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-10">
            <p className="eyebrow-silver mb-3">PRACTICAL GUIDANCE, NOT ANOTHER GENERIC REPORT</p>
            <h2 className="text-3xl md:text-4xl font-serif font-semibold text-white mb-4">
              Clear recommendations you can actually use.
            </h2>
          </div>

          {/* Construction image – 25% size */}
          <div className="mb-2 flex justify-center">
            <Image
              src="/easy-ai-buy-back-time-construction.png"
              alt="Construction business owner reviewing an illustrative AI productivity dashboard on a job site."
              width={2048}
              height={1143}
              className="w-1/4 h-auto object-contain"
              sizes="(max-width: 768px) 50vw, 25vw"
              loading="lazy"
            />
          </div>
          <p className="font-sans text-xs text-silver-dark mb-12 leading-relaxed text-center">
            Illustrative example. Actual recommendations and results depend on each business.
          </p>

          {/* 4 deliverables */}
          <div className="grid sm:grid-cols-2 gap-x-16 gap-y-8">
            {deliverables.map(d => (
              <div key={d.title} className="border-l-2 border-teal pl-5">
                <h3 className="font-serif font-semibold text-white text-lg mb-2">{d.title}</h3>
                <p className="font-sans text-sm text-silver-light leading-relaxed">{d.body}</p>
              </div>
            ))}
          </div>

          <p className="font-sans text-xs text-silver-dark mt-10">
            You keep control of every decision. We explain the options; you decide what moves forward.
          </p>
        </div>
      </section>

      {/* ── S6 AI TRUST ──────────────────────────────────────────────────── */}
      <section className="bg-navy-900 py-20 md:py-28 border-b border-navy-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-12 max-w-2xl">
            <p className="eyebrow-silver mb-3">TECHNOLOGY WITH ACCOUNTABILITY</p>
            <h2 className="text-3xl md:text-4xl font-serif font-semibold text-white mb-4">
              AI should support your business, not control it.
            </h2>
            <p className="font-sans text-silver-light leading-relaxed">
              Every Easy AI recommendation is reviewed by a human and evaluated for business fit, reliability, cost, privacy, and risk.
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

      {/* ── S7 FOUNDER ───────────────────────────────────────────────────── */}
      <section className="bg-navy-900 py-20 md:py-28 border-b border-navy-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="eyebrow-silver mb-4">EXPERIENCE BEFORE TECHNOLOGY</p>
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-white mb-6">
            Helping business owners buy back their most valuable resource, their time.
          </h2>
          <p className="font-sans text-silver-light leading-relaxed mb-4 text-lg">
            I am Etoyi, with over 30 years of experience in sales and entrepreneurship. My growing frustration with spending more time doing busywork than actually working or enjoying time with my family led me to create Easy AI.
          </p>
          <p className="font-sans text-silver-light leading-relaxed mb-10 text-lg">
            I understand that time is the one finite resource you can never get back. That is why I made it my mission to help business owners use the right AI tools, software, and workflows to reclaim their time and focus on the work and people that matter most.
          </p>

          <blockquote className="border-l-4 border-teal pl-6 mb-10">
            <p className="font-serif text-xl md:text-2xl text-white italic leading-relaxed">
              "You can always make more money. You cannot make more time. My goal is to help you buy some of yours back."
            </p>
            <footer className="font-sans text-sm text-silver-dark mt-3">Etoyi, Founder of Easy AI</footer>
          </blockquote>

          <Link href="/about" className="btn-green text-sm px-7 py-3.5 inline-flex">
            Meet Etoyi
          </Link>
        </div>
      </section>

      {/* ── S8 FINAL CTA ─────────────────────────────────────────────────── */}
      <section className="bg-navy-900 py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <p className="eyebrow-silver mb-4">YOUR TIME IS TOO VALUABLE FOR BUSYWORK</p>
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-white mb-6">
            Find the right AI tools to help you buy back your time.
          </h2>
          <p className="font-sans text-silver-light text-lg leading-relaxed mb-10">
            Start with our free Business AI Assessment. We will learn where your time is going, identify repetitive work, and explore tools that fit how your business actually operates.
          </p>
          <Link href="/assessment" className="btn-green text-base px-8 py-4 inline-flex">
            Start Your Free Business Assessment
          </Link>
          <p className="font-sans text-xs text-silver-dark mt-6">
            No generic tool lists. No pressure. Just practical guidance built around your business.
          </p>
        </div>
      </section>
    </>
  );
}
