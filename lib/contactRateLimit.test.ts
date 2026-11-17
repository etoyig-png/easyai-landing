import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The defect these tests exist for: the contact route previously called isRateLimited(),
 * which counts rows in the assessment Submission table. Contact messages create no Submission
 * rows, so that limiter counted contact traffic as zero forever.
 */
const tx = {
  $queryRaw: vi.fn(),
  contactRateLimitEvent: { count: vi.fn(), create: vi.fn() },
  submission: { count: vi.fn() },
};
const transaction = vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx));
vi.mock('./prisma', () => ({ prisma: { $transaction: (...args: [never]) => transaction(...args) } }));

import { admitContactMessage } from './contactRateLimit';

beforeEach(() => {
  vi.clearAllMocks();
  tx.$queryRaw.mockResolvedValue([]);
  tx.contactRateLimitEvent.count.mockResolvedValue(0);
  tx.contactRateLimitEvent.create.mockResolvedValue({ id: 'evt_1' });
  tx.submission.count.mockResolvedValue(99);
});

describe('contact attempts are counted separately from assessments', () => {
  it('counts the contact ledger, never the assessment table', async () => {
    await admitContactMessage('203.0.113.9');
    expect(tx.contactRateLimitEvent.count).toHaveBeenCalledTimes(1);
    expect(tx.submission.count).not.toHaveBeenCalled();
  });

  it('is not affected by a caller with many assessment rows', async () => {
    // 99 assessment submissions, zero contact messages: contact must still be allowed.
    tx.submission.count.mockResolvedValue(99);
    tx.contactRateLimitEvent.count.mockResolvedValue(0);
    await expect(admitContactMessage('203.0.113.9')).resolves.toEqual({ kind: 'accepted' });
  });

  it('records the attempt so it counts toward the next request', async () => {
    await admitContactMessage('203.0.113.9');
    expect(tx.contactRateLimitEvent.create).toHaveBeenCalledTimes(1);
  });
});

describe('the limit is reached and enforced', () => {
  it('accepts attempts below the ceiling', async () => {
    for (const priorCount of [0, 1, 2]) {
      tx.contactRateLimitEvent.count.mockResolvedValue(priorCount);
      await expect(admitContactMessage('203.0.113.9'), `after ${priorCount}`).resolves.toEqual({ kind: 'accepted' });
    }
  });

  it('refuses the attempt that reaches the ceiling', async () => {
    tx.contactRateLimitEvent.count.mockResolvedValue(3);
    await expect(admitContactMessage('203.0.113.9')).resolves.toEqual({ kind: 'limited' });
  });

  it('records nothing when the attempt is refused', async () => {
    tx.contactRateLimitEvent.count.mockResolvedValue(3);
    await admitContactMessage('203.0.113.9');
    expect(tx.contactRateLimitEvent.create).not.toHaveBeenCalled();
  });

  it('refuses a caller with no usable identity', async () => {
    await expect(admitContactMessage('')).resolves.toEqual({ kind: 'limited' });
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe('concurrent requests cannot slip past the limit', () => {
  it('serializes on a transaction-scoped advisory lock before counting', async () => {
    await admitContactMessage('203.0.113.9');
    const lockQuery = tx.$queryRaw.mock.calls[0][0].join('');
    expect(lockQuery).toContain('pg_advisory_xact_lock');
    expect(lockQuery).toContain('::text');
    // The lock is taken before the count, so two simultaneous callers cannot both read the
    // same pre-limit total.
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.contactRateLimitEvent.count.mock.invocationCallOrder[0]);
  });

  it('counts and records inside one serializable transaction', async () => {
    await admitContactMessage('203.0.113.9');
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'Serializable' });
  });

  it('locks per caller, so different callers do not block each other', async () => {
    await admitContactMessage('203.0.113.9');
    const first = tx.$queryRaw.mock.calls[0][1];
    vi.clearAllMocks();
    tx.$queryRaw.mockResolvedValue([]);
    tx.contactRateLimitEvent.count.mockResolvedValue(0);
    await admitContactMessage('198.51.100.4');
    expect(tx.$queryRaw.mock.calls[0][1]).not.toBe(first);
  });
});

describe('storage behaviour', () => {
  it('fails closed by propagating a storage error instead of returning a verdict', async () => {
    tx.contactRateLimitEvent.count.mockRejectedValue(new Error('database unavailable'));
    await expect(admitContactMessage('203.0.113.9')).rejects.toThrow('database unavailable');
  });

  it('propagates a write failure rather than treating it as an accepted attempt', async () => {
    tx.contactRateLimitEvent.create.mockRejectedValue(new Error('write failed'));
    await expect(admitContactMessage('203.0.113.9')).rejects.toThrow('write failed');
  });

  it('stores a one-way hash, never the raw address', async () => {
    await admitContactMessage('203.0.113.9');
    const stored = tx.contactRateLimitEvent.create.mock.calls[0][0].data.ipHash;
    expect(stored).not.toContain('203.0.113.9');
    expect(stored).toMatch(/^[0-9a-f]{64}$/);
    // The same caller must hash to the same value, or the limit would never accumulate.
    const lockArgument = tx.$queryRaw.mock.calls[0][1];
    expect(lockArgument).toBe(`contact:${stored}`);
  });
});
