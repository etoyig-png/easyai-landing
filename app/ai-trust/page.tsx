import Link from 'next/link';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'AI Trust & Human Control' };

const trustPrinciples = [
  { icon: '👤', title: 'Human review is mandatory', body: 'AI drafts findings and recommendations. A human at EasyAI checks every item for real-world fit, data access, and client-facing risk before you see it. AI does not make final decisions.' },
  { icon: '🔒', title: 'Data access is explicit', body: 'We ask what data any tool or agent needs to access — and whether that access is appropriate. Sensitive data is flagged in every assessment.' },
  { icon: '✅', title: 'Your approval before action', body: 'No tool is configured, no automation runs, and no agent takes a client-facing action without your approval. You control what gets implemented and when.' },
  { icon: '👁', title: 'Transparency about AI use', body: 'We tell you when and how AI is involved in our process — including the consultation analysis, product research, and report drafting.' },
  { icon: '📋', title: 'Limitations are documented', body: 'Every recommendation includes what the tool does not do and what could go wrong. We do not hide the limitations of AI products.' },
  { icon: '🚫', title: 'AI does not promise outcomes', body: 'We provide estimates with visible assumptions. We do not guarantee savings, profitability, or productivity improvements. Results depend on implementation quality and adoption.' },
];

export default function AITrustPage() {
  return (
    <>
      <section className="bg-gradient-to-br from-brand-950 to-brand-700 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="section-label text-teal-300 mb-3">Our approach</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">AI Trust & Human Control</h1>
          <p className="text-brand-100 text-lg max-w-2xl">AI is a tool in our process — not a replacement for judgment. Here is exactly how we use it and where humans stay in control.</p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="section-label mb-3">What we commit to</p>
            <h2 className="text-3xl font-bold text-slate-900">How trust works at EasyAI</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trustPrinciples.map(p => (
              <div key={p.title} className="card hover:shadow-md transition-shadow">
                <div className="text-2xl mb-3">{p.icon}</div>
                <h3 className="font-semibold text-slate-900 mb-2">{p.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="section-label mb-3 text-center">What AI does in our process</p>
          <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">AI assists. Humans decide.</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card border-green-100">
              <h3 className="font-semibold text-green-700 mb-3">AI is used for</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                {['Transcribing and analyzing consultation recordings','Extracting bottlenecks, pain points, and repeated tasks','Researching AI products and software options','Drafting comparison tables and ROI scenarios','Generating the first draft of assessment reports','Summarizing findings for human review'].map(i => (
                  <li key={i} className="flex items-start gap-2"><span className="text-green-500 mt-0.5">+</span>{i}</li>
                ))}
              </ul>
            </div>
            <div className="card border-red-100">
              <h3 className="font-semibold text-red-700 mb-3">AI does not</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                {['Make final recommendations without human review','Access your business data without explicit permission','Send outreach or communications automatically','Approve its own suggestions','Guarantee business outcomes or savings','Make decisions about what gets implemented'].map(i => (
                  <li key={i} className="flex items-start gap-2"><span className="text-red-400 mt-0.5">-</span>{i}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white text-center">
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Questions about how we use AI?</h2>
          <p className="text-slate-500 mb-6">Ask us directly before or during your consultation.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/book-consultation" className="btn-primary">Book a Consultation</Link>
            <Link href="/contact" className="btn-secondary">Contact Us</Link>
          </div>
        </div>
      </section>
    </>
  );
}
