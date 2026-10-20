import { describe, it, expect } from 'vitest';
import { validateResultHtml, buildWhyQuestion } from './resultValidator';

/**
 * Negative coverage for the two rules added in the Action Plan audit: unsupported money claims
 * and claims that an audit/inspection was performed. A validator that never fires is worthless,
 * so each rule is proven to catch a real violation AND proven not to fire on legitimate copy.
 */
const submission = { businessName: 'Riverside Plumbing', firstName: 'Dana' };
const WHY = `<p>${buildWhyQuestion('Riverside Plumbing')}</p>`;
const wrap = (fragment: string) => `<h2>Hi Dana</h2>${fragment}${WHY}`;

describe('money-claim guard', () => {
  const violations = [
    ['a monthly tool price', '<p>Most tools that fit run $40-60/month, not thousands.</p>'],
    ['a per-month price', '<p>Expect about $99 per month for what you need.</p>'],
    ['a savings figure', '<p>You could save $500 a month on admin work.</p>'],
    ['an ROI figure', '<p>That is roughly $12,000 in revenue over a year.</p>'],
  ] as const;

  for (const [label, fragment] of violations) {
    it(`rejects ${label}`, () => {
      const result = validateResultHtml(wrap(fragment), submission);
      expect(result.valid).toBe(false);
      expect(result.violations.join(' ')).toMatch(/money\/ROI claim/);
    });
  }

  it('allows qualitative cost reassurance with no figure', () => {
    const ok = wrap(
      '<p>Easy AI looks for practical improvements that fit how Riverside Plumbing already runs, without handing you another system to babysit.</p>'
    );
    expect(validateResultHtml(ok, submission).valid).toBe(true);
  });

  it("does not fire on the owner's own revenue band from their answers", () => {
    // workSituation legitimately contains bands like "$100K-$1M/yr". That is their data, not an
    // invented price, and must not be treated as a violation.
    const ok = wrap('<p>You told us Riverside Plumbing sits in the $100K-$1M range.</p>');
    expect(validateResultHtml(ok, submission).valid).toBe(true);
  });
});

describe('false-audit guard', () => {
  const violations = [
    ['a full audit claim', '<p>We ran a full audit of your website before writing this.</p>'],
    ['a scan claim', '<p>We scanned your site and found several issues.</p>'],
    ['a rankings claim', '<p>Your Google rankings are slipping in your area.</p>'],
    ['a metadata inspection claim', '<p>We checked your metadata and found gaps.</p>'],
  ] as const;

  for (const [label, fragment] of violations) {
    it(`rejects ${label}`, () => {
      const result = validateResultHtml(wrap(fragment), submission);
      expect(result.valid).toBe(false);
      expect(result.violations.join(' ')).toMatch(/audit\/inspection/);
    });
  }

  it('still allows saying a website is not communicating clearly', () => {
    // Naming the symptom is permitted. Explaining the paid technical fix is what is not.
    const ok = wrap(
      '<p>From the outside it is not obvious what Riverside Plumbing does or which areas you serve.</p>'
    );
    expect(validateResultHtml(ok, submission).valid).toBe(true);
  });
});
