import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildAssessmentPackage, buildQuestionsAndAnswers } from './assessmentSync';

// In-memory stand-in for the Submission and FunnelEventOutbox tables. $transaction restores both
// tables when its callback throws, the rollback the completion boundary relies on.
const db = vi.hoisted(() => ({
  rows: new Map<string, Record<string, unknown>>(),
  submissions: new Map<string, Record<string, unknown>>(),
  failOutboxWrite: false,
}));
const rows = db.rows;
vi.mock('./prisma', () => {
  const matches = (row: Record<string, unknown>, where: Record<string, unknown>): boolean => Object.entries(where).every(([field, condition]) => {
    if (field === 'AND') return (condition as Record<string, unknown>[]).every((part) => matches(row, part));
    if (field === 'OR') return (condition as Record<string, unknown>[]).some((part) => matches(row, part));
    if (condition && typeof condition === 'object' && !(condition instanceof Date)) {
      const c = condition as { lte?: Date; lt?: number; not?: unknown; equals?: unknown; path?: string[] };
      if ('equals' in c) {
        let candidate: unknown = row[field];
        for (const part of c.path ?? []) candidate = (candidate as Record<string, unknown>)?.[part];
        return JSON.stringify(candidate) === JSON.stringify(c.equals);
      }
      if (c.lte) return (row[field] as Date) <= c.lte;
      if (c.lt !== undefined) return (row[field] as number) < c.lt;
      if ('not' in c) return row[field] !== c.not;
    }
    return row[field] === condition;
  });
  const client = {
    funnelEventOutbox: {
      findUnique: async ({ where }: { where: { idempotencyKey: string } }) => db.rows.get(where.idempotencyKey) ?? null,
      findMany: async ({ where }: { where: Record<string, unknown> }) => Array.from(db.rows.values()).filter((r) => matches(r, where)),
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `row-${db.rows.size + 1}`, eventVersion: 1, attempts: 0, deliveredAt: null, nextAttemptAt: new Date(), ...data };
        db.rows.set(data.idempotencyKey as string, row);
        return row;
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = Array.from(db.rows.values()).find((r) => r.id === where.id)!;
        Object.assign(row, data);
        return row;
      },
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        if (db.failOutboxWrite) throw new Error('transient store outage');
        const hit = Array.from(db.rows.values()).filter((r) => matches(r, where));
        hit.forEach((r) => Object.assign(r, data));
        return { count: hit.length };
      },
    },
    submission: {
      findUnique: async ({ where }: { where: { id: string } }) => db.submissions.get(where.id) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = { ...(db.submissions.get(where.id) ?? { id: where.id }), ...data };
        db.submissions.set(where.id, row);
        return row;
      },
    },
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) => {
      const rowsBefore = new Map(Array.from(db.rows, ([k, v]) => [k, { ...v }]));
      const submissionsBefore = new Map(Array.from(db.submissions, ([k, v]) => [k, { ...v }]));
      try {
        return await callback(client);
      } catch (err) {
        db.rows.clear(); rowsBefore.forEach((v, k) => db.rows.set(k, v));
        db.submissions.clear(); submissionsBefore.forEach((v, k) => db.submissions.set(k, v));
        throw err;
      }
    },
  };
  return { prisma: client };
});
import type { AssessmentSubmission } from './validation';

const submission = {
  workSituation: 'Small business, 1-10 employees ($100K-$1M/yr)',
  searchVisibility: 'We show up sometimes, but competitors seem more visible',
  aiChallenge: "I'm excited about AI but overwhelmed by where to start",
  desiredOutcome: 'Save time — automate tasks and free up my schedule',
  timeDrain: 'Answering calls & following up with leads quickly',
  privacyConcern: "Somewhat worried — I think about it, but it's not stopping me",
  industry: 'Construction & Trades (contractors, subs, home services)',
  leadResponse: 'We respond manually, but follow-up is not always consistent.',
  websiteConversion: 'Visitors can contact us, but the next step could be clearer',
  firstName: 'A',
  lastName: 'B',
  businessName: 'C',
  email: 'a@example.com',
  websiteUrl: 'https://example.com',
  noWebsite: false,
  consent: true,
  formLoadedAt: 1,
} as AssessmentSubmission;

describe('assessment synchronization contract', () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.resetModules(); });
  beforeEach(() => { rows.clear(); db.submissions.clear(); db.failOutboxWrite = false; });

  async function load(configured = true) {
    vi.stubEnv('COMMAND_CENTER_ASSESSMENT_SYNC_URL', configured ? 'https://fixture.example/api/easy-ai/assessments' : '');
    vi.stubEnv('COMMAND_CENTER_ASSESSMENT_SYNC_TOKEN', configured ? 'fixture-only' : '');
    vi.resetModules();
    const sync = await import('./assessmentSync');
    const { prisma } = await import('./prisma');
    const { drainFunnelEventOutbox } = await import('./gary/funnelEvents');
    // What admitAssessment does inside its transaction, right after storing the submission.
    const admit = async () => {
      db.submissions.set('fixture-1', { id: 'fixture-1', status: 'pending' });
      await sync.recordAssessmentSyncIntent(prisma, 'fixture-1', submission);
    };
    return { ...sync, admit, drainFunnelEventOutbox };
  }
  const params = { submissionId: 'fixture-1', submission, resultHtml: '<p>result</p>', status: 'completed' as const, emailDeliveryStatus: 'sent' as const };
  const key = 'assessment.sync:fixture-1';

  it('admission stores a held-back recovery row that the drain does not send while completion is still possible', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { admit, drainFunnelEventOutbox, ASSESSMENT_RECOVERY_DELAY_MS } = await load();
    const before = Date.now();
    await admit();
    const row = rows.get(key)!;
    expect(row).toMatchObject({ eventType: 'assessment.sync', deliveredAt: null, attempts: 0 });
    expect((row.nextAttemptAt as Date).getTime()).toBeGreaterThanOrEqual(before + ASSESSMENT_RECOVERY_DELAY_MS);
    expect(row.payload).toMatchObject({ idempotencyKey: 'easy-ai-assessment-fixture-1', submissionId: 'fixture-1', resultSummary: '' });
    expect((row.payload as Record<string, unknown>).processingStatus).toBeUndefined();
    await drainFunnelEventOutbox();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('completion commits status and the full body together, sends the current CC contract once, and a repeat does not post again', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetch);
    const { admit, completeAssessmentSync } = await load();
    await admit();
    await completeAssessmentSync(params);
    await completeAssessmentSync(params);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, request] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://fixture.example/api/easy-ai/assessments');
    expect((request.headers as Record<string, string>).Authorization).toBe('Bearer fixture-only');
    expect(JSON.parse(request.body as string)).toMatchObject({
      companyName: submission.businessName, contactName: 'A B', contactEmail: submission.email,
      idempotencyKey: 'easy-ai-assessment-fixture-1', submissionId: 'fixture-1',
      processingStatus: 'completed', emailDeliveryStatus: 'sent', resultSummary: '<p>result</p>',
    });
    expect(db.submissions.get('fixture-1')).toMatchObject({ status: 'completed', resultHtml: '<p>result</p>' });
    expect(rows.size).toBe(1);
    expect(rows.get(key)).toMatchObject({ deliveredAt: expect.any(Date) });
  });

  it('keeps a durable, retry-scheduled row when the Command Center is down instead of dropping the assessment', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('down', { status: 503 })));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { admit, completeAssessmentSync } = await load();
    await admit();
    await completeAssessmentSync(params);
    expect(rows.get(key)).toMatchObject({
      deliveredAt: null, attempts: 1, lastError: 'Command Center responded 503', nextAttemptAt: expect.any(Date),
    });
  });

  it('stores the completed body while sync is unconfigured so it is delivered once configuration exists', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { admit, completeAssessmentSync } = await load(false);
    await admit();
    await completeAssessmentSync(params);
    expect(fetch).not.toHaveBeenCalled();
    expect(rows.get(key)).toMatchObject({ deliveredAt: null, attempts: 0, payload: expect.objectContaining({ processingStatus: 'completed' }) });
  });

  it('a storage failure at completion rolls the boundary back, keeps the recovery row, and the drain later delivers it', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetch);
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { admit, completeAssessmentSync, drainFunnelEventOutbox, ASSESSMENT_RECOVERY_DELAY_MS } = await load();
    await admit();
    db.failOutboxWrite = true;
    await expect(completeAssessmentSync(params)).resolves.toBeUndefined();
    db.failOutboxWrite = false;
    expect(errors).toHaveBeenCalledWith(expect.stringContaining('stage=store'), expect.any(Error));
    // The visitor's sent email still reads as completed, through the status-only retry.
    expect(db.submissions.get('fixture-1')).toMatchObject({ status: 'completed' });
    expect(rows.get(key)).toMatchObject({ deliveredAt: null, attempts: 0 });
    expect(fetch).not.toHaveBeenCalled();

    await drainFunnelEventOutbox();
    expect(fetch).not.toHaveBeenCalled();
    vi.useFakeTimers({ now: Date.now() + ASSESSMENT_RECOVERY_DELAY_MS + 1000, toFake: ['Date'] });
    await drainFunnelEventOutbox();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)).toMatchObject({ submissionId: 'fixture-1', idempotencyKey: 'easy-ai-assessment-fixture-1' });
    expect(rows.get(key)).toMatchObject({ deliveredAt: expect.any(Date) });
  });

  it('a submission admitted before admission recorded the row still gets one at completion', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetch);
    const { completeAssessmentSync } = await load();
    await completeAssessmentSync({ ...params, status: 'failed', emailDeliveryStatus: 'failed' });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(rows.get(key)).toMatchObject({ deliveredAt: expect.any(Date), payload: expect.objectContaining({ processingStatus: 'failed', emailDeliveryStatus: 'failed' }) });
    expect(db.submissions.get('fixture-1')).toMatchObject({ status: 'failed', errorMessage: 'Result email delivery failed' });
  });

  it('includes both discovery and website conversion answers', () => {
    const answers = buildQuestionsAndAnswers(submission);
    expect(answers).toContainEqual({
      question: 'How visible is your business in Google and AI answers?',
      answer: submission.searchVisibility,
    });
    expect(answers).toContainEqual({
      question: 'What usually happens after a potential customer visits your website?',
      answer: submission.websiteConversion,
    });
  });

  it('versions the redesigned assessment and carries both gaps forward', () => {
    const assessmentPackage = buildAssessmentPackage(submission, '<p>result</p>');
    expect(assessmentPackage.assessmentVersion).toBe('2026-09-dual-gap-v2');
    expect(assessmentPackage.painPointsIdentified).toContain(submission.searchVisibility);
    expect(assessmentPackage.painPointsIdentified).toContain(submission.websiteConversion);
  });
});
