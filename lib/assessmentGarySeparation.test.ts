import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { buildUserPrompt } from './anthropic';
import type { AssessmentSubmission } from './validation';

/**
 * Gary is an independent website assistant. He must never score, generate, rewrite,
 * validate, or influence an assessment result, and no Gary prompt, message, session, or
 * visitor answer may reach the answer-generation system. These are regression tests for
 * that boundary, not aspirations: the boundary holds today and this file fails loudly if
 * an import or a correlation value ever crosses it.
 */
const ANSWER_ENGINE_FILES = [
  'lib/anthropic.ts',
  'lib/resultValidator.ts',
  'lib/validation.ts',
  'lib/quizQuestions.ts',
  'lib/resend.ts',
  'lib/safeEmailContent.ts',
  'app/api/assessment/route.ts',
];

const repoRoot = path.resolve(__dirname, '..');

/**
 * Comments are stripped before the identifier scan: documenting why the boundary exists
 * (as several of these files do) is exactly what we want, whereas Gary appearing in real
 * code is what must never happen.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split(/\r?\n/)
    .map((line) => (/^\s*\/\//.test(line) ? '' : line))
    .join('\n');
}

const submission: AssessmentSubmission = {
  workSituation: 'Small business, 1-10 employees ($100K-$1M/yr)',
  searchVisibility: 'We show up sometimes, but competitors seem more visible',
  aiChallenge: "I'm excited about AI but overwhelmed by where to start",
  desiredOutcome: 'Make more money — increase revenue or cut costs',
  timeDrain: 'Answering calls & following up with leads quickly',
  privacyConcern: "Somewhat worried — I think about it, but it's not stopping me",
  industry: 'Construction & Trades (contractors, subs, home services)',
  leadResponse: 'We respond manually, but follow-up is not always consistent.',
  websiteConversion: 'Visitors can contact us, but the next step could be clearer',
  firstName: 'Taylor',
  lastName: 'Doe',
  businessName: 'Johnson Electric',
  email: 'taylor@example.com',
  websiteUrl: 'https://example.com',
  noWebsite: false,
  funnelCorrelationId: 'gary-session-9f3c2a11',
  consent: true,
  formLoadedAt: 1,
};

describe('Gary separation from the assessment answer engine', () => {
  it.each(ANSWER_ENGINE_FILES)('%s does not import anything under lib/gary', (relativePath) => {
    const source = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
    expect(source).not.toMatch(/from\s+['"](?:@\/lib\/gary|\.\/gary|\.\.\/lib\/gary|\.\/lib\/gary)/);
    expect(source).not.toMatch(/require\(\s*['"][^'"]*lib\/gary/);
  });

  it.each(ANSWER_ENGINE_FILES)('%s contains no Gary code outside of comments', (relativePath) => {
    const source = stripComments(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
    expect(source).not.toMatch(/\bgary\b/i);
  });

  it('never puts the Gary funnel correlation id into the generation prompt', () => {
    const prompt = buildUserPrompt(submission);
    expect(prompt).not.toContain('gary-session-9f3c2a11');
    expect(prompt).not.toMatch(/correlation/i);
    expect(prompt).not.toMatch(/\bgary\b/i);
  });

  it('builds the same prompt whether or not a Gary handoff correlation id is present', () => {
    const { funnelCorrelationId: _ignored, ...withoutCorrelation } = submission;
    expect(buildUserPrompt(submission)).toBe(buildUserPrompt(withoutCorrelation as AssessmentSubmission));
  });
});
