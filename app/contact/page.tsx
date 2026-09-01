import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Reach Easy AI in Tampa, Florida. Get in touch with questions or to start your business assessment.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <>
      <section className="bg-navy-900 text-white py-20 border-b border-navy-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="eyebrow-silver mb-3">GET IN TOUCH</p>
          <h1 className="text-4xl md:text-5xl font-serif font-semibold mb-4">Need to Reach Easy AI?</h1>
          <p className="text-silver-light text-lg max-w-2xl font-sans leading-relaxed">
            Gary from Accounting can help you contact us and make sure your message reaches the right person.
          </p>
        </div>
      </section>

      <section className="py-20 bg-navy-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="font-sans text-silver-light leading-relaxed mb-8">
              Get in touch with questions about your business, AI opportunities, or to start your free assessment.
              We respond within one business day.
            </p>

            <Link href="/assessment" className="btn-green text-base px-7 py-3.5 inline-block">
              Start Your Free Business Assessment
            </Link>

            <p className="font-sans text-xs text-silver-dark mt-4">
              The fastest way to get relevant answers tailored to your business.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 mt-14 max-w-2xl">
            <div className="border-l-2 border-teal pl-5">
              <h2 className="font-serif font-semibold text-white text-lg mb-1">Location</h2>
              <p className="font-sans text-sm text-silver-light">Tampa, Florida &mdash; serving clients remotely.</p>
            </div>
            <div className="border-l-2 border-teal pl-5">
              <h2 className="font-serif font-semibold text-white text-lg mb-1">Response time</h2>
              <p className="font-sans text-sm text-silver-light">We respond within one business day.</p>
            </div>
          </div>

          {/* Always-present alternate path, so the page is never a dead end even if the chat
              widget fails to load at all. */}
          <div className="mt-10 max-w-2xl border border-navy-800 rounded-xl p-5">
            <p className="font-sans text-sm text-silver-light">
              Prefer not to chat? The{' '}
              <Link href="/assessment" className="underline text-white font-medium">free assessment</Link>{' '}
              reaches the same place and tells us more about your business before we talk.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
