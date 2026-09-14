import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockPrisma = { publicContact: { count: vi.fn() } };
const mockHealth = vi.fn();

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/gary/funnelEvents', () => ({ drainFunnelEventOutbox: vi.fn(), funnelOutboxHealth: mockHealth, deliverFunnelEvent: vi.fn(), recordFunnelEvent: vi.fn() }));
vi.mock('@/lib/contactRateLimit', () => ({ admitContactMessage: vi.fn() }));
vi.mock('@/lib/resend', () => ({ sendContactMessage: vi.fn() }));

function request(method: string, secret?: string) {
  return new NextRequest('https://example.test/api/gary/funnel-outbox/drain', {
    method,
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  process.env.GARY_FUNNEL_DRAIN_SECRET = 'drain-secret';
});
afterEach(() => {
  delete process.env.GARY_FUNNEL_DRAIN_SECRET;
  vi.resetModules();
});

describe('GET /api/gary/funnel-outbox/drain (pipeline health)', () => {
  it('requires the bearer secret', async () => {
    const { GET } = await import('./route');
    expect((await GET(request('GET'))).status).toBe(401);
    expect((await GET(request('GET', 'wrong'))).status).toBe(401);
    expect(mockHealth).not.toHaveBeenCalled();
  });

  it('returns 200 ok when nothing needs a human', async () => {
    mockHealth.mockResolvedValue({ configured: true, undelivered: 0, exhausted: 0, oldestUndeliveredAgeSeconds: 0 });
    mockPrisma.publicContact.count.mockResolvedValue(0);
    const { GET } = await import('./route');
    const response = await GET(request('GET', 'drain-secret'));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, problems: [] });
  });

  it('returns 503 with named problems for exhausted handoffs, unsent notifications, and stuck sends', async () => {
    mockHealth.mockResolvedValue({ configured: false, undelivered: 2, exhausted: 1, oldestUndeliveredAgeSeconds: 7200 });
    mockPrisma.publicContact.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1);
    const { GET } = await import('./route');
    const response = await GET(request('GET', 'drain-secret'));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.problems).toEqual([
      'funnel webhook not configured',
      '1 handoff event(s) exhausted retries',
      'undelivered handoff older than 1h',
      '3 contact(s) with unsent notification',
      '1 contact(s) stuck in sending',
    ]);
    // Counts only. No visitor names, addresses, or reasons ever leave this endpoint.
    expect(JSON.stringify(body)).not.toMatch(/@|firstName|reason/);
  });
});
