import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssessmentSubmission } from '../validation';

const originalFetch = global.fetch;

const submission = {
  workSituation: 'I run my own business',
  usingAiTools: 'Occasionally',
  aiChallenge: 'I do not know where to start',
  desiredOutcome: 'Win back time',
  timeDrain: 'Answering the same questions over and over',
  privacyConcern: 'Somewhat worried',
  industry: 'Healthcare',
  sportsFan: 'Yes',
  firstName: 'Dana',
  lastName: 'Warner',
  businessName: 'Warner Home Health',
  email: 'dana@example.com',
  consent: true,
  formLoadedAt: 1,
} as unknown as AssessmentSubmission;

beforeEach(() => {
  vi.resetAllMocks();
  process.env.COMMAND_CENTER_ASSESSMENT_SYNC_URL = 'https://command-center.example/api/easy-ai/assessments';
  process.env.COMMAND_CENTER_ASSESSMENT_SYNC_TOKEN = 'test-sync-token';
});

afterEach(() => {
  global.fetch = originalFetch;
  delete process.env.COMMAND_CENTER_ASSESSMENT_SYNC_URL;
  delete process.env.COMMAND_CENTER_ASSESSMENT_SYNC_TOKEN;
  vi.resetModules();
});

async function syncAndReadBody(overrides: Partial<AssessmentSubmission> = {}) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true });
  global.fetch = fetchMock;
  const { syncCompleteAssessmentToCommandCenter } = await import('./assessmentSync');
  await syncCompleteAssessmentToCommandCenter({
    submissionId: 'landing-submission-1',
    submission: { ...submission, ...overrides },
    resultHtml: '<p>Your AI Action Plan</p>',
    status: 'completed',
    emailDeliveryStatus: 'sent',
  });
  return { fetchMock, body: JSON.parse(fetchMock.mock.calls[0][1].body) };
}

describe('syncCompleteAssessmentToCommandCenter', () => {
  // The Command Center's /api/easy-ai/assessments route reads companyName / contactName /
  // contactEmail / contactPhone and 400s without a companyName plus at least one contact method.
  // Sending businessName/email/phone instead made every sync fail validation.
  it('sends the Command Center field names, not the website ones', async () => {
    const { body } = await syncAndReadBody();

    expect(body).toMatchObject({
      companyName: 'Warner Home Health',
      contactName: 'Dana Warner',
      contactEmail: 'dana@example.com',
      industry: 'Healthcare',
      profileResult: 'Win back time',
      source: 'easyai-landing',
    });
    expect(body.businessName).toBeUndefined();
    expect(body.email).toBeUndefined();
    expect(body.firstName).toBeUndefined();
    expect(body.lastName).toBeUndefined();
  });

  it('satisfies the route’s "company name + at least one contact method" rule', async () => {
    const { body } = await syncAndReadBody();
    expect(body.companyName).toBeTruthy();
    expect(Boolean(body.contactEmail) || Boolean(body.contactPhone)).toBe(true);
  });

  it('forwards funnelCorrelationId when the submission came through a Gary handoff', async () => {
    const { body } = await syncAndReadBody({ funnelCorrelationId: 'gary-session-abc' } as Partial<AssessmentSubmission>);
    expect(body.funnelCorrelationId).toBe('gary-session-abc');
    expect(body.submissionId).toBe('landing-submission-1');
  });

  it('leaves funnelCorrelationId undefined for a direct assessment with no Gary conversation', async () => {
    const { body } = await syncAndReadBody();
    expect(body.funnelCorrelationId).toBeUndefined();
  });

  it('sends a stable idempotency key derived from the submission id', async () => {
    const first = await syncAndReadBody();
    const second = await syncAndReadBody();
    expect(first.body.idempotencyKey).toBe('easy-ai-assessment-landing-submission-1');
    expect(second.body.idempotencyKey).toBe(first.body.idempotencyKey);
  });

  it('still sends the complete assessment package alongside the flat fields', async () => {
    const { body } = await syncAndReadBody();
    expect(body.assessmentPackage).toMatchObject({
      assessmentVersion: '2026-08-easyai-quiz-v1',
      clientFacingSummary: '<p>Your AI Action Plan</p>',
    });
    expect(body.assessmentPackage.questions.length).toBeGreaterThan(0);
  });

  it('is a no-op when the sync URL/token are not configured', async () => {
    delete process.env.COMMAND_CENTER_ASSESSMENT_SYNC_URL;
    const fetchMock = vi.fn();
    global.fetch = fetchMock;
    const { syncCompleteAssessmentToCommandCenter } = await import('./assessmentSync');
    await syncCompleteAssessmentToCommandCenter({
      submissionId: 'landing-submission-1',
      submission,
      resultHtml: '<p>x</p>',
      status: 'completed',
      emailDeliveryStatus: 'sent',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
