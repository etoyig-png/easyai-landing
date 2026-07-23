import Link from 'next/link';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Contact' };

export default function ContactPage() {
  return (
    <>
      <section className="bg-gradient-to-br from-brand-950 to-brand-700 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="section-label text-teal-300 mb-3">Get in touch</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact EasyAI</h1>
          <p className="text-brand-100 text-lg max-w-2xl">Questions before booking? Reach out and we will get back to you within one business day.</p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:grid md:grid-cols-2 gap-16 items-start">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">How to reach us</h2>

            <div className="space-y-5">
              <div className="card">
                <h3 className="font-semibold text-slate-900 mb-1">Email</h3>
                <p className="text-sm text-slate-500">Email contact coming soon. In the meantime, use the form or book a consultation.</p>
              </div>
              <div className="card">
                <h3 className="font-semibold text-slate-900 mb-1">Phone</h3>
                <p className="text-sm text-slate-500">Phone number coming soon.</p>
              </div>
              <div className="card">
                <h3 className="font-semibold text-slate-900 mb-1">Location</h3>
                <p className="text-sm text-slate-500">Tampa, FL — Serving clients remotely</p>
              </div>
              <div className="card">
                <h3 className="font-semibold text-slate-900 mb-1">Response time</h3>
                <p className="text-sm text-slate-500">We respond within one business day.</p>
              </div>
            </div>

            <div className="mt-8 bg-brand-50 border border-brand-100 rounded-xl p-4">
              <p className="text-sm text-brand-800 font-medium mb-1">Prefer to start with the assessment?</p>
              <p className="text-sm text-brand-700">The <Link href="/assessment" className="underline">AI Opportunity Assessment</Link> is the fastest way to get relevant answers. It takes 10 minutes and we respond directly to what you submit.</p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Send a message</h2>
            <form
              action="https://formspree.io/f/REPLACE_WITH_YOUR_FORM_ID"
              method="POST"
              className="space-y-4"
            >
              <div>
                <label htmlFor="name" className="label">Name</label>
                <input type="text" id="name" name="name" required className="input" />
              </div>
              <div>
                <label htmlFor="email" className="label">Email</label>
                <input type="email" id="email" name="email" required className="input" />
              </div>
              <div>
                <label htmlFor="message" className="label">Message</label>
                <textarea id="message" name="message" required rows={5} className="input resize-y" />
              </div>
              <button type="submit" className="btn-primary w-full py-3">Send Message</button>
              <p className="text-xs text-slate-400 text-center">We will respond within one business day.</p>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
