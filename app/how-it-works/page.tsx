import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'How It Works' };

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
    num: '05', title: 'We research tools and solutions',
    body: 'For each identified problem, we research existing AI products, SaaS tools, automations, process changes, and — when necessary — custom agent opportunities. We compare cost, setup effort, learning curve, integration requirements, limitations, and expected value. We don\'t recommend tools we haven\'t verified.',
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
      <section className="bg-gradient-to-br from-brand-950 to-brand-700 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="section-label text-teal-300 mb-3">The process</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">How EasyAI works</h1>
          <p className="text-brand-100 text-lg max-w-2xl">We understand your business before we recommend anything. Every step is designed around that principle.</p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="space-y-8">
            {steps.map(s => (
              <div key={s.num} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-14 h-14 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-sm">{s.num}</div>
                <div className="card flex-1">
                  <h2 className="font-semibold text-slate-900 text-lg mb-2">{s.title}</h2>
                  <p className="text-slate-500 leading-relaxed text-sm">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:grid md:grid-cols-3 gap-6 text-center">
          {[
            { icon: '🔍', title: 'Diagnosis first', body: 'The consultation and transcript come before any product recommendations.' },
            { icon: '👤', title: 'Human validation', body: 'AI drafts. A human verifies every recommendation before delivery.' },
            { icon: '🎯', title: 'Simplest effective solution', body: 'The answer may be AI, regular software, or just a better process.' },
          ].map(p => (
            <div key={p.title} className="card mb-4 md:mb-0">
              <div className="text-3xl mb-2">{p.icon}</div>
              <h3 className="font-semibold text-slate-900 mb-1">{p.title}</h3>
              <p className="text-sm text-slate-500">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 bg-white text-center">
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Ready to start?</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/assessment" className="btn-primary">Take the Assessment</Link>
            <Link href="/book-consultation" className="btn-secondary">Book a Consultation</Link>
          </div>
        </div>
      </section>
    </>
  );
}
