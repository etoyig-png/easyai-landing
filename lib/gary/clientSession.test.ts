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
  it('uses new in-memory identity when quota blocks writes but reads return stale data', () => {
    session.storeSessionId('old-session');
    vi.stubGlobal('window', { sessionStorage: { getItem: (key: string) => values.get(key) ?? null,
      setItem() { throw new Error('quota exceeded'); }, removeItem: (key: string) => values.delete(key) } });
    session.storeSessionId('new-session'); session.storeConversation(snapshot);
    expect(session.getStoredSessionId()).toBe('new-session');
    expect(session.getStoredConversation()).toEqual(snapshot);
    session.clearStoredSessionId();
  });
  it('does not restore discarded credentials or drafts when storage removal is denied', () => {
    session.storeSessionId('discarded-session');
    session.storeSessionCapability('discarded-capability');
    session.storeConversation(snapshot);
    vi.stubGlobal('window', { sessionStorage: { getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem() { throw new Error('removal denied'); } } });
    session.clearStoredSessionId();
    expect(session.getStoredSessionId()).toBeNull();
    expect(session.getStoredSessionCapability()).toBeNull();
    expect(session.getStoredConversation()).toBeNull();
    session.storeSessionId('replacement-session');
    expect(session.getStoredSessionId()).toBe('replacement-session');
  });
  it('keeps discarded credentials absent after reload when removal fails but overwriting works', async () => {
    session.storeSessionId('discarded-reload');
    session.storeSessionCapability('discarded-secret');
    session.storeConversation(snapshot);
    vi.stubGlobal('window', { sessionStorage: { getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem() { throw new Error('removal denied'); } } });
    session.clearStoredSessionId();
    vi.resetModules(); // Reload loses module-level masks, while browser storage survives.
    const reloaded = await import('./clientSession');
    expect(reloaded.getStoredSessionId()).toBeNull();
    expect(reloaded.getStoredSessionCapability()).toBeNull();
    expect(reloaded.getStoredConversation()).toBeNull();
  });
  it.each(['gary-session-id', 'gary-session-capability', 'gary-conversation-v1'])(
    'handles removal denial for only %s without keeping old credentials', async (blockedKey) => {
      session.storeSessionId('old-partial'); session.storeSessionCapability('old-capability');
      session.storeConversation(snapshot);
      vi.stubGlobal('window', { sessionStorage: { getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem(key: string) { if (key === blockedKey) throw new Error('denied'); values.delete(key); } } });
      session.clearStoredSessionId();
      vi.resetModules();
      const reloaded = await import('./clientSession');
      expect(reloaded.getStoredSessionId()).toBeNull();
      expect(reloaded.getStoredSessionCapability()).toBeNull();
      expect(reloaded.getStoredConversation()).toBeNull();
      reloaded.storeSessionId('new-partial'); reloaded.storeSessionCapability('new-capability');
      reloaded.storeConversation(snapshot);
      vi.resetModules();
      const reopened = await import('./clientSession');
      expect(reopened.getStoredSessionId()).toBe('new-partial');
      expect(reopened.getStoredSessionCapability()).toBe('new-capability');
      expect(reopened.getStoredConversation()).toEqual(snapshot);
    });
  it('masks discarded data when both removal and overwrite fail, until storage recovers', () => {
    session.storeSessionId('old-denied'); session.storeSessionCapability('old-secret');
    session.storeConversation(snapshot);
    vi.stubGlobal('window', { sessionStorage: { getItem: (key: string) => values.get(key) ?? null,
      setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } } });
    session.clearStoredSessionId();
    expect(session.getStoredSessionId()).toBeNull();
    expect(session.getStoredSessionCapability()).toBeNull();
    expect(session.getStoredConversation()).toBeNull();
    session.storeSessionId('new-memory'); session.storeSessionCapability('new-memory-secret');
    expect(session.getStoredSessionId()).toBe('new-memory');
    expect(session.getStoredSessionCapability()).toBe('new-memory-secret');
    vi.stubGlobal('window', { sessionStorage: { getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) } });
    session.clearStoredSessionId();
    expect(values.has('gary-session-id')).toBe(false);
    expect(values.has('gary-session-capability')).toBe(false);
    expect(values.has('gary-conversation-v1')).toBe(false);
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
