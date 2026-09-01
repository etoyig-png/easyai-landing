'use client';

const ANONYMOUS_ID_KEY = 'gary-anonymous-id';
const SESSION_ID_KEY = 'gary-session-id';
const SESSION_CAPABILITY_KEY = 'gary-session-capability';
const ANIMATION_PLAYED_KEY = 'gary-launch-animated-v1';

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Persists across the browser session (survives page navigation, not a new tab/browser restart). */
export function getOrCreateAnonymousId(): string {
  if (typeof window === 'undefined') return '';
  let id = window.localStorage.getItem(ANONYMOUS_ID_KEY);
  if (!id) {
    id = randomId();
    window.localStorage.setItem(ANONYMOUS_ID_KEY, id);
  }
  return id;
}

export function getStoredSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(SESSION_ID_KEY);
}

export function storeSessionId(sessionId: string): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(SESSION_ID_KEY, sessionId);
}

export function getStoredSessionCapability(): string | null {
  return typeof window === 'undefined' ? null : window.sessionStorage.getItem(SESSION_CAPABILITY_KEY);
}

export function storeSessionCapability(capability: string): void {
  if (typeof window !== 'undefined') window.sessionStorage.setItem(SESSION_CAPABILITY_KEY, capability);
}

export function clearStoredSessionId(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(SESSION_ID_KEY);
  window.sessionStorage.removeItem(SESSION_CAPABILITY_KEY);
}

/** The full attention routine (jump, point, sign) plays once per browser session — later page loads show the seated state instead. */
export function hasPlayedLaunchAnimation(): boolean {
  if (typeof window === 'undefined') return true;
  return window.sessionStorage.getItem(ANIMATION_PLAYED_KEY) === '1';
}

export function markLaunchAnimationPlayed(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(ANIMATION_PLAYED_KEY, '1');
}
