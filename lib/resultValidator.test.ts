import { describe, expect, it } from 'vitest';
import { buildWhyQuestion, validateResultHtml } from './resultValidator';

const submission = { businessName: 'Johnson Electric', firstName: 'Taylor' };

function withWhyQuestion(body: string): string {
  return `${body}<p>Get found: Review visibility.</p><p>Get chosen: Review the website path.</p><p>Free action 1: Write down the process.</p><p>Free action 2: Draft a response.</p><p>Free action 3: Track the next step.</p><p>${buildWhyQuestion(submission.businessName)}</p>`;
}

describe('validateResultHtml', () => {
  it('passes clean, compliant HTML', () => {
    const html = withWhyQuestion(
      '<h2>Hi Taylor,</h2><p>Thanks for walking through the assessment for Johnson Electric. Johnson Electric came through clearly. Taylor, this is common at Johnson Electric.</p>'
    );
    const result = validateResultHtml(html, submission);
    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('flags an em dash', () => {
    const html = withWhyQuestion('<p>Johnson Electric — a great business.</p>');
    expect(validateResultHtml(html, submission).violations).toContain('em dash present');
  });

  it('flags an en dash', () => {
    const html = withWhyQuestion('<p>Monday–Friday hours at Johnson Electric.</p>');
    expect(validateResultHtml(html, submission).violations).toContain('en dash present');
  });

  it('catches a leaked research-status paragraph even when wrapped inside an HTML tag', () => {
    // This is the real production leak: the narration is comma-spliced INSIDE the
    // same <p> as the greeting, so stripping "before the first tag" never sees it.
    const html = withWhyQuestion(
      "<p>I searched but couldn't confirm anything verifiable about this specific business, so I've kept the hook centered on Taylor's name, business name, and trade, no invented details. Taylor, here's what stood out from your assessment for Johnson Electric.</p>"
    );
    const result = validateResultHtml(html, submission);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes('narration'))).toBe(true);
  });

  it('catches other narration-leak phrasings', () => {
    const html = withWhyQuestion('<p>No verifiable public listing was found for Johnson Electric, so here is what stood out.</p>');
    expect(validateResultHtml(html, submission).violations.some((v) => v.includes('narration'))).toBe(true);
  });

  it('flags prohibited AI-writing phrases', () => {
    const html = withWhyQuestion("<p>You're in good company at Johnson Electric.</p>");
    expect(validateResultHtml(html, submission).violations.some((v) => v.includes('prohibited AI phrase'))).toBe(true);
  });

  it('flags the "not X, but Y" construction', () => {
    const html = withWhyQuestion('<p>This is not a guarantee, but a possibility for Johnson Electric.</p>');
    expect(validateResultHtml(html, submission).violations.some((v) => v.includes('not X, but Y'))).toBe(true);
  });

  it('flags blocklisted brand names', () => {
    const html = withWhyQuestion('<p>Johnson Electric could use GoHighLevel to manage leads.</p>');
    expect(validateResultHtml(html, submission).violations.some((v) => v.includes('blocklisted brand'))).toBe(true);
  });

  it('flags invented Easy AI client claims', () => {
    const html = withWhyQuestion('<p>Our clients at Johnson Electric type businesses have seen great results.</p>');
    expect(validateResultHtml(html, submission).violations.some((v) => v.includes('client claim'))).toBe(true);
  });

  it('flags injected/unescaped script content', () => {
    const html = withWhyQuestion('<p>Welcome to <script>alert(1)</script> Johnson Electric.</p>');
    expect(validateResultHtml(html, submission).violations.some((v) => v.includes('injected'))).toBe(true);
  });

  it('flags a missing WHY question', () => {
    const html = withWhyQuestion('<h2>Hi Taylor,</h2><p>Thanks for the assessment, Johnson Electric.</p>').replace(`<p>${buildWhyQuestion(submission.businessName)}</p>`, '');
    expect(validateResultHtml(html, submission).violations).toContain('missing mandatory closing WHY question');
  });

  it('flags a duplicated WHY question', () => {
    const why = buildWhyQuestion(submission.businessName);
    const html = withWhyQuestion(`<p>${why}</p>`);
    expect(validateResultHtml(html, submission).violations).toContain('duplicate WHY question');
  });

  it('flags the WHY question when it is not the final paragraph', () => {
    const html = `${withWhyQuestion('')}<p>One more thought after it.</p>`;
    expect(validateResultHtml(html, submission).violations).toContain('WHY question is not the final narrative paragraph');
  });

  it('requires one diagnosis for both discovery and website conversion', () => {
    const html = withWhyQuestion('<p>Body.</p>').replace('<p>Get chosen: Review the website path.</p>', '');
    expect(validateResultHtml(html, submission).violations).toContain('must contain exactly one Get chosen diagnosis');
  });

  it('requires exactly one of each of three labeled free actions', () => {
    const why = `<p>${buildWhyQuestion(submission.businessName)}</p>`;
    expect(validateResultHtml(`<p>Free action 1: One.</p><p>Free action 2: Two.</p>${why}`, submission).violations).toContain('must contain exactly three free actions');
    expect(validateResultHtml(`<p>Free action 1: One.</p><p>Free action 2: Two.</p><p>Free action 3: Three.</p><p>Free action 4: Four.</p>${why}`, submission).violations).toContain('must contain exactly three free actions');
  });

  it('rejects unsupported money, audit, and sports content', () => {
    for (const content of ['It costs $40 monthly.', 'We completed a business audit.', 'Use a football strategy.']) {
      expect(validateResultHtml(withWhyQuestion(`<p>${content}</p>`), submission).violations.some((v) => v.includes('unsupported money'))).toBe(true);
    }
  });

  it.each(['Smith Sports', 'ROI Advisors', 'Audit Partners', '$40 Studio'])(
    'allows claim-pattern language in the business name only inside the required WHY question: %s',
    (businessName) => {
      const customSubmission = { ...submission, businessName };
      const html = [
        '<p>Here is a safe plan for your business.</p>',
        '<p>Get found: Review visibility.</p>',
        '<p>Get chosen: Review the website path.</p>',
        '<p>Free action 1: Write down the process.</p>',
        '<p>Free action 2: Draft a response.</p>',
        '<p>Free action 3: Track the next step.</p>',
        `<p>${buildWhyQuestion(businessName)}</p>`,
      ].join('');
      expect(validateResultHtml(html, customSubmission).violations).toEqual([]);
    }
  );

  it.each(['sports', 'ROI', 'business audit', '$40'])(
    'still rejects claim-pattern language everywhere before the WHY question: %s',
    (unsafeContent) => {
      expect(validateResultHtml(withWhyQuestion(`<p>${unsafeContent}</p>`), submission).violations.some((v) => v.includes('unsupported money'))).toBe(true);
    }
  );

  it.each([
    'This will unlock new customers for Johnson Electric.',
    'You can leverage what you already have.',
    'This is a game-changing shift.',
    'A revolutionary way to answer the phone.',
    'The result is transformative for your week.',
    'A cutting-edge approach to scheduling.',
    'The handoff should feel seamless.',
    'You need a robust follow-up process.',
    'This will supercharge your follow-up.',
    'Steps that elevate your business quickly.',
    'Time to take your business to the next level.',
    "In today's digital landscape, discovery matters.",
    "In today's fast-paced world, speed wins.",
    'You can harness the power of AI here.',
    'AI-powered solutions handle the intake.',
    'This will streamline your operations.',
    'A plan to maximize your potential.',
    'Ready to embark on a journey with AI.',
    'We build tailored solutions for owners.',
    'Here are some valuable insights from your answers.',
    'These steps drive growth over time.',
    'This helps you stay ahead of the curve.',
    'From there, the possibilities are endless.',
  ])('rejects representative AI-slop language: %s', (slop) => {
    const result = validateResultHtml(withWhyQuestion(`<p>${slop}</p>`), submission);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes('AI-slop phrase'))).toBe(true);
  });

  it('rejects canned empathy instead of a specific observation', () => {
    const html = withWhyQuestion('<p>We completely understand your frustration with all of this.</p>');
    expect(validateResultHtml(html, submission).violations).toContain('canned empathy instead of a specific observation');
  });

  it.each([
    'We searched Google and your listing is thin.',
    'We compared your website against three local competitors.',
    'After reviewing your Google Business Profile, one thing stood out.',
    'Based on our analysis, discovery is the weak point.',
    'Your Google rankings show a steady decline.',
    'You rank below two nearby shops.',
    'Your Google + AI Presence Score is 42 out of 100.',
    'Competitor analysis revealed a gap in reviews.',
    'We confirmed that your contact form is broken.',
  ])('rejects fabricated search, competitor, or verified-audit claims: %s', (claim) => {
    const result = validateResultHtml(withWhyQuestion(`<p>${claim}</p>`), submission);
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes('fabricated search'))).toBe(true);
  });

  it('still allows offering the Google + AI Presence Score as an optional next step', () => {
    const html = withWhyQuestion(
      "<p>Easy AI's verified Google + AI Presence Score, which we shorten to GAP Score, can test how Johnson Electric shows up in Google and AI answers against three local competitors. This free assessment points you in a direction. It is not that completed review.</p>"
    );
    expect(validateResultHtml(html, submission).violations).toEqual([]);
  });

  it('does not reject honest phrasing about the answers the visitor supplied', () => {
    const html = withWhyQuestion('<p>We reviewed your answers and one theme repeats across all nine of them.</p>');
    expect(validateResultHtml(html, submission).violations).toEqual([]);
  });

  it.each(['Unlock Realty', 'Elevate Dental', 'Robust Roofing', 'Seamless Movers'])(
    'does not reject a business whose own name contains banned marketing language: %s',
    (businessName) => {
      const customSubmission = { ...submission, businessName };
      const html = [
        `<p>Here is a plan for ${businessName}.</p>`,
        '<p>Get found: Review visibility.</p>',
        '<p>Get chosen: Review the website path.</p>',
        '<p>Free action 1: Write down the process.</p>',
        '<p>Free action 2: Draft a response.</p>',
        '<p>Free action 3: Track the next step for seven days.</p>',
        `<p>${buildWhyQuestion(businessName)}</p>`,
      ].join('');
      expect(validateResultHtml(html, customSubmission).violations).toEqual([]);
    }
  );

  it('still rejects banned marketing language outside the business name', () => {
    const customSubmission = { ...submission, businessName: 'Unlock Realty' };
    const html = [
      '<p>This plan will unlock new customers.</p>',
      '<p>Get found: Review visibility.</p>',
      '<p>Get chosen: Review the website path.</p>',
      '<p>Free action 1: Write down the process.</p>',
      '<p>Free action 2: Draft a response.</p>',
      '<p>Free action 3: Track the next step for seven days.</p>',
      `<p>${buildWhyQuestion('Unlock Realty')}</p>`,
    ].join('');
    expect(validateResultHtml(html, customSubmission).violations.some((v) => v.includes('AI-slop phrase'))).toBe(true);
  });

  it('counts business-name mentions', () => {
    const html = withWhyQuestion(
      '<p>Johnson Electric is doing well. Johnson Electric grows fast. We love Johnson Electric. Taylor built Johnson Electric from scratch.</p>'
    );
    // 4 mentions in the body + 1 inside the WHY question = 5.
    expect(validateResultHtml(html, submission).businessNameMentionCount).toBe(5);
  });
});

describe('buildWhyQuestion', () => {
  it('substitutes the business name into the exact required sentence', () => {
    expect(buildWhyQuestion('Johnson Electric')).toBe(
      'One final question worth thinking about: What made you build Johnson Electric, and what do you want the business to make possible for you?'
    );
  });

  it('escapes HTML-dangerous characters in the business name without entity-encoding quotes', () => {
    expect(buildWhyQuestion("<Bob's> Plumbing")).toBe(
      "One final question worth thinking about: What made you build &lt;Bob's&gt; Plumbing, and what do you want the business to make possible for you?"
    );
  });
});
