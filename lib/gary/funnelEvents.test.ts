import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockOutbox = {
  findUnique: vi.fn(),
  create: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
};

vi.mock('../prisma', () => ({
  prisma: { funnelEventOutbox: mockOutbox },
}));

const originalFetch = global.fetch;

beforeEach(() => {
  vi.resetAllMocks();
  process.env.GARY_FUNNEL_WEBHOOK_URL = 'https://command-center.example/api/easy-ai/public-funnel/events';
  process.env.GARY_FUNNEL_WEBHOOK_SECRET = 'test-secret';
});

afterEach(() => {
  global.fetch = originalFetch;
  delete process.env.GARY_FUNNEL_WEBHOOK_URL;
  delete process.env.GARY_FUNNEL_WEBHOOK_SECRET;
  vi.resetModules();
});

describe('enqueueFunnelEvent', () => {
  it('is a no-op when the idempotency key already exists', async () => {
    mockOutbox.findUnique.mockResolvedValue({ id: 'existing' });
    const { enqueueFunnelEvent } = await import('./funnelEvents');
    await enqueueFunnelEvent({ eventType: 'chat.session.started', payload: {}, idempotencyKey: 'dup-key' });
    expect(mockOutbox.create).not.toHaveBeenCalled();
  });

  it('creates a new row and attempts delivery when the key is new', async () => {
    mockOutbox.findUnique.mockResolvedValue(null);
    mockOutbox.create.mockResolvedValue({});
    mockOutbox.findMany.mockResolvedValue([]);
    const { enqueueFunnelEvent } = await import('./funnelEvents');
    await enqueueFunnelEvent({ eventType: 'chat.session.started', payload: { sessionId: 's1' }, idempotencyKey: 'new-key' });
    expect(mockOutbox.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ eventType: 'chat.session.started', idempotencyKey: 'new-key' }) })
    );
  });
});

describe('drainFunnelEventOutbox', () => {
  it('marks a row delivered on a successful POST', async () => {
    const row = { id: 'row-1', idempotencyKey: 'k1', eventType: 'chat.session.started', eventVersion: 1, payload: {}, attempts: 0 };
    mockOutbox.findMany.mockResolvedValue([row]);
    mockOutbox.update.mockResolvedValue({});
    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    const { drainFunnelEventOutbox } = await import('./funnelEvents');
    const result = await drainFunnelEventOutbox();

    expect(result.delivered).toBe(1);
    expect(mockOutbox.update).toHaveBeenCalledWith({ where: { id: 'row-1' }, data: { deliveredAt: expect.any(Date) } });
  });

  it('applies exponential backoff and records lastError on a failed POST, without deleting the row', async () => {
    const row = { id: 'row-2', idempotencyKey: 'k2', eventType: 'chat.session.started', eventVersion: 1, payload: {}, attempts: 1 };
    mockOutbox.findMany.mockResolvedValue([row]);
    mockOutbox.update.mockResolvedValue({});
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    const { drainFunnelEventOutbox } = await import('./funnelEvents');
    const result = await drainFunnelEventOutbox();

    expect(result.failed).toBe(1);
    expect(mockOutbox.update).toHaveBeenCalledTimes(1);
    const call = mockOutbox.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'row-2' });
    expect(call.data.attempts).toBe(2);
    expect(call.data.lastError).toContain('500');
    expect(call.data.nextAttemptAt).toBeInstanceOf(Date);
    expect(call.data.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('stops retrying after the max attempt count but keeps the row with its error history', async () => {
    const row = { id: 'row-3', idempotencyKey: 'k3', eventType: 'chat.session.started', eventVersion: 1, payload: {}, attempts: 7 };
    mockOutbox.findMany.mockResolvedValue([row]);
    mockOutbox.update.mockResolvedValue({});
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'));

    const { drainFunnelEventOutbox } = await import('./funnelEvents');
    await drainFunnelEventOutbox();

    const call = mockOutbox.update.mock.calls[0][0];
    expect(call.data.attempts).toBe(8);
    expect(call.data.lastError).toContain('max attempts reached');
    expect(call.data.nextAttemptAt).toBeUndefined(); // no further retry scheduled
  });

  it('is a no-op when the webhook URL/secret are not configured', async () => {
    delete process.env.GARY_FUNNEL_WEBHOOK_URL;
    const { drainFunnelEventOutbox } = await import('./funnelEvents');
    const result = await drainFunnelEventOutbox();
    expect(result).toEqual({ delivered: 0, failed: 0 });
    expect(mockOutbox.findMany).not.toHaveBeenCalled();
  });
});
