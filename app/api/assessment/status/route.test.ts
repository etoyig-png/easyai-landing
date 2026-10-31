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
  it.each(['pending', 'completed', 'failed'])('returns owned result availability (%s) without contact data', async (status) => {
    find.mockResolvedValue({ status, businessName: 'Fixture business', resultHtml: null });
    const response = await GET(request('fixture', createSessionCapability('assessment-status:fixture')));
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(await response.json()).toEqual({ status, submissionId: 'fixture', businessName: 'Fixture business', result: { availability: status === 'pending' ? 'pending' : 'unavailable', text: null } });
    expect(find).toHaveBeenCalledWith({ where: { id: 'fixture' }, select: { status: true, businessName: true, resultHtml: true } });
  });
  it('reports unavailable storage honestly without exposing errors', async () => {
    find.mockRejectedValue(new Error('sensitive internal fixture'));
    const response = await GET(request('fixture', createSessionCapability('assessment-status:fixture')));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('sensitive internal');
  });
});


it.each(['completed', 'failed'])('keeps saved results available for %s as the existing plain-text email representation', async status => {
  find.mockResolvedValue({ status, businessName: 'Fixture business', resultHtml: '<p>Same full result &amp; details</p><img src=x onerror=alert(1)><p>&#60;script&#62;literal&#60;/script&#62;</p>', email: 'private@example.test', errorMessage: 'private failure' });
  const response = await GET(request('fixture', createSessionCapability('assessment-status:fixture')));
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.result.availability).toBe('available');
  expect(body.result.text).toContain('Same full result & details');
  expect(body.result.text).toContain('Watch Your Next-Step Video:');
  expect(body.submissionId).toBe('fixture');
  expect(JSON.stringify(body)).not.toMatch(/private@example|private failure|onerror|<script/);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
});
it('keeps an unknown owned submission distinct from unavailable storage', async () => {
  find.mockResolvedValue(null);
  const response = await GET(request('fixture', createSessionCapability('assessment-status:fixture')));
  expect(response.status).toBe(404); expect(response.headers.get('cache-control')).toBe('private, no-store');
});
