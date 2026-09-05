import { describe, expect, it } from 'vitest';
import { buildFallbackResultHtml, stripLeakedPreamble } from './anthropic';
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
