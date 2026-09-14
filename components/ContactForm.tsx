'use client';

import { useState } from 'react';

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string };

/**
 * Posts to /api/contact, which delivers the message to the Easy AI business inbox with the
 * visitor as Reply-To. Nothing here decides where mail goes: the route and the server-only
 * email configuration do, so a visitor cannot influence sender or recipient.
 *
 * Success is only ever reported when the route confirms delivery.
 */
/** The business address is passed in by the server page so this client component never imports email configuration. */
export default function ContactForm({ fallbackEmail }: { fallbackEmail: string }) {
  const [formLoadedAt] = useState(() => Date.now());
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [fields, setFields] = useState({ name: '', email: '', phone: '', businessName: '', message: '' });

  const update = (key: keyof typeof fields) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFields((prev) => ({ ...prev, [key]: event.target.value }));

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (status.kind === 'sending') return;
    setStatus({ kind: 'sending' });
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, companyUrl: honeypot, formLoadedAt }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setStatus({ kind: 'error', message: payload.error ?? 'Something went wrong. Please try again.' });
        return;
      }
      setStatus({ kind: 'sent' });
      setFields({ name: '', email: '', phone: '', businessName: '', message: '' });
    } catch {
      setStatus({ kind: 'error', message: 'We could not reach the server. Please check your connection and try again.' });
    }
  }

  if (status.kind === 'sent') {
    return (
      <div className="rounded-xl border border-teal bg-navy-800 p-6">
        <p className="font-sans text-white font-medium">Thanks. Your message is on its way.</p>
        <p className="font-sans text-sm text-silver-light mt-2">We read every message and will reply within one business day.</p>
      </div>
    );
  }

  const inputClass =
    'w-full rounded-lg border border-navy-700 bg-navy-800 px-4 py-3 text-white focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal';
  const labelClass = 'block font-sans text-sm font-medium text-silver-light mb-2';

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {/* Honeypot, invisible to real visitors, catches basic bots. Same pair as the assessment. */}
      <input
        type="text"
        name="companyUrl"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
      />
      <div>
        <label htmlFor="name" className={labelClass}>Name</label>
        <input type="text" id="name" required value={fields.name} onChange={update('name')} className={inputClass} />
      </div>
      <div>
        <label htmlFor="email" className={labelClass}>Email</label>
        <input type="email" id="email" required value={fields.email} onChange={update('email')} className={inputClass} />
      </div>
      <div>
        <label htmlFor="phone" className={labelClass}>Phone (optional)</label>
        <input type="tel" id="phone" value={fields.phone} onChange={update('phone')} className={inputClass} />
      </div>
      <div>
        <label htmlFor="businessName" className={labelClass}>Business name (optional)</label>
        <input type="text" id="businessName" value={fields.businessName} onChange={update('businessName')} className={inputClass} />
      </div>
      <div>
        <label htmlFor="message" className={labelClass}>Message</label>
        <textarea id="message" required rows={5} value={fields.message} onChange={update('message')} className={`${inputClass} resize-y`} />
      </div>
      {status.kind === 'error' && (
        <p className="font-sans text-sm text-red-400">
          {status.message}{' '}
          <span className="text-silver-light">
            Or email us directly at <a href={`mailto:${fallbackEmail}`} className="underline text-white">{fallbackEmail}</a>.
          </span>
        </p>
      )}
      <button type="submit" disabled={status.kind === 'sending'} className="btn-green w-full py-3 disabled:opacity-60">
        {status.kind === 'sending' ? 'Sending...' : 'Send Message'}
      </button>
      <p className="text-xs text-silver-dark text-center">We will respond within one business day.</p>
    </form>
  );
}
