'use client';
import { useEffect, useState } from 'react';
import { readAssessmentReceipt, storeAssessmentReceipt, type AssessmentReceipt } from '@/lib/assessmentReceipt';
type SavedResult = { submissionId: string; businessName: string; text: string };
type Status = 'checking' | 'unknown' | 'pending' | 'completed' | 'failed';
const headings: Record<Status, [string, string]> = {
  checking: ['Checking your assessment status', 'We are checking the saved submission, not assuming delivery.'],
  unknown: ['Your assessment submission', 'Delivery cannot be confirmed in this browser. If you submitted an assessment and need help, contact us.'],
  pending: ['Your assessment is being processed', 'Your submission is saved. Delivery is not confirmed yet; you can check this page again later.'],
  completed: ['Your Action Plan was accepted for email delivery', 'The email provider accepted your plan. Check your inbox and spam folder; this does not confirm arrival.'],
  failed: ['We could not send your Action Plan', 'Your submission is saved, but email delivery failed. Please contact us so we can help.'],
};
export default function AssessmentDeliveryStatus({ contactEmail }: { contactEmail: string }) {
  const [{ status, result, canRecheck }, setView] = useState<{ status: Status; result?: SavedResult | null; canRecheck?: boolean }>({ status: 'checking' });
  const [checkAttempt, setCheckAttempt] = useState(0);
  useEffect(() => {
    setView({ status: 'checking' });
    let stopped = false; let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    let receipt: AssessmentReceipt;
    try {
      const stored = readAssessmentReceipt();
      if (!stored?.id || !stored.capability || !Number.isFinite(stored.storedAt) || Date.now() - stored.storedAt > 24 * 60 * 60 * 1000) {
        storeAssessmentReceipt(null); setView({ status: 'unknown' }); return;
      }
      receipt = stored;
    } catch { setView({ status: 'unknown' }); return; }
    async function poll(remaining: number) {
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 4000);
      try {
        const response = await fetch(`/api/assessment/status?id=${encodeURIComponent(receipt.id)}`, {
          headers: { Authorization: `Bearer ${receipt.capability}` }, signal: controller.signal, cache: 'no-store',
        });
        if (!response.ok) throw new Error();
        const { status, submissionId, businessName, result } = await response.json();
        if (!['pending', 'completed', 'failed'].includes(status)) throw new Error();
        if (submissionId !== undefined && submissionId !== receipt.id) throw new Error();
        let saved: SavedResult | null = null;
        if (result?.availability === 'available') {
          if (submissionId !== receipt.id || typeof businessName !== 'string' || !businessName.trim() ||
              typeof result.text !== 'string' || !result.text.trim()) throw new Error();
          saved = { submissionId, businessName, text: result.text };
        } else if (result && !['pending', 'unavailable'].includes(result.availability)) throw new Error();
        if (!stopped) {
          setView({ status, result: saved, canRecheck: status === 'failed' || (status === 'completed' && !saved) || (status === 'pending' && remaining === 1) });
          if (status === 'pending' && remaining > 1) timer = setTimeout(() => void poll(remaining - 1), 5000);
        }
      } catch { if (!stopped) { setView({ status: 'unknown', canRecheck: true }); } }
      finally { clearTimeout(timeout); }
    }
    void poll(24); // <=24 read-only calls; no re-generation, resend or paid call
    return () => { stopped = true; clearTimeout(timer); controller?.abort(); };
  }, [checkAttempt]);
  return <div aria-live="polite">
    <p className="section-label text-teal-300 mb-3">Assessment status</p>
    <h1 className="text-4xl md:text-5xl font-bold mb-4">{headings[status][0]}</h1>
    <p className="text-brand-100 text-lg max-w-2xl">
      {headings[status][1]}
    </p>
    {canRecheck && <button type="button" className="block text-teal-200 underline my-4" onClick={() => setCheckAttempt(attempt => attempt + 1)}>Check status again</button>}
    {result && <section aria-label="Your assessment results" className="card mt-8 p-6 sm:p-8 text-slate-900" data-assessment-id={result.submissionId}>
      <h2 className="text-2xl font-bold mb-2 break-words">Your Action Plan for {result.businessName}</h2>
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{result.text}</p>
    </section>}
    {(status === 'failed' || status === 'unknown') && <a className="text-teal-200 underline" href={`mailto:${contactEmail}`}>{contactEmail}</a>}
  </div>;
}
