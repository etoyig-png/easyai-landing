import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GARY_MAX_MESSAGES, GARY_MAX_TRANSCRIPT_CHARS } from '@/lib/requestSafety';

const mocks = vi.hoisted(() => ({ session: vi.fn(), write: vi.fn(), limited: vi.fn(), update: vi.fn(), reply: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: {
  publicChatSession: { findUnique: mocks.session, update: mocks.update },
  publicChatMessage: { create: mocks.write, findMany: async () => [] },
  publicContact: { findUnique: async () => null },
} }));
vi.mock('@/lib/gary/llm/providerFactory', () => ({ createGaryLlmAdapter: () => ({}) }));
vi.mock('@/lib/gary/replyPipeline', () => ({ generateGaryReply: mocks.reply }));
vi.mock('@/lib/rateLimit', () => ({ getClientIp: () => 'fixture-ip', isGaryRateLimited: mocks.limited }));
vi.mock('@/lib/gary/sessionCapability', () => ({ createSessionCapability: () => 'fixture-cap', verifySessionCapability: () => true }));
import { POST } from './route';

beforeEach(() => { vi.clearAllMocks(); mocks.limited.mockResolvedValue(false); });

describe('scripted contact turns respect the shared conversation budget', () => {
  for (const action of ['start', 'confirm'] as const) {
    it(`rejects ${action} at the message ceiling before writing or sending`, async () => {
      mocks.session.mockResolvedValue({ id: 'fixture-session', messages: Array.from({ length: GARY_MAX_MESSAGES }, () => ({ content: 'fixture' })) });
      const response = await POST(new NextRequest('http://localhost/api/gary/message', {
        method: 'POST', body: JSON.stringify({ anonymousId: 'fixture-anon', sessionId: 'fixture-session', sessionCapability: 'fixture-cap', contactFlow: { action, draft: { step: 'confirm' } } }),
      }));
      expect(response.status).toBe(409);
      expect(mocks.write).not.toHaveBeenCalled();
    });
  }
  it('rejects a scripted turn at the transcript character ceiling', async () => {
    mocks.session.mockResolvedValue({ id: 'fixture-session', messages: [{ content: 'x'.repeat(GARY_MAX_TRANSCRIPT_CHARS) }] });
    const response = await POST(new NextRequest('http://localhost/api/gary/message', {
      method: 'POST', body: JSON.stringify({ anonymousId: 'fixture-anon', sessionId: 'fixture-session', sessionCapability: 'fixture-cap', contactFlow: { action: 'start' } }),
    }));
    expect(response.status).toBe(409);
    expect(mocks.write).not.toHaveBeenCalled();
  });
});

describe('the assessment handoff switch', () => {
  const ask = () => POST(new NextRequest('http://localhost/api/gary/message', {
    method: 'POST', body: JSON.stringify({ anonymousId: 'fixture-anon', sessionId: 'fixture-session', sessionCapability: 'fixture-cap', message: 'What could AI do for my bakery?' }),
  }));
  beforeEach(() => {
    mocks.session.mockResolvedValue({ id: 'fixture-session', messages: [], visitorTurnCount: 3, assessmentOfferCount: 0 });
    mocks.reply.mockResolvedValue({ text: 'An assessment would show that.', model: 'fixture', offerAssessment: true });
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('passes the model offer through while the handoff is enabled', async () => {
    await expect((await ask()).json()).resolves.toMatchObject({ offerAssessment: true });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ assessmentOfferCount: { increment: 1 } }) }));
  });

  it('never offers or counts an assessment while ASSISTANT_ASSESSMENT_HANDOFF_ENABLED=false', async () => {
    vi.stubEnv('ASSISTANT_ASSESSMENT_HANDOFF_ENABLED', 'false');
    await expect((await ask()).json()).resolves.toMatchObject({ offerAssessment: false });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ assessmentOfferCount: undefined }) }));
  });
});
