import Link from 'next/link';
import type { Metadata } from 'next';
import ConsultationGate from '@/components/ConsultationGate';

/**
 * Resolved on the server, never as NEXT_PUBLIC_ values, so only the two URLs that must reach the
 * browser to work do so. No calendar id, OAuth token, client secret, or account credential is
 * read here or sent to the client.
 *
 * CONSULTATION_VIDEO_URL     - direct URL to the consultation video file.
 * CONSULTATION_SCHEDULER_URL - the Easy AI Google Appointment Schedule booking link.
 *
 * Both are intentionally unset until the owner supplies real values. Nothing is invented, and
 * with them unset the page tells the visitor scheduling is not open rather than faking it.
 */
const CONSULTATION_VIDEO_URL = process.env.CONSULTATION_VIDEO_URL;
const CONSULTATION_SCHEDULER_URL = process.env.CONSULTATION_SCHEDULER_URL;

export const metadata: Metadata = { title: 'Assessment Complete' };

export default function AssessmentCompletePage({
  searchParams,
}: {
  searchParams?: { intent?: string };
}) {
  // Visitors who started from "Book a Consultation" came here to schedule, so the scheduling
  // step is surfaced first for them. Nothing is scheduled or submitted automatically - it is
  // still a link the visitor chooses to click.
  const consultationIntent = searchParams?.intent === 'consultation';
  return (
    <>
      <section className="bg-navy-900 text-white border-b border-navy-800 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="eyebrow-silver mb-3">You&rsquo;re all set</p>
          <h1 className="text-4xl md:text-5xl font-serif font-semibold mb-4">Your AI Action Plan is on its way</h1>
          <p className="text-silver-light text-lg max-w-2xl">
            Check your inbox soon — we&rsquo;re researching your business and putting your personalized plan together right now.
          </p>
        </div>
      </section>

      <section className="py-16 bg-navy-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-10">
          {consultationIntent && (
            <div className="rounded-xl border border-navy-800 border-l-4 border-l-teal bg-navy-900 p-6 sm:p-8">
              <p className="eyebrow-silver mb-3">Your consultation</p>
              <h2 className="text-lg font-semibold text-white mb-2">Ready to book your consultation</h2>
              <p className="text-sm text-silver-light mb-3">
                Your answers are in, so the call can start with your actual situation instead of the basics.
              </p>
              <p className="text-sm text-silver-light">
                Watch the short video below, then request a time. Requesting a time is not the same
                as a confirmed appointment &mdash; Easy AI confirms it.
              </p>
            </div>
          )}

          <div className="rounded-xl border border-navy-800 bg-navy-900 p-6 sm:p-8">
            <p className="eyebrow-silver mb-3">While you wait</p>
            <h2 className="text-lg font-semibold text-white mb-4">Watch this before scheduling</h2>
            <ConsultationGate videoUrl={CONSULTATION_VIDEO_URL} schedulerUrl={CONSULTATION_SCHEDULER_URL} />
          </div>

          <div className="rounded-xl border border-navy-800 bg-navy-900 p-6 sm:p-8">
            <p className="eyebrow-silver mb-3">What happens next</p>
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
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal text-navy-900 flex items-center justify-center text-sm font-bold">
                    {s.num}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm mb-1">{s.title}</h3>
                    <p className="text-sm text-silver-light">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-navy-800 bg-navy-900 text-center py-10 px-6">
            <h3 className="text-xl font-serif font-semibold text-white mb-3">Don&rsquo;t want to wait for the email?</h3>
            <p className="text-silver-light text-sm mb-6 max-w-md mx-auto">
              Go ahead and grab a time for a discovery call — we&rsquo;ll come prepared with your assessment answers already in hand.
            </p>
            <Link href="/assessment?intent=consultation" className="btn-green inline-block">
              Request a Consult Time
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
