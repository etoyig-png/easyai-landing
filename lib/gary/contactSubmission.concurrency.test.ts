import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  decideClaim,
  submitAssistantContact,
  type ClaimResult,
  type ContactRecordData,
  type ContactSubmissionDeps,
} from './contactSubmission';
import type { FunnelEventInput } from './funnelEvents';
import type { SiteConfig } from '@/lib/siteConfig';

/**
 * CONCURRENCY. Two simultaneous "Yes, send it" requests for one Gary session (two tabs, a
 * replayed request, a double submit that beat the client-side guard) must produce ONE contact
 * record, ONE contact.captured event, and ONE notification email.
 *
 * Part 1 always runs: an in-memory model with the two properties the real database provides
 * (a per-session lock, and uniqueness on sourceSessionId / idempotencyKey). It proves the
 * pipeline honours the claim contract and cannot notify twice.
 *
 * Part 2 runs only when TEST_DATABASE_URL points at a disposable PostgreSQL with the
 * migrations applied. It runs the REAL claim transaction (advisory lock + Serializable +
 * unique index) from productionContactSubmissionDeps, with the provider and limiter faked.
 * Continuous integration has no database, so it is skipped there and must be run locally
 * before release. Never point it at a shared or production database.
 */

const config: SiteConfig = {
  siteKey: 'easy-ai',
  brand: { name: 'Easy AI' },
  assistant: { name: 'Gary', programName: 'AIM' },
  contact: { notificationEmail: 'hello@easyaiconsult.com', channelLabel: 'Gary contact request', channelKey: 'assistant-contact-flow', bookingPath: '/book-consultation' },
  actions: { contactFlow: true, assessmentHandoff: true },
};

/** Yields to the event loop so two in-flight submissions interleave the way two serverless invocations do. */
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

/** A per-key mutex standing in for pg_advisory_xact_lock. */
function makeLock() {
  const chains = new Map<string, Promise<void>>();
  return async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const previous = chains.get(key) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => { release = resolve; });
    chains.set(key, previous.then(() => current));
    await previous;
    try {
      return await fn();
    } finally {
      release();
    }
  };
}

function makeModel() {
  const contacts = new Map<string, { id: string; notificationStatus: string; updatedAt: Date; record: ContactRecordData }>();
  const events = new Map<string, FunnelEventInput>();
  const withLock = makeLock();
  const deps: ContactSubmissionDeps = {
    admit: vi.fn(async () => { await tick(); return { kind: 'accepted' } as const; }),
    send: vi.fn(async () => { await tick(); }),
    deliver: vi.fn(async () => { await tick(); return 'delivered' as const; }),
    now: () => new Date(),
    claim: (sessionId, record, event, now) =>
      withLock(sessionId, async (): Promise<ClaimResult> => {
        await tick();
        const existing = contacts.get(sessionId) ?? null;
        const decision = decideClaim(existing, now);
        if (decision === 'already-processed') return { claim: 'already-processed', contactId: existing!.id };
        if (decision === 'in-progress') return { claim: 'in-progress' };
        await tick();
        if (existing) {
          existing.notificationStatus = 'sending';
          existing.updatedAt = now;
          existing.record = record;
        } else {
          contacts.set(sessionId, { id: `contact-${contacts.size + 1}`, notificationStatus: 'sending', updatedAt: now, record });
        }
        const handoff = events.has(event.idempotencyKey) ? 'existing' : 'created';
        events.set(event.idempotencyKey, event);
        return { claim: 'claimed', contactId: contacts.get(sessionId)!.id, handoff };
      }),
    settle: async (contactId, sessionId, result, now) => {
      await tick();
      const row = contacts.get(sessionId)!;
      row.notificationStatus = result.status;
      row.updatedAt = now;
    },
  };
  return { deps, contacts, events };
}

const params = { sessionId: 'session-race', clientIdentity: '203.0.113.9', send: { name: 'Dana', email: 'dana@example.com', reason: 'Call me' }, config };

describe('two simultaneous confirmations for one session (in-memory lock + uniqueness model)', () => {
  it('produce one contact, one contact.captured event, and one notification', async () => {
    const { deps, contacts, events } = makeModel();
    const [a, b] = await Promise.all([submitAssistantContact(params, deps), submitAssistantContact(params, deps)]);
    const kinds = [a.kind, b.kind].sort();
    expect(kinds.filter((k) => k === 'sent')).toHaveLength(1);
    expect(kinds).toContain('in-progress');
    expect(contacts.size).toBe(1);
    expect(events.size).toBe(1);
    expect([...events.keys()]).toEqual(['contact.captured:session-race:assistant-contact-flow']);
    expect(deps.send).toHaveBeenCalledTimes(1);
  });

  it('a later confirmation after success is already-processed and sends nothing more', async () => {
    const { deps } = makeModel();
    await submitAssistantContact(params, deps);
    await expect(submitAssistantContact(params, deps)).resolves.toMatchObject({ kind: 'already-processed' });
    expect(deps.send).toHaveBeenCalledTimes(1);
  });

  it('a retry after a failed notification re-sends once, updates the same contact, and keeps one event', async () => {
    const { deps, contacts, events } = makeModel();
    (deps.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('provider down'));
    await expect(submitAssistantContact(params, deps)).resolves.toMatchObject({ kind: 'saved-not-notified' });
    expect(events.size).toBe(1);
    await expect(submitAssistantContact({ ...params, send: { ...params.send, reason: 'Call me, corrected' } }, deps)).resolves.toMatchObject({ kind: 'sent', handoff: 'existing' });
    expect(contacts.size).toBe(1);
    expect(contacts.get('session-race')!.record.reason).toBe('Call me, corrected');
    expect(events.size).toBe(1);
    expect(deps.send).toHaveBeenCalledTimes(2);
  });

  it('ten simultaneous confirmations still produce exactly one of everything', async () => {
    const { deps, contacts, events } = makeModel();
    const outcomes = await Promise.all(Array.from({ length: 10 }, () => submitAssistantContact(params, deps)));
    expect(outcomes.filter((o) => o.kind === 'sent')).toHaveLength(1);
    expect(contacts.size).toBe(1);
    expect(events.size).toBe(1);
    expect(deps.send).toHaveBeenCalledTimes(1);
  });
});

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

describe.skipIf(!TEST_DATABASE_URL)('two simultaneous confirmations against a real PostgreSQL (TEST_DATABASE_URL)', () => {
  let prisma: import('@prisma/client').PrismaClient;
  let deps: ContactSubmissionDeps;
  const sessionId = `race-${Date.now()}`;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    process.env.DIRECT_URL = TEST_DATABASE_URL;
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient();
    const { productionContactSubmissionDeps } = await import('./contactSubmission');
    deps = {
      ...productionContactSubmissionDeps,
      admit: vi.fn(async () => ({ kind: 'accepted' } as const)),
      send: vi.fn(async () => { await new Promise((r) => setTimeout(r, 50)); }),
      deliver: vi.fn(async () => 'not-configured' as const),
    };
    await prisma.publicChatSession.create({ data: { id: sessionId, anonymousId: `anon-${sessionId}` } });
  });

  afterAll(async () => {
    await prisma.publicChatMessage.deleteMany({ where: { sessionId } });
    await prisma.funnelEventOutbox.deleteMany({ where: { idempotencyKey: `contact.captured:${sessionId}:assistant-contact-flow` } });
    await prisma.publicChatSession.update({ where: { id: sessionId }, data: { identifiedContactId: null } });
    await prisma.publicContact.deleteMany({ where: { sourceSessionId: sessionId } });
    await prisma.publicChatSession.delete({ where: { id: sessionId } });
    await prisma.$disconnect();
  });

  it('the real claim transaction admits one sender; the database holds one contact and one event', async () => {
    const p = { ...params, sessionId };
    const outcomes = await Promise.all(Array.from({ length: 5 }, () => submitAssistantContact(p, deps)));
    expect(outcomes.filter((o) => o.kind === 'sent')).toHaveLength(1);
    expect(deps.send).toHaveBeenCalledTimes(1);
    expect(await prisma.publicContact.count({ where: { sourceSessionId: sessionId } })).toBe(1);
    expect(await prisma.funnelEventOutbox.count({ where: { idempotencyKey: `contact.captured:${sessionId}:assistant-contact-flow` } })).toBe(1);
    const contact = await prisma.publicContact.findUniqueOrThrow({ where: { sourceSessionId: sessionId } });
    expect(contact.notificationStatus).toBe('sent');
    expect(contact.siteKey).toBe('easy-ai');
  });
});
