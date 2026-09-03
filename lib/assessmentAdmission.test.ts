import { beforeEach, describe, expect, it, vi } from 'vitest';

const tx = {
  $queryRaw: vi.fn(),
  submission: { findFirst: vi.fn(), count: vi.fn(), create: vi.fn() },
};
vi.mock('./prisma', () => ({
  prisma: { $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) },
}));

import { admitAssessment } from './assessmentAdmission';

const submission = {
  workSituation: 'x', usingAiTools: 'x', aiChallenge: 'x', desiredOutcome: 'x', timeDrain: 'x',
  privacyConcern: 'x', industry: 'x', leadResponse: 'x', sportsFan: 'x', firstName: 'A', lastName: 'B',
  businessName: 'C', email: 'person@example.com', websiteUrl: 'https://example.com', noWebsite: false,
  consent: true, formLoadedAt: 1,
} as never;

describe('atomic assessment admission', () => {
  beforeEach(() => { vi.clearAllMocks(); tx.submission.findFirst.mockResolvedValue(null); tx.submission.count.mockResolvedValue(0); tx.submission.create.mockResolvedValue({ id: 'new' }); });
  it('creates below the threshold while acquiring identity and email locks', async () => {
    await expect(admitAssessment(submission, 'identity')).resolves.toEqual({ kind: 'created', submission: { id: 'new' } });
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    const lockQueries = tx.$queryRaw.mock.calls.map(([query]) => query.join(''));
    expect(lockQueries.every((query) => query.includes('pg_advisory_xact_lock') && query.includes('::text'))).toBe(true);
    expect(tx.submission.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      leadResponse: 'x', websiteUrl: 'https://example.com', noWebsite: false,
    }) }));
  });
  it('returns an existing pending/completed duplicate without new work', async () => {
    tx.submission.findFirst.mockResolvedValue({ id: 'existing' });
    await expect(admitAssessment(submission, 'identity')).resolves.toEqual({ kind: 'duplicate', submission: { id: 'existing' } });
    expect(tx.submission.create).not.toHaveBeenCalled();
  });
  it('fails closed at the threshold', async () => {
    tx.submission.count.mockResolvedValue(3);
    await expect(admitAssessment(submission, 'identity')).resolves.toEqual({ kind: 'limited' });
    expect(tx.submission.create).not.toHaveBeenCalled();
  });
  it('propagates database failure instead of admitting', async () => {
    tx.submission.count.mockRejectedValue(new Error('database unavailable'));
    await expect(admitAssessment(submission, 'identity')).rejects.toThrow('database unavailable');
  });
});
