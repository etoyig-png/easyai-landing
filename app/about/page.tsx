import Link from 'next/link';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'About EasyAI' };

export default function AboutPage() {
  return (
    <>
      <section className="bg-navy-900 text-white border-b border-navy-800 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="eyebrow-silver mb-3">Who we are</p>
          <h1 className="text-4xl md:text-5xl font-serif font-semibold mb-4">About EasyAI</h1>
          <p className="text-silver-light text-lg max-w-2xl">AI product consulting and implementation for businesses that want real answers, not hype.</p>
        </div>
      </section>

      <section className="py-20 bg-navy-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:grid md:grid-cols-2 gap-16 items-start">
          <div>
            <p className="eyebrow-silver mb-3">What EasyAI is</p>
            <h2 className="text-3xl font-serif font-semibold text-white mb-6">We help businesses get found, get chosen, and win the customer</h2>
            <p className="text-silver-light mb-4 leading-relaxed">
              EasyAI is an AI product consulting and implementation company based in Tampa, FL, serving clients remotely. We work with business owners, operations leads, and teams who are hearing a lot about AI and need someone to tell them what actually applies to their situation.
            </p>
            <p className="text-silver-light mb-4 leading-relaxed">
              We do not sell software. We do not have referral deals. We diagnose first through a structured consultation and then research the tools and changes that match what we find.
            </p>
            <p className="text-silver-light leading-relaxed">
              The answer might be an AI product, a standard SaaS tool, a better process, or a custom agent. We follow the problem to the right answer, not the other way around.
            </p>
          </div>
          <div className="mt-10 md:mt-0 space-y-4">
            <div className="rounded-xl border border-navy-800 bg-navy-900 p-6">
              <h3 className="font-semibold text-white mb-2">Based in Tampa, FL</h3>
              <p className="text-sm text-silver-light">Serving clients remotely across the U.S.</p>
            </div>
            <div className="rounded-xl border border-navy-800 bg-navy-900 p-6">
              <h3 className="font-semibold text-white mb-2">Diagnosis-first</h3>
              <p className="text-sm text-silver-light">Every engagement starts with understanding your business, not pitching software.</p>
            </div>
            <div className="rounded-xl border border-navy-800 bg-navy-900 p-6">
              <h3 className="font-semibold text-white mb-2">Human-reviewed recommendations</h3>
              <p className="text-sm text-silver-light">AI assists our research and analysis. A human reviews every recommendation before it reaches you.</p>
            </div>
            <div className="rounded-xl border border-navy-800 bg-navy-900 p-6">
              <h3 className="font-semibold text-white mb-2">Independent</h3>
              <p className="text-sm text-silver-light">We do not earn commissions on the tools we recommend. Our job is to find what fits, not what pays us.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-navy-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="eyebrow-silver mb-3 text-center">Our principles</p>
          <h2 className="text-3xl font-serif font-semibold text-white mb-10 text-center">How we operate</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              { title: 'Diagnose before prescribing', body: 'We conduct a structured consultation and analyze the transcript before making any recommendations. We do not pitch software at the first meeting.' },
              { title: 'Honest about what AI cannot do', body: 'We document limitations for every tool we recommend. We do not oversell AI capabilities or guarantee outcomes that depend on things we cannot control.' },
              { title: 'Simplest effective solution', body: 'If a better process or a standard SaaS tool solves the problem, that is what we recommend. Custom AI agents are reserved for problems with no better solution.' },
              { title: 'You stay in control', body: 'No tool is configured, no automation runs, and no agent acts without your approval. Every implementation is reversible and documented.' },
            ].map(p => (
              <div key={p.title} className="rounded-xl border border-navy-800 bg-navy-900 p-6">
                <h3 className="font-semibold text-white mb-2">{p.title}</h3>
                <p className="text-sm text-silver-light leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-navy-900 text-center">
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-serif font-semibold text-white mb-4">Work with us</h2>
          <p className="text-silver-light mb-6">Start by telling us about your business. We will take it from there.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/assessment" className="btn-green">Take the Assessment</Link>
            <Link href="/assessment?intent=consultation" className="btn-ghost-white">Book a Consultation</Link>
          </div>
        </div>
      </section>
    </>
  );
}
