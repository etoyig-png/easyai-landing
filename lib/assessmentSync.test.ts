import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildAssessmentPackage, buildQuestionsAndAnswers } from './assessmentSync';

// In-memory stand-in for the FunnelEventOutbox table the sync now writes through.
const rows = vi.hoisted(() => new Map<string, Record<string, unknown>>());
vi.mock('./prisma', () => ({
  prisma: {
    funnelEventOutbox: {
      findUnique: async ({ where }: { where: { idempotencyKey: string } }) => rows.get(where.idempotencyKey) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `row-${rows.size + 1}`, eventVersion: 1, attempts: 0, deliveredAt: null, nextAttemptAt: new Date(0), ...data };
        rows.set(data.idempotencyKey as string, row);
        return row;
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = Array.from(rows.values()).find((r) => r.id === where.id)!;
        Object.assign(row, data);
        return row;
      },
    },
  },
}));
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
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.resetModules(); });
  beforeEach(() => rows.clear());

  async function load(configured = true) {
    vi.stubEnv('COMMAND_CENTER_ASSESSMENT_SYNC_URL', configured ? 'https://fixture.example/api/easy-ai/assessments' : '');
    vi.stubEnv('COMMAND_CENTER_ASSESSMENT_SYNC_TOKEN', configured ? 'fixture-only' : '');
    vi.resetModules();
    return import('./assessmentSync');
  }
  const params = { submissionId: 'fixture-1', submission, resultHtml: '<p>result</p>', status: 'completed' as const, emailDeliveryStatus: 'sent' as const };

  it('sends the current CC contract once to the assessment intake, and a repeat sync does not post again', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetch);
    const { syncCompleteAssessmentToCommandCenter } = await load();
    await syncCompleteAssessmentToCommandCenter(params);
    await syncCompleteAssessmentToCommandCenter(params);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, request] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://fixture.example/api/easy-ai/assessments');
    expect((request.headers as Record<string, string>).Authorization).toBe('Bearer fixture-only');
    expect(JSON.parse(request.body as string)).toMatchObject({
      companyName: submission.businessName, contactName: 'A B', contactEmail: submission.email,
      idempotencyKey: 'easy-ai-assessment-fixture-1', submissionId: 'fixture-1',
      processingStatus: 'completed', emailDeliveryStatus: 'sent',
    });
    expect(rows.get('assessment.sync:fixture-1')).toMatchObject({ eventType: 'assessment.sync', deliveredAt: expect.any(Date) });
  });

  it('keeps a durable, retry-scheduled row when the Command Center is down instead of dropping the assessment', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('down', { status: 503 })));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { syncCompleteAssessmentToCommandCenter } = await load();
    await syncCompleteAssessmentToCommandCenter(params);
    expect(rows.get('assessment.sync:fixture-1')).toMatchObject({
      deliveredAt: null, attempts: 1, lastError: 'Command Center responded 503', nextAttemptAt: expect.any(Date),
    });
  });

  it('stores the package while sync is unconfigured so it is delivered once configuration exists', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { syncCompleteAssessmentToCommandCenter } = await load(false);
    await syncCompleteAssessmentToCommandCenter(params);
    expect(fetch).not.toHaveBeenCalled();
    expect(rows.get('assessment.sync:fixture-1')).toMatchObject({ deliveredAt: null, attempts: 0 });
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
