'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ASSESSMENT_RECEIPT_KEY, type AssessmentReceipt } from '@/lib/assessmentReceipt';
type Status = 'checking' | 'unknown' | 'pending' | 'completed' | 'failed';
const headings: Record<Status, string> = {
  checking: 'Checking your assessment status', unknown: 'Your assessment submission',
  pending: 'Your assessment is being processed', completed: 'Your Action Plan was accepted for email delivery',
  failed: 'We could not send your Action Plan',
};
export default function AssessmentDeliveryStatus({ contactEmail }: { contactEmail: string }) {
  const [status, setStatus] = useState<Status>('checking');
  const [checkAttempt, setCheckAttempt] = useState(0);
  const [canRecheck, setCanRecheck] = useState(false);
  useEffect(() => {
    setStatus('checking');
    setCanRecheck(false);
    let stopped = false; let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    let receipt: AssessmentReceipt;
    try {
      receipt = JSON.parse(sessionStorage.getItem(ASSESSMENT_RECEIPT_KEY) ?? 'null');
      if (!receipt?.id || !receipt.capability || !Number.isFinite(receipt.storedAt) || Date.now() - receipt.storedAt > 24 * 60 * 60 * 1000) {
        sessionStorage.removeItem(ASSESSMENT_RECEIPT_KEY); setStatus('unknown'); return;
      }
    } catch { setStatus('unknown'); return; }
    async function poll(remaining: number) {
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 4000);
      try {
        const response = await fetch(`/api/assessment/status?id=${encodeURIComponent(receipt.id)}`, {
          headers: { Authorization: `Bearer ${receipt.capability}` }, signal: controller.signal, cache: 'no-store',
        });
        if (!response.ok) throw new Error('status unavailable');
        const body = await response.json();
        if (!['pending', 'completed', 'failed'].includes(body.status)) throw new Error('unknown status');
        if (!stopped) {
          setStatus(body.status);
          setCanRecheck(body.status === 'failed' || (body.status === 'pending' && remaining === 1));
          if (body.status === 'pending' && remaining > 1) timer = setTimeout(() => void poll(remaining - 1), 5000);
        }
      } catch { if (!stopped) { setStatus('unknown'); setCanRecheck(true); } }
      finally { clearTimeout(timeout); }
    }
    void poll(24); // <=24 read-only calls; no re-generation, resend or paid call
    return () => { stopped = true; clearTimeout(timer); controller?.abort(); };
  }, [checkAttempt]);
  return <div aria-live="polite">
    <p className="section-label text-teal-300 mb-3">Assessment status</p>
    <h1 className="text-4xl md:text-5xl font-bold mb-4">{headings[status]}</h1>
    <p className="text-brand-100 text-lg max-w-2xl">
      {status === 'completed' ? 'The email provider accepted your plan. Check your inbox and spam folder; this does not confirm arrival.'
        : status === 'pending' ? 'Your submission is saved. Delivery is not confirmed yet; you can check this page again later.'
          : status === 'failed' ? 'Your submission is saved, but email delivery failed. Please contact us so we can help.'
            : status === 'checking' ? 'We are checking the saved submission, not assuming delivery.'
              : 'Delivery cannot be confirmed in this browser. If you submitted an assessment and need help, contact us.'}
    </p>
    {canRecheck && <button type="button" className="block text-teal-200 underline my-4" onClick={() => setCheckAttempt(attempt => attempt + 1)}>Check status again</button>}
    {(status === 'failed' || status === 'unknown') && <Link className="text-teal-200 underline" href={`mailto:${contactEmail}`}>{contactEmail}</Link>}
  </div>;
}
