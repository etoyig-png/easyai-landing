'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useFocusTrap } from '@/lib/gary/useFocusTrap';
import {
  clearStoredSessionId,
  getOrCreateAnonymousId,
  getStoredSessionId,
  getStoredSessionCapability,
  storeSessionCapability,
  storeSessionId,
} from '@/lib/gary/clientSession';

interface ChatBubble {
  id: string;
  role: 'visitor' | 'gary';
  text: string;
}

interface MessageApiResponse {
  sessionId: string;
  sessionCapability?: string;
  reply: { text: string; options?: string[] };
  offerAssessment?: boolean;
}

export default function GaryPanel({ onClose }: { onClose: () => void }) {
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
          sessionCapability: getStoredSessionCapability(),
          anonymousId: getOrCreateAnonymousId(),
          currentPage: pathname,
          referrer: typeof document !== 'undefined' ? document.referrer : undefined,
          ...payload,
        }),
      });
      if (!response.ok) throw new Error('Gary is having trouble responding right now.');
      const data: MessageApiResponse = await response.json();
      storeSessionId(data.sessionId);
      if (data.sessionCapability) storeSessionCapability(data.sessionCapability);
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
        body: JSON.stringify({ sessionId: getStoredSessionId(), sessionCapability: getStoredSessionCapability() }),
      });
      if (!response.ok) throw new Error('handoff failed');
      const { redirectUrl } = (await response.json()) as { redirectUrl: string };
      window.location.href = redirectUrl;
    } catch {
      setError("Couldn't open the assessment just now — try the button in the menu instead.");
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
