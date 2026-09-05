import { describe, expect, it } from 'vitest';
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
