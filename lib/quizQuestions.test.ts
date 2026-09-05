import { describe, expect, it } from 'vitest';
import {
  buildQuestions,
  WORK_SITUATION_OPTIONS,
  SEARCH_VISIBILITY_OPTIONS,
  AI_CHALLENGE_OPTIONS,
  DESIRED_OUTCOME_OPTIONS,
  TIME_DRAIN_OPTIONS,
  PRIVACY_CONCERN_OPTIONS,
  INDUSTRY_OPTIONS,
  LEAD_RESPONSE_OPTIONS,
  WEBSITE_CONVERSION_OPTIONS,
} from './quizQuestions';

describe('buildQuestions', () => {
  it('keeps nine questions and covers both discovery and website conversion', () => {
    const questions = buildQuestions('Johnson Electric');
    expect(questions.map((q) => q.key)).toEqual([
      'workSituation',
      'searchVisibility',
      'aiChallenge',
      'desiredOutcome',
      'timeDrain',
      'privacyConcern',
      'industry',
      'leadResponse',
      'websiteConversion',
    ]);
    expect(questions).toHaveLength(9);
  });

  it('uses the approved option sets in the intended order', () => {
    const questions = buildQuestions('Acme Co');
    expect(questions[0].options).toEqual(WORK_SITUATION_OPTIONS);
    expect(questions[1].options).toEqual(SEARCH_VISIBILITY_OPTIONS);
    expect(questions[2].options).toEqual(AI_CHALLENGE_OPTIONS);
    expect(questions[3].options).toEqual(DESIRED_OUTCOME_OPTIONS);
    expect(questions[4].options).toEqual(TIME_DRAIN_OPTIONS);
    expect(questions[5].options).toEqual(PRIVACY_CONCERN_OPTIONS);
    expect(questions[6].options).toEqual(INDUSTRY_OPTIONS);
    expect(questions[7].options).toEqual(LEAD_RESPONSE_OPTIONS);
    expect(questions[8].options).toEqual(WEBSITE_CONVERSION_OPTIONS);
    expect(questions.filter((q) => q.allowOther).map((q) => q.key)).toEqual(['industry']);
  });

  it('personalizes the two new customer-opportunity questions', () => {
    const questions = buildQuestions('Johnson Electric');
    expect(questions[1].title).toContain('Johnson Electric');
    expect(questions[1].title).toContain('Google');
    expect(questions[1].title).toContain('AI');
    expect(questions[8].title).toContain("Johnson Electric's website");
  });

  it('uses clear generic wording before a business name is entered', () => {
    const questions = buildQuestions('');
    expect(questions[1].title).toBe(
      'When customers search Google or ask AI for the services you offer, how visible is your business?'
    );
    expect(questions[8].title).toBe(
      'When a potential customer visits your website, what usually happens next?'
    );
  });

  it('does not strip an HTML-like business name at the string level', () => {
    const malicious = '<script>alert(1)</script> Plumbing';
    expect(buildQuestions(malicious)[1].title).toContain(malicious);
  });
});
