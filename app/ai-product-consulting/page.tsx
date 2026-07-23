import Link from 'next/link';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'AI Product Consulting' };

const solutionTypes = [
  { icon: '🤖', label: 'Existing AI products', body: 'Off-the-shelf tools that may already solve your problem -- often the fastest and lowest-risk path.' },
  { icon: '💼', label: 'Ordinary SaaS software', body: 'Sometimes the answer is a better non-AI tool. We research those too.' },
  { icon: '🔄', label: 'Process redesign', body: 'Broken processes do not get better with AI on top. We fix the process first.' },
  { icon: '⚡', label: 'Automations', body: 'Connect your existing tools and remove manual handoffs.' },
  { icon: '🗂', label: 'CRM (when needed)', body: 'Only recommended when the assessment shows scattered data is a genuine obstacle.' },
  { icon: '🧠', label: 'Custom AI agents', body: 'When existing tools are not enough, we build agents for the specific workflow.' },
];

const compareFactors = [
  'Cost and subscription structure', 'Setup complexity', 'Learning curve for your team',
  'Integration requirements', 'Known limitations', 'Vendor reliability', 'Expected time saved',
  'Estimated expense reduction', 'Productivity impact', 'What AI should not do in this workflow',
];

export default function AIProductConsultingPage() {
  return (
    <>
      <section className="bg-gradient-to-br from-brand-950 to-brand-700 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="section-label text-teal-300 mb-3">Services</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">AI Product Consulting</h1>
          <p className="text-brand-100 text-lg max-w-2xl">We research the AI tools, SaaS products, automations, and process changes that fit your actual business -- not a generic software list.</p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:grid md:grid-cols-2 gap-16 items-start">
          <div>
            <p className="section-label mb-3">What we do</p>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Discovery before prescription</h2>
            <p className="text-slate-600 mb-4 leading-relaxed">We conduct a structured consultation to understand how your business operates -- where work enters, where it slows down, what repeats, and what costs the most time and money.</p>
            <p className="text-slate-600 mb-4 leading-relaxed">Then we research tools and solutions that fit the actual problem. Not the most popular AI platform. Not the most expensive option. The one that fits.</p>
            <p className="text-slate-600 leading-relaxed">We prioritize existing products and simple solutions first. Custom AI agents are an option when existing tools genuinely cannot solve the problem -- not the default answer.</p>
          </div>
          <div className="mt-10 md:mt-0">
            <p className="section-label mb-3">Solution types we consider</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {solutionTypes.map(s => (
                <div key={s.label} className="card">
                  <div className="text-xl mb-2">{s.icon}</div>
                  <h3 className="font-semibold text-slate-900 text-sm mb-1">{s.label}</h3>
                  <p className="text-xs text-slate-500">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="section-label mb-3 text-center">How we compare tools</p>
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">We check what matters to your business</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {compareFactors.map(f => (
              <div key={f} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-slate-100">
                <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-bold flex-shrink-0">&#10003;</span>
                <span className="text-sm text-slate-700">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-white text-center">
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Start with the assessment</h2>
          <p className="text-slate-500 mb-6">Tell us about your business. We will come to the consultation already prepared.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/assessment" className="btn-primary">Take the Assessment</Link>
            <Link href="/book-consultation" className="btn-secondary">Book a Consultation</Link>
          </div>
        </div>
      </section>
    </>
  );
}
