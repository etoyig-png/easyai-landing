import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import * as options from '@/lib/quizQuestions';

const f = vi.hoisted(() => ({ admit: vi.fn(), owner: vi.fn(), visitor: vi.fn(), generate: vi.fn(), complete: vi.fn(), notify: vi.fn(), pending: [] as Promise<unknown>[] }));
vi.mock('@vercel/functions', () => ({ waitUntil: (p: Promise<unknown>) => f.pending.push(p) }));
vi.mock('@/lib/assessmentAdmission', () => ({ admitAssessment: f.admit }));
vi.mock('@/lib/resend', () => ({ sendInternalNotification: f.owner, sendResultEmail: f.visitor }));
vi.mock('@/lib/anthropic', () => ({ generateAssessmentResult: f.generate, buildFallbackResultHtml: () => '<p>Complete fallback report</p>' }));
vi.mock('@/lib/assessmentSync', () => ({ completeAssessmentSync: f.complete }));
vi.mock('@/lib/commandCenter', () => ({ notifyCommandCenter: f.notify }));
vi.mock('@/lib/sessionCapability', () => ({ createSessionCapability: () => 'synthetic-capability' }));
vi.mock('@/lib/rateLimit', () => ({ looksLikeSpam: () => false, getClientIp: () => '192.0.2.18' }));
import { POST } from './route';
const data = {
  workSituation: options.WORK_SITUATION_OPTIONS[0], searchVisibility: options.SEARCH_VISIBILITY_OPTIONS[0],
  aiChallenge: options.AI_CHALLENGE_OPTIONS[0], desiredOutcome: options.DESIRED_OUTCOME_OPTIONS[0], timeDrain: options.TIME_DRAIN_OPTIONS[0],
  privacyConcern: options.PRIVACY_CONCERN_OPTIONS[0], industry: options.INDUSTRY_OPTIONS[0], leadResponse: options.LEAD_RESPONSE_OPTIONS[0],
  websiteConversion: options.WEBSITE_CONVERSION_OPTIONS[0], firstName: 'Synthetic', lastName: 'Visitor', businessName: 'Synthetic business',
  email: 'visitor@example.test', noWebsite: true, consent: true, formLoadedAt: 1,
};
const request = (body = data) => new NextRequest('http://localhost/api/assessment', { method: 'POST', body: JSON.stringify(body) });
const settle = async () => { await Promise.all(f.pending.splice(0)); };
beforeEach(() => {
  vi.clearAllMocks(); f.pending.length = 0;
  f.admit.mockResolvedValue({ kind: 'accepted', submission: { id: 'synthetic-1' } });
  f.generate.mockResolvedValue('<p>Full generated report</p>');
  f.owner.mockResolvedValue(undefined); f.visitor.mockResolvedValue(undefined);
});
describe('owner report route (mock effects only)', () => {
  it.each([false, true])('sends owner and visitor the same saved full report, including fallback=%s', async fallback => {
    if (fallback) f.generate.mockRejectedValueOnce(new Error('Synthetic generation failure'));
    expect((await POST(request())).status).toBe(200); await settle();
    const report = fallback ? '<p>Complete fallback report</p>' : '<p>Full generated report</p>';
    expect(f.owner).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'synthetic-1', email: data.email, consent: true }), report);
    expect(f.visitor).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ to: data.email, resultHtml: report }));
    expect(f.complete).toHaveBeenCalledWith(expect.objectContaining({ submissionId: 'synthetic-1', resultHtml: report }));
    f.admit.mockResolvedValueOnce({ kind: 'duplicate', submission: { id: 'synthetic-1' } });
    expect(await (await POST(request())).json()).toMatchObject({ duplicate: true }); await settle();
    expect(f.owner).toHaveBeenCalledTimes(1); expect(f.visitor).toHaveBeenCalledTimes(1); expect(f.generate).toHaveBeenCalledTimes(1);
  });
  it('does not send or admit without consent', async () => {
    expect((await POST(request({ ...data, consent: false }))).status).toBe(400); await settle();
    expect(f.admit).not.toHaveBeenCalled(); expect(f.owner).not.toHaveBeenCalled(); expect(f.visitor).not.toHaveBeenCalled();
  });
  it('does not let owner rejection suppress visitor report or saved results', async () => {
    f.owner.mockRejectedValueOnce(new Error('Synthetic owner rejection'));
    expect((await POST(request())).status).toBe(200); await settle();
    expect(f.visitor).toHaveBeenCalledTimes(1);
    expect(f.complete).toHaveBeenCalledWith(expect.objectContaining({ resultHtml: '<p>Full generated report</p>', emailDeliveryStatus: 'sent' }));
  });
});
