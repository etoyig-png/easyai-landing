import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => {
  const url = process.env.ISOLATED_JOURNEY_DATABASE_URL;
  if (url) {
    const target = new URL(url);
    if (!['127.0.0.1', 'localhost'].includes(target.hostname) || !target.pathname.startsWith('/easyai_journey_')) {
      throw new Error('Journey tests require a dedicated disposable local database');
    }
    process.env.DATABASE_URL = url;
    process.env.DIRECT_URL = url;
  }
  process.env.VERCEL_ENV = 'development';
  process.env.EMAIL_TEST_RECIPIENT = 'isolated-inbox@example.test';
  process.env.GARY_SESSION_CAPABILITY_SECRET = 'isolated-journey-fixture-only';
  for (const key of ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'RESEND_API_KEY', 'COMMAND_CENTER_WEBHOOK_URL',
    'COMMAND_CENTER_ASSESSMENT_SYNC_URL', 'EASY_AI_PUBLIC_FUNNEL_WEBHOOK_URL', 'PUBLIC_FUNNEL_WEBHOOK_URL', 'GARY_FUNNEL_WEBHOOK_URL', 'ASSESSMENT_NOTIFICATION_EMAIL', 'RESULT_EMAIL_REPLY_TO']) delete process.env[key];
  process.env.COMMAND_CENTER_ASSESSMENT_SYNC_URL = 'http://127.0.0.1:3199/assessments';
  process.env.COMMAND_CENTER_ASSESSMENT_SYNC_TOKEN = 'synthetic-capture';
  process.env.GARY_FUNNEL_WEBHOOK_URL = 'http://127.0.0.1:3199/funnel';
  process.env.GARY_FUNNEL_WEBHOOK_SECRET = 'synthetic-capture';
  return { wire: [] as { url: string; body: string }[], pending: [] as Promise<unknown>[], inbox: [] as Record<string, unknown>[],
    send: vi.fn(), generate: vi.fn().mockResolvedValue('<p>Isolated saved opportunity plan.</p>') };
});
vi.mock('@vercel/functions', () => ({ waitUntil: (task: Promise<unknown>) => fixture.pending.push(task) }));
vi.mock('resend', () => ({ Resend: class { emails = { send: fixture.send }; } }));
vi.mock('./anthropic', async (original) => ({ ...await original<typeof import('./anthropic')>(), generateAssessmentResult: fixture.generate }));
vi.mock('./gary/llm/providerFactory', () => ({ createGaryLlmAdapter: () => { throw new Error('No paid calls allowed in scripted journey'); } }));
import { NextRequest } from 'next/server';
import { prisma } from './prisma';
import { POST as assess } from '@/app/api/assessment/route';
import { GET as status } from '@/app/api/assessment/status/route';
import { POST as gary } from '@/app/api/gary/message/route';
import * as options from './quizQuestions';
import { internalRecipient } from './emailRouting';

function request(path: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': (body as { anonymousId?: string }).anonymousId === 'isolated-retry' ? '192.0.2.19' : (body as { anonymousId?: string }).anonymousId === 'cross-repository-fixture' ? '192.0.2.20' : '192.0.2.18' }, body: JSON.stringify(body) });
}
async function settle() { while (fixture.pending.length) await Promise.all(fixture.pending.splice(0)); }

function assessmentData() {
  return { workSituation: options.WORK_SITUATION_OPTIONS[0], searchVisibility: options.SEARCH_VISIBILITY_OPTIONS[0],
      aiChallenge: options.AI_CHALLENGE_OPTIONS[0], desiredOutcome: options.DESIRED_OUTCOME_OPTIONS[0], timeDrain: options.TIME_DRAIN_OPTIONS[0],
      privacyConcern: options.PRIVACY_CONCERN_OPTIONS[0], industry: options.INDUSTRY_OPTIONS[0], leadResponse: options.LEAD_RESPONSE_OPTIONS[0],
      websiteConversion: options.WEBSITE_CONVERSION_OPTIONS[0], firstName: 'Isolated', lastName: 'Fixture', businessName: 'Non-customer fixture',
      email: 'assessment@example.test', noWebsite: true, consent: true, formLoadedAt: Date.now() - 5000 };
}

describe.skipIf(!process.env.ISOLATED_JOURNEY_DATABASE_URL)('isolated real routes/PostgreSQL with captured test inbox (not external delivery)', () => {
  beforeAll(() => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
      if (!['http://127.0.0.1:3199/assessments', 'http://127.0.0.1:3199/funnel'].includes(String(url))) throw new Error('Unexpected outbound request in isolated journey');
      fixture.wire.push({ url: String(url), body: String(init.body) });
      return new Response('{}', { status: 201 });
    }));
    fixture.send.mockImplementation(async (message: Record<string, unknown>) => {
      expect(message.to).toBe('isolated-inbox@example.test');
      fixture.inbox.push(structuredClone(message));
      return { data: { id: `local-inbox-${fixture.inbox.length}` }, error: null };
    });
  });
  afterAll(async () => { await settle(); await prisma.$disconnect(); vi.unstubAllGlobals(); });

  it('saves assessment result and two redirected notifications, protects status and deduplicates replay', async () => {
    const data = assessmentData();
    const response = await assess(request('/api/assessment', data));
    expect(response.status).toBe(200);
    const accepted = await response.json();
    expect(accepted.id).toBeTruthy();
    await settle();
    const row = await prisma.submission.findUniqueOrThrow({ where: { id: accepted.id } });
    expect(row).toMatchObject({ status: 'completed', resultHtml: '<p>Isolated saved opportunity plan.</p>' });
    expect(fixture.inbox).toHaveLength(2);
    expect(fixture.inbox[0].html).toContain(accepted.id);
    expect(fixture.inbox[1]).toMatchObject({ replyTo: 'info@easyaiconsult.com' });
    expect(fixture.inbox[1].html).toContain(row.resultHtml);
    expect(internalRecipient()).toBe('info@easyaiconsult.com');
    expect((await status(new NextRequest(`http://localhost/api/assessment/status?id=${accepted.id}`))).status).toBe(401);
    const tracked = await status(new NextRequest(`http://localhost/api/assessment/status?id=${accepted.id}`, { headers: { authorization: `Bearer ${accepted.statusCapability}` } }));
    expect(await tracked.json()).toEqual({ status: 'completed' });
    const replay = await assess(request('/api/assessment', data));
    expect(await replay.json()).toMatchObject({ id: accepted.id, duplicate: true });
    await settle();
    expect(fixture.generate).toHaveBeenCalledTimes(1);
    expect(fixture.inbox).toHaveLength(2);
    expect(await prisma.submission.count()).toBe(1);
  });

  it('runs Gary name/contact/reason/confirm with durable contact and one inbox message despite replay', async () => {
    let response = await gary(request('/api/gary/message', { anonymousId: 'isolated-gary' }));
    expect(response.status).toBe(200);
    let body = await response.json();
    const identity = { anonymousId: 'isolated-gary', sessionId: body.sessionId, sessionCapability: body.sessionCapability };
    expect(body.reply.text).toContain('Gary');
    response = await gary(request('/api/gary/message', { ...identity, contactFlow: { action: 'start' } }));
    body = await response.json();
    for (const text of ['Isolated Visitor', 'gary@example.test', 'Please discuss this non-customer fixture.']) {
      response = await gary(request('/api/gary/message', { ...identity, contactFlow: { action: 'answer', draft: body.contactFlow.draft, text } }));
      expect(response.status).toBe(200);
      body = await response.json();
    }
    expect(body.contactFlow.draft.step).toBe('confirm');
    const confirmation = { ...identity, contactFlow: { action: 'confirm', draft: body.contactFlow.draft } };
    response = await gary(request('/api/gary/message', confirmation));
    expect((await response.json()).contactFlow.done).toBe(true);
    await settle();
    const contact = await prisma.publicContact.findUniqueOrThrow({ where: { sourceSessionId: identity.sessionId } });
    expect(contact).toMatchObject({ notificationStatus: 'sent', emailNormalized: 'gary@example.test' });
    expect(fixture.inbox).toHaveLength(3);
    expect(fixture.inbox[2]).toMatchObject({ replyTo: 'gary@example.test' });
    expect(fixture.inbox[2].html).toContain('Please discuss this non-customer fixture.');
    response = await gary(request('/api/gary/message', confirmation));
    expect((await response.json()).contactFlow.done).toBe(true);
    await settle();
    expect(fixture.inbox).toHaveLength(3);
    expect(await prisma.publicContact.count({ where: { sourceSessionId: identity.sessionId } })).toBe(1);
    expect(await prisma.funnelEventOutbox.count({ where: { idempotencyKey: `contact.captured:${identity.sessionId}:assistant-contact-flow` } })).toBe(1);
  });
  it('keeps a failed Gary notification durable and retries it without duplicate contact or inbox receipt', async () => {
    const opened = await gary(request('/api/gary/message', { anonymousId: 'isolated-retry' }));
    const session = await opened.json();
    const confirmation = { anonymousId: 'isolated-retry', sessionId: session.sessionId, sessionCapability: session.sessionCapability,
      contactFlow: { action: 'confirm', draft: { step: 'confirm', name: 'Retry Fixture', contact: 'retry@example.test', reason: 'Synthetic retry request' } } };
    fixture.send.mockResolvedValueOnce({ data: null, error: { message: 'Isolated inbox unavailable' } });
    const failed = await gary(request('/api/gary/message', confirmation));
    const body = await failed.json();
    expect(body.contactFlow.done).toBe(false);
    expect(body.reply.text).toContain("message itself didn't go through");
    await settle();
    const saved = await prisma.publicContact.findUniqueOrThrow({ where: { sourceSessionId: session.sessionId } });
    expect(saved.notificationStatus).toBe('failed');
    const before = fixture.inbox.length;
    const retry = await gary(request('/api/gary/message', confirmation));
    expect((await retry.json()).contactFlow.done).toBe(true);
    await settle();
    expect(await prisma.publicContact.findUniqueOrThrow({ where: { sourceSessionId: session.sessionId } })).toMatchObject({ id: saved.id, notificationStatus: 'sent' });
    expect(fixture.inbox).toHaveLength(before + 1);
    await gary(request('/api/gary/message', confirmation));
    await settle();
    expect(fixture.inbox).toHaveLength(before + 1);
  });

  it.skipIf(!process.env.ISOLATED_JOURNEY_BROWSER)('browser assessment and Gary traverse their forms into durable records and captured inbox', async () => {
    const { chromium, expect: browserExpect } = await import('@playwright/test');
    const chromiumArgs = (await import('@sparticuz/chromium')).default.args;
    const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
      args: chromiumArgs.filter(argument => !['--single-process', '--in-process-gpu', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'].includes(argument)) });
    try {
      const page = await browser.newPage(process.env.ISOLATED_JOURNEY_MOBILE ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : {});
      await page.addInitScript(() => {
        const state = window as typeof window & { assessmentCls: number };
        state.assessmentCls = 0;
        new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
            if (!shift.hadRecentInput) state.assessmentCls += shift.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
      });
      let submissionId = '';
      await page.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.hostname !== '127.0.0.1') return route.abort();
        if (url.pathname === '/api/assessment') {
          const response = await assess(request(url.pathname, route.request().postDataJSON()));
          const result = await response.json(); submissionId = result.id;
          await settle();
          return route.fulfill({ status: response.status, json: result });
        }
        if (url.pathname === '/api/gary/message') {
          const response = await gary(request(url.pathname, route.request().postDataJSON()));
          await settle();
          return route.fulfill({ status: response.status, json: await response.json() });
        }
        if (url.pathname === '/api/assessment/status') {
          const response = await status(new NextRequest(url, { headers: route.request().headers() }));
          return route.fulfill({ status: response.status, json: await response.json() });
        }
        if (url.pathname.startsWith('/api/')) return route.abort();
        return route.continue();
      });
      const before = fixture.inbox.length;
      await page.goto('http://127.0.0.1:3200/assessment');
      const openedAt = Date.now();
      await page.locator('input.input').nth(0).fill('Browser');
      await page.locator('input.input').nth(1).fill('Browser Non-customer Fixture');
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      expect(await page.evaluate(() => (window as typeof window & { assessmentCls: number }).assessmentCls)).toBeLessThanOrEqual(0.1);
      await page.getByRole('button', { name: 'Continue →', exact: true }).click();
      for (const question of options.buildQuestions('Browser Non-customer Fixture')) {
        await browserExpect(page.getByRole('heading', { level: 1 })).toHaveText(question.title);
        await page.getByRole('button', { name: question.options[0], exact: true }).click();
      }
      await browserExpect(page.getByText('11 of 11', { exact: true })).toBeVisible();
      await page.locator('input.input').first().fill('Fixture');
      await page.locator('input[type=email]').fill('browser@example.test');
      await page.getByRole('button', { name: 'Continue without sharing a website', exact: true }).click();
      await page.getByRole('button', { name: 'Continue →', exact: true }).click();
      await page.getByRole('checkbox').check();
      await browserExpect.poll(() => Date.now() - openedAt).toBeGreaterThanOrEqual(3500);
      await page.getByRole('button', { name: 'Confirm & Send →', exact: true }).click();
      await browserExpect(page.getByRole('heading', { name: 'Your Action Plan was accepted for email delivery', exact: true })).toBeVisible();
      expect(submissionId).toBeTruthy();
      expect(await prisma.submission.findUniqueOrThrow({ where: { id: submissionId } })).toMatchObject({ status: 'completed', resultHtml: '<p>Isolated saved opportunity plan.</p>' });
      expect(fixture.inbox).toHaveLength(before + 2);
      expect(fixture.inbox[before].html).toContain(submissionId);
      await page.goto('http://127.0.0.1:3200/contact');
      await browserExpect.poll(() => page.evaluate(() => document.documentElement.getAttribute('data-gary-ready'))).toBe('true');
      await page.getByRole('button', { name: 'Talk to Gary' }).click();
      const dialog = page.getByRole('dialog', { name: 'Chat with Gary from Accounting' });
      const flow = await import('./gary/contactFlow');
      for (const text of ['Browser Visitor', 'browser-gary@example.test']) {
        await dialog.getByRole('textbox').fill(text);
        await dialog.getByRole('button', { name: 'Send', exact: true }).click();
      }
      await dialog.getByRole('button', { name: flow.CONTACT_REASON_OPTIONS[1], exact: true }).click();
      await dialog.getByRole('button', { name: flow.CONTACT_CONFIRM_YES, exact: true }).click();
      await browserExpect(dialog.getByText(flow.contactOutcomeTexts('Easy AI').sent, { exact: true })).toBeVisible();
      expect(await prisma.publicContact.findFirstOrThrow({ where: { emailNormalized: 'browser-gary@example.test' } })).toMatchObject({ notificationStatus: 'sent' });
      expect(fixture.inbox).toHaveLength(before + 3);
    } finally { await browser.close(); }
  }, 30_000);

  it('exports correlated website-generated assessment and Gary wire bodies for CC contract verification', async () => {
    const notificationsBefore = fixture.inbox.length;
    const modelCallsBefore = fixture.generate.mock.calls.length;
    const anonymousId = 'cross-repository-fixture';
    const opening = await gary(request('/api/gary/message', { anonymousId, contactFlow: { action: 'start' } }));
    let body = await opening.json();
    const identity = { anonymousId, sessionId: body.sessionId, sessionCapability: body.sessionCapability };
    for (const text of ['Cross Repository Owner', 'cross-repository@example.test', 'Please arrange a human follow-up.']) {
      body = await (await gary(request('/api/gary/message', { ...identity, contactFlow: { action: 'answer', draft: body.contactFlow.draft, text } }))).json();
    }
    const sent = await gary(request('/api/gary/message', { ...identity, contactFlow: { action: 'confirm', draft: body.contactFlow.draft } }));
    expect((await sent.json()).contactFlow.done).toBe(true);
    const input = { ...assessmentData(), businessName: 'Cross Repository Fixture', email: 'cross-repository@example.test', funnelCorrelationId: identity.sessionId };
    const accepted = await (await assess(request('/api/assessment', input))).json();
    expect(accepted.id).toBeTruthy();
    await settle();
    const assessment = fixture.wire.find(item => item.url.endsWith('/assessments') && JSON.parse(item.body).submissionId === accepted.id);
    const contact = fixture.wire.find(item => item.url.endsWith('/funnel') && JSON.parse(item.body).eventType === 'contact.captured' && JSON.parse(item.body).sessionId === identity.sessionId);
    expect(assessment).toBeTruthy(); expect(contact).toBeTruthy();
    expect(JSON.parse(assessment!.body)).toMatchObject({ funnelCorrelationId: identity.sessionId, processingStatus: 'completed', emailDeliveryStatus: 'sent' });
    expect(fixture.inbox).toHaveLength(notificationsBefore + 3);
    expect(fixture.generate.mock.calls.length).toBe(modelCallsBefore + 1);
    const exportPath = process.env.ISOLATED_JOURNEY_WIRE_EXPORT;
    if (exportPath) {
      const { writeFileSync } = await import('node:fs');
      writeFileSync(exportPath, JSON.stringify({ provenance: 'Actual website route/Prisma/outbox serialization; synthetic visitor, captured notifications and deterministic model; HTTP acceptance captured, not external delivery', websiteRuntimeBase: 'f7d3a951a7f3e5dbf72907edb4ed956b5bd34ba1', assessment, contact }, null, 2));
    }
  });

});
