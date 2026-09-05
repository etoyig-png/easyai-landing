import { describe, expect, it } from 'vitest';
import { buildWhyQuestion, validateResultHtml } from './resultValidator';

/**
 * Negative coverage, restored from 80e2c38. A validator that never fires is worthless, and a
 * validator that fires on legitimate copy is worse: it silently pushes every lead onto the
 * fallback. Each rule here is proven to catch a real violation AND proven not to fire on copy
 * the approved methodology actually requires.
 */
const submission = { businessName: 'Riverside Plumbing', firstName: 'Dana' };
const WHY = `<p>${buildWhyQuestion('Riverside Plumbing')}</p>`;
const wrap = (fragment: string) => `<h2>Dana, a quick read on Riverside Plumbing</h2>${fragment}${WHY}`;

describe('money-claim guard', () => {
  it.each([
    ['a monthly tool price', '<p>Most tools that fit run $40-60/month, not thousands.</p>'],
    ['a per-month price', '<p>Expect about $99 per month for what you need.</p>'],
    ['a savings figure', '<p>You could save $500 a month on admin work.</p>'],
    ['a revenue figure', '<p>That is roughly $12,000 in revenue over a year.</p>'],
    ['a bare return claim', '<p>The ROI on that change is worth thinking about.</p>'],
  ])('rejects %s', (_label, fragment) => {
    const result = validateResultHtml(wrap(fragment), submission);
    expect(result.valid).toBe(false);
    expect(result.violations.join(' ')).toMatch(/money\/ROI claim/);
  });

  it('allows qualitative cost reassurance with no figure', () => {
    const ok = wrap(
      "<p>On cost, this isn't the part where anyone tells you to buy something. Easy AI looks for practical improvements that fit how Riverside Plumbing already runs.</p>"
    );
    expect(validateResultHtml(ok, submission).violations).toEqual([]);
  });

  it("does not fire on the owner's own revenue band from their answers", () => {
    // workSituation legitimately contains bands like "$100K-$1M/yr". That is their data, not
    // an invented price, and must not be treated as a violation.
    const ok = wrap('<p>You told us Riverside Plumbing sits in the $100K-$1M range.</p>');
    expect(validateResultHtml(ok, submission).violations).toEqual([]);
  });
});

describe('false-audit guard', () => {
  it.each([
    ['a full audit claim', '<p>We ran a full audit of your website before writing this.</p>'],
    ['a scan claim', '<p>We scanned your site and found several issues.</p>'],
    ['a rankings claim', '<p>Your Google rankings are slipping in your area.</p>'],
    ['a metadata inspection claim', '<p>We checked your metadata and found gaps.</p>'],
  ])('rejects %s', (_label, fragment) => {
    const result = validateResultHtml(wrap(fragment), submission);
    expect(result.valid).toBe(false);
    expect(result.violations.join(' ')).toMatch(/audit\/inspection/);
  });

  it('still allows saying a website is not communicating clearly', () => {
    // Naming the symptom is permitted. Explaining the paid technical fix is what is not.
    const ok = wrap("<p>From the outside it isn't obvious what Riverside Plumbing does or which areas you serve.</p>");
    expect(validateResultHtml(ok, submission).violations).toEqual([]);
  });

  it('still allows the required Google + AI Presence invitation', () => {
    const ok = wrap(
      "<p>Easy AI measures how Riverside Plumbing shows up in Google and in Artificial Intelligence (AI) answers next to three local competitors. That's the Google + AI Presence (GAP) Score. This free read isn't that.</p>"
    );
    expect(validateResultHtml(ok, submission).violations).toEqual([]);
  });
});

describe('em dash and filler guards', () => {
  it('rejects an em dash', () => {
    expect(validateResultHtml(wrap('<p>Riverside Plumbing — a good business.</p>'), submission).violations).toContain('em dash present');
  });

  it('rejects representative artificial-sounding filler', () => {
    const result = validateResultHtml(
      wrap('<p>This will unlock game-changing growth and take your business to the next level with AI-powered solutions.</p>'),
      submission
    );
    expect(result.valid).toBe(false);
    expect(result.violations.filter((v) => v.includes('AI-slop phrase')).length).toBeGreaterThanOrEqual(3);
  });

  it('rejects canned empathy', () => {
    expect(validateResultHtml(wrap('<p>We completely understand your frustration.</p>'), submission).violations).toContain(
      'canned empathy instead of a specific observation'
    );
  });
});

describe('label rules are gone', () => {
  // The forced "Get found:" / "Get chosen:" / "Free action N:" rules were deliberately
  // removed. Prose that carries none of them is now valid, which is the whole point of the
  // recovered methodology.
  it('accepts a report with no framework labels at all', () => {
    const ok = wrap(
      "<p>Missed inquiries and an informational website create the same problem: interested customers can reach Riverside Plumbing and still disappear.</p><p>First, check your business details. Second, add one clear way to reach you. Third, log every inquiry for seven days.</p>"
    );
    expect(validateResultHtml(ok, submission).violations).toEqual([]);
  });
});

describe('internal system names stay blocked, GAP stays allowed', () => {
  it.each(['SmartSite', 'AIM Voice', 'the Digital GAP Scorecard', 'our Command Center', 'the Concierge'])(
    'rejects the internal name %s',
    (name) => {
      const result = validateResultHtml(wrap(`<p>Riverside Plumbing would benefit from ${name}.</p>`), submission);
      expect(result.violations.some((v) => v.includes('blocklisted brand'))).toBe(true);
    }
  );

  it('allows the now-public GAP Score', () => {
    const ok = wrap("<p>That's the Google + AI Presence (GAP) Score, and this free read isn't it.</p>");
    expect(validateResultHtml(ok, submission).violations).toEqual([]);
  });

  it('allows the ordinary lowercase words gap and aim', () => {
    const ok = wrap('<p>The gap here is what we aim to close first for Riverside Plumbing.</p>');
    expect(validateResultHtml(ok, submission).violations).toEqual([]);
  });
});

describe('business-name exemption', () => {
  it.each(['Smith Sports', 'Unlock Realty', 'Elevate Dental', 'ROI Advisors'])(
    'does not reject a business whose own name contains banned language: %s',
    (businessName) => {
      const custom = { businessName, firstName: 'Dana' };
      const html = `<h2>Dana, a quick read on ${businessName}</h2><p>Here is a plan for ${businessName}.</p><p>${buildWhyQuestion(businessName)}</p>`;
      expect(validateResultHtml(html, custom).violations).toEqual([]);
    }
  );

  it('still rejects the same language outside the business name', () => {
    const custom = { businessName: 'Unlock Realty', firstName: 'Dana' };
    const html = `<p>This plan will unlock new customers.</p><p>${buildWhyQuestion('Unlock Realty')}</p>`;
    expect(validateResultHtml(html, custom).violations.some((v) => v.includes('AI-slop phrase'))).toBe(true);
  });
});
