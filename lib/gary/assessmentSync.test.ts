import { describe, expect, it } from 'vitest';
import { buildAssessmentPackage, buildQuestionsAndAnswers } from './assessmentSync';
import type { AssessmentSubmission } from '../validation';

const submission = {
  workSituation: 'Small business, 1-10 employees ($100K-$1M/yr)',
  usingAiTools: 'Yes — using AI tools like ChatGPT or Claude at least a few times per week',
  aiChallenge: "I'm excited about AI but overwhelmed by where to start",
  desiredOutcome: 'Save time — automate tasks and free up my schedule',
  timeDrain: 'Answering calls & following up with leads quickly',
  privacyConcern: "Somewhat worried — I think about it, but it's not stopping me",
  industry: 'Construction & Trades (contractors, subs, home services)',
  leadResponse: 'We respond manually, but follow-up is not always consistent.', sportsFan: 'Football', favoriteTeam: 'Lions',
  firstName: 'A', lastName: 'B', businessName: 'C', email: 'a@example.com',
  noWebsite: true, consent: true, formLoadedAt: 1,
} as AssessmentSubmission;

describe('assessment synchronization contract', () => {
  it('includes leadResponse in questions without exposing favoriteTeam', () => {
    const answers = buildQuestionsAndAnswers(submission);
    expect(answers).toContainEqual({
      question: 'What usually happens after a potential customer contacts your business?',
      answer: 'We respond manually, but follow-up is not always consistent.',
    });
    expect(JSON.stringify(answers)).not.toContain('Lions');
  });

  it('preserves the legacy profile and empty category scores', () => {
    const assessmentPackage = buildAssessmentPackage(submission, '<p>result</p>');
    expect(assessmentPackage.profileResult).toBe(submission.desiredOutcome);
    expect(assessmentPackage.categoryScores).toEqual({});
  });
});
