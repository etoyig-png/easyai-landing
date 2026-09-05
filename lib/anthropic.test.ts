import { describe, expect, it } from 'vitest';
import { buildFallbackResultHtml, stripLeakedPreamble } from './anthropic';
import { validateResultHtml } from './resultValidator';
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

  it('answers both customer-opportunity gaps', () => {
    const html = buildFallbackResultHtml(baseSubmission);
    expect(html).toContain('<strong>Get found:</strong>');
    expect(html).toContain('<strong>Get chosen:</strong>');
    expect(html).toContain('GAP Score');
  });

  it('contains exactly three free actions and the exact final WHY question', () => {
    const html = buildFallbackResultHtml(baseSubmission);
    expect(html.match(/Free action [1-3]:/g)).toHaveLength(3);
    expect(html).not.toMatch(/\$40|football/i);
    expect(html.trim()).toMatch(/One final question worth thinking about: What made you build Johnson Electric, and what do you want the business to make possible for you\?<\/p>$/);
  });

  it('contains no em dash or en dash', () => {
    const html = buildFallbackResultHtml(baseSubmission);
    expect(html).not.toMatch(/—/);
    expect(html).not.toMatch(/–/);
  });
});

/**
 * The fallback is the only report we can assert on deterministically (no live Claude call
 * is ever made in tests), so it doubles as the executable specification of the methodology
 * the system prompt asks the model for.
 */
describe('Feel-Felt-Found methodology in the deterministic report', () => {
  it('passes the same validator the model output has to clear', () => {
    const result = validateResultHtml(buildFallbackResultHtml(baseSubmission), baseSubmission);
    expect(result.violations).toEqual([]);
    expect(result.valid).toBe(true);
  });

  // Every option list is exercised because several of them carry characters or words the
  // validator rejects (em dashes in the outcome and privacy lists, "but" inside two of the
  // challenge and lead-response options), so a single happy-path fixture would not prove
  // the fallback is safe for real submissions.
  it.each([
    ['searchVisibility', SEARCH_VISIBILITY_OPTIONS],
    ['aiChallenge', AI_CHALLENGE_OPTIONS],
    ['desiredOutcome', DESIRED_OUTCOME_OPTIONS],
    ['timeDrain', TIME_DRAIN_OPTIONS],
    ['privacyConcern', PRIVACY_CONCERN_OPTIONS],
    ['industry', INDUSTRY_OPTIONS],
    ['leadResponse', LEAD_RESPONSE_OPTIONS],
    ['websiteConversion', WEBSITE_CONVERSION_OPTIONS],
  ] as const)('stays valid for every %s answer', (key, options) => {
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
      const result = validateResultHtml(buildFallbackResultHtml(submission), submission);
      expect(result.violations, `${key} = ${option}`).toEqual([]);
    }
  });

  it('never interpolates the free-text industry description into the report', () => {
    const html = buildFallbackResultHtml({
      ...baseSubmission,
      industry: 'Something else',
      industryOther: '<img src=x onerror=alert(1)>',
    });
    expect(html).not.toContain('onerror');
    expect(html).toContain('businesses like yours');
  });

  it('follows the required report flow in order', () => {
    const html = buildFallbackResultHtml(baseSubmission);
    const order = [
      'Hi Taylor,',
      '<strong>Get found:</strong>',
      '<strong>Get chosen:</strong>',
      '<strong>Free action 1:</strong>',
      '<strong>Free action 2:</strong>',
      '<strong>Free action 3:</strong>',
      'Google + AI Presence Score',
      'One final question worth thinking about:',
    ];
    const positions = order.map((marker) => html.indexOf(marker));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('applies Feel, Felt and Found without ever printing the labels', () => {
    const html = buildFallbackResultHtml(baseSubmission);
    // Feel: their own challenge answer, quoted back verbatim.
    expect(html).toContain(baseSubmission.aiChallenge);
    // Felt: normalized inside their industry, with no invented customer or testimonial.
    expect(html).toMatch(/normal place to be/);
    // industryLabel output is escaped for a text node, so the ampersand arrives as &amp;.
    expect(html).toMatch(/construction &amp; trades businesses/i);
    // Found: the lesson split across the two diagnoses and turned into actions.
    expect(html).toContain('getting found and getting chosen');
    for (const label of [/\bFEEL\b/, /\bFELT\b/, /\bFOUND\b/, />\s*Feel:/, />\s*Felt:/, />\s*Found:/]) {
      expect(html).not.toMatch(label);
    }
  });

  it('covers discovery, website conversion, and seven-day tracking across the three actions', () => {
    const html = buildFallbackResultHtml(baseSubmission);
    const actions = html.split(/<strong>Free action [1-3]:<\/strong>/).slice(1);
    expect(actions).toHaveLength(3);
    expect(actions[0]).toMatch(/search|google|ai assistant/i);
    expect(actions[1]).toMatch(/website|form|call, book, or request information/i);
    expect(actions[2]).toMatch(/seven days/i);
    // Each action has to say what to do, how to do it, and what to observe, so none of
    // them can be a single throwaway instruction.
    for (const action of actions) {
      expect(action.trim().split(/(?<=\.)\s+/).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('offers the Google + AI Presence Score as an optional next step and spells it out before shortening it', () => {
    const html = buildFallbackResultHtml(baseSubmission);
    expect(html.indexOf('Google + AI Presence Score')).toBeLessThan(html.indexOf('GAP Score'));
    expect(html).toMatch(/This free assessment points you in a direction/);
    expect(html).not.toMatch(/\baudit/i);
  });

  it('makes no promise about rankings, leads, revenue, or savings', () => {
    const html = buildFallbackResultHtml(baseSubmission);
    expect(html).not.toMatch(/\b(?:guarantee|guaranteed|will rank|more revenue for you|you will get more (?:leads|customers))\b/i);
  });
});
