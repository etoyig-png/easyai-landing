import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Contact' };

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

          <div className="mt-14 max-w-2xl">
            <h2 className="font-serif font-semibold text-white text-2xl mb-6">Send a message</h2>
            <form
              action="https://formspree.io/f/REPLACE_WITH_YOUR_FORM_ID"
              method="POST"
              className="space-y-5"
            >
              <div>
                <label htmlFor="name" className="block font-sans text-sm font-medium text-silver-light mb-2">Name</label>
                <input type="text" id="name" name="name" required className="w-full rounded-lg border border-navy-700 bg-navy-800 px-4 py-3 text-white focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
              </div>
              <div>
                <label htmlFor="email" className="block font-sans text-sm font-medium text-silver-light mb-2">Email</label>
                <input type="email" id="email" name="email" required className="w-full rounded-lg border border-navy-700 bg-navy-800 px-4 py-3 text-white focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
              </div>
              <div>
                <label htmlFor="message" className="block font-sans text-sm font-medium text-silver-light mb-2">Message</label>
                <textarea id="message" name="message" required rows={5} className="w-full resize-y rounded-lg border border-navy-700 bg-navy-800 px-4 py-3 text-white focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
              </div>
              <button type="submit" className="btn-green w-full py-3">Send Message</button>
              <p className="text-xs text-silver-dark text-center">We will respond within one business day.</p>
            </form>
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
