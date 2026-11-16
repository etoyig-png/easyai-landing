import Link from 'next/link';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Service FAQs' };

const faqs = [
  { q: 'Where should I start?', a: 'Start with the assessment and your Company’s GAP Score. GAP, SmartSite and AIM Digital / Voice remain our core services. The assessment helps us discuss which customer-discovery, website or response problem to look at first.' },
  { q: 'What happens after the assessment?', a: 'We review what you share and discuss the next practical step with you. That may mean improving an existing tool, scoping a focused project or arranging a consultation. You decide what to do next; submitting an assessment does not authorize implementation or spending.' },
  { q: 'What does Marketing & Ad Development cover?', a: 'We can scope messaging, ad concepts, scripts and creative variations for testing. For example, we might develop several versions of a service ad for your audience. Campaign setup, platform choice and any media budget are agreed separately. Results are not guaranteed.' },
  { q: 'When would I need a custom AI agent?', a: 'When a clear task is not well served by your existing tools. Examples include answering from approved service information or preparing an inquiry summary for staff. We define the task, permissions, human review and tests before recommending a build.' },
  { q: 'What is BRIQ?', a: 'BRIQ means Brand IQ, the Company Brain. It is a way to organize approved business knowledge, such as services, policies, FAQs and brand guidance, for your team and AI assistants. We scope access, updates and review around your business; it is not a promise that an AI knows everything.' },
  { q: 'What can workflow automation and integrations help with?', a: 'They can reduce repeated handoffs between tools, such as preparing a follow-up task after an inquiry or moving approved information into an existing customer system. What is possible depends on the tools, access and process you already use.' },
  { q: 'Do I have to replace the tools I already use?', a: 'No. We look at your current tools first and keep what works where practical. We explain any proposed replacement, cost or limitation before you decide.' },
];
export default function FAQPage() {
  return <>
    <section className="bg-navy-900 text-white border-b border-navy-800 py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <p className="eyebrow-silver mb-3">Practical answers</p>
        <h1 className="text-4xl md:text-5xl font-serif font-semibold mb-5">Easy AI service FAQs</h1>
        <p className="text-silver-light text-lg">Start with the business problem. Keep useful tools. Agree on the next step.</p>
      </div>
    </section>
    <section className="py-16 bg-navy-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-4">
        {faqs.map(faq => <details key={faq.q} className="rounded-xl border border-navy-800 p-6">
          <summary className="font-semibold text-white cursor-pointer">{faq.q}</summary>
          <p className="text-silver-light leading-relaxed mt-4">{faq.a}</p>
        </details>)}
        <div className="pt-8 text-center">
          <Link href="/assessment" className="btn-green">Start Your Journey Now</Link>
          <p className="mt-5"><Link href="/how-it-works" className="text-teal underline">See What We Do</Link></p>
        </div>
      </div>
    </section>
  </>;
}
