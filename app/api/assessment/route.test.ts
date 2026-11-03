import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import * as options from '@/lib/quizQuestions';

const f = vi.hoisted(() => ({ admit: vi.fn(), owner: vi.fn(), visitor: vi.fn(), generate: vi.fn(), complete: vi.fn(), notify: vi.fn(), mail: vi.fn(), pending: [] as Promise<unknown>[] }));
vi.mock('@vercel/functions', () => ({ waitUntil: (p: Promise<unknown>) => f.pending.push(p) }));
vi.mock('@/lib/assessmentAdmission', () => ({ admitAssessment: f.admit }));
vi.mock('resend', () => ({ Resend: class { emails = { send: f.mail }; } }));
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

// Reuses the browser interception pattern from isolatedJourney.postgres.test.ts, without a DB.
it.skipIf(!process.env.MOCKED_CONNECTED_BROWSER)('connects Gary handoff, assessment and captured full-report mail in one mocked browser journey', async () => {
  const { chromium, expect: browserExpect } = await import('@playwright/test');
  const chromiumArgs = (await import('@sparticuz/chromium')).default.args;
  const { generateGaryReply } = await import('@/lib/gary/replyPipeline');
  const { garyOpeningMessage, GARY_OPENING_OPTIONS } = await import('@/lib/gary/openingQuestion');
  const mail = await vi.importActual<typeof import('@/lib/resend')>('@/lib/resend');
  vi.stubEnv('VERCEL_ENV', 'development');
  vi.stubEnv('EMAIL_TEST_RECIPIENT', 'connected-inbox@example.test');
  vi.stubEnv('RESEND_API_KEY', '');
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Outbound fetch forbidden in mocked journey'); }));
  const inbox: { message: Record<string, unknown>; options: unknown }[] = [];
  f.mail.mockImplementation(async (message, options) => {
    inbox.push({ message, options });
    return { data: { id: `captured-${inbox.length}` }, error: null };
  });
  f.owner.mockImplementation(mail.sendInternalNotification);
  f.visitor.mockImplementation(mail.sendResultEmail);
  f.admit.mockResolvedValue({ kind: 'accepted', submission: { id: 'connected-submission' } });
  const report = '<h2>Connected full report</h2><p>First practical recommendation.</p><p>Final recommendation &amp; detail.</p>';
  f.generate.mockResolvedValue(report);
  const adapter = { provider: 'openai' as const, generateChatCompletion: vi.fn().mockResolvedValue({
    text: 'Start by recording which enquiries miss a follow-up. The assessment can help you choose one practical next step.[[OFFER_ASSESSMENT]]',
    model: 'synthetic-only', provider: 'openai' as const,
  }) };
  const calls: { path: string; body: Record<string, unknown> }[] = [];
  let completion: { resultHtml: string; submissionId: string; submission: typeof data } | undefined;
  f.complete.mockImplementation(async value => { completion = value; });
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    args: chromiumArgs.filter(argument => !['--single-process', '--in-process-gpu', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'].includes(argument)) });
  try {
    const page = await browser.newPage();
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== 'http://127.0.0.1:3200') return route.abort();
      if (!url.pathname.startsWith('/api/')) return route.continue();
      const body = route.request().postDataJSON() ?? {};
      calls.push({ path: url.pathname, body });
      if (url.pathname === '/api/gary/message') {
        const reply = body.message ? await generateGaryReply(adapter, { knownAnswers: [], visitorTurnCount: 1,
          assessmentOfferCount: 0, lastVisitorSafetyClass: 'none' }, [{ role: 'user', content: body.message }]) : null;
        return route.fulfill({ json: { sessionId: 'connected-gary', sessionCapability: 'synthetic-gary-cap',
          reply: { text: reply?.text ?? garyOpeningMessage('Gary is an AI assistant.'), options: reply ? [] : GARY_OPENING_OPTIONS },
          offerAssessment: reply?.offerAssessment ?? false } });
      }
      if (url.pathname === '/api/gary/handoff') {
        expect(body).toEqual({ sessionId: 'connected-gary', sessionCapability: 'synthetic-gary-cap' });
        return route.fulfill({ json: { redirectUrl: '/assessment?token=synthetic-handoff&funnelCorrelationId=connected-gary' } });
      }
      if (url.pathname === '/api/gary/handoff/consume') {
        expect(body).toEqual({ token: 'synthetic-handoff' });
        return route.fulfill({ json: { sessionId: 'connected-gary', prefill: {} } });
      }
      if (url.pathname === '/api/assessment') {
        const result = await POST(request(body as typeof data));
        await settle();
        return route.fulfill({ status: result.status, json: await result.json() });
      }
      if (url.pathname === '/api/assessment/status' && completion) {
        expect(url.searchParams.get('id')).toBe(completion.submissionId);
        expect(route.request().headers().authorization).toBe('Bearer synthetic-capability');
        return route.fulfill({ json: { status: 'completed', submissionId: completion.submissionId,
          businessName: completion.submission.businessName, result: { availability: 'available', text: mail.buildResultEmailText(completion.resultHtml) } } });
      }
      return route.abort();
    });
    await page.goto('http://127.0.0.1:3200/');
    await browserExpect.poll(() => page.evaluate(() => document.documentElement.getAttribute('data-gary-ready'))).toBe('true');
    await page.getByRole('button', { name: 'Chat with Gary from Accounting', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await browserExpect(dialog.getByText('Gary is an AI assistant.', { exact: false })).toBeVisible();
    await dialog.getByRole('textbox').fill('We lose follow-ups after enquiries. What should I do?');
    await dialog.getByRole('button', { name: 'Send', exact: true }).click();
    await dialog.getByRole('button', { name: 'Start My Free Assessment', exact: true }).click();
    await page.waitForURL('**/assessment?**');
    await page.locator('input.input').nth(0).fill(data.firstName);
    await page.locator('input.input').nth(1).fill(data.businessName);
    await page.getByRole('button', { name: 'Continue →', exact: true }).click();
    for (const question of options.buildQuestions(data.businessName)) {
      await browserExpect(page.getByRole('heading', { level: 1 })).toHaveText(question.title);
      await page.getByRole('button', { name: question.options[0], exact: true }).click();
    }
    await page.locator('input.input').first().fill(data.lastName);
    await page.locator('input[type=email]').fill(data.email);
    await page.getByRole('button', { name: 'Continue without sharing a website', exact: true }).click();
    await page.getByRole('button', { name: 'Continue →', exact: true }).click();
    await browserExpect(page.getByRole('button', { name: 'Confirm & Send →', exact: true })).toBeDisabled();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Confirm & Send →', exact: true }).click();
    const results = page.getByRole('region', { name: 'Your assessment results', exact: true });
    await browserExpect(results).toBeVisible();
    await browserExpect(results).toHaveAttribute('data-assessment-id', 'connected-submission');
    expect(await results.locator('p').textContent()).toBe(mail.buildResultEmailText(report));
    await page.reload();
    await browserExpect(results).toBeVisible();
    expect(await results.locator('p').textContent()).toBe(mail.buildResultEmailText(report));
    expect(f.admit).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ ...data, formLoadedAt: expect.any(Number), funnelCorrelationId: 'connected-gary' }), '192.0.2.18');
    expect(adapter.generateChatCompletion).toHaveBeenCalledTimes(1);
    expect(f.generate).toHaveBeenCalledTimes(1);
    expect(inbox).toHaveLength(2);
    expect(inbox.every(entry => entry.message.to === 'connected-inbox@example.test')).toBe(true);
    expect(inbox[0].message).toMatchObject({ replyTo: data.email, html: expect.stringContaining(report), text: expect.stringContaining(mail.buildResultEmailText(report)) });
    expect(inbox[0].message.text).toContain('Submission ID: connected-submission');
    for (const key of ['workSituation','searchVisibility','aiChallenge','desiredOutcome','timeDrain','privacyConcern','industry','leadResponse','websiteConversion'] as const) expect(inbox[0].message.text).toContain(data[key]);
    expect(inbox[0].options).toEqual({ idempotencyKey: 'assessment-owner:connected-submission:report' });
    expect(inbox[1].message).toMatchObject({ html: expect.stringContaining(report), text: mail.buildResultEmailText(report) });
    expect(calls.filter(call => call.path === '/api/assessment')).toHaveLength(1);
    expect(calls.filter(call => call.path === '/api/assessment/status')).toHaveLength(2);
    expect(calls.filter(call => call.path === '/api/gary/handoff')).toHaveLength(1);
    expect(calls.filter(call => call.path === '/api/gary/message')).toHaveLength(2);
    expect(calls.filter(call => call.path === '/api/gary/message').every(call => !call.body.contactFlow)).toBe(true);
    expect(calls.filter(call => call.path === '/api/gary/handoff/consume')).toHaveLength(1);
    expect(f.notify).toHaveBeenCalledWith({ status: 'assessment_completed', submissionId: 'connected-submission' });
    const fs = await import('node:fs');
    fs.writeFileSync('/workspace/work/connected-mocked-flow.capture.json', JSON.stringify({ runtime: 'de4d6381c2c3803681561b1ec873418d9c74e628',
      scope: 'connected browser + real reply pipeline/assessment POST/email formatter; mocked model/auth/handoff/storage/status/SDK/CC',
      calls, completion, inbox, actualProviderCalls: 0, actualEmailSends: 0 }, null, 2));
  } finally { await browser.close(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); }
}, 45_000);
