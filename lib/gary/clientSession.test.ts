import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as session from './clientSession';

const values = new Map<string, string>();
const snapshot = { messages: [{ id: 'gary-1', role: 'gary', text: 'Hello' }], options: [], input: '',
  offerAssessment: false, choosingChange: false, contactPlaceholder: null, contactDraft: null, pending: null, hasContactFlow: false };
beforeEach(() => {
  values.clear();
  vi.stubGlobal('window', { sessionStorage: { getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => values.set(k, v), removeItem: (k: string) => values.delete(k) } });
});
afterEach(() => vi.unstubAllGlobals());

describe('Gary recovery boundaries', () => {
  it('does not show one session recovery under another session identity', () => {
    session.storeSessionId('visitor-a'); session.storeConversation(snapshot);
    session.storeSessionId('visitor-b');
    expect(session.getStoredConversation()).toBeNull();
  });
  it('Start Over removes credentials and personal recovery data together', () => {
    session.storeSessionId('visitor-a'); session.storeSessionCapability('private'); session.storeConversation(snapshot);
    session.clearStoredSessionId();
    expect(session.getStoredConversation()).toBeNull();
    expect(session.getStoredSessionCapability()).toBeNull();
    expect(values.has('gary-conversation-v1')).toBe(false);
  });
  it('expires recovery instead of retaining personal text indefinitely', () => {
    session.storeSessionId('visitor-a'); session.storeConversation(snapshot);
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 24 * 60 * 60 * 1000 + 1);
    expect(session.getStoredConversation()).toBeNull();
    vi.restoreAllMocks();
  });
  it('rejects malformed stored transcript values without crashing the panel', () => {
    values.set('gary-conversation-v1', JSON.stringify({ savedAt: Date.now(), sessionId: null,
      snapshot: { ...snapshot, messages: [{ id: 'x', role: 'gary', text: { html: 'bad' } }] } }));
    expect(session.getStoredConversation()).toBeNull();
  });
  it('keeps chat usable when the browser denies storage', () => {
    vi.stubGlobal('window', { sessionStorage: { getItem() { throw new Error('denied'); },
      setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } },
      localStorage: { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } } });
    session.clearStoredSessionId();
    session.storeSessionId('memory'); session.storeConversation(snapshot);
    expect(session.getStoredSessionId()).toBe('memory');
    expect(session.getStoredConversation()).toEqual(snapshot);
    expect(session.getOrCreateAnonymousId()).toBe(session.getOrCreateAnonymousId());
    session.clearStoredSessionId();
  });
});
