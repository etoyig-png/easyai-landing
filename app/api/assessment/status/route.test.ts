import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createSessionCapability } from '@/lib/sessionCapability';
const find = vi.hoisted(() => vi.fn());
vi.mock('@/lib/prisma', () => ({ prisma: { submission: { findUnique: find } } }));
import { GET } from './route';
beforeEach(() => { vi.stubEnv('GARY_SESSION_CAPABILITY_SECRET', 'synthetic-status-secret-only'); find.mockReset(); });
afterEach(() => vi.unstubAllEnvs());
const request = (id: string, token = '') => new NextRequest(`https://fixture.test/api/assessment/status?id=${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` } });
describe('assessment status resource capability', () => {
  it('rejects absent, wrong-resource, Gary-session and expired capabilities before reading storage', async () => {
    for (const token of ['', createSessionCapability('assessment-status:another'), createSessionCapability('fixture'), createSessionCapability('assessment-status:fixture', Date.now() - 1000)]) {
      expect((await GET(request('fixture', token))).status).toBe(401);
    }
    expect(find).not.toHaveBeenCalled();
  });
  it.each(['pending', 'completed', 'failed'])('returns only the owned status (%s), never contact data or result HTML', async (status) => {
    find.mockResolvedValue({ status });
    const response = await GET(request('fixture', createSessionCapability('assessment-status:fixture')));
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(await response.json()).toEqual({ status });
    expect(find).toHaveBeenCalledWith({ where: { id: 'fixture' }, select: { status: true } });
  });
  it('reports unavailable storage honestly without exposing errors', async () => {
    find.mockRejectedValue(new Error('sensitive internal fixture'));
    const response = await GET(request('fixture', createSessionCapability('assessment-status:fixture')));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('sensitive internal');
  });
});
