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
  getStoredConversation,
  storeConversation,
} from '@/lib/gary/clientSession';
import {
  CONTACT_CHANGE_OPTIONS,
  CONTACT_CONFIRM_CHANGE,
  CONTACT_CONFIRM_YES,
  CONTACT_SOMETHING_ELSE,
  type ContactDraft,
  type ContactField,
  type ContactFlowRequest,
} from '@/lib/gary/contactFlow';

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
  contactFlow?: { draft: ContactDraft; freeText: boolean; placeholder?: string; done?: boolean; outcome?: string; retryable?: boolean };
}

type GaryRequest = { message?: string; optionSelected?: string; contactFlow?: ContactFlowRequest };
type RequestEnvelope = GaryRequest & {
  requestId?: string; sessionId?: string; sessionCapability?: string; anonymousId: string;
  currentPage: string; referrer?: string;
};
type PendingRequest = GaryRequest & { requestEnvelope?: RequestEnvelope; retryBlocked?: boolean };
interface ConversationSnapshot {
  messages: ChatBubble[]; options: string[]; offerAssessment: boolean; input: string;
  contactDraft: ContactDraft | null; contactPlaceholder: string | null; choosingChange: boolean;
  pending: PendingRequest | null; hasContactFlow: boolean; contactPending?: boolean;
}

const BLOCKED_REQUEST = 'This request cannot be retried safely. Start Over opens a new chat; it does not cancel this request.';

const LEGACY_REQUEST = 'This older request has no replay protection. Its outcome is unknown; retrying may repeat it.';

const UNCONFIRMED_REQUEST = 'The outcome is unknown. Your request is kept here; delivery is not confirmed. Retry the same request when ready.';

export type GaryIntent = 'contact' | null;

export default function GaryPanel({ onClose, initialIntent = null }: { onClose: () => void; initialIntent?: GaryIntent }) {
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatBubble[]>([]);
  const [options, setOptions] = useState<string[]>([]);
  const [offerAssessment, setOfferAssessment] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmingStartOver, setConfirmingStartOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The four-step contact flow. The server holds no flow state: the draft lives here and is
  // echoed back with every turn, so the server can validate and advance it.
  const [contactDraft, setContactDraft] = useState<ContactDraft | null>(null);
  const [contactPlaceholder, setContactPlaceholder] = useState<string | null>(null);
  const [choosingChange, setChoosingChange] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);
  const requestController = useRef<AbortController | null>(null);
  const [hasContactFlow, setHasContactFlow] = useState(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; requestController.current?.abort(); };
  }, []);
  const [restored, setRestored] = useState(false);
  const [pending, setPending] = useState<PendingRequest | null>(null);

  const [contactPending, setContactPending] = useState(false);

  const recoveryRef = useRef<ConversationSnapshot>();
  recoveryRef.current = { messages, options, offerAssessment, input, contactDraft, contactPlaceholder, choosingChange, pending, hasContactFlow, contactPending };

  useEffect(() => {
    if (!restored) return;
    storeConversation(recoveryRef.current);
  }, [restored, messages, options, offerAssessment, input, contactDraft, contactPlaceholder, choosingChange, pending, hasContactFlow, contactPending]);

  useFocusTrap(panelRef, true, onClose);

  async function sendToGary(payload: PendingRequest, retry = false) {
    const { requestEnvelope, retryBlocked, message, optionSelected, contactFlow } = payload;
    if (busyRef.current || retryBlocked) return;
    busyRef.current = true;
    setSending(true);
    const controller = new AbortController();
    requestController.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 65_000);
    setError(null);
    try {
      const sessionId = getStoredSessionId();
      // Persist the original envelope once. Retry must not acquire new credentials or
      // page metadata; legacy dispatched snapshots must not gain a new request identity.
      const envelope: RequestEnvelope = requestEnvelope ?? {
        message, optionSelected, contactFlow,
        ...(sessionId ? { sessionId, sessionCapability: getStoredSessionCapability() ?? undefined } : {}),
        anonymousId: getOrCreateAnonymousId(), currentPage: pathname,
        referrer: document.referrer || undefined,
        ...(!retry && !contactFlow ? { requestId: crypto.randomUUID() } : {}),
      };
      const saved = { ...payload, requestEnvelope: envelope };
      setPending(saved);
      // Save before dispatch, including refresh before React's next effect.
      storeConversation({ ...recoveryRef.current, pending: saved });
      const response = await fetch('/api/gary/message', {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(envelope),
      });
      if (!mountedRef.current) return;
      const data = await response.json().catch(() => null) as (MessageApiResponse & { outcome?: string }) | null;
      if (!mountedRef.current) return;
      if (!response.ok) {
        const outcome = data?.outcome;
        const blocked = response.status === 403 || response.status === 410 ||
          (response.status === 409 && outcome !== 'pending') ||
          ['conflict', 'indeterminate', 'expired'].includes(outcome ?? '');
        if (blocked) {
          const stopped = { ...saved, retryBlocked: true };
          setPending(stopped);
          storeConversation({ ...recoveryRef.current, pending: stopped });
        }
        const text = outcome === 'pending'
          ? 'Your original request is still pending or uncertain. Wait a moment, then retry the same request.'
          : outcome === 'unavailable'
            ? 'Gary could not access the saved request. Retry it when ready.'
            : blocked
              ? BLOCKED_REQUEST
              : retry && !envelope.requestId && !envelope.contactFlow
                ? LEGACY_REQUEST
                : UNCONFIRMED_REQUEST;
        setError(text);
        return;
      }
      if (!data?.sessionId || typeof data.reply?.text !== 'string') throw new Error();
      storeSessionId(data.sessionId);
      if (data.sessionCapability) storeSessionCapability(data.sessionCapability);
      setMessages((prev) => {
        const bubble: ChatBubble = { id: `gary-${Date.now()}`, role: 'gary', text: data.reply.text };
        return contactPending && payload.contactFlow?.action === 'confirm' && prev.at(-1)?.role === 'gary'
          ? [...prev.slice(0, -1), bubble] : [...prev, bubble];
      });
      setContactPending(data.contactFlow?.outcome === 'pending');
      setOptions(data.reply.options ?? []);
      setOfferAssessment(Boolean(data.offerAssessment));
      setChoosingChange(false);
      setPending(null);
      if (data.contactFlow) setHasContactFlow(true);
      if (data.contactFlow && !data.contactFlow.done) {
        setContactDraft(data.contactFlow.draft);
        setContactPlaceholder(data.contactFlow.placeholder ?? null);
      } else {
        setContactDraft(null);
        setContactPlaceholder(null);
      }
    } catch {
      if (mountedRef.current) setError(UNCONFIRMED_REQUEST);
    } finally {
      window.clearTimeout(timeout);
      busyRef.current = false;
      if (mountedRef.current) setSending(false);
    }
  }

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    // Strict Mode replays effects before the first microtask. Cancel that rehearsal setup
    // before dispatch so development opens once without a duplicate backend request.
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const saved = getStoredConversation<ConversationSnapshot>();
      setRestored(true);
      if (saved) {
        recoveryRef.current = saved;
        setMessages(saved.messages);
        setOptions(saved.options);
        setOfferAssessment(saved.offerAssessment);
        setInput(saved.input);
        setContactDraft(saved.contactDraft);
        setContactPlaceholder(saved.contactPlaceholder);
        setChoosingChange(saved.choosingChange);
        setPending(saved.pending);
        setHasContactFlow(Boolean(saved.hasContactFlow));
        setContactPending(Boolean(saved.contactPending));
        if (initialIntent === 'contact' && !saved.hasContactFlow && !saved.pending) {
          void sendToGary({ contactFlow: { action: 'start' } });
        }
        if (saved.pending) setError(saved.pending.retryBlocked
          ? BLOCKED_REQUEST
          : !saved.pending.requestEnvelope?.requestId && !saved.pending.contactFlow
            ? LEGACY_REQUEST
            : UNCONFIRMED_REQUEST);
        return;
      }
      if (initialIntent === 'contact') {
        void sendToGary({ contactFlow: { action: 'start' } });
        return;
      }
      if (getStoredSessionId()) {
        setError('Your earlier conversation is not available in this tab. Start over to begin a new chat.');
        return;
      }
      void sendToGary({});
    });
    return () => { cancelled = true; initializedRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSend(text: string, optionSelected?: string) {
    const trimmed = text.trim();
    if (!trimmed || busyRef.current || pending) return;
    setMessages((prev) => [...prev, { id: `visitor-${Date.now()}`, role: 'visitor', text: trimmed }]);
    setOptions([]);
    setInput('');
    if (contactDraft) {
      // Inside the contact flow every typed answer advances the current step, never the model.
      void sendToGary({ contactFlow: { action: 'answer', draft: contactDraft, text: trimmed } });
      return;
    }
    void sendToGary({ message: trimmed, optionSelected });
  }

  function handleContactOption(option: string) {
    if (!contactDraft || busyRef.current || pending) return;
    if (option === CONTACT_SOMETHING_ELSE) {
      // Free typing in the same step. Focus the field; nothing is sent and no step is added.
      inputRef.current?.focus();
      return;
    }
    if (contactPending && option !== CONTACT_CONFIRM_YES) return;
    if (option === CONTACT_CONFIRM_CHANGE) {
      setChoosingChange(true);
      return;
    }
    if (!contactPending) setMessages((prev) => [...prev, { id: `visitor-${Date.now()}`, role: 'visitor', text: option }]);
    if (option !== CONTACT_CONFIRM_YES) setOptions([]);
    if (option === CONTACT_CONFIRM_YES) {
      void sendToGary({ contactFlow: { action: 'confirm', draft: contactDraft } });
      return;
    }
    void sendToGary({ contactFlow: { action: 'answer', draft: contactDraft, text: option } });
  }

  function handleChangeField(field: ContactField) {
    if (!contactDraft || busyRef.current || pending) return;
    setChoosingChange(false);
    setOptions([]);
    void sendToGary({ contactFlow: { action: 'change', draft: contactDraft, field } });
  }

  async function handleStartAssessment() {
    setSending(true);
    setError(null);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 65_000);
    try {
      const response = await fetch('/api/gary/handoff', {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: getStoredSessionId(), sessionCapability: getStoredSessionCapability() }),
      });
      if (!response.ok) throw new Error();
      const { redirectUrl } = (await response.json()) as { redirectUrl: string };
      if (mountedRef.current) window.location.href = redirectUrl;
    } catch {
      if (mountedRef.current) {
        setError("Couldn't open the assessment. Try again or keep chatting.");
        setSending(false);
      }
    } finally { window.clearTimeout(timeout); }
  }

  function handleStartOver() {
    if ((messages.length > 0 || getStoredSessionId()) && !confirmingStartOver) {
      setConfirmingStartOver(true);
      return;
    }
    if (busyRef.current) return;
    clearStoredSessionId();
    recoveryRef.current = { messages: [], options: [], offerAssessment: false, input: '', contactDraft: null, contactPlaceholder: null, choosingChange: false, pending: null, hasContactFlow: false, contactPending: false };
    setPending(null);
    setHasContactFlow(false);
    setContactPending(false);
    setMessages([]);
    setInput('');
    setOptions([]);
    setOfferAssessment(false);
    setConfirmingStartOver(false);
    setContactDraft(null);
    setContactPlaceholder(null);
    setChoosingChange(false);
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
      className="fixed inset-0 z-[60] flex flex-col bg-white sm:inset-auto sm:right-4 sm:bottom-4 sm:h-[min(600px,calc(100dvh-2rem))] sm:w-[380px] sm:rounded-xl sm:shadow-2xl sm:border sm:border-slate-200"
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

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {messages.map((bubble) => (
          <div key={bubble.id} className={bubble.role === 'gary' ? 'flex justify-start' : 'flex justify-end'}>
            <div
              className={
                bubble.role === 'gary'
                  ? 'max-w-[85%] whitespace-pre-wrap break-words rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-800'
                  : 'max-w-[85%] whitespace-pre-wrap break-words rounded-lg bg-navy-900 px-3 py-2 text-sm text-white'
              }
            >
              {bubble.text}
            </div>
          </div>
        ))}
        {sending && <p className="text-xs text-slate-400">Gary is typing...</p>}
        {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
        {pending && !pending.retryBlocked && !sending && (
          <button type="button" className="min-h-[44px] rounded-lg border border-slate-300 px-3 text-sm text-slate-700" onClick={() => void sendToGary(pending, true)}>
            Retry request
          </button>
        )}

        {contactDraft?.step === 'confirm' && <p className="text-xs text-slate-600">By choosing “Yes, send it”, you agree to share these details with Easy AI so the team can respond.</p>}
        {options.length > 0 && !choosingChange && (
          <div className="flex flex-col gap-2" data-testid="gary-options">
            {options.map((option) => (
              <button
                key={option}
                disabled={sending || Boolean(pending) || (contactPending && option !== CONTACT_CONFIRM_YES)}
                type="button"
                onClick={() => (contactDraft ? handleContactOption(option) : handleSend(option, option))}
                className={
                  contactDraft && option === CONTACT_CONFIRM_YES
                    // Darker than .btn-green on purpose: white 14 px text on green-600 is 3.3:1
                    // against the panel's white surface; green-800 gives 6.4:1 (WCAG AA 4.5:1).
                    ? 'inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-green-800 px-3 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-green-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-900'
                    : contactDraft && option === CONTACT_SOMETHING_ELSE
                      ? 'min-h-[44px] rounded-lg px-3 py-2 text-left text-sm text-slate-500 underline'
                      : 'min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-left text-sm text-slate-700 hover:border-navy-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-silver'
                }
              >
                {option}
              </button>
            ))}
            {!contactDraft && (
              <button
                type="button"
                onClick={() => handleSend('Something different')}
                className="min-h-[44px] rounded-lg px-3 py-2 text-left text-sm text-slate-500 underline"
              >
                Something different
              </button>
            )}
          </div>
        )}

        {choosingChange && contactDraft && (
          <div className="flex flex-col gap-2" data-testid="gary-change-options">
            <p className="text-xs text-slate-500">Which one?</p>
            {CONTACT_CHANGE_OPTIONS.map(({ label, field }) => (
              <button
                key={field}
                disabled={sending || Boolean(pending) || contactPending}
                type="button"
                onClick={() => handleChangeField(field)}
                className="min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-left text-sm text-slate-700 hover:border-navy-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-silver"
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {offerAssessment && !contactDraft && (
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
              disabled={sending}
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
          ref={inputRef}
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={contactPlaceholder ?? 'Type a message...'}
          disabled={sending || Boolean(pending) || contactPending}
          maxLength={contactDraft ? 1000 : 2000}
          aria-label={contactPlaceholder ?? 'Message Gary'}
          // Explicit colours on purpose: the site body is white-on-navy, and this field sits on the
          // panel's white surface, so inherited text would be white on white.
          className="min-h-[44px] flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-500 disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus-visible:border-navy-900 focus-visible:ring-2 focus-visible:ring-navy-900"
        />
        <button
          type="submit"
          disabled={sending || Boolean(pending) || contactPending || !input.trim()}
          className="min-h-[44px] min-w-[44px] rounded-lg bg-navy-900 px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
