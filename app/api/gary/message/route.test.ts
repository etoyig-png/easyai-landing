import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// In-memory stand-in for the two Gary tables the route touches. No database, model or network.
type Message = { id: string; sessionId: string; role: string; content: string; createdAt: Date };
type Session = { id: string; anonymousId: string; ipAddress: string; visitorTurnCount: number; assessmentOfferCount: number; identifiedContactId: string | null; startedAt: Date };
const db = vi.hoisted(() => ({ sessions: new Map<string, Session>(), messages: [] as Message[], seq: 0 }));
const providerCalls = vi.hoisted(() => ({ count: 0, failNext: false }));

vi.mock('@/lib/prisma', () => {
  const tick = () => new Date(Date.now() + ++db.seq);
  const withMessages = (session: Session) => ({ ...session, messages: db.messages.filter((m) => m.sessionId === session.id) });
  return {
    prisma: {
      publicChatSession: {
        create: async ({ data }: { data: Partial<Session> }) => {
          const session: Session = { id: `s${++db.seq}`, anonymousId: data.anonymousId ?? '', ipAddress: data.ipAddress ?? '', visitorTurnCount: 0, assessmentOfferCount: 0, identifiedContactId: null, startedAt: tick() };
          db.sessions.set(session.id, session);
          return withMessages(session);
        },
        findUnique: async ({ where }: { where: { id: string } }) => {
          const session = db.sessions.get(where.id);
          return session ? withMessages(session) : null;
        },
        update: async ({ where, data }: { where: { id: string }; data: { visitorTurnCount?: { increment: number }; assessmentOfferCount?: { increment: number } } }) => {
          const session = db.sessions.get(where.id)!;
          if (data.visitorTurnCount) session.visitorTurnCount += data.visitorTurnCount.increment;
          if (data.assessmentOfferCount) session.assessmentOfferCount += data.assessmentOfferCount.increment;
          return session;
        },
      },
      publicChatMessage: {
        create: async ({ data }: { data: Omit<Message, 'id' | 'createdAt'> }) => {
          const message = { ...data, id: `m${++db.seq}`, createdAt: tick() };
          db.messages.push(message);
          return message;
        },
        findMany: async ({ where }: { where: { sessionId: string } }) => db.messages.filter((m) => m.sessionId === where.sessionId),
      },
      publicContact: { findUnique: async () => null },
    },
  };
});
vi.mock('@/lib/rateLimit', () => ({ getClientIp: () => '203.0.113.7', isGaryRateLimited: async () => false }));
vi.mock('@/lib/gary/funnelEvents', () => ({ enqueueFunnelEvent: async () => undefined }));
vi.mock('@/lib/gary/llm/providerFactory', () => ({
  createGaryLlmAdapter: () => ({
    provider: 'openai',
    generateChatCompletion: async () => {
      providerCalls.count += 1;
      if (providerCalls.failNext) { providerCalls.failNext = false; throw new Error('provider unavailable'); }
      return { text: 'Check who owns the callback for after-hours calls, then time how long it takes.', model: 'mock-model' };
    },
  }),
}));

process.env.GARY_SESSION_CAPABILITY_SECRET = 'test-only-session-secret-not-a-real-value';
const { POST } = await import('./route');

async function send(body: Record<string, unknown>) {
  const response = await POST(new NextRequest('http://localhost/api/gary/message', { method: 'POST', body: JSON.stringify({ anonymousId: 'anon-1', currentPage: '/', ...body }), headers: { 'content-type': 'application/json' } }));
  return { status: response.status, data: await response.json() };
}

describe('POST /api/gary/message assessment schedule (mocked database and model)', () => {
  beforeEach(() => { db.sessions.clear(); db.messages.length = 0; providerCalls.count = 0; providerCalls.failNext = false; });

  it('flags replies 4, 9, 14, 19, 24, 29 and 34, excluding the greeting, and keeps the count across a reopen', async () => {
    const opening = await send({});
    expect(opening.data.offerAssessment).toBe(false);
    const { sessionId, sessionCapability } = opening.data;
    const flagged: number[] = [];
    for (let reply = 1; reply <= 34; reply++) {
      // Replies 15+ are sent as if the browser was refreshed: same stored session, no new greeting.
      const { status, data } = await send({ sessionId, sessionCapability, message: reply % 3 === 0 ? 'ok' : 'We miss calls after hours, what should we check?' });
      expect(status).toBe(200);
      if (data.offerAssessment) flagged.push(reply);
    }
    expect(flagged).toEqual([4, 9, 14, 19, 24, 29, 34]);
    expect(db.sessions.get(sessionId)!.visitorTurnCount).toBe(34);
  });

  it('a failed provider request completes no reply and does not advance the schedule', async () => {
    const { sessionId, sessionCapability } = (await send({})).data;
    for (let reply = 1; reply <= 3; reply++) await send({ sessionId, sessionCapability, message: 'We miss calls after hours.' });
    providerCalls.failNext = true;
    await expect(send({ sessionId, sessionCapability, message: 'What should we check first?' })).rejects.toThrow('provider unavailable');
    expect(db.sessions.get(sessionId)!.visitorTurnCount).toBe(3);
    const retry = await send({ sessionId, sessionCapability, message: 'What should we check first?' });
    expect(retry.data.offerAssessment).toBe(true);
    expect(db.sessions.get(sessionId)!.visitorTurnCount).toBe(4);
  });

  it('answers a direct link request with the button and no model call', async () => {
    const { sessionId, sessionCapability } = (await send({})).data;
    const before = providerCalls.count;
    const { data } = await send({ sessionId, sessionCapability, message: 'Send me the link to the assessment.' });
    expect(data.offerAssessment).toBe(true);
    expect(data.reply.text).not.toMatch(/can(?:'|no)?t send links/i);
    expect(providerCalls.count).toBe(before);
  });
});
