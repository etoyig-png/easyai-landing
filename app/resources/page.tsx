import Link from 'next/link';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Resources' };

const articles = [
  {
    tag: 'AI Basics',
    title: 'What AI actually means for small businesses',
    body: 'Most AI tools business owners encounter are one of three things: language models, workflow automation, or data classification. Here is what each category is good for and what it cannot do.',
  },
  {
    tag: 'Decision Framework',
    title: 'How to decide if an AI tool is worth trying',
    body: 'Before subscribing to another tool, run through these five questions: What specific task does this automate? Who reviews the output? What happens if it is wrong? What does it cost per hour of work saved? What data does it access?',
  },
  {
    tag: 'AI Trust',
    title: 'Why AI-powered is not a feature — it is a starting point',
    body: 'The term AI-powered in a product description tells you very little. What matters is what the AI does, what it decides autonomously, what data it accesses, and whether a human reviews its output before it affects your business.',
  },
  {
    tag: 'Implementation',
    title: 'The five most common reasons AI implementations fail',
    body: 'Most AI projects fail for non-AI reasons: unclear ownership, no testing with real data, skipped training, no documentation, and solving the wrong problem. Here is how to avoid each one.',
  },
  {
    tag: 'Process',
    title: 'Fix the process before you automate it',
    body: 'Automating a broken process gives you faster broken results. The most valuable thing we do in a consultation is identify where the real problem is — and it is often upstream of where the client thinks it is.',
  },
  {
    tag: 'CRM',
    title: 'When you actually need a CRM and when you do not',
    body: 'CRM is often the first thing people reach for and the last thing they actually needed. Here are the signals that indicate a CRM would help — and the signs you should solve a simpler problem first.',
  },
];

export default function ResourcesPage() {
  return (
    <>
      <section className="bg-gradient-to-br from-brand-950 to-brand-700 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="section-label text-teal-300 mb-3">Education</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Resources</h1>
          <p className="text-brand-100 text-lg max-w-2xl">Practical reading on AI for business — without the hype.</p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-10 text-sm text-amber-800 max-w-2xl">
            These articles are educational overviews, not implementation advice for your specific business. For recommendations that apply to your situation, start with the <Link href="/assessment" className="underline font-medium">AI Opportunity Assessment</Link>.
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map(a => (
              <div key={a.title} className="card hover:shadow-md transition-shadow flex flex-col">
                <span className="inline-block text-xs font-semibold uppercase tracking-wide text-brand-600 bg-brand-50 rounded-full px-3 py-1 mb-3 w-fit">{a.tag}</span>
                <h2 className="font-semibold text-slate-900 text-base mb-3 leading-snug">{a.title}</h2>
                <p className="text-sm text-slate-500 leading-relaxed flex-1">{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-slate-50 text-center">
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Ready to apply this to your business?</h2>
          <p className="text-slate-500 mb-6">General reading only goes so far. The assessment is how we learn enough to give you specific answers.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/assessment" className="btn-primary">Take the Assessment</Link>
            <Link href="/book-consultation" className="btn-secondary">Book a Consultation</Link>
          </div>
        </div>
      </section>
    </>
  );
}
