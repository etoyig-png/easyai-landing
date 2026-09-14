import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockOutbox = {
  findUnique: vi.fn(),
  create: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  count: vi.fn(),
  findFirst: vi.fn(),
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
  it('reports an existing key without creating a second row', async () => {
    mockOutbox.findUnique.mockResolvedValue({ id: 'existing' });
    const { enqueueFunnelEvent } = await import('./funnelEvents');
    const result = await enqueueFunnelEvent({ eventType: 'chat.session.started', payload: {}, idempotencyKey: 'dup-key' });
    expect(result).toEqual({ stored: 'existing' });
    expect(mockOutbox.create).not.toHaveBeenCalled();
  });

  it('reports a storage failure as failed instead of resolving silently', async () => {
    mockOutbox.findUnique.mockResolvedValue(null);
    mockOutbox.create.mockRejectedValue(new Error('connection refused'));
    const { enqueueFunnelEvent } = await import('./funnelEvents');
    const result = await enqueueFunnelEvent({ eventType: 'contact.captured', payload: {}, idempotencyKey: 'k-fail' });
    expect(result).toEqual({ stored: 'failed', error: 'connection refused' });
    expect(mockOutbox.findMany).not.toHaveBeenCalled();
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

  // The Command Center's /api/easy-ai/public-funnel/events route accepts ONLY these five
  // top-level keys and 400s on anything else, which previously made every delivery fail and
  // retry to exhaustion. These tests pin the wire format so it cannot drift back.
  const ENVELOPE_KEYS = ['eventType', 'eventId', 'sessionId', 'funnelCorrelationId', 'payload'];

  it('sends only the envelope keys the Command Center accepts', async () => {
    const row = {
      id: 'row-4',
      idempotencyKey: 'contact.captured:s1',
      eventType: 'contact.captured',
      eventVersion: 1,
      payload: {
        sessionId: 's1',
        funnelCorrelationId: 's1',
        firstName: 'Dana',
        summary: { mainProblem: 'Missed calls' },
        transcriptReference: 's1',
        occurredAt: '2026-08-11T12:00:00.000Z',
      },
      attempts: 0,
    };
    mockOutbox.findMany.mockResolvedValue([row]);
    mockOutbox.update.mockResolvedValue({});
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock;

    const { drainFunnelEventOutbox } = await import('./funnelEvents');
    await drainFunnelEventOutbox();

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(Object.keys(body).sort()).toEqual([...ENVELOPE_KEYS].sort());
    expect(body).toMatchObject({
      eventType: 'contact.captured',
      eventId: 'contact.captured:s1',
      sessionId: 's1',
      funnelCorrelationId: 's1',
    });
    // Everything else — including eventVersion — moves inside the flexible payload, nothing lost.
    expect(body.payload).toEqual({
      firstName: 'Dana',
      summary: { mainProblem: 'Missed calls' },
      transcriptReference: 's1',
      occurredAt: '2026-08-11T12:00:00.000Z',
      eventVersion: 1,
    });
  });

  it('omits funnelCorrelationId entirely when the event has none, rather than sending null', async () => {
    const row = {
      id: 'row-5',
      idempotencyKey: 'chat.session.started:s2',
      eventType: 'chat.session.started',
      eventVersion: 1,
      payload: { sessionId: 's2', anonymousId: 'anon-1', page: '/', occurredAt: '2026-08-11T12:00:00.000Z' },
      attempts: 0,
    };
    mockOutbox.findMany.mockResolvedValue([row]);
    mockOutbox.update.mockResolvedValue({});
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock;

    const { drainFunnelEventOutbox } = await import('./funnelEvents');
    await drainFunnelEventOutbox();

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect('funnelCorrelationId' in body).toBe(false);
    expect(body.sessionId).toBe('s2');
    expect(body.payload).toMatchObject({ anonymousId: 'anon-1', page: '/' });
  });

  it('reshapes an already-queued legacy row on its next delivery attempt', async () => {
    // A row enqueued before this fix is stored in the same flat payload shape, so nothing needs
    // backfilling — draining it now produces the correct envelope.
    const row = {
      id: 'row-6',
      idempotencyKey: 'assessment.started:s3',
      eventType: 'assessment.started',
      eventVersion: 1,
      payload: { sessionId: 's3', funnelCorrelationId: 's3', occurredAt: '2026-08-11T12:00:00.000Z' },
      attempts: 3,
    };
    mockOutbox.findMany.mockResolvedValue([row]);
    mockOutbox.update.mockResolvedValue({});
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock;

    const { drainFunnelEventOutbox } = await import('./funnelEvents');
    const result = await drainFunnelEventOutbox();

    expect(result.delivered).toBe(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(Object.keys(body).sort()).toEqual([...ENVELOPE_KEYS].sort());
    expect(body.eventId).toBe('assessment.started:s3');
  });

  it('is a no-op when the webhook URL/secret are not configured', async () => {
    delete process.env.GARY_FUNNEL_WEBHOOK_URL;
    const { drainFunnelEventOutbox } = await import('./funnelEvents');
    const result = await drainFunnelEventOutbox();
    expect(result).toEqual({ delivered: 0, failed: 0 });
    expect(mockOutbox.findMany).not.toHaveBeenCalled();
  });
});

describe('recordFunnelEvent (transactional writer)', () => {
  it('creates the row through the client it is given and reports created', async () => {
    const tx = { funnelEventOutbox: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}) } };
    const { recordFunnelEvent } = await import('./funnelEvents');
    const result = await recordFunnelEvent(tx as never, { eventType: 'contact.captured', payload: { sessionId: 's1' }, idempotencyKey: 'contact.captured:s1' });
    expect(result).toEqual({ stored: 'created' });
    expect(tx.funnelEventOutbox.create).toHaveBeenCalledTimes(1);
  });

  it('treats a concurrent unique violation as existing, never as a second row', async () => {
    const tx = { funnelEventOutbox: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' })) } };
    const { recordFunnelEvent } = await import('./funnelEvents');
    await expect(recordFunnelEvent(tx as never, { eventType: 'contact.captured', payload: {}, idempotencyKey: 'k' })).resolves.toEqual({ stored: 'existing' });
  });

  it('throws on any other storage failure so a surrounding transaction rolls back', async () => {
    const tx = { funnelEventOutbox: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockRejectedValue(new Error('disk full')) } };
    const { recordFunnelEvent } = await import('./funnelEvents');
    await expect(recordFunnelEvent(tx as never, { eventType: 'contact.captured', payload: {}, idempotencyKey: 'k' })).rejects.toThrow('disk full');
  });
});

describe('deliverFunnelEvent (targeted, awaited attempt)', () => {
  const row = { id: 'row-c', idempotencyKey: 'contact.captured:s1', eventType: 'contact.captured', eventVersion: 1, payload: { sessionId: 's1' }, attempts: 0, deliveredAt: null, nextAttemptAt: new Date(0) };

  it('delivers a due row and marks it delivered', async () => {
    mockOutbox.findUnique.mockResolvedValue(row);
    mockOutbox.update.mockResolvedValue({});
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 201 }) as never;
    const { deliverFunnelEvent } = await import('./funnelEvents');
    await expect(deliverFunnelEvent(row.idempotencyKey)).resolves.toBe('delivered');
    expect(mockOutbox.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ deliveredAt: expect.any(Date) }) }));
  });

  it('schedules a retry when the receiver fails, and reports it', async () => {
    mockOutbox.findUnique.mockResolvedValue(row);
    mockOutbox.update.mockResolvedValue({});
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 502 }) as never;
    const { deliverFunnelEvent } = await import('./funnelEvents');
    await expect(deliverFunnelEvent(row.idempotencyKey)).resolves.toBe('retry-scheduled');
    expect(mockOutbox.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ attempts: 1, nextAttemptAt: expect.any(Date) }) }));
  });

  it('reports exhausted without another attempt once the ceiling is reached', async () => {
    mockOutbox.findUnique.mockResolvedValue({ ...row, attempts: 8 });
    global.fetch = vi.fn() as never;
    const { deliverFunnelEvent } = await import('./funnelEvents');
    await expect(deliverFunnelEvent(row.idempotencyKey)).resolves.toBe('exhausted');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('reports not-configured without touching the row when the webhook is unset', async () => {
    delete process.env.GARY_FUNNEL_WEBHOOK_URL;
    const { deliverFunnelEvent } = await import('./funnelEvents');
    await expect(deliverFunnelEvent(row.idempotencyKey)).resolves.toBe('not-configured');
    expect(mockOutbox.findUnique).not.toHaveBeenCalled();
  });
});

describe('exhausted rows and health', () => {
  it('excludes rows at the attempt ceiling from the due set so they no longer block the queue', async () => {
    mockOutbox.findMany.mockResolvedValue([]);
    const { drainFunnelEventOutbox } = await import('./funnelEvents');
    await drainFunnelEventOutbox();
    expect(mockOutbox.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ attempts: { lt: 8 } }) }));
  });

  it('reports undelivered, exhausted, and the oldest wait as durable indicators', async () => {
    mockOutbox.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1);
    mockOutbox.findFirst.mockResolvedValue({ createdAt: new Date('2026-09-14T10:00:00Z') });
    const { funnelOutboxHealth } = await import('./funnelEvents');
    const health = await funnelOutboxHealth(new Date('2026-09-14T12:00:00Z'));
    expect(health).toEqual({ configured: true, undelivered: 3, exhausted: 1, oldestUndeliveredAgeSeconds: 7200 });
  });
});
