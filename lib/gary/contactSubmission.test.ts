import { describe, expect, it, vi } from 'vitest';
import {
  SENDING_LEASE_MS,
  decideClaim,
  normalizePhone,
  notificationIdempotencyKey,
  submitAssistantContact,
  type ClaimResult,
  type ContactSubmissionDeps,
} from './contactSubmission';
import type { SiteConfig } from '@/lib/siteConfig';

const config: SiteConfig = {
  siteKey: 'easy-ai',
  brand: { name: 'Easy AI' },
  assistant: { name: 'Gary', programName: 'AIM', disclosure: "Hi, I'm Gary, Easy AI's AI assistant." },
  contact: {
    notificationEmail: 'hello@easyaiconsult.com',
    channelLabel: 'Gary contact request',
    channelKey: 'assistant-contact-flow',
    bookingPath: '/book-consultation',
  },
  actions: { contactFlow: true, assessmentHandoff: true },
};

const NOW = new Date('2026-09-14T12:00:00Z');

function makeDeps(overrides: Partial<ContactSubmissionDeps> = {}) {
  const calls: string[] = [];
  const deps: ContactSubmissionDeps = {
    admit: vi.fn(async () => { calls.push('admit'); return { kind: 'accepted' } as const; }),
    claim: vi.fn(async (): Promise<ClaimResult> => { calls.push('claim'); return { claim: 'claimed', contactId: 'contact-1', handoff: 'created' }; }),
    send: vi.fn(async () => { calls.push('send'); return { accepted: 'sent' } as const; }),
    settle: vi.fn(async (_id, _session, result) => { calls.push(`settle:${result.status}`); }),
    deliver: vi.fn(async () => { calls.push('deliver'); return 'delivered' as const; }),
    // Test stand-in for waitUntil: run the task now and keep its promise so tests can await it.
    background: vi.fn((task) => { calls.push('background'); backgroundTasks.push(task()); }),
    now: () => NOW,
    ...overrides,
  };
  const backgroundTasks: Promise<unknown>[] = [];
  return { deps, calls, settled: () => Promise.all(backgroundTasks) };
}

const send = { name: 'Dana Reyes', email: 'Dana@Example.com', phone: '(555) 010-0100', reason: 'I want to talk about my business' };
const params = { sessionId: 'session-1', clientIdentity: '203.0.113.9', send, config };

describe('ordering: rate limit, claim (contact + handoff), notify, settle, then delivery after the response', () => {
  it('runs the stages in that order and reports sent with the handoff durably stored and delivery scheduled', async () => {
    const { deps, calls, settled } = makeDeps();
    const outcome = await submitAssistantContact(params, deps);
    expect(outcome).toEqual({ kind: 'sent', contactId: 'contact-1', handoff: 'created', delivery: 'scheduled' });
    await settled();
    expect(calls).toEqual(['admit', 'claim', 'send', 'settle:sent', 'background', 'deliver']);
    expect(deps.deliver).toHaveBeenCalledWith('contact.captured:session-1:assistant-contact-flow');
  });

  it('does not hold the visitor for the webhook: a slow delivery does not delay the outcome', async () => {
    let finished = false;
    const { deps, settled } = makeDeps({ deliver: vi.fn(async () => { await new Promise((r) => setTimeout(r, 200)); finished = true; return 'delivered' as const; }) });
    const t0 = Date.now();
    const outcome = await submitAssistantContact(params, deps);
    expect(Date.now() - t0).toBeLessThan(150);
    expect(outcome).toMatchObject({ kind: 'sent', delivery: 'scheduled' });
    expect(finished).toBe(false);
    await settled();
    expect(finished).toBe(true);
  });

  it('hands delivery to the background mechanism only after the durable row exists (never before the claim)', async () => {
    const { deps, calls } = makeDeps({ claim: vi.fn(async () => { throw new Error('db down'); }) });
    await submitAssistantContact(params, deps);
    expect(calls).not.toContain('background');
    expect(deps.deliver).not.toHaveBeenCalled();
  });
});

describe('the claim carries the durable record, session link, and handoff together', () => {
  it('passes name, contact details, reason, channel, site ownership, consent and session, plus one contact.captured event', async () => {
    const { deps } = makeDeps();
    await submitAssistantContact(params, deps);
    expect(deps.claim).toHaveBeenCalledWith(
      'session-1',
      {
        firstName: 'Dana Reyes',
        emailNormalized: 'dana@example.com',
        phoneNormalized: '5550100100',
        reason: 'I want to talk about my business',
        channel: 'assistant-contact-flow',
        siteKey: 'easy-ai',
        sourceSessionId: 'session-1',
        consentGivenAt: NOW,
        consentText: 'Confirmed "Yes, send it" in the Gary contact flow.',
      },
      {
        eventType: 'contact.captured',
        idempotencyKey: 'contact.captured:session-1:assistant-contact-flow',
        payload: expect.objectContaining({
          sessionId: 'session-1',
          funnelCorrelationId: 'session-1',
          siteKey: 'easy-ai',
          channel: 'assistant-contact-flow',
          firstName: 'Dana Reyes',
          emailNormalized: 'dana@example.com',
          phoneNormalized: '5550100100',
          summary: 'I want to talk about my business',
          occurredAt: NOW.toISOString(),
        }),
      },
      NOW
    );
  });

  it('derives ownership from server config, never from the request', async () => {
    const { deps } = makeDeps();
    await submitAssistantContact({ ...params, send: { ...send, reason: 'siteKey=other-tenant' } }, deps);
    const [, record, event] = (deps.claim as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(record.siteKey).toBe('easy-ai');
    expect(event.payload.siteKey).toBe('easy-ai');
  });

  it('uses one idempotency key per session, whatever the visitor typed', async () => {
    const { deps } = makeDeps();
    await submitAssistantContact({ ...params, send: { ...send, reason: 'first' } }, deps);
    await submitAssistantContact({ ...params, send: { ...send, reason: 'second' } }, deps);
    const keys = (deps.claim as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[2].idempotencyKey);
    expect(new Set(keys)).toEqual(new Set(['contact.captured:session-1:assistant-contact-flow']));
  });

  it('never passes the raw client identity anywhere but the limiter', async () => {
    const { deps } = makeDeps();
    await submitAssistantContact(params, deps);
    const everything = JSON.stringify([
      (deps.claim as ReturnType<typeof vi.fn>).mock.calls,
      (deps.send as ReturnType<typeof vi.fn>).mock.calls,
      (deps.settle as ReturnType<typeof vi.fn>).mock.calls,
    ]);
    expect(everything).not.toContain('203.0.113.9');
  });

  it('stores an email-only contact with no phone, and a phone-only contact with no email', async () => {
    const { deps } = makeDeps();
    await submitAssistantContact({ ...params, send: { name: 'Dana', email: 'dana@example.com', reason: 'Q' } }, deps);
    await submitAssistantContact({ ...params, send: { name: 'Dana', phone: '555-010-0100', reason: 'Q' } }, deps);
    const records = (deps.claim as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[1]);
    expect(records[0]).toMatchObject({ emailNormalized: 'dana@example.com', phoneNormalized: null });
    expect(records[1]).toMatchObject({ emailNormalized: null, phoneNormalized: '5550100100' });
  });
});

describe('notification', () => {
  it('sends with the configured channel label and brand, passing the email through for Reply-To', async () => {
    const { deps } = makeDeps();
    await submitAssistantContact(params, deps);
    expect(deps.send).toHaveBeenCalledWith(
      {
        name: 'Dana Reyes',
        email: 'Dana@Example.com',
        phone: '(555) 010-0100',
        message: 'I want to talk about my business',
        channelLabel: 'Gary contact request',
        brandName: 'Easy AI',
      },
      { idempotencyKey: 'contact-notification:easy-ai:session-1' }
    );
  });

  it('derives the provider idempotency key from site and session on the server, stable across retries', async () => {
    const { deps } = makeDeps({ send: vi.fn().mockRejectedValueOnce(new Error('provider down')).mockResolvedValue({ accepted: 'sent' }) });
    await submitAssistantContact({ ...params, send: { ...send, reason: 'first wording' } }, deps);
    await submitAssistantContact({ ...params, send: { ...send, reason: 'second wording' } }, deps);
    const keys = (deps.send as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[1].idempotencyKey);
    expect(keys).toEqual(['contact-notification:easy-ai:session-1', 'contact-notification:easy-ai:session-1']);
    expect(notificationIdempotencyKey('partner-1', 'session-1')).toBe('contact-notification:partner-1:session-1');
  });

  it('passes no email when the visitor gave only a phone, so no Reply-To is invented', async () => {
    const { deps } = makeDeps();
    await submitAssistantContact({ ...params, send: { name: 'Dana', phone: '555-010-0100', reason: 'Call me' } }, deps);
    expect(deps.send).toHaveBeenCalledWith(expect.objectContaining({ email: undefined, phone: '555-010-0100' }), expect.anything());
  });
});

describe('the eight states', () => {
  it('1. contact not stored: limiter error fails closed before anything is stored or sent', async () => {
    const { deps } = makeDeps({ admit: vi.fn(async () => { throw new Error('relation "ContactRateLimitEvent" does not exist'); }) });
    const outcome = await submitAssistantContact(params, deps);
    expect(outcome).toEqual({ kind: 'failed', stage: 'rate-limit' });
    expect(deps.claim).not.toHaveBeenCalled();
    expect(deps.send).not.toHaveBeenCalled();
  });

  it('1b. contact not stored: a claim failure (contact + handoff roll back together) sends nothing', async () => {
    const { deps } = makeDeps({ claim: vi.fn(async () => { throw new Error('db down'); }) });
    const outcome = await submitAssistantContact(params, deps);
    expect(outcome).toEqual({ kind: 'failed', stage: 'storage' });
    expect(deps.send).not.toHaveBeenCalled();
    expect(deps.deliver).not.toHaveBeenCalled();
  });

  it('2. stored and handoff queued, but notification failed: honest outcome, contact marked failed, handoff still attempted', async () => {
    const { deps, calls, settled } = makeDeps({ send: vi.fn(async () => { calls.push('send'); throw new Error('provider down'); }) });
    const outcome = await submitAssistantContact(params, deps);
    expect(outcome).toEqual({ kind: 'saved-not-notified', contactId: 'contact-1', handoff: 'created', delivery: 'scheduled' });
    expect(deps.settle).toHaveBeenCalledWith('contact-1', 'session-1', { status: 'failed', error: 'provider down' }, NOW);
    await settled();
    expect(calls).toEqual(['admit', 'claim', 'send', 'settle:failed', 'background', 'deliver']);
  });

  it('3. stored, handoff queued, notification accepted', async () => {
    const { deps } = makeDeps();
    await expect(submitAssistantContact(params, deps)).resolves.toMatchObject({ kind: 'sent' });
    expect(deps.settle).toHaveBeenCalledWith('contact-1', 'session-1', { status: 'sent' }, NOW);
  });

  it('4. contact already processed: nothing re-sent, nothing re-delivered', async () => {
    const { deps } = makeDeps({ claim: vi.fn(async () => ({ claim: 'already-processed', contactId: 'contact-1' }) as ClaimResult) });
    const outcome = await submitAssistantContact(params, deps);
    expect(outcome).toEqual({ kind: 'already-processed', contactId: 'contact-1' });
    expect(deps.send).not.toHaveBeenCalled();
    expect(deps.deliver).not.toHaveBeenCalled();
  });

  it('4b. another request holds the lease: in-progress, nothing duplicated', async () => {
    const { deps } = makeDeps({ claim: vi.fn(async () => ({ claim: 'in-progress' }) as ClaimResult) });
    await expect(submitAssistantContact(params, deps)).resolves.toEqual({ kind: 'in-progress' });
    expect(deps.send).not.toHaveBeenCalled();
  });

  it('5. contact limited: nothing stored or sent', async () => {
    const { deps } = makeDeps({ admit: vi.fn(async () => ({ kind: 'limited' } as const)) });
    await expect(submitAssistantContact(params, deps)).resolves.toEqual({ kind: 'limited' });
    expect(deps.claim).not.toHaveBeenCalled();
    expect(deps.send).not.toHaveBeenCalled();
  });

  it('6. handoff storage failure is a claim failure: it cannot masquerade as a durable handoff', async () => {
    const { deps } = makeDeps({ claim: vi.fn(async () => { throw new Error('funnelEventOutbox insert failed'); }) });
    await expect(submitAssistantContact(params, deps)).resolves.toEqual({ kind: 'failed', stage: 'storage' });
    expect(deps.send).not.toHaveBeenCalled();
  });

  it('7 and 8. webhook pending-retry and exhausted are outbox-row states that never change what the visitor is told', async () => {
    for (const state of ['retry-scheduled', 'exhausted'] as const) {
      const { deps, settled } = makeDeps({ deliver: vi.fn(async () => state) });
      await expect(submitAssistantContact(params, deps)).resolves.toEqual({ kind: 'sent', contactId: 'contact-1', handoff: 'created', delivery: 'scheduled' });
      await settled();
      expect(deps.deliver).toHaveBeenCalledTimes(1);
    }
  });

  it('a delivery exception in the background is contained and never reaches the caller', async () => {
    const { deps, settled } = makeDeps({ deliver: vi.fn(async () => { throw new Error('boom'); }) });
    await expect(submitAssistantContact(params, deps)).resolves.toMatchObject({ kind: 'sent', delivery: 'scheduled' });
    await expect(settled()).resolves.toBeTruthy();
  });

  it('a settle failure after a successful send is contained: the visitor is still told the truth (sent)', async () => {
    const { deps } = makeDeps({ settle: vi.fn(async () => { throw new Error('settle failed'); }) });
    await expect(submitAssistantContact(params, deps)).resolves.toMatchObject({ kind: 'sent' });
  });
});

describe('decideClaim (evaluated under the session lock)', () => {
  it('claims when there is no contact yet', () => {
    expect(decideClaim(null, NOW)).toBe('claimable');
  });
  it('refuses when the notification was already sent', () => {
    expect(decideClaim({ id: 'c', notificationStatus: 'sent', updatedAt: NOW }, NOW)).toBe('already-processed');
  });
  it('reports in-progress while a fresh sending lease is held', () => {
    expect(decideClaim({ id: 'c', notificationStatus: 'sending', updatedAt: new Date(NOW.getTime() - 5_000) }, NOW)).toBe('in-progress');
  });
  it('lets a stale sending lease be reclaimed (a request that died mid-send)', () => {
    expect(decideClaim({ id: 'c', notificationStatus: 'sending', updatedAt: new Date(NOW.getTime() - SENDING_LEASE_MS - 1) }, NOW)).toBe('claimable');
  });
  it('lets a failed notification be retried', () => {
    expect(decideClaim({ id: 'c', notificationStatus: 'failed', updatedAt: NOW }, NOW)).toBe('claimable');
  });
});

describe('normalizePhone', () => {
  it('keeps digits and a leading plus only', () => {
    expect(normalizePhone('+1 (555) 010-0100')).toBe('+15550100100');
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
  });
});
