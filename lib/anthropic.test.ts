import { describe, expect, it } from 'vitest';
import {
  ASSESSMENT_SYSTEM_PROMPT,
  buildFallbackResultHtml,
  buildUserPrompt,
  rankCustomerLeak,
  stripLeakedPreamble,
} from './anthropic';
import { buildWhyQuestion, validateResultHtml } from './resultValidator';
import {
  AI_CHALLENGE_OPTIONS,
  DESIRED_OUTCOME_OPTIONS,
  INDUSTRY_OPTIONS,
  LEAD_RESPONSE_OPTIONS,
  PRIVACY_CONCERN_OPTIONS,
  SEARCH_VISIBILITY_OPTIONS,
  TIME_DRAIN_OPTIONS,
  WEBSITE_CONVERSION_OPTIONS,
} from './quizQuestions';
import type { AssessmentSubmission } from './validation';

const baseSubmission: AssessmentSubmission = {
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
  consent: true,
  formLoadedAt: 1,
};

/**
 * What the reader actually sees: tags stripped and entities decoded. Needed because an
 * escaped ampersand ("Construction &amp; Trades") carries a semicolon that never reaches the
 * reader, so punctuation rules have to be checked against the decoded text, not the markup.
 */
function toReaderText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('stripLeakedPreamble', () => {
  it('returns clean HTML output unchanged', () => {
    const clean = '<h2>Hi Taylor,</h2><p>Thanks for taking the assessment.</p>';
    expect(stripLeakedPreamble(clean)).toBe(clean);
  });

  it('strips leaked narration before the real greeting', () => {
    const leaked = 'No listing was confirmed. <h2>Hi Taylor,</h2><p>Body.</p>';
    expect(stripLeakedPreamble(leaked)).toBe('<h2>Hi Taylor,</h2><p>Body.</p>');
  });

  it('returns null when no HTML tag exists', () => {
    expect(stripLeakedPreamble('Just plain prose.')).toBeNull();
  });
});

describe('buildFallbackResultHtml', () => {
  it('escapes HTML-dangerous submitted fields', () => {
    const html = buildFallbackResultHtml({ ...baseSubmission, businessName: '<script>alert(1)</script>' });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });


  it('contains no em dash or en dash', () => {
    const html = buildFallbackResultHtml(baseSubmission);
    expect(html).not.toMatch(/—/);
    expect(html).not.toMatch(/–/);
  });

  it('never interpolates the free-text industry description into the report', () => {
    const html = buildFallbackResultHtml({
      ...baseSubmission,
      industry: 'Something else',
      industryOther: '<img src=x onerror=alert(1)>',
    });
    expect(html).not.toContain('onerror');
    expect(html).toMatch(/In most local businesses/);
  });
});

/**
 * The deterministic fallback is the only report that can be asserted on without a live model
 * call, so it doubles as the executable specification of the recovered methodology. The
 * approved golden email is enforced separately in lib/actionPlanGolden.test.ts; this suite
 * proves the fallback holds the contract across EVERY answer combination, which is what
 * caught the unescaped industry description and the Professional Services em dash.
 */
describe('deterministic report — recovered methodology across every answer', () => {
  it('passes the same validator the model output has to clear', () => {
    const result = validateResultHtml(buildFallbackResultHtml(baseSubmission), baseSubmission);
    expect(result.violations).toEqual([]);
    expect(result.valid).toBe(true);
  });

  // Several option lists carry characters or words the validator rejects: em dashes in the
  // outcome and privacy lists, and "but" inside two of the challenge and lead-response
  // options. A single happy-path fixture would not prove the fallback is safe for real
  // submissions.
  it.each([
    ['searchVisibility', SEARCH_VISIBILITY_OPTIONS],
    ['aiChallenge', AI_CHALLENGE_OPTIONS],
    ['desiredOutcome', DESIRED_OUTCOME_OPTIONS],
    ['timeDrain', TIME_DRAIN_OPTIONS],
    ['privacyConcern', PRIVACY_CONCERN_OPTIONS],
    ['industry', INDUSTRY_OPTIONS],
    ['leadResponse', LEAD_RESPONSE_OPTIONS],
    ['websiteConversion', WEBSITE_CONVERSION_OPTIONS],
  ] as const)('stays valid and on-standard for every %s answer', (key, options) => {
    for (const option of options) {
      const submission = {
        ...baseSubmission,
        [key]: option,
        ...(key === 'industry' && option === 'Something else' ? { industryOther: 'Mobile dog grooming' } : {}),
        ...(key === 'websiteConversion'
          ? option === 'We do not currently have a website'
            ? { noWebsite: true, websiteUrl: undefined }
            : { noWebsite: false, websiteUrl: 'https://example.com' }
          : {}),
      } as AssessmentSubmission;
      const html = buildFallbackResultHtml(submission);
      const text = toReaderText(html);
      expect(validateResultHtml(html, submission).violations, `${key} = ${option}`).toEqual([]);
      expect(html, `${key} = ${option}`).not.toMatch(/[—–]/);
      expect(text, `${key} = ${option}`).not.toMatch(/;/);
      expect(text, `${key} = ${option}`).not.toMatch(/Get found:|Get chosen:|Free action \d/i);
      expect(text, `${key} = ${option}`).not.toMatch(/\b(?:FEEL|FELT|FOUND)\b/);
      expect(text.trim().endsWith(buildWhyQuestion(submission.businessName)), `${key} = ${option}`).toBe(true);
    }
  });

  it('applies Feel, Felt and Found without ever printing the labels', () => {
    const html = buildFallbackResultHtml(baseSubmission);
    // Feel: their own challenge answer, quoted back once rather than recited.
    expect(html).toContain(baseSubmission.aiChallenge);
    // Felt: normalized impersonally, with no claim that anyone at Easy AI spoke to owners.
    expect(html).toMatch(/That kind of concern is common among owners/);
    expect(html).not.toMatch(/owners i(?:'ve| have)? spoken/i);
    // Found: a ranked leak turned into actions.
    expect(html).toMatch(/leak worth closing|leak worth closing first/i);
    for (const label of [/\bFEEL\b/, /\bFELT\b/, /\bFOUND\b/, />\s*Feel:/, />\s*Felt:/, />\s*Found:/]) {
      expect(html).not.toMatch(label);
    }
  });

  it('ranks one area rather than grading both evenly', () => {
    expect(rankCustomerLeak(baseSubmission)).toBe('conversion');
    expect(
      rankCustomerLeak({
        ...baseSubmission,
        searchVisibility: 'We rarely show up when customers search or ask AI for businesses like ours',
        websiteConversion: 'Visitors have one clear action, and we can track what happens next',
        leadResponse: 'They receive a fast response and are tracked through the next step.',
      })
    ).toBe('discovery');
  });

  it('covers discovery, contact path, and seven-day tracking in three prose actions', () => {
    const text = buildFallbackResultHtml(baseSubmission).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const section = text.match(/Three things you can do this week, free(.*?)On cost/)?.[1] ?? '';
    expect(section).toMatch(/First, check that your hours/);
    expect(section).toMatch(/Second, put one clear way to reach/);
    expect(section).toMatch(/Third, log every call/);
    expect(section).not.toMatch(/\bFourth\b/);
  });

  it('rewrites the second action when the owner has no website', () => {
    const noWebsite = {
      ...baseSubmission,
      websiteConversion: 'We do not currently have a website',
      noWebsite: true,
      websiteUrl: undefined,
    } as AssessmentSubmission;
    const html = buildFallbackResultHtml(noWebsite);
    expect(html).toMatch(/sits at the top of your business listing/);
    expect(html).not.toMatch(/near the top of your website/);
  });

  it('teaches none of the paid Google + AI Presence method in the free actions', () => {
    const text = buildFallbackResultHtml(baseSubmission).toLowerCase();
    for (const term of ['schema', 'metadata', 'keyword', 'competitor analysis', 'structured data', 'which three competitors']) {
      expect(text).not.toContain(term);
    }
  });

  it('delivers every piece of advice before Easy AI is named', () => {
    const all = buildFallbackResultHtml(baseSubmission).replace(/<[^>]+>/g, ' ').trim().split(/\s+/);
    expect(all.findIndex((word) => word.startsWith('Easy'))).toBeGreaterThan(all.length * 0.6);
  });

  it('offers the Google + AI Presence Score softly, spelled out, never as something performed', () => {
    const html = buildFallbackResultHtml(baseSubmission);
    expect(html).toContain('Artificial Intelligence (AI)');
    expect(html.indexOf('Artificial Intelligence (AI)')).toBeLessThan(html.indexOf('(GAP) Score'));
    expect(html).toMatch(/This free read isn't that/);
    expect(html).not.toMatch(/\baudit/i);
  });

  it('makes no promise about rankings, leads, revenue, or savings', () => {
    const html = buildFallbackResultHtml(baseSubmission);
    expect(html).not.toMatch(/\b(?:guarantee|guaranteed|will rank|you will get more (?:leads|customers))\b/i);
    expect(html).not.toMatch(/[$£€]\s?\d/);
  });
});

/**
 * Test 9 of the agreed writing-standard suite: the rules have to live in the prompt, not only
 * in the validator. This catches silent prompt drift, which is how the money-reassurance beat
 * and the invisible-arc rule were lost the first time (53593a3, 9e41e7f).
 */
describe('system prompt carries the recovered writing standard', () => {
  it.each([
    ['no em dashes', 'Do NOT use em dashes'],
    ['the invisible arc', 'The arc must be invisible'],
    ['no Get found or Get chosen labels', 'Never write "Get found", "Get chosen"'],
    ['no numbered free-action labels', 'never write "Free action"'],
    ['a single ranked leak', 'Name the SINGLE largest customer leak'],
    ['evidence versus assumption', 'Separate evidence from assumption'],
    ['no invented founder experience', 'Never claim that anyone at Easy AI has personally spoken'],
    ['advice before Easy AI is named', 'Deliver all of the advice before Easy AI is named'],
    ['acronyms spelled out', 'Spell out an acronym in full the first time it appears'],
    ['contractions used naturally', 'Use contractions naturally'],
    ['no three-fragment runs', 'Never write three sentence fragments in a row'],
    ['the approved word band', 'Target 450 to 525 words'],
    ['the protected-methodology ban', 'That method is paid work'],
    ['no search tool', 'You have no search tool in this task'],
  ])('states the rule for %s', (_label, rule) => {
    expect(ASSESSMENT_SYSTEM_PROMPT).toContain(rule);
  });

  it('no longer asks the model to run a web search', () => {
    expect(ASSESSMENT_SYSTEM_PROMPT).not.toMatch(/use web search/i);
    expect(buildUserPrompt(baseSubmission)).not.toMatch(/use web search/i);
    expect(buildUserPrompt(baseSubmission)).toContain('You have no search tool');
  });
});
