import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createSessionCapability } from '@/lib/sessionCapability';
import * as options from '@/lib/quizQuestions';

const f = vi.hoisted(() => ({ findFirst: vi.fn(), findUnique: vi.fn(), query: vi.fn(), count: vi.fn(), create: vi.fn(), effect: vi.fn() }));
vi.mock('@/lib/prisma', () => {
  const tx = { $queryRaw: f.query, submission: { findFirst: f.findFirst, count: f.count, create: f.create } };
  return { prisma: { $transaction: async (run: (client: typeof tx) => unknown) => run(tx), submission: { findUnique: f.findUnique } } };
});
vi.mock('@/lib/resend', async original => ({ ...await original<typeof import('@/lib/resend')>(), sendInternalNotification: f.effect, sendResultEmail: f.effect }));
vi.mock('@/lib/anthropic', () => ({ generateAssessmentResult: f.effect, buildFallbackResultHtml: f.effect }));
vi.mock('@/lib/assessmentSync', () => ({ recordAssessmentSyncIntent: f.effect, completeAssessmentSync: f.effect }));
vi.mock('@/lib/commandCenter', () => ({ notifyCommandCenter: f.effect }));
vi.mock('@vercel/functions', () => ({ waitUntil: f.effect }));
import { POST } from './route';
import { GET } from './status/route';

const data = {
  firstName: 'Different', lastName: 'Visitor', businessName: 'Different business', email: 'shared@example.test',
  noWebsite: true, consent: true, companyUrl: '', formLoadedAt: Date.now() - 10000,
  workSituation: options.WORK_SITUATION_OPTIONS[0], searchVisibility: options.SEARCH_VISIBILITY_OPTIONS[0],
  aiChallenge: options.AI_CHALLENGE_OPTIONS[0], desiredOutcome: options.DESIRED_OUTCOME_OPTIONS[0],
  timeDrain: options.TIME_DRAIN_OPTIONS[0], privacyConcern: options.PRIVACY_CONCERN_OPTIONS[0],
  industry: options.INDUSTRY_OPTIONS[0], leadResponse: options.LEAD_RESPONSE_OPTIONS[0], websiteConversion: options.WEBSITE_CONVERSION_OPTIONS[0],
};
const id = 'original-synthetic-assessment';
function submit(token = '', email = data.email) {
  return POST(new NextRequest('http://fixture.test/api/assessment', { method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'x-vercel-forwarded-for': '192.0.2.99' }, body: JSON.stringify({ ...data, email }) }));
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('GARY_SESSION_CAPABILITY_SECRET', 'synthetic-offline-signing-secret');
  vi.stubEnv('GARY_HANDOFF_TOKEN_SECRET', '');
  f.findFirst.mockResolvedValue({ id });
  f.findUnique.mockResolvedValue({ status: 'completed', businessName: 'Original business', resultHtml: '<p>Original private full report.</p>' });
});
afterEach(() => vi.unstubAllEnvs());

it.each(['absent', 'malformed', 'wrong assessment', 'Gary session', 'expired', 'oversized', 'bad signature'])('withholds an existing receipt for %s ownership evidence', async kind => {
  const valid = createSessionCapability(`assessment-status:${id}`);
  const token = kind === 'absent' ? '' : kind === 'malformed' ? 'not-a-capability' : kind === 'wrong assessment' ? createSessionCapability('assessment-status:other')
    : kind === 'Gary session' ? createSessionCapability(id) : kind === 'expired' ? createSessionCapability(`assessment-status:${id}`, Date.now() - 1000)
      : kind === 'oversized' ? 'x'.repeat(2049) : valid.slice(0, -1) + (valid.endsWith('x') ? 'y' : 'x');
  // Case-insensitive email lookup and a different identity cannot supply ownership.
  const response = await submit(token, 'SHARED@example.test');
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(await response.json()).toEqual({ success: true, duplicate: true });
  expect(f.findFirst.mock.calls[0][0].where.email).toEqual({ equals: 'SHARED@example.test', mode: 'insensitive' });
  expect(f.findFirst.mock.calls[0][0].where).not.toHaveProperty('ipAddress');
  const read = await GET(new NextRequest(`http://fixture.test/api/assessment/status?id=${id}`, { headers: { authorization: `Bearer ${token}` } }));
  expect(read.status).toBe(401);
  expect(f.findUnique).not.toHaveBeenCalled();
  expect(f.effect).not.toHaveBeenCalled();
  expect(f.create).not.toHaveBeenCalled();
});

it.each(['pending', 'completed'])('recovers an owned %s duplicate with the same token and full saved results, without new work', async status => {
  f.findUnique.mockResolvedValue({ status, businessName: 'Original business', resultHtml: '<p>Original private full report.</p>' });
  const token = createSessionCapability(`assessment-status:${id}`);
  const response = await submit(token);
  expect(await response.json()).toEqual({ success: true, duplicate: true, id, statusCapability: token });
  const read = await GET(new NextRequest(`http://fixture.test/api/assessment/status?id=${id}`, { headers: { authorization: `Bearer ${token}` } }));
  expect(read.status).toBe(200);
  expect((await read.json()).result.text).toContain('Original private full report.');
  expect(f.effect).not.toHaveBeenCalled();
  expect(f.create).not.toHaveBeenCalled();
});

it('fails closed when signing configuration becomes unavailable', async () => {
  const token = createSessionCapability(`assessment-status:${id}`);
  vi.stubEnv('GARY_SESSION_CAPABILITY_SECRET', '');
  expect(await (await submit(token)).json()).toEqual({ success: true, duplicate: true });
  expect(f.effect).not.toHaveBeenCalled();
});
