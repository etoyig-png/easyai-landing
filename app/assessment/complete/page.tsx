import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Assessment Complete' };

export default function AssessmentCompletePage() {
  return (
    <>
      <section className="bg-gradient-to-br from-brand-950 to-brand-700 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="section-label text-teal-300 mb-3">You&rsquo;re all set</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Your AI Action Plan is on its way</h1>
          <p className="text-brand-100 text-lg max-w-2xl">
            Check your inbox soon — we&rsquo;re researching your business and putting your personalized plan together right now.
          </p>
        </div>
      </section>

      <section className="py-16 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="card p-6 sm:p-8">
            <p className="section-label mb-3">While you wait</p>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">A quick look at how Easy AI works</h2>
            <div className="relative w-full aspect-video bg-navy-900 rounded-xl overflow-hidden flex items-center justify-center">
              <div className="text-center text-white/80">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/10 flex items-center justify-center">
                  <svg className="w-7 h-7 ml-1" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <p className="text-sm">Explainer video coming soon</p>
              </div>
            </div>
          </div>

          <div className="card p-6 sm:p-8">
            <p className="section-label mb-3">What happens next</p>
            <div className="space-y-4">
              {[
                {
                  num: '1',
                  title: 'We research your business',
                  body: 'We look at what you told us plus what’s public about your business to ground your plan in reality, not generic advice.',
                },
                {
                  num: '2',
                  title: 'Your AI Action Plan lands in your inbox',
                  body: 'Usually within 15+ minutes. It walks through where AI realistically fits your business, and what it would take to get there.',
                },
                {
                  num: '3',
                  title: 'You decide what’s next',
                  body: 'Read it on your own time. If it’s useful, book a discovery call. If not, no pressure and no follow-up spam.',
                },
              ].map((s) => (
                <div key={s.num} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-bold">
                    {s.num}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm mb-1">{s.title}</h3>
                    <p className="text-sm text-slate-500">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card text-center py-10 px-6">
            <h3 className="text-xl font-bold text-slate-900 mb-3">Don&rsquo;t want to wait for the email?</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
              Go ahead and grab a time for a discovery call — we&rsquo;ll come prepared with your assessment answers already in hand.
            </p>
            <Link href="/book-consultation" className="btn-primary inline-block">
              Book a Discovery Call
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
