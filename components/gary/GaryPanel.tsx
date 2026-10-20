'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useFocusTrap } from '@/lib/gary/useFocusTrap';
import {
  clearStoredSessionId,
  getOrCreateAnonymousId,
  getStoredSessionId,
  storeSessionId,
} from '@/lib/gary/clientSession';

interface ChatBubble {
  id: string;
  role: 'visitor' | 'gary';
  text: string;
}

interface MessageApiResponse {
  sessionId: string;
  reply: { text: string; options?: string[] };
  offerAssessment?: boolean;
}

export default function GaryPanel({
  onClose,
  intent,
}: {
  onClose: () => void;
  /** 'contact' when opened from the Contact page. Sent with every message in this conversation
   *  (rather than stored server-side) so no session-schema change is needed. */
  intent?: 'contact';
}) {
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatBubble[]>([]);
  const [options, setOptions] = useState<string[]>([]);
  const [offerAssessment, setOfferAssessment] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmingStartOver, setConfirmingStartOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);
  // Contact mode only: the structured confirm-and-send step. Gary gathers the details
  // conversationally, then the visitor reviews them here and presses send. Submission is driven
  // by these validated fields rather than by parsing chat text, so what gets delivered is exactly
  // what the visitor saw and approved - which is what makes "read it back and confirm" real.
  const [showConfirm, setShowConfirm] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactDraft, setContactDraft] = useState({
    name: '',
    businessName: '',
    reason: '',
    preferredContact: 'email' as 'email' | 'phone',
    email: '',
    phone: '',
  });

  useFocusTrap(panelRef, true, onClose);

  async function sendToGary(payload: { message?: string; optionSelected?: string }) {
    setSending(true);
    setError(null);
    try {
      const response = await fetch('/api/gary/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: getStoredSessionId(),
          anonymousId: getOrCreateAnonymousId(),
          currentPage: pathname,
          intent,
          referrer: typeof document !== 'undefined' ? document.referrer : undefined,
          ...payload,
        }),
      });
      if (!response.ok) throw new Error('Gary is having trouble responding right now.');
      const data: MessageApiResponse = await response.json();
      storeSessionId(data.sessionId);
      setMessages((prev) => [...prev, { id: `gary-${Date.now()}`, role: 'gary', text: data.reply.text }]);
      setOptions(data.reply.options ?? []);
      setOfferAssessment(Boolean(data.offerAssessment));
    } catch {
      setError('Something went wrong. You can keep typing, or reach out directly if this keeps happening.');
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    // A contact conversation always starts fresh: resuming an unrelated earlier chat would drop
    // the visitor into the middle of a different topic when they clicked "contact us".
    if (intent === 'contact') {
      clearStoredSessionId();
      void sendToGary({});
      return;
    }
    if (getStoredSessionId()) return; // resuming an existing session — nothing to send yet
    void sendToGary({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSend(text: string, optionSelected?: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setMessages((prev) => [...prev, { id: `visitor-${Date.now()}`, role: 'visitor', text: trimmed }]);
    setOptions([]);
    setInput('');
    void sendToGary({ message: trimmed, optionSelected });
  }

  async function handleStartAssessment() {
    setSending(true);
    try {
      const response = await fetch('/api/gary/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: getStoredSessionId() }),
      });
      if (!response.ok) throw new Error('handoff failed');
      const { redirectUrl } = (await response.json()) as { redirectUrl: string };
      window.location.href = redirectUrl;
    } catch {
      setError("Couldn't open the assessment just now — try the button in the menu instead.");
      setSending(false);
    }
  }

  async function submitContactRequest() {
    if (sending || contactSent) return;
    setContactError(null);
    const detail = contactDraft.preferredContact === 'email' ? contactDraft.email.trim() : contactDraft.phone.trim();
    if (!contactDraft.name.trim() || !contactDraft.reason.trim() || !detail) {
      setContactError('Please fill in your name, what this is about, and how to reach you.');
      return;
    }
    setSending(true);
    try {
      const response = await fetch('/api/gary/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: getStoredSessionId(),
          name: contactDraft.name.trim(),
          businessName: contactDraft.businessName.trim() || undefined,
          reason: contactDraft.reason.trim(),
          preferredContact: contactDraft.preferredContact,
          email: contactDraft.email.trim() || undefined,
          phone: contactDraft.phone.trim() || undefined,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { delivered?: boolean; error?: string };
      // Only treat this as sent when the server says it actually delivered. A failed send must
      // never render as a success.
      if (!response.ok || !data.delivered) throw new Error(data.error ?? 'send failed');
      setContactSent(true);
      setMessages((prev) => [
        ...prev,
        {
          id: `gary-sent-${Date.now()}`,
          role: 'gary',
          text: "Got it - that's on its way to the team. Someone will follow up using the contact method you chose, usually within one business day.",
        },
      ]);
      setShowConfirm(false);
    } catch {
      setContactError('That did not send. Please try again, or use the free assessment link on the contact page.');
    } finally {
      setSending(false);
    }
  }

  function handleStartOver() {
    if (messages.length > 0 && !confirmingStartOver) {
      setConfirmingStartOver(true);
      return;
    }
    clearStoredSessionId();
    setMessages([]);
    setOptions([]);
    setOfferAssessment(false);
    setConfirmingStartOver(false);
    setShowConfirm(false);
    setContactSent(false);
    setContactError(null);
    initializedRef.current = false;
    void sendToGary({}).then(() => {
      initializedRef.current = true;
    });
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Chat with Gary from Accounting"
      className="fixed inset-0 z-[60] flex flex-col bg-white sm:inset-auto sm:right-4 sm:bottom-4 sm:h-[600px] sm:w-[380px] sm:rounded-xl sm:shadow-2xl sm:border sm:border-slate-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-between border-b border-slate-200 bg-navy-900 px-4 py-3 sm:rounded-t-xl">
        <span className="text-sm font-semibold text-white">Gary from Accounting</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleStartOver}
            className="min-h-[44px] min-w-[44px] rounded px-2 text-xs font-medium text-silver-light hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-silver"
          >
            {confirmingStartOver ? 'Confirm?' : 'Start Over'}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-silver-light hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-silver"
          >
            &times;
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {messages.map((bubble) => (
          <div key={bubble.id} className={bubble.role === 'gary' ? 'flex justify-start' : 'flex justify-end'}>
            <div
              className={
                bubble.role === 'gary'
                  ? 'max-w-[85%] rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-800'
                  : 'max-w-[85%] rounded-lg bg-navy-900 px-3 py-2 text-sm text-white'
              }
            >
              {bubble.text}
            </div>
          </div>
        ))}
        {/* Contact mode: review-and-send. Gary asks for these conversationally above; this step
            exists so the visitor sees exactly what will be sent and has to press send. Nothing
            leaves the browser until this button is pressed. */}
        {intent === 'contact' && !contactSent && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            {!showConfirm ? (
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                className="w-full rounded bg-navy-900 px-3 py-2 text-xs font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700"
              >
                Review and send my message
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700">Check this over before it goes:</p>
                <label className="block text-[11px] font-medium text-slate-600">
                  Your name
                  <input
                    value={contactDraft.name}
                    onChange={(e) => setContactDraft((d) => ({ ...d, name: e.target.value }))}
                    className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-800"
                  />
                </label>
                <label className="block text-[11px] font-medium text-slate-600">
                  Business name (optional)
                  <input
                    value={contactDraft.businessName}
                    onChange={(e) => setContactDraft((d) => ({ ...d, businessName: e.target.value }))}
                    className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-800"
                  />
                </label>
                <label className="block text-[11px] font-medium text-slate-600">
                  What is this about?
                  <textarea
                    rows={2}
                    value={contactDraft.reason}
                    onChange={(e) => setContactDraft((d) => ({ ...d, reason: e.target.value }))}
                    className="mt-0.5 w-full resize-y rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-800"
                  />
                </label>
                <fieldset>
                  <legend className="text-[11px] font-medium text-slate-600">How should we reach you?</legend>
                  <div className="mt-1 flex gap-3">
                    {(['email', 'phone'] as const).map((method) => (
                      <label key={method} className="flex items-center gap-1 text-xs text-slate-700">
                        <input
                          type="radio"
                          name="gary-preferred-contact"
                          checked={contactDraft.preferredContact === method}
                          onChange={() => setContactDraft((d) => ({ ...d, preferredContact: method }))}
                        />
                        {method === 'email' ? 'Email' : 'Phone'}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="block text-[11px] font-medium text-slate-600">
                  {contactDraft.preferredContact === 'email' ? 'Email address' : 'Phone number'}
                  <input
                    type={contactDraft.preferredContact === 'email' ? 'email' : 'tel'}
                    value={contactDraft.preferredContact === 'email' ? contactDraft.email : contactDraft.phone}
                    onChange={(e) =>
                      setContactDraft((d) =>
                        d.preferredContact === 'email' ? { ...d, email: e.target.value } : { ...d, phone: e.target.value }
                      )
                    }
                    className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-800"
                  />
                </label>
                {contactError && <p className="text-xs text-red-600">{contactError}</p>}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={submitContactRequest}
                    disabled={sending}
                    className="flex-1 rounded bg-green-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
                  >
                    {sending ? 'Sending...' : 'Send to Easy AI'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirm(false)}
                    className="rounded border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600"
                  >
                    Not yet
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {sending && <p className="text-xs text-slate-400">Gary is typing...</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}

        {options.length > 0 && (
          <div className="flex flex-col gap-2">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleSend(option, option)}
                className="min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-left text-sm text-slate-700 hover:border-navy-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-silver"
              >
                {option}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleSend('Something different')}
              className="min-h-[44px] rounded-lg px-3 py-2 text-left text-sm text-slate-500 underline"
            >
              Something different
            </button>
          </div>
        )}

        {offerAssessment && (
          <div className="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <button
              type="button"
              onClick={handleStartAssessment}
              disabled={sending}
              className="btn-green min-h-[44px] w-full text-center text-sm"
            >
              Start My Free Assessment
            </button>
            <button
              type="button"
              onClick={() => setOfferAssessment(false)}
              className="min-h-[44px] text-sm text-slate-600 underline"
            >
              Keep Chatting
            </button>
          </div>
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSend(input);
        }}
        className="flex items-center gap-2 border-t border-slate-200 px-3 py-3"
      >
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Type a message..."
          disabled={sending}
          className="min-h-[44px] flex-1 rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-silver"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="min-h-[44px] min-w-[44px] rounded-lg bg-navy-900 px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
