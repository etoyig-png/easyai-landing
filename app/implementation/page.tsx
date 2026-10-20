import Link from 'next/link';
import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Implementation & Support',
  description:
    'Easy AI sets up, connects, tests, documents, and supports the systems behind your customer growth, so approved changes actually get used.',
  alternates: { canonical: '/implementation' },
};

const implServices = [
  { icon: '🔧', title: 'Tool setup & configuration', body: 'We install and configure approved tools for your business -- properly, not just out of the box.' },
  { icon: '🔗', title: 'Integrations & connections', body: 'Connect your tools so data flows between them without manual copying.' },
  { icon: '⚡', title: 'Workflow automation', body: 'Remove manual handoffs between steps. Build reliable, testable automations.' },
  { icon: '🤖', title: 'Custom AI agent builds', body: 'When existing products cannot solve the problem, we design and build a custom agent with defined inputs, outputs, and human approval points.' },
  { icon: '🧪', title: 'Testing & QA', body: 'We test with real-world data before your team uses anything in production.' },
  { icon: '📚', title: 'Documentation & training', body: 'Every implementation includes clear documentation and training so your team actually uses it.' },
];

const agentRules = [
  'Every custom agent has a defined scope, inputs, outputs, and memory boundary.',
  'Human approval is required before any agent takes a client-facing action.',
  'Sensitive data access requires explicit permission and logging.',
  'Agents are tested thoroughly before production deployment.',
  'You receive documentation covering what the agent does, what it does not do, and how to override it.',
  'No production agent runs with full autonomy by default.',
];

export default function ImplementationPage() {
  return (
    <>
      <section className="bg-navy-900 text-white border-b border-navy-800 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="eyebrow-silver mb-3">Services</p>
          <h1 className="text-4xl md:text-5xl font-serif font-semibold mb-4">Implementation &amp; Support</h1>
          <p className="text-silver-light text-lg max-w-2xl">Once you have an approved recommendation, EasyAI can set it up, connect it, test it, document it, and train your team -- or build a custom agent when existing tools are not enough.</p>
        </div>
      </section>

      <section className="py-20 bg-navy-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="eyebrow-silver mb-3">What implementation includes</p>
            <h2 className="text-3xl font-serif font-semibold text-white">We find the opportunity, then put Artificial Intelligence to work</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {implServices.map(s => (
              <div key={s.title} className="card hover:shadow-md transition-shadow">
                <div className="text-2xl mb-3">{s.icon}</div>
                <h3 className="font-semibold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-silver-light leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-navy-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:grid md:grid-cols-2 gap-12 items-start">
          <div>
            <p className="eyebrow-silver mb-3">Custom AI agents</p>
            <h2 className="text-3xl font-serif font-semibold text-white mb-4">When existing tools are not enough</h2>
            <p className="text-silver-light mb-4 leading-relaxed">Not every problem has an off-the-shelf solution. When the assessment identifies a workflow that no existing product adequately handles, EasyAI can design and build a custom AI agent for it.</p>
            <p className="text-silver-light leading-relaxed">Custom agents are scoped, tested, documented, and deployed with clear human control boundaries. They are not built speculatively -- every agent starts from a real identified problem.</p>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-4">Our custom agent rules</h3>
            <ul className="space-y-3">
              {agentRules.map(r => (
                <li key={r} className="flex items-start gap-3 text-sm text-silver-light">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-navy-800 text-teal flex items-center justify-center text-xs font-bold mt-0.5">✓</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="py-16 bg-navy-900 text-center">
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-serif font-semibold text-white mb-2">Start with a consultation</h2>
          <p className="text-silver-light mb-6">Implementation starts after the assessment. We do not build things before we understand the problem.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/assessment" className="btn-green">Take the Assessment</Link>
            <Link href="/assessment?intent=consultation" className="btn-ghost-white">Book a Consultation</Link>
          </div>
        </div>
      </section>
    </>
  );
}
