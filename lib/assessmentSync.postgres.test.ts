import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.DIRECT_URL = process.env.TEST_DATABASE_URL;
  }
  process.env.COMMAND_CENTER_ASSESSMENT_SYNC_URL = 'https://fixture.example/api/easy-ai/assessments';
  process.env.COMMAND_CENTER_ASSESSMENT_SYNC_TOKEN = 'fixture-only';
});
import { prisma } from './prisma';
import { admitAssessment } from './assessmentAdmission';
import { ASSESSMENT_RECOVERY_DELAY_MS, completeAssessmentSync } from './assessmentSync';
import { assessmentSyncKey, drainFunnelEventOutbox } from './gary/funnelEvents';
import type { AssessmentSubmission } from './validation';

const run = `${Date.now()}`;
function fixture(label: string) {
  return {
    workSituation: 'x', searchVisibility: 'x', aiChallenge: 'x', desiredOutcome: 'x', timeDrain: 'x', privacyConcern: 'x',
    industry: 'x', leadResponse: 'x', websiteConversion: 'x', firstName: 'Fixture', lastName: label, businessName: `Fixture ${label}`,
    email: `assessment-${label}-${run}@example.test`, websiteUrl: 'https://example.test', noWebsite: false, consent: true, formLoadedAt: 1,
  } as unknown as AssessmentSubmission;
}

describe.skipIf(!process.env.TEST_DATABASE_URL)('assessment sync durability against disposable PostgreSQL with mocked Command Center', () => {
  const ids: string[] = [];
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  afterAll(async () => {
    await prisma.funnelEventOutbox.deleteMany({ where: { idempotencyKey: { in: ids.map(assessmentSyncKey) } } });
    await prisma.submission.deleteMany({ where: { id: { in: ids } } });
  });

  async function admit(data: AssessmentSubmission) {
    const admission = await admitAssessment(data, `identity-${data.lastName}-${run}`);
    if (admission.kind !== 'created') throw new Error(`expected a created admission, got ${admission.kind}`);
    ids.push(admission.submission.id);
    return admission.submission.id;
  }

  it('commits the held-back sync row with the submission, and a duplicate request adds nothing', async () => {
    const data = fixture('admitted');
    const id = await admit(data);
    const row = await prisma.funnelEventOutbox.findUniqueOrThrow({ where: { idempotencyKey: assessmentSyncKey(id) } });
    expect(row).toMatchObject({ eventType: 'assessment.sync', deliveredAt: null, attempts: 0 });
    expect(row.nextAttemptAt.getTime()).toBeGreaterThan(Date.now() + ASSESSMENT_RECOVERY_DELAY_MS - 60_000);
    const duplicate = await admitAssessment(data, `identity-admitted-${run}`);
    expect(duplicate).toEqual({ kind: 'duplicate', submission: { id } });
    expect(await prisma.funnelEventOutbox.count({ where: { idempotencyKey: { startsWith: 'assessment.sync:' }, payload: { path: ['contactEmail'], equals: data.email } } })).toBe(1);
  });

  it('completes status and sync body in one commit and delivers once', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetch);
    const data = fixture('completed');
    const id = await admit(data);
    await completeAssessmentSync({ submissionId: id, submission: data, resultHtml: '<p>r</p>', status: 'completed', emailDeliveryStatus: 'sent' });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)).toMatchObject({ submissionId: id, processingStatus: 'completed' });
    expect((await prisma.submission.findUniqueOrThrow({ where: { id } })).status).toBe('completed');
    const row = await prisma.funnelEventOutbox.findUniqueOrThrow({ where: { idempotencyKey: assessmentSyncKey(id) } });
    expect(row.deliveredAt).not.toBeNull();
    expect(row.payload).toMatchObject({ processingStatus: 'completed', resultSummary: '<p>r</p>' });
  });

  it('a due pending intent waits without consuming attempts, then late completion sends only final content', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetch);
    const data = fixture('late');
    const id = await admit(data);
    vi.useFakeTimers({ now: Date.now() + ASSESSMENT_RECOVERY_DELAY_MS + 1000, toFake: ['Date'] });
    await drainFunnelEventOutbox({ limit: 100 });
    expect(fetch).not.toHaveBeenCalled();
    const waiting = await prisma.funnelEventOutbox.findUniqueOrThrow({ where: { idempotencyKey: assessmentSyncKey(id) } });
    expect(waiting).toMatchObject({ attempts: 0, deliveredAt: null });
    await completeAssessmentSync({ submissionId: id, submission: data, resultHtml: '<p>late</p>', status: 'completed', emailDeliveryStatus: 'sent' });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)).toMatchObject({ syncStage: 'final', processingStatus: 'completed', resultSummary: '<p>late</p>' });
  });

  it('a stale acknowledgment never settles a changed payload and the new payload remains retryable', async () => {
    const data = fixture('stale');
    const id = await admit(data);
    const key = assessmentSyncKey(id);
    const stored = await prisma.funnelEventOutbox.findUniqueOrThrow({ where: { idempotencyKey: key } });
    const original = { ...(stored.payload as object), processingStatus: 'completed', resultSummary: 'first' };
    await prisma.funnelEventOutbox.update({ where: { id: stored.id }, data: { payload: original, nextAttemptAt: new Date(0) } });
    const fetch = vi.fn().mockImplementationOnce(async () => {
      await prisma.funnelEventOutbox.update({ where: { id: stored.id }, data: { payload: { ...original, resultSummary: 'final' } } });
      return new Response('{}', { status: 201 });
    }).mockResolvedValue(new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetch);
    const { deliverFunnelEvent } = await import('./gary/funnelEvents');
    expect(await deliverFunnelEvent(key)).toBe('retry-scheduled');
    expect((await prisma.funnelEventOutbox.findUniqueOrThrow({ where: { id: stored.id } })).deliveredAt).toBeNull();
    expect(await deliverFunnelEvent(key)).toBe('delivered');
    expect(JSON.parse((fetch.mock.calls[1][1] as RequestInit).body as string).resultSummary).toBe('final');
  });

  it('completion reopens an old delivered provisional receipt for the final receiver stage', async () => {
    const data = fixture('provisional');
    const id = await admit(data);
    await prisma.funnelEventOutbox.update({ where: { idempotencyKey: assessmentSyncKey(id) }, data: { deliveredAt: new Date() } });
    const fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetch);
    await completeAssessmentSync({ submissionId: id, submission: data, resultHtml: '<p>final</p>', status: 'failed', emailDeliveryStatus: 'failed' });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect((await prisma.submission.findUniqueOrThrow({ where: { id } })).resultHtml).toBe('<p>final</p>');
    expect(JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)).toMatchObject({ syncStage: 'final', processingStatus: 'failed', resultSummary: '<p>final</p>' });
  });

  it('rolls back a completion whose outbox write fails, and the drain delivers the admission row after the recovery delay', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetch);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const data = fixture('recovered');
    const id = await admit(data);
    // A real transaction whose outbox write fails after the status update has run inside it.
    const failingOutbox = {
      $transaction: ((callback: (tx: unknown) => Promise<unknown>) => prisma.$transaction(async (tx) => callback(new Proxy(tx, {
        get: (target, prop) => prop === 'funnelEventOutbox'
          ? { ...target.funnelEventOutbox, updateMany: async () => { throw new Error('transient store outage'); } }
          : Reflect.get(target, prop),
      })))) as typeof prisma.$transaction,
    };
    let statusInsideTransaction = '';
    const observe = vi.spyOn(prisma.submission, 'update').mockImplementationOnce((async () => {
      // The status-only retry runs after rollback; what it sees is what the failed commit left.
      statusInsideTransaction = (await prisma.submission.findUniqueOrThrow({ where: { id } })).status;
      return prisma.submission.update({ where: { id }, data: { status: 'completed', resultHtml: '<p>r</p>' } });
    }) as never);
    await completeAssessmentSync({ submissionId: id, submission: data, resultHtml: '<p>r</p>', status: 'completed', emailDeliveryStatus: 'sent' }, failingOutbox);
    expect(observe).toHaveBeenCalled();
    expect(statusInsideTransaction).toBe('pending');
    expect((await prisma.submission.findUniqueOrThrow({ where: { id } })).status).toBe('completed');
    const held = await prisma.funnelEventOutbox.findUniqueOrThrow({ where: { idempotencyKey: assessmentSyncKey(id) } });
    expect(held).toMatchObject({ deliveredAt: null, attempts: 0 });
    expect((held.payload as Record<string, unknown>).processingStatus).toBeUndefined();

    await drainFunnelEventOutbox({ limit: 100 });
    expect(fetch.mock.calls.filter(([, init]) => JSON.parse((init as RequestInit).body as string).submissionId === id)).toHaveLength(0);
    vi.useFakeTimers({ now: Date.now() + ASSESSMENT_RECOVERY_DELAY_MS + 60_000, toFake: ['Date'] });
    await drainFunnelEventOutbox({ limit: 100 });
    const sent = fetch.mock.calls.filter(([, init]) => JSON.parse((init as RequestInit).body as string).submissionId === id);
    expect(sent).toHaveLength(1);
    expect(JSON.parse((sent[0][1] as RequestInit).body as string)).toMatchObject({ idempotencyKey: `easy-ai-assessment-${id}`, companyName: data.businessName, syncStage: 'final', processingStatus: 'completed', emailDeliveryStatus: 'sent', resultSummary: '<p>r</p>' });
    expect((await prisma.funnelEventOutbox.findUniqueOrThrow({ where: { idempotencyKey: assessmentSyncKey(id) } })).deliveredAt).not.toBeNull();
  });
});
