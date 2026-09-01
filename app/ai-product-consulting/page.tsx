import Link from 'next/link';
import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'AI Strategy & Tool Selection',
  description:
    'After we help customers find and choose your business, Easy AI looks at the systems behind it: what to fix, what to automate, and what to leave alone.',
  alternates: { canonical: '/ai-product-consulting' },
};

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
      <section className="bg-navy-900 text-white border-b border-navy-800 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="eyebrow-silver mb-3">Services</p>
          <h1 className="text-4xl md:text-5xl font-serif font-semibold mb-4">AI Strategy &amp; Tool Selection</h1>
          <p className="text-silver-light text-lg max-w-2xl">We research the AI tools, SaaS products, automations, and process changes that fit your actual business -- not a generic software list.</p>
        </div>
      </section>

      <section className="py-20 bg-navy-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:grid md:grid-cols-2 gap-16 items-start">
          <div>
            <p className="eyebrow-silver mb-3">What we do</p>
            <h2 className="text-3xl font-serif font-semibold text-white mb-4">We recommend systems that solve the real business problem</h2>
            <p className="text-silver-light mb-4 leading-relaxed">We conduct a structured consultation to understand how your business operates -- where work enters, where it slows down, what repeats, and what costs the most time and money.</p>
            <p className="text-silver-light mb-4 leading-relaxed">Then we research tools and solutions that fit the actual problem. Not the most popular AI platform. Not the most expensive option. The one that fits.</p>
            <p className="text-silver-light leading-relaxed">We prioritize existing products and simple solutions first. Custom AI agents are an option when existing tools genuinely cannot solve the problem -- not the default answer.</p>
          </div>
          <div className="mt-10 md:mt-0">
            <p className="eyebrow-silver mb-3">Solution types we consider</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {solutionTypes.map(s => (
                <div key={s.label} className="rounded-xl border border-navy-800 bg-navy-900 p-6">
                  <div className="text-xl mb-2">{s.icon}</div>
                  <h3 className="font-semibold text-white text-sm mb-1">{s.label}</h3>
                  <p className="text-xs text-silver-light">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-navy-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="eyebrow-silver mb-3 text-center">How we compare tools</p>
          <h2 className="text-3xl font-serif font-semibold text-white mb-8 text-center">We check what matters to your business</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {compareFactors.map(f => (
              <div key={f} className="flex items-center gap-3 bg-navy-900 rounded-xl px-4 py-3 border border-navy-800">
                <span className="w-5 h-5 rounded-full bg-navy-800 text-teal flex items-center justify-center text-xs font-bold flex-shrink-0">&#10003;</span>
                <span className="text-sm text-silver-light">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-navy-900 text-center">
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-serif font-semibold text-white mb-4">Start with the assessment</h2>
          <p className="text-silver-light mb-6">Tell us about your business. We will come to the consultation already prepared.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/assessment" className="btn-green">Take the Assessment</Link>
            <Link href="/assessment?intent=consultation" className="btn-ghost-white">Book a Consultation</Link>
          </div>
        </div>
      </section>
    </>
  );
}
