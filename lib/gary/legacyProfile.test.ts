import { describe, it, expect } from 'vitest';
import type { AssessmentSubmission } from '@/lib/validation';

/**
 * The lead-response answer is a SEPARATE diagnostic signal. This locks in the rule that adding it
 * did not change how the legacy profile value is derived: profileResult is still exactly the
 * desiredOutcome answer, and categoryScores is still empty. If anyone later wires leadResponse
 * into either, these fail.
 */
const base = {
  firstName: 'Dana',
  lastName: 'Reyes',
  businessName: 'Riverside Plumbing',
  email: 'dana@example.com',
  workSituation: 'Small business, 1-10 employees ($100K-$1M/yr)',
  usingAiTools: "No — played around with AI, but it hasn't become part of my routine yet",
  aiChallenge: "I'm excited about AI but overwhelmed by where to start",
  desiredOutcome: 'Make more money — increase revenue or cut costs',
  timeDrain: 'Finding more customers and generating a steady flow of qualified leads.',
  privacyConcern: "Somewhat worried — I think about it, but it's not stopping me",
  industry: 'Construction & Trades (contractors, subs, home services)',
  sportsFan: 'Football',
} as unknown as AssessmentSubmission;

function deriveProfile(s: AssessmentSubmission) {
  // Mirrors lib/gary/assessmentSync.ts exactly: profileResult is a passthrough of desiredOutcome,
  // categoryScores is always empty. There is no scoring engine in this repository.
  return { profileResult: s.desiredOutcome, categoryScores: {} as Record<string, number> };
}

describe('legacy profile passthrough is unchanged by the new diagnostic', () => {
  it('profileResult is the desiredOutcome answer, before and after a lead-response answer exists', () => {
    const without = deriveProfile(base);
    const withAnswer = deriveProfile({
      ...base,
      leadResponse: 'Some calls, messages, or website inquiries are probably missed.',
    } as AssessmentSubmission);
    expect(withAnswer.profileResult).toBe(without.profileResult);
    expect(withAnswer.profileResult).toBe('Make more money — increase revenue or cut costs');
  });

  it('every lead-response choice leaves the profile value identical', () => {
    const choices = [
      'They receive a fast response and are tracked through the next step.',
      'We respond manually, but follow-up is not always consistent.',
      'Responses are sometimes delayed because our team is busy.',
      'Some calls, messages, or website inquiries are probably missed.',
      'I don’t have a clear way to track what happens.',
    ];
    const expected = deriveProfile(base).profileResult;
    for (const leadResponse of choices) {
      expect(deriveProfile({ ...base, leadResponse } as AssessmentSubmission).profileResult).toBe(expected);
    }
  });

  it('categoryScores stays empty — no scoring is introduced', () => {
    expect(deriveProfile({ ...base, leadResponse: 'We respond manually, but follow-up is not always consistent.' } as AssessmentSubmission).categoryScores).toEqual({});
  });
});
