import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EasyAI — Find the AI Tools Your Business Actually Needs',
};

const outcomes = [
  { icon: '⏱', title: 'Save Time', body: 'Identify repetitive work that can be handled by AI or automation — without disrupting how your team already operates.' },
  { icon: '💰', title: 'Reduce Expenses', body: 'Find where you\'re overpaying for software, paying employees for manual work, or losing money to slow follow-up.' },
  { icon: '📈', title: 'Improve Productivity', body: 'Move faster on the work that matters. Let the right tools handle the administrative overhead.' },
  { icon: '🏆', title: 'Increase Profitability', body: 'Better follow-up, faster delivery, lower operating costs, and more consistent customer experiences add up.' },
];

const steps = [
  { num: '01', title: 'You take the assessment or book a call', body: 'Tell us about your business, your current tools, and where your time goes. This takes about 10 minutes.' },
  { num: '02', title: 'We conduct a structured consultation', body: 'A focused 45-minute conversation about how your business actually works — before we recommend anything.' },
  { num: '03', title: 'We analyze your consultation transcript', body: 'We use AI to extract bottlenecks, repetitive tasks, and cost problems from the conversation. Then a human reviews every finding.' },
  { num: '04', title: 'You receive a prioritized recommendation set', body: 'Not a giant software list — a focused set of tools, changes, or automations with honest cost, effort, and value estimates.' },
  { num: '05', title: 'You decide what to implement', body: 'Self-implement or hire EasyAI to set it up, connect it, test it, and train your team.' },
];

const notList = [
  'A generic chatbot setup shop',
  'A CRM reseller or CRM-first consulting firm',
  'A marketing agency that happens to use AI',
  'A company that automates broken processes without first understanding them',
  'A promise that every business needs AI or automation',
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-brand-950 via-brand-800 to-teal-600 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, white 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-24 md:py-32">
          <p className="section-label text-teal-300 mb-4">AI Product Consulting · Tampa, FL</p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight max-w-3xl mb-6">
            Find the AI and software tools your business actually needs.
          </h1>
          <p className="text-lg md:text-xl text-brand-100 max-w-2xl mb-4 leading-relaxed">
            EasyAI helps businesses save time, reduce expenses, improve productivity, and increase profitability through practical AI product consulting and implementation.
          </p>
          <p className="text-sm text-brand-200 mb-10">
            Every recommendation is reviewed for business fit, data access, customer trust, and human control before implementation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/assessment" className="btn-white text-base px-8 py-4">Take the AI Opportunity Assessment</Link>
            <Link href="/book-consultation" className="btn-secondary border-white text-white hover:bg-white/10 text-base px-8 py-4">Book a Consultation</Link>
          </div>
          <p className="text-xs text-brand-300 mt-4">No sales pressure. We learn how your business works before recommending anything.</p>
        </div>
      </section>

      {/* Outcomes */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="section-label mb-3">What we help you achieve</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Real business outcomes. Not AI hype.</h2>
            <p className="text-slate-500 mt-4 max-w-xl mx-auto">We measure success in time, money, and results — not in the number of AI tools we install.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {outcomes.map(o => (
              <div key={o.title} className="card hover:shadow-md transition-shadow">
                <div className="text-3xl mb-3">{o.icon}</div>
                <h3 className="font-semibold text-slate-900 mb-2">{o.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{o.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — summary */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="section-label mb-3">The process</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Diagnose before prescribing.</h2>
            <p className="text-slate-500 mt-4 max-w-xl mx-auto">We understand how your business works before we recommend a single tool or automation.</p>
          </div>
          <div className="relative">
            <div className="hidden md:block absolute left-8 top-8 bottom-8 w-0.5 bg-brand-100" />
            <div className="space-y-6">
              {steps.map(s => (
                <div key={s.num} className="relative flex gap-6 items-start">
                  <div className="flex-shrink-0 w-16 h-16 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-sm z-10">{s.num}</div>
                  <div className="card flex-1 hover:shadow-md transition-shadow">
                    <h3 className="font-semibold text-slate-900 mb-1">{s.title}</h3>
                    <p className="text-sm text-slate-500">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-center mt-10">
            <Link href="/how-it-works" className="btn-primary">See the full process →</Link>
          </div>
        </div>
      </section>

      {/* Custom agents callout */}
      <section className="py-20 bg-gradient-to-r from-brand-700 to-teal-600 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:flex items-center justify-between gap-12">
          <div className="mb-8 md:mb-0">
            <p className="section-label text-teal-200 mb-3">When off-the-shelf tools aren't enough</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">We can build a custom AI agent for your workflow.</h2>
            <p className="text-brand-100 max-w-xl leading-relaxed">
              If existing AI products, SaaS tools, or automations can't adequately solve the problem, EasyAI can design, build, test, and deploy a custom agent — with clear permissions, human approval points, and documentation.
            </p>
          </div>
          <div className="flex-shrink-0">
            <Link href="/implementation" className="btn-white text-base px-8 py-4 whitespace-nowrap">Learn about custom agents →</Link>
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="section-label mb-3">Our approach</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">Audit → Optimize → Automate</h2>
            <p className="text-slate-600 mb-4 leading-relaxed">
              We learn the current process first. Then we fix what's broken. Then we apply the right technology — which may be AI, ordinary software, a process change, or nothing at all.
            </p>
            <p className="text-slate-600 mb-6 leading-relaxed">
              The simplest effective solution wins. We don't recommend a $500/month AI platform when a $10 SaaS tool and a better workflow would solve the problem.
            </p>
            <Link href="/how-it-works" className="btn-primary">See how the process works →</Link>
          </div>
          <div className="mt-10 md:mt-0">
            <div className="bg-slate-50 rounded-2xl p-8">
              <h3 className="font-semibold text-slate-900 mb-4">EasyAI is <em>not</em>:</h3>
              <ul className="space-y-3">
                {notList.map(item => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-600">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-xs font-bold mt-0.5">✕</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Trust signal */}
      <section className="py-16 bg-slate-50 border-y border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="section-label mb-3">AI Trust & Human Control</p>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">Every recommendation is reviewed by a human before it reaches you.</h2>
          <p className="text-slate-500 max-w-2xl mx-auto mb-6 leading-relaxed">
            EasyAI uses AI to analyze your consultation and research products — then a human checks every recommendation for real-world fit, data access, customer-facing risk, and responsible implementation before you see anything.
          </p>
          <Link href="/ai-trust" className="btn-primary">How we handle AI responsibly →</Link>
        </div>
      </section>

      {/* CTAs */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="section-label mb-3">Ready to start?</p>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Two ways to get started</h2>
          <p className="text-slate-500 mb-10">Either way, we learn how your business works before recommending anything.</p>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="card text-left border-brand-100 hover:shadow-md transition-shadow">
              <div className="text-2xl mb-3">📋</div>
              <h3 className="font-semibold text-slate-900 mb-2">Take the AI Opportunity Assessment</h3>
              <p className="text-sm text-slate-500 mb-4 leading-relaxed">Answer a few questions about your business, your current tools, and where your time goes. Takes about 10 minutes. We'll follow up with next steps.</p>
              <Link href="/assessment" className="btn-primary w-full text-center">Start the Assessment →</Link>
            </div>
            <div className="card text-left border-brand-100 hover:shadow-md transition-shadow">
              <div className="text-2xl mb-3">📞</div>
              <h3 className="font-semibold text-slate-900 mb-2">Book a Consultation</h3>
              <p className="text-sm text-slate-500 mb-4 leading-relaxed">Schedule a focused 45-minute conversation about how your business works. Come with your biggest operational frustration and leave with clarity.</p>
              <Link href="/book-consultation" className="btn-secondary w-full text-center">Book a Consultation →</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
