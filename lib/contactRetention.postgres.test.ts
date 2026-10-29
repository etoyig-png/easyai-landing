import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'crypto';
vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});
import { prisma } from './prisma';
import { admitContactMessage, cleanupExpiredContactAttempts } from './contactRateLimit';
const identity = `retention-${Date.now()}`;
const ipHash = createHash('sha256').update(identity).digest('hex');
const boundaryHash = createHash('sha256').update(`${identity}-boundary`).digest('hex');
describe.skipIf(!process.env.TEST_DATABASE_URL)('bounded contact abuse retention on isolated PostgreSQL', () => {
  afterEach(() => prisma.contactRateLimitEvent.deleteMany({ where: { ipHash: { in: [ipHash, boundaryHash] } } }));
  it('bounds concurrent deletion and preserves active rate-limit enforcement', async () => {
    const now = new Date();
    await prisma.contactRateLimitEvent.createMany({ data: [
      ...Array.from({ length: 3 }, () => ({ ipHash, createdAt: new Date(now.getTime() - 8 * 86400000) })),
      ...Array.from({ length: 3 }, () => ({ ipHash, createdAt: now })),
    ] });
    const results = await Promise.all([cleanupExpiredContactAttempts(1, now), cleanupExpiredContactAttempts(1, now)]);
    expect(results).toEqual([1, 1]);
    expect(await prisma.contactRateLimitEvent.count({ where: { ipHash } })).toBe(4);
    expect(await cleanupExpiredContactAttempts(100, now)).toBe(1);
    expect(await prisma.contactRateLimitEvent.count({ where: { ipHash } })).toBe(3);
    await expect(admitContactMessage(identity)).resolves.toEqual({ kind: 'limited' });
  });
  it('preserves the exact seven-day boundary and returns zero after expired rows are drained', async () => {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 7 * 86400000);
    const retainedTimes = [cutoff, new Date(cutoff.getTime() + 1), now];
    await prisma.contactRateLimitEvent.createMany({ data: [
      { ipHash: boundaryHash, createdAt: new Date(cutoff.getTime() - 1) },
      ...retainedTimes.map(createdAt => ({ ipHash: boundaryHash, createdAt })),
    ] });
    expect(await cleanupExpiredContactAttempts(100, now)).toBe(1);
    const retained = await prisma.contactRateLimitEvent.findMany({
      where: { ipHash: boundaryHash }, orderBy: { createdAt: 'asc' }, select: { createdAt: true },
    });
    expect(retained.map(row => row.createdAt)).toEqual(retainedTimes);
    expect(await cleanupExpiredContactAttempts(100, now)).toBe(0);
  });
  it('bounds large backlogs, non-finite limits, zero limits and fractional batches', async () => {
    const now = new Date();
    await prisma.contactRateLimitEvent.createMany({ data: [
      ...Array.from({ length: 1504 }, () => ({ ipHash, createdAt: new Date(now.getTime() - 8 * 86400000) })),
      { ipHash, createdAt: now },
    ] });
    expect(await cleanupExpiredContactAttempts(Number.NaN, now)).toBe(500);
    expect(await cleanupExpiredContactAttempts(50_000, now)).toBe(1000);
    expect(await cleanupExpiredContactAttempts(0, now)).toBe(1);
    expect(await cleanupExpiredContactAttempts(2.9, now)).toBe(2);
    expect(await cleanupExpiredContactAttempts(100, now)).toBe(1);
    expect(await cleanupExpiredContactAttempts(100, now)).toBe(0);
    expect(await prisma.contactRateLimitEvent.count({ where: { ipHash } })).toBe(1);
  });
});
