import Link from 'next/link';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Book a Consultation' };

export default function BookConsultationPage() {
  return (
    <>
      <section className="bg-gradient-to-br from-brand-950 to-brand-700 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="section-label text-teal-300 mb-3">Get started</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Book a Consultation</h1>
          <p className="text-brand-100 text-lg max-w-2xl">45 minutes. Structured. No sales pitch. We ask about your business — and you get honest answers about where AI can and cannot help.</p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:grid md:grid-cols-2 gap-16 items-start">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">What to expect</h2>
            <div className="space-y-4">
              {[
                { num: '1', title: '45-minute video or phone call', body: 'We walk through how your business operates, where work slows down, what repeats, and what costs the most time.' },
                { num: '2', title: 'We prepare ahead of time', body: 'If you completed the assessment, we review it before the call. We come with focused questions, not a generic intro.' },
                { num: '3', title: 'Recording with your consent', body: 'We record to transcribe and analyze so we do not miss anything. You control what is recorded.' },
                { num: '4', title: 'Assessment report follows', body: 'After the call, we research tools and solutions and deliver a written report with our findings — usually within a few business days.' },
                { num: '5', title: 'No pressure on next steps', body: 'You decide whether to implement yourself or hire EasyAI. There is no automatic upsell.' },
              ].map(s => (
                <div key={s.num} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-bold">{s.num}</div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm mb-1">{s.title}</h3>
                    <p className="text-sm text-slate-500">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 bg-slate-50 rounded-xl p-4 text-sm text-slate-600">
              <strong className="text-slate-800">Tip:</strong> Complete the <Link href="/assessment" className="text-brand-600 underline">AI Opportunity Assessment</Link> before booking. It takes 10 minutes and makes the consultation significantly more useful.
            </div>
          </div>

          <div>
            <div className="card text-center py-10">
              <div className="text-4xl mb-4">📅</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Select a time</h3>
              <p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto">Our booking calendar will appear here. In the meantime, reach out directly and we will schedule a time.</p>
              <Link href="/contact" className="btn-primary inline-block">Contact us to schedule</Link>
              <p className="text-xs text-slate-400 mt-4">Calendar booking coming soon.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 bg-slate-50 text-center">
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          <p className="text-slate-500 text-sm">Not ready for a call? <Link href="/assessment" className="text-brand-600 underline">Take the assessment first</Link> — we will follow up with next steps.</p>
        </div>
      </section>
    </>
  );
}
