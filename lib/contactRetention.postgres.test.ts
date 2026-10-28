import { afterAll, describe, expect, it, vi } from 'vitest';
import { createHash } from 'crypto';
vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});
import { prisma } from './prisma';
import { admitContactMessage, cleanupExpiredContactAttempts } from './contactRateLimit';
const identity = `retention-${Date.now()}`;
const ipHash = createHash('sha256').update(identity).digest('hex');
describe.skipIf(!process.env.TEST_DATABASE_URL)('bounded contact abuse retention on isolated PostgreSQL', () => {
  afterAll(() => prisma.contactRateLimitEvent.deleteMany({ where: { ipHash } }));
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
});
