import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GARY_MAX_MESSAGES, GARY_MAX_TRANSCRIPT_CHARS } from '@/lib/requestSafety';

const mocks = vi.hoisted(() => ({ session: vi.fn(), write: vi.fn(), limited: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: {
  publicChatSession: { findUnique: mocks.session },
  publicChatMessage: { create: mocks.write },
} }));
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
