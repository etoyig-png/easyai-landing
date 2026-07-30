import { describe, expect, it } from 'vitest';
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

const ORIGINAL_TITLES: Record<string, string> = {
  workSituation: 'What best describes your work situation?',
  usingAiTools: 'Are you regularly using AI tools in your business?',
  aiChallenge: "What's your #1 AI challenge right now?",
  desiredOutcome: "What's the #1 outcome you're hoping AI can help you achieve?",
  timeDrain: 'Which area of your business eats up the most of your time?',
  privacyConcern: "When you think about using AI in your business, how worried are you about you and your customers' data privacy and security?",
  industry: 'What kind of business do you run?',
  sportsFan: 'Are you a sports fan? If so, which do you like more?',
};

describe('buildQuestions', () => {
  it('keeps Q1 (workSituation) and Q8 (sportsFan) unpersonalized regardless of business name', () => {
    const questions = buildQuestions('Johnson Electric');
    expect(questions[0].title).toBe(ORIGINAL_TITLES.workSituation);
    expect(questions[7].title).toBe(ORIGINAL_TITLES.sportsFan);
  });

  it('interpolates the business name into Q2-Q7 titles', () => {
    const questions = buildQuestions('Johnson Electric');
    const personalized = questions.slice(1, 7);
    for (const q of personalized) {
      expect(q.title).toContain('Johnson Electric');
    }
  });

  it('falls back to the original unpersonalized wording when business name is empty', () => {
    const questions = buildQuestions('');
    for (const key of Object.keys(ORIGINAL_TITLES)) {
      const q = questions.find((item) => item.key === key);
      expect(q?.title).toBe(ORIGINAL_TITLES[key]);
    }
  });

  it('preserves the exact option arrays, order, and allowOther flags for every question', () => {
    const questions = buildQuestions('Acme Co');
    expect(questions.map((q) => q.key)).toEqual([
      'workSituation',
      'usingAiTools',
      'aiChallenge',
      'desiredOutcome',
      'timeDrain',
      'privacyConcern',
      'industry',
      'sportsFan',
    ]);
    expect(questions[0].options).toEqual(WORK_SITUATION_OPTIONS);
    expect(questions[1].options).toEqual(USING_AI_TOOLS_OPTIONS);
    expect(questions[2].options).toEqual(AI_CHALLENGE_OPTIONS);
    expect(questions[3].options).toEqual(DESIRED_OUTCOME_OPTIONS);
    expect(questions[4].options).toEqual(TIME_DRAIN_OPTIONS);
    expect(questions[5].options).toEqual(PRIVACY_CONCERN_OPTIONS);
    expect(questions[6].options).toEqual(INDUSTRY_OPTIONS);
    expect(questions[7].options).toEqual(SPORTS_OPTIONS);
    expect(questions[6].allowOther).toBe(true);
    expect(questions.filter((q) => q.allowOther).map((q) => q.key)).toEqual(['industry']);
  });

  it('does not strip or mangle an HTML/script-like business name at the string level', () => {
    // XSS safety comes from React's JSX auto-escaping when `title` is rendered
    // as text content in page.tsx (never dangerouslySetInnerHTML) — this
    // function's only job is correct string interpolation, not sanitization.
    const malicious = '<script>alert(1)</script> Plumbing';
    const questions = buildQuestions(malicious);
    expect(questions[1].title).toContain(malicious);
  });

  it('interpolates punctuation-heavy business names cleanly', () => {
    const name = "O'Brien's Plumbing & Electric, LLC";
    const questions = buildQuestions(name);
    expect(questions[1].title).toBe(`Are you regularly using AI tools at ${name}?`);
  });
});
