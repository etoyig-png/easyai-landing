import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'How It Works' };

/**
 * The complete public service range. Descriptions are outcome-first on purpose: they say what the
 * business gets, never which internal system delivers it. No proprietary product names appear
 * here or anywhere else visitor-facing.
 */
const services: { n: string; title: string; body: string; comingSoon?: boolean }[] = [
  { n: '01', title: 'Online Visibility and Customer Discovery', body: 'Improve how customers find, understand, and choose your business across Google, local search, and Artificial Intelligence discovery.' },
  { n: '02', title: 'Interactive Websites and Lead Capture', body: 'Create website experiences that help visitors take action and turn interest into real inquiries.' },
  { n: '03', title: 'Digital and Phone Customer Response', body: 'Respond to customer questions, calls, and requests while guiding each person toward the appropriate next step.' },
  { n: '04', title: 'Business AI Assessment and Strategy', body: 'Identify growth opportunities, operational problems, useful technology, and the most practical improvements to make first.' },
  { n: '05', title: 'Ready-to-Configure AI Assistants', body: 'Configure existing Artificial Intelligence assistance for common repetitive or information-heavy business tasks.' },
  { n: '06', title: 'Custom AI Assistants', body: 'Build specialized assistance around your actual process when an existing solution does not fit.' },
  { n: '07', title: 'Workflow Automation', body: 'Connect repetitive tasks, customer follow-up, information movement, and business handoffs.' },
  { n: '08', title: 'Customer Relationship and Follow-Up Systems', body: 'Organize customer information, communication, follow-up, and revenue activity.', comingSoon: true },
  { n: '09', title: 'Custom Business Management Dashboards', body: 'Bring important information, priorities, projects, customer activity, and business systems into one organized view.' },
  { n: '10', title: 'Ongoing Implementation and Support', body: 'Help business owners configure, use, improve, and maintain approved technology and workflows over time.' },
];

const steps = [
  {
    num: '01', title: 'Take the AI Opportunity Assessment or book a call',
    body: 'Fill out a short form about your business, current tools, repetitive work, time drains, and goals. This is not the full consulting assessment — it\'s how we learn enough to make the conversation useful. You can also skip the form and book a consultation directly.',
  },
  {
    num: '02', title: 'We prepare a pre-consultation brief',
    body: 'Before the call, we review your form responses and any available public information about your business. We prepare a list of focused questions so we can spend the consultation time understanding your actual workflows — not covering the basics.',
  },
  {
    num: '03', title: 'We conduct a structured 45-minute consultation',
    body: 'This is a focused business interview. We ask about how work enters your business, where it slows down, what repeats, what costs the most time, and what you\'ve already tried. We record the consultation with your consent. You are in control of what is recorded and how it is stored.',
  },
  {
    num: '04', title: 'The transcript is analyzed',
    body: 'The recording is transcribed and reviewed by EasyAI. We use AI to extract pain points, bottlenecks, repeated tasks, expenses, and goals from the conversation. This is a draft — not a final recommendation. A human reviews every finding before it moves forward.',
  },
  {
    num: '05', title: 'We Evaluate How Customers Find You—and What Slows You Down',
    body: 'We review how your business appears across Google, local search, and Artificial Intelligence discovery. We also examine the systems, tools, and processes consuming time, delaying customer responses, creating extra work, or causing opportunities to be missed. Then we identify what should improve first.',
  },
  {
    num: '06', title: 'Human review and AI Trust check',
    body: 'Before you see anything, a human reviews every recommendation for real-world fit, data access, customer-facing risk, human approval requirements, and adoption risk. We correct anything that doesn\'t hold up. CRM is only recommended if the assessment shows it\'s genuinely necessary.',
  },
  {
    num: '07', title: 'You receive a prioritized assessment report',
    body: 'We deliver a clear report with quick wins, an effort-versus-impact summary, recommended tools or changes, honest cost and ROI estimates, and an initial implementation plan. We explain what each tool does, what it costs, what it requires, and what to watch for.',
  },
  {
    num: '08', title: 'You decide how to move forward',
    body: 'You can implement the recommendations yourself. Or you can hire EasyAI to set up, configure, connect, test, document, and train your team on the approved solution. There is no pressure and no automatic next step.',
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <section className="bg-navy-900 text-white border-b border-navy-800 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="eyebrow-silver mb-3">The process</p>
          <h1 className="text-4xl md:text-5xl font-serif font-semibold mb-4">What Easy AI Does</h1>
          <p className="text-silver-light text-lg max-w-2xl">We help customers find you, understand you, and choose you. Getting found is only the first step, so we follow the customer through to a real conversation with your team.</p>
        </div>
      </section>

      <section className="py-20 bg-navy-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="space-y-8">
            {steps.map(s => (
              <div key={s.num} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-14 h-14 rounded-full bg-teal text-navy-900 flex items-center justify-center font-bold text-sm">{s.num}</div>
                <div className="rounded-xl border border-navy-800 bg-navy-900 p-6 flex-1">
                  <h2 className="font-semibold text-white text-lg mb-2">{s.title}</h2>
                  <p className="text-silver-light leading-relaxed text-sm">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-navy-900 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:grid md:grid-cols-3 gap-6 text-center">
          {[
            { icon: '🔍', title: 'Diagnosis first', body: 'The consultation and transcript come before any product recommendations.' },
            { icon: '👤', title: 'Human validation', body: 'AI drafts. A human verifies every recommendation before delivery.' },
            { icon: '🎯', title: 'Simplest effective solution', body: 'The answer may be AI, regular software, or just a better process.' },
          ].map(p => (
            <div key={p.title} className="rounded-xl border border-navy-800 bg-navy-900 p-6 mb-4 md:mb-0">
              <div className="text-3xl mb-2">{p.icon}</div>
              <h3 className="font-semibold text-white mb-1">{p.title}</h3>
              <p className="text-sm text-silver-light">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Complete public service range - below the primary customer-growth explanation. */}
      <section className="py-20 bg-navy-900 border-t border-navy-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="mb-10 max-w-2xl">
            <h2 className="text-3xl font-serif font-semibold text-white mb-3">More Ways Easy AI Can Help Your Business</h2>
            <p className="text-silver-light leading-relaxed">
              Getting found and capturing customers is the starting point. Easy AI can also help improve the
              systems, workflows, and daily operations behind your business.
            </p>
          </div>

          <ul className="grid sm:grid-cols-2 gap-x-10 gap-y-8 list-none">
            {services.map((s) => (
              <li key={s.n} className="border-l-2 border-brand-600 pl-5">
                <p className="text-xs font-semibold text-silver-dark tracking-widest mb-1">{s.n}</p>
                <h3 className="font-semibold text-white mb-1 flex flex-wrap items-center gap-2">
                  {s.title}
                  {s.comingSoon && (
                    <span className="text-[11px] font-semibold uppercase tracking-wide bg-navy-800 text-silver-light px-2 py-0.5 rounded">
                      Coming Soon
                    </span>
                  )}
                </h3>
                <p className="text-sm text-silver-light leading-relaxed">{s.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-16 bg-navy-900 text-center">
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-serif font-semibold text-white mb-4">Ready to start?</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/assessment" className="btn-green">Take the Assessment</Link>
            <Link href="/assessment?intent=consultation" className="btn-ghost-white">Book a Consultation</Link>
          </div>
        </div>
      </section>
    </>
  );
}
