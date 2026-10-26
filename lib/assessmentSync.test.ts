import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildAssessmentPackage, buildQuestionsAndAnswers } from './assessmentSync';
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
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });

  it('sends the current CC contract and one stable key for retries of the same submission', async () => {
    vi.stubEnv('COMMAND_CENTER_ASSESSMENT_SYNC_URL', 'https://fixture.example/api/easy-ai/assessments');
    vi.stubEnv('COMMAND_CENTER_ASSESSMENT_SYNC_TOKEN', 'fixture-only');
    vi.resetModules();
    const fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetch);
    const { syncCompleteAssessmentToCommandCenter } = await import('./assessmentSync');
    const params = { submissionId: 'fixture-1', submission, resultHtml: '<p>result</p>', status: 'completed' as const, emailDeliveryStatus: 'sent' as const };
    await syncCompleteAssessmentToCommandCenter(params);
    await syncCompleteAssessmentToCommandCenter(params);
    for (const [, request] of fetch.mock.calls as unknown as [string, RequestInit][]) {
      expect(JSON.parse(request.body as string)).toMatchObject({
        companyName: submission.businessName, contactName: 'A B', contactEmail: submission.email,
        idempotencyKey: 'easy-ai-assessment-fixture-1', submissionId: 'fixture-1',
        processingStatus: 'completed', emailDeliveryStatus: 'sent',
      });
    }
    expect(fetch).toHaveBeenCalledTimes(2);
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
