import { describe, it, expect } from 'vitest';
import {
  buildQuestions,
  WORK_SITUATION_OPTIONS,
  USING_AI_TOOLS_OPTIONS,
  AI_CHALLENGE_OPTIONS,
  DESIRED_OUTCOME_OPTIONS,
  TIME_DRAIN_OPTIONS,
  PRIVACY_CONCERN_OPTIONS,
  INDUSTRY_OPTIONS,
  SPORTS_OPTIONS,
} from './quizQuestions';

/**
 * Protection contract for the ORIGINAL, finalized assessment.
 *
 * These assertions exist so the approved question set cannot drift again. Every option string
 * below is the approved wording; the only sanctioned change in the current pass is the single
 * time-drain option replacement, which is asserted explicitly rather than left loose.
 *
 * NOTE ON "LEGACY SCORING/PROFILES": this repository has no scoring engine, no profile types, and
 * no profile-assignment or recommendation-scoring logic. The only profile-shaped value is
 * `profileResult`, a passthrough of the desiredOutcome answer, and `categoryScores`, which is
 * always an empty object (see lib/gary/assessmentSync.ts). The contract that matters is therefore
 * "the new diagnostic answer must never feed those two values", which is asserted in
 * lib/gary/assessmentSync.test.ts.
 */
describe('assessment contract — approved question set', () => {
  it('asks exactly 9 questions, in the approved order', () => {
    expect(buildQuestions('Acme Co').map((q) => q.key)).toEqual([
      'workSituation',
      'usingAiTools',
      'aiChallenge',
      'desiredOutcome',
      'timeDrain',
      'privacyConcern',
      'industry',
      'leadResponse',
      'sportsFan',
    ]);
  });

  it('contains none of the rejected seven-question expansion keys', () => {
    const rejected = [
      'customerDiscovery',
      'searchVisibility',
      'websiteAction',
      'responseSpeed',
      'missedCalls',
      'followUpConsistency',
      'sensitiveInfo',
    ];
    const keys = buildQuestions('Acme Co').map((q) => q.key as string);
    for (const key of rejected) expect(keys).not.toContain(key);
  });

  it('preserves the approved answer choices for every original question', () => {
    expect(WORK_SITUATION_OPTIONS).toEqual([
      'Solopreneur, no employees (under $100K/yr)',
      'Small business, 1-10 employees ($100K-$1M/yr)',
      'Growing business, 10-50 employees ($1M-$5M/yr)',
      'Larger business, 50+ employees ($5M+/yr)',
      'Full-time employee, no business of my own',
    ]);
    expect(USING_AI_TOOLS_OPTIONS).toHaveLength(2);
    expect(AI_CHALLENGE_OPTIONS).toHaveLength(4);
    expect(DESIRED_OUTCOME_OPTIONS).toHaveLength(3);
    expect(PRIVACY_CONCERN_OPTIONS).toHaveLength(4);
    expect(INDUSTRY_OPTIONS).toHaveLength(7);
    expect(SPORTS_OPTIONS).toEqual(['Football', 'Basketball', 'Not really a sports fan']);
  });

  it('replaces only the marketing time-drain option, leaving the other four untouched', () => {
    expect(TIME_DRAIN_OPTIONS).toEqual([
      'Answering calls & following up with leads quickly',
      'Scheduling & appointments',
      'Invoicing, billing & payments',
      'Paperwork & documentation',
      'Finding more customers and generating a steady flow of qualified leads.',
    ]);
    expect(TIME_DRAIN_OPTIONS).not.toContain('Marketing, new customers & missed leads');
  });

  it('keeps the approved business-name personalization on the questions that had it', () => {
    const named = buildQuestions('Johnson Electric');
    const byKey = Object.fromEntries(named.map((q) => [q.key, q.title]));
    for (const key of ['usingAiTools', 'aiChallenge', 'desiredOutcome', 'timeDrain', 'privacyConcern', 'industry']) {
      expect(byKey[key]).toContain('Johnson Electric');
    }
    // These two were always unpersonalized and must stay that way.
    expect(byKey.workSituation).toBe('What best describes your work situation?');
    expect(byKey.sportsFan).toBe('Are you a sports fan? If so, which do you like more?');
  });

  it('only the industry question offers a write-in "other"', () => {
    expect(buildQuestions('Acme Co').filter((q) => q.allowOther).map((q) => q.key)).toEqual(['industry']);
  });

  it('asks the new lead-response question with the approved wording and choices', () => {
    const q = buildQuestions('Acme Co').find((item) => item.key === 'leadResponse');
    expect(q?.title).toBe('What usually happens after a potential customer contacts your business?');
    expect(q?.options).toEqual([
      'They receive a fast response and are tracked through the next step.',
      'We respond manually, but follow-up is not always consistent.',
      'Responses are sometimes delayed because our team is busy.',
      'Some calls, messages, or website inquiries are probably missed.',
      'I don’t have a clear way to track what happens.',
    ]);
  });

  it('totals 11 visitor-facing screens: intro + 9 questions + contact', () => {
    expect(1 + buildQuestions('').length + 1).toBe(11);
  });
});
