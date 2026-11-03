import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ findSession: vi.fn(), verify: vi.fn(() => true) }));
vi.mock('@/lib/prisma', () => ({ prisma: { publicChatSession: { findUnique: mocks.findSession } } }));
vi.mock('@/lib/gary/sessionCapability', () => ({ verifySessionCapability: mocks.verify }));
import { POST } from './route';

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe('POST /api/gary/handoff with the assessment handoff switched off', () => {
  it('refuses before verifying the session, reading the database or issuing a token', async () => {
    vi.stubEnv('ASSISTANT_ASSESSMENT_HANDOFF_ENABLED', 'false');
    const response = await POST(new NextRequest('http://localhost/api/gary/handoff', {
      method: 'POST', body: JSON.stringify({ sessionId: 'fixture-session', sessionCapability: 'fixture-cap' }),
    }));
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.not.toHaveProperty('redirectUrl');
    expect(mocks.verify).not.toHaveBeenCalled();
    expect(mocks.findSession).not.toHaveBeenCalled();
  });
});
