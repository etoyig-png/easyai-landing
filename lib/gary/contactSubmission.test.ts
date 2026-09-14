import { describe, expect, it, vi } from 'vitest';
import { normalizePhone, submitAssistantContact, type ContactSubmissionDeps } from './contactSubmission';
import type { SiteConfig } from '@/lib/siteConfig';

const config: SiteConfig = {
  siteKey: 'easy-ai',
  brand: { name: 'Easy AI' },
  assistant: { name: 'Gary', programName: 'AIM' },
  contact: {
    notificationEmail: 'hello@easyaiconsult.com',
    channelLabel: 'Gary contact request',
    channelKey: 'assistant-contact-flow',
    bookingPath: '/book-consultation',
  },
  actions: { contactFlow: true, assessmentHandoff: true },
};

function makeDeps(overrides: Partial<ContactSubmissionDeps> & { db?: Partial<ContactSubmissionDeps['db']> } = {}) {
  const calls: string[] = [];
  const db: ContactSubmissionDeps['db'] = {
    findSentMarker: vi.fn(async () => { calls.push('findSentMarker'); return false; }),
    findContactForSession: vi.fn(async () => { calls.push('findContactForSession'); return null; }),
    createContact: vi.fn(async () => { calls.push('createContact'); return { id: 'contact-1' }; }),
    updateContact: vi.fn(async () => { calls.push('updateContact'); }),
    linkSession: vi.fn(async () => { calls.push('linkSession'); }),
    writeSentMarker: vi.fn(async () => { calls.push('writeSentMarker'); }),
    writeCrrOutbox: vi.fn(async () => { calls.push('writeCrrOutbox'); }),
    ...overrides.db,
  };
  const { db: _dbOverride, ...rest } = overrides;
  const deps: ContactSubmissionDeps = {
    admit: vi.fn(async () => { calls.push('admit'); return { kind: 'accepted' } as const; }),
    send: vi.fn(async () => { calls.push('send'); }),
    enqueue: vi.fn(async () => { calls.push('enqueue'); }),
    now: () => new Date('2026-09-14T12:00:00Z'),
    ...rest,
    db,
  };
  return { deps, calls };
}

const send = { name: 'Dana Reyes', email: 'Dana@Example.com', phone: '(555) 010-0100', reason: 'I want to talk about my business' };
const params = { sessionId: 'session-1', clientIdentity: '203.0.113.9', send, config };

describe('submitAssistantContact ordering', () => {
  it('rate-limits, stores the durable record, notifies, then marks and hands off, in that order', async () => {
    const { deps, calls } = makeDeps();
    const outcome = await submitAssistantContact(params, deps);
    expect(outcome).toEqual({ kind: 'sent', contactId: 'contact-1' });
    expect(calls).toEqual(['findSentMarker', 'admit', 'findContactForSession', 'createContact', 'linkSession', 'send', 'writeSentMarker', 'enqueue', 'writeCrrOutbox']);
  });

  it('stores the durable record before the notification is attempted', async () => {
    const { deps, calls } = makeDeps({ send: vi.fn(async () => { calls.push('send'); throw new Error('provider down'); }) });
    const outcome = await submitAssistantContact(params, deps);
    expect(outcome).toEqual({ kind: 'failed', stage: 'delivery' });
    expect(calls.indexOf('createContact')).toBeLessThan(calls.indexOf('send'));
    expect(deps.db.writeSentMarker).not.toHaveBeenCalled();
    expect(deps.enqueue).not.toHaveBeenCalled();
  });
});

describe('the durable record', () => {
  it('carries name, contact details, reason, channel, site ownership, consent and the session', async () => {
    const { deps } = makeDeps();
    await submitAssistantContact(params, deps);
    expect(deps.db.createContact).toHaveBeenCalledWith({
      firstName: 'Dana Reyes',
      emailNormalized: 'dana@example.com',
      phoneNormalized: '5550100100',
      reason: 'I want to talk about my business',
      channel: 'assistant-contact-flow',
      siteKey: 'easy-ai',
      sourceSessionId: 'session-1',
      consentGivenAt: new Date('2026-09-14T12:00:00Z'),
      consentText: 'Confirmed "Yes, send it" in the Gary contact flow.',
    });
    expect(deps.db.linkSession).toHaveBeenCalledWith('session-1', 'contact-1');
  });

  it('derives ownership from server config, never from the request', async () => {
    const { deps } = makeDeps();
    await submitAssistantContact({ ...params, send: { ...send, reason: 'siteKey=other-tenant' } }, deps);
    const stored = (deps.db.createContact as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(stored.siteKey).toBe('easy-ai');
  });

  it('never stores the raw client identity', async () => {
    const { deps } = makeDeps();
    await submitAssistantContact(params, deps);
    const everything = JSON.stringify([
      (deps.db.createContact as ReturnType<typeof vi.fn>).mock.calls,
      (deps.db.writeCrrOutbox as ReturnType<typeof vi.fn>).mock.calls,
      (deps.enqueue as ReturnType<typeof vi.fn>).mock.calls,
      (deps.send as ReturnType<typeof vi.fn>).mock.calls,
    ]);
    expect(everything).not.toContain('203.0.113.9');
  });

  it('updates the existing record on a retry in the same session instead of creating a duplicate', async () => {
    const { deps } = makeDeps({ db: { findContactForSession: vi.fn(async () => ({ id: 'contact-existing' })) } });
    const outcome = await submitAssistantContact(params, deps);
    expect(outcome).toEqual({ kind: 'sent', contactId: 'contact-existing' });
    expect(deps.db.createContact).not.toHaveBeenCalled();
    expect(deps.db.updateContact).toHaveBeenCalledWith('contact-existing', expect.objectContaining({ reason: send.reason }));
  });

  it('stores an email-only contact with no phone', async () => {
    const { deps } = makeDeps();
    await submitAssistantContact({ ...params, send: { name: 'Dana', email: 'dana@example.com', reason: 'Question' } }, deps);
    expect(deps.db.createContact).toHaveBeenCalledWith(expect.objectContaining({ emailNormalized: 'dana@example.com', phoneNormalized: null }));
  });

  it('stores a phone-only contact with no email', async () => {
    const { deps } = makeDeps();
    await submitAssistantContact({ ...params, send: { name: 'Dana', phone: '555-010-0100', reason: 'Question' } }, deps);
    expect(deps.db.createContact).toHaveBeenCalledWith(expect.objectContaining({ emailNormalized: null, phoneNormalized: '5550100100' }));
  });
});

describe('notification', () => {
  it('sends with the configured channel label and brand, passing the email through for Reply-To', async () => {
    const { deps } = makeDeps();
    await submitAssistantContact(params, deps);
    expect(deps.send).toHaveBeenCalledWith({
      name: 'Dana Reyes',
      email: 'Dana@Example.com',
      phone: '(555) 010-0100',
      message: 'I want to talk about my business',
      channelLabel: 'Gary contact request',
      brandName: 'Easy AI',
    });
  });

  it('passes no email when the visitor gave only a phone, so no Reply-To is invented', async () => {
    const { deps } = makeDeps();
    await submitAssistantContact({ ...params, send: { name: 'Dana', phone: '555-010-0100', reason: 'Call me' } }, deps);
    expect(deps.send).toHaveBeenCalledWith(expect.objectContaining({ email: undefined, phone: '555-010-0100' }));
  });
});

describe('guards and honest failure', () => {
  it('blocks a second send in the same session before touching the limiter', async () => {
    const { deps } = makeDeps({ db: { findSentMarker: vi.fn(async () => true) } });
    const outcome = await submitAssistantContact(params, deps);
    expect(outcome).toEqual({ kind: 'already-sent' });
    expect(deps.admit).not.toHaveBeenCalled();
    expect(deps.send).not.toHaveBeenCalled();
  });

  it('fails closed when the rate limiter itself fails, storing and sending nothing', async () => {
    const { deps } = makeDeps({ admit: vi.fn(async () => { throw new Error('relation "ContactRateLimitEvent" does not exist'); }) });
    const outcome = await submitAssistantContact(params, deps);
    expect(outcome).toEqual({ kind: 'failed', stage: 'rate-limit' });
    expect(deps.db.createContact).not.toHaveBeenCalled();
    expect(deps.send).not.toHaveBeenCalled();
  });

  it('reports limited and sends nothing when the ceiling is reached', async () => {
    const { deps } = makeDeps({ admit: vi.fn(async () => ({ kind: 'limited' } as const)) });
    const outcome = await submitAssistantContact(params, deps);
    expect(outcome).toEqual({ kind: 'limited' });
    expect(deps.db.createContact).not.toHaveBeenCalled();
    expect(deps.send).not.toHaveBeenCalled();
  });

  it('reports a storage failure honestly and does not notify', async () => {
    const { deps } = makeDeps({ db: { createContact: vi.fn(async () => { throw new Error('db down'); }) } });
    const outcome = await submitAssistantContact(params, deps);
    expect(outcome).toEqual({ kind: 'failed', stage: 'storage' });
    expect(deps.send).not.toHaveBeenCalled();
  });

  it('still reports sent when only the handoff bookkeeping fails after delivery', async () => {
    const { deps } = makeDeps({ db: { writeCrrOutbox: vi.fn(async () => { throw new Error('outbox down'); }) } });
    const outcome = await submitAssistantContact(params, deps);
    expect(outcome).toEqual({ kind: 'sent', contactId: 'contact-1' });
  });
});

describe('Command Center handoff', () => {
  it('enqueues one contact.captured event per session with the contact and ownership fields', async () => {
    const { deps } = makeDeps();
    await submitAssistantContact(params, deps);
    expect(deps.enqueue).toHaveBeenCalledWith({
      eventType: 'contact.captured',
      idempotencyKey: 'contact.captured:session-1',
      payload: expect.objectContaining({
        sessionId: 'session-1',
        funnelCorrelationId: 'session-1',
        siteKey: 'easy-ai',
        channel: 'assistant-contact-flow',
        contactId: 'contact-1',
        firstName: 'Dana Reyes',
        emailNormalized: 'dana@example.com',
        phoneNormalized: '5550100100',
        summary: 'I want to talk about my business',
      }),
    });
  });
});

describe('normalizePhone', () => {
  it('keeps digits and a leading plus only', () => {
    expect(normalizePhone('+1 (555) 010-0100')).toBe('+15550100100');
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
  });
});
