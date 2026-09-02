import { describe, expect, it } from 'vitest';
import { buildFallbackResultHtml, stripLeakedPreamble } from './anthropic';
import type { AssessmentSubmission } from './validation';

const baseSubmission: AssessmentSubmission = {
  workSituation: 'Small business, 1-10 employees ($100K-$1M/yr)',
  usingAiTools: "No — played around with AI, but it hasn't become part of my routine yet",
  aiChallenge: "I'm excited about AI but overwhelmed by where to start",
  desiredOutcome: 'Make more money — increase revenue or cut costs',
  timeDrain: 'Answering calls & following up with leads quickly',
  privacyConcern: 'Somewhat worried — I think about it, but it\'s not stopping me',
  industry: 'Construction & Trades (contractors, subs, home services)',
  leadResponse: 'We respond manually, but follow-up is not always consistent.',
  sportsFan: 'Not really a sports fan',
  firstName: 'Taylor',
  lastName: 'Doe',
  businessName: 'Johnson Electric',
  email: 'taylor@example.com',
  noWebsite: true,
  consent: true,
  formLoadedAt: 1,
};

describe('stripLeakedPreamble', () => {
  it('returns clean HTML output unchanged', () => {
    const clean = '<h2>Hi Taylor,</h2><p>Thanks for taking the assessment.</p>';
    expect(stripLeakedPreamble(clean)).toBe(clean);
  });

  it('strips a leaked reasoning sentence comma-spliced before the real greeting', () => {
    const leaked =
      "No verifiable public listing for this specific business turned up, so I've kept the hook centered on their name, industry, and assessment answers rather than inventing details. <h2>Toy, here's what stood out from your assessment</h2><p>Thanks for taking the time...</p>";
    const result = stripLeakedPreamble(leaked);
    expect(result).not.toBeNull();
    expect(result).toMatch(/^<h2>/);
    expect(result).not.toContain('No verifiable public listing');
  });

  it('strips leading whitespace/narration across multiple sentences before the first tag', () => {
    const leaked = "I'll start with the search, then write the email. No listing was found.\n\n<h2>Hi Jordan,</h2><p>Body.</p>";
    const result = stripLeakedPreamble(leaked);
    expect(result).toMatch(/^<h2>/);
  });

  it('returns null when no HTML tag exists anywhere (unsalvageable)', () => {
    expect(stripLeakedPreamble('Just plain prose with no tags at all.')).toBeNull();
  });
});

describe('buildFallbackResultHtml', () => {
  it('escapes HTML-dangerous characters in submitted fields', () => {
    const html = buildFallbackResultHtml({ ...baseSubmission, businessName: '<script>alert(1)</script>' });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('contains no em dash or en dash', () => {
    const html = buildFallbackResultHtml(baseSubmission);
    expect(html).not.toMatch(/—/);
    expect(html).not.toMatch(/–/);
  });

  it('keeps ordinary apostrophes in business names literal, not entity-encoded', () => {
    const html = buildFallbackResultHtml({ ...baseSubmission, businessName: "Bob's Plumbing" });
    expect(html).toContain("Bob's Plumbing");
  });

  it('contains exactly three free actions, no unsupported money claim, and the exact final WHY question', () => {
    const html = buildFallbackResultHtml({ ...baseSubmission, sportsFan: 'Football', favoriteTeam: 'Lions' });
    expect(html.match(/Free action [1-3]:/g)).toHaveLength(3);
    expect(html).not.toMatch(/\$40|football|Lions/i);
    expect(html.trim()).toMatch(/One final question worth thinking about: What made you build Johnson Electric, and what do you want the business to make possible for you\?<\/p>$/);
  });
});
