'use client';

const ANONYMOUS_ID_KEY = 'gary-anonymous-id';
const SESSION_ID_KEY = 'gary-session-id';
const SESSION_CAPABILITY_KEY = 'gary-session-capability';
const ANIMATION_PLAYED_KEY = 'gary-launch-animated-v1';

// Some privacy modes deny Web Storage. Keep this tab's in-memory chat usable in that case.
const memory = new Map<string, string>();
function readSession(key: string): string | null {
  try { return window.sessionStorage.getItem(key); } catch { return memory.get(key) ?? null; }
}
function writeSession(key: string, value: string): void {
  memory.set(key, value);
  try { window.sessionStorage.setItem(key, value); } catch { /* In-memory fallback. */ }
}
function removeSession(key: string): void {
  memory.delete(key);
  try { window.sessionStorage.removeItem(key); } catch { /* In-memory fallback. */ }
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Persists across the browser session (survives page navigation, not a new tab/browser restart). */
export function getOrCreateAnonymousId(): string {
  if (typeof window === 'undefined') return '';
  let id: string | null;
  try { id = window.localStorage.getItem(ANONYMOUS_ID_KEY); } catch { id = memory.get(ANONYMOUS_ID_KEY) ?? null; }
  if (!id) {
    id = randomId();
    memory.set(ANONYMOUS_ID_KEY, id);
    try { window.localStorage.setItem(ANONYMOUS_ID_KEY, id); } catch { /* In-memory fallback. */ }
  }
  return id;
}

export function getStoredSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return readSession(SESSION_ID_KEY);
}

export function storeSessionId(sessionId: string): void {
  if (typeof window === 'undefined') return;
  writeSession(SESSION_ID_KEY, sessionId);
}

export function getStoredSessionCapability(): string | null {
  return typeof window === 'undefined' ? null : readSession(SESSION_CAPABILITY_KEY);
}

export function storeSessionCapability(capability: string): void {
  if (typeof window !== 'undefined') writeSession(SESSION_CAPABILITY_KEY, capability);
}

export function clearStoredSessionId(): void {
  if (typeof window === 'undefined') return;
  removeSession(SESSION_ID_KEY);
  removeSession(SESSION_CAPABILITY_KEY);
  removeSession(CONVERSATION_KEY);
}

/** The full attention routine (jump, point, sign) plays once per browser session — later page loads show the seated state instead. */
export function hasPlayedLaunchAnimation(): boolean {
  if (typeof window === 'undefined') return true;
  return readSession(ANIMATION_PLAYED_KEY) === '1';
}

export function markLaunchAnimationPlayed(): void {
  if (typeof window === 'undefined') return;
  writeSession(ANIMATION_PLAYED_KEY, '1');
}

const CONVERSATION_KEY = 'gary-conversation-v1';

/** Tab-scoped recovery only; never an authority for server history or contact delivery. */
export function storeConversation(snapshot: unknown): void {
  try {
    const value = JSON.stringify({ sessionId: getStoredSessionId(), savedAt: Date.now(), snapshot });
    if (value.length <= 100_000) writeSession(CONVERSATION_KEY, value);
  } catch { /* Storage can be disabled or full; the current chat stays usable. */ }
}

export function getStoredConversation<T>(): T | null {
  try {
    const raw = readSession(CONVERSATION_KEY);
    if (!raw || raw.length > 100_000) return null;
    const envelope = JSON.parse(raw);
    const s = envelope.snapshot;
    if (typeof envelope.savedAt !== 'number' || Date.now() - envelope.savedAt > 24 * 60 * 60 * 1000 ||
        envelope.sessionId !== getStoredSessionId() || !s ||
        !Array.isArray(s.messages) || s.messages.length > 160 ||
        !s.messages.every((m: { id?: unknown; role?: unknown; text?: unknown }) => typeof m.id === 'string' &&
          (m.role === 'visitor' || m.role === 'gary') && typeof m.text === 'string') ||
        !Array.isArray(s.options) || !s.options.every((o: unknown) => typeof o === 'string') ||
        typeof s.input !== 'string' || typeof s.offerAssessment !== 'boolean' || typeof s.choosingChange !== 'boolean' ||
        !(s.contactPlaceholder === null || typeof s.contactPlaceholder === 'string') ||
        !(s.contactDraft === null || ['name', 'contact', 'reason', 'confirm'].includes(s.contactDraft?.step)) ||
        !(s.pending === null || (typeof s.pending === 'object' && !Array.isArray(s.pending)))) return null;
    return s as T;
  } catch { return null; }
}
