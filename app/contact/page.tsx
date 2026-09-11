import Link from 'next/link';
import type { Metadata } from 'next';
import TalkToGaryButton from '@/components/TalkToGaryButton';

export const metadata: Metadata = { title: 'Contact' };

/**
 * Gary is the contact experience. There is no form here and no traditional contact block: the
 * button opens the Gary already mounted in the layout, straight into his four-step contact flow
 * (name, how to reach you, what you need, confirm and send). The flow itself lives in
 * lib/gary/contactFlow.ts and delivers through the same route and inbox as everything else.
 */
export default function ContactPage() {
  return (
    <>
      <section className="bg-navy-900 text-white py-20 border-b border-navy-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="eyebrow-silver mb-3">GET IN TOUCH</p>
          <h1 className="text-4xl md:text-5xl font-serif font-semibold mb-4">Need to reach Easy AI? Talk to Gary.</h1>
          <p className="text-silver-light text-lg max-w-2xl font-sans leading-relaxed">
            Gary takes your name, the best way to reach you, and what you need. Then he sends it straight to the Easy AI team.
            Four quick steps, no form.
          </p>
        </div>
      </section>

      <section className="py-20 bg-navy-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl">
            <TalkToGaryButton />
            <p className="font-sans text-xs text-silver-dark mt-4">We respond within one business day.</p>
          </div>

          {/* Always-present alternate path, so the page is never a dead end even if the chat
              widget fails to load at all. */}
          <div className="mt-14 max-w-2xl border border-navy-800 rounded-xl p-5">
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
