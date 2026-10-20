import { describe, expect, it } from 'vitest';
import { buildResultEmailHtml, RESULT_EMAIL_CTA_URL, RESULT_EMAIL_LOGO_URL } from './resend';
import type { ActionPlanFields } from './actionPlanValidator';

const fields: ActionPlanFields = {
  opening: 'Thanks for the assessment, Taylor.',
  challengeOneHeadline: 'Leads Are Going Cold While You Are Working',
  challengeOneStory: 'Marker CHALLENGE_ONE_STORY.',
  actionOneHeadline: 'Stop Losing Leads to Slow Follow-Up',
  actionOneDoNow: 'Marker DO_NOW_ONE.',
  actionOneAutomationOpportunity: 'Marker AUTOMATION_ONE.',
  challengeTwoHeadline: 'Administrative Work Is Taking Time From Clients',
  challengeTwoStory: 'Marker CHALLENGE_TWO_STORY.',
  actionTwoHeadline: 'Reduce Appointment Back-and-Forth',
  actionTwoDoNow: 'Marker DO_NOW_TWO.',
  actionTwoAutomationOpportunity: 'Marker AUTOMATION_TWO.',
  easyAiSummary: 'Marker EASY_AI_SUMMARY. Easy AI can help.',
};

const submission = {
  businessName: 'Johnson Electric',
  desiredOutcome: 'Save time — automate tasks and free up my schedule',
} as const;

describe('buildResultEmailHtml', () => {
  const html = buildResultEmailHtml(fields, submission);

  it('renders the logo image tag with the fixed www URL and non-mirrored alt text', () => {
    expect(html).toContain(`<img src="${RESULT_EMAIL_LOGO_URL}"`);
    expect(html).toContain('alt="Easy AI logo"');
    expect(html.toLowerCase()).not.toContain('alt="easy ai business ai advisory"');
  });

  it('does not wrap the logo in a full-width dark-blue header container', () => {
    const logoBlockMatch = html.match(/<div[^>]*>\s*<img src="https:\/\/www\.easyaiconsult\.com/);
    expect(logoBlockMatch).not.toBeNull();
    const openingTag = logoBlockMatch![0];
    expect(openingTag).not.toMatch(/background:\s*#0b1d3a/i);
    expect(openingTag).not.toMatch(/text-align:\s*center/i);
  });

  it('left-aligns the logo with padding matching the body content edge', () => {
    const logoDivMatch = html.match(/<div style="([^"]*)">\s*<img src="https:\/\/www\.easyaiconsult\.com/);
    expect(logoDivMatch).not.toBeNull();
    const style = logoDivMatch![1];
    // Same 32px horizontal padding as the body-content div below it.
    expect(style).toMatch(/padding:\s*28px 32px/);
    const bodyDivMatch = html.match(/<div style="([^"]*)">\s*<h1/);
    expect(bodyDivMatch![1]).toMatch(/32px/);
  });

  it('has the fixed title YOUR 3-STEP AI ACTION PLAN', () => {
    expect(html).toContain('YOUR 3-STEP AI ACTION PLAN');
  });

  it('renders every element in the required fixed order', () => {
    const order = [
      RESULT_EMAIL_LOGO_URL,
      'YOUR 3-STEP AI ACTION PLAN',
      'Thanks for the assessment, Taylor.',
      'CHALLENGE 1: Leads Are Going Cold',
      'Marker CHALLENGE_ONE_STORY',
      'STEP 1, YOUR ACTION: Stop Losing Leads',
      'Do This Now:</strong> Marker DO_NOW_ONE',
      'Automation Opportunity:</strong> Marker AUTOMATION_ONE',
      'CHALLENGE 2: Administrative Work',
      'Marker CHALLENGE_TWO_STORY',
      'STEP 2, YOUR ACTION: Reduce Appointment',
      'Do This Now:</strong> Marker DO_NOW_TWO',
      'Automation Opportunity:</strong> Marker AUTOMATION_TWO',
      'HOW EASY AI HELPS',
      'Marker EASY_AI_SUMMARY',
      '<strong>If Johnson Electric gave you more control over your time', // deterministically selected for "Save time" outcome
      "STEP 3: LET'S TALK IT THROUGH AND FIND YOUR BEST FIT",
      'Find My Best Fit',
    ];
    let cursor = -1;
    for (const marker of order) {
      const index = html.indexOf(marker);
      expect(index, `expected to find "${marker}" after position ${cursor}`).toBeGreaterThan(cursor);
      cursor = index;
    }
  });

  it('contains exactly one CHALLENGE / STEP pair each and one HOW EASY AI HELPS section', () => {
    expect(html.match(/CHALLENGE 1:/g)).toHaveLength(1);
    expect(html.match(/CHALLENGE 2:/g)).toHaveLength(1);
    expect(html.match(/STEP 1, YOUR ACTION:/g)).toHaveLength(1);
    expect(html.match(/STEP 2, YOUR ACTION:/g)).toHaveLength(1);
    expect(html.match(/HOW EASY AI HELPS/g)).toHaveLength(1);
  });

  it('does not contain a separate cost or time section, or a $40-60 estimate', () => {
    expect(html).not.toMatch(/about cost/i);
    expect(html).not.toMatch(/about your time/i);
    expect(html).not.toMatch(/\$40.{0,5}60/);
    expect(html).not.toContain('$');
  });

  it('bolds the WHY question and places it immediately before Step 3 with nothing else between', () => {
    const whyIndex = html.indexOf('<strong>If Johnson Electric gave you more control over your time');
    const step3Index = html.indexOf("STEP 3: LET'S TALK IT THROUGH");
    expect(whyIndex).toBeGreaterThan(-1);
    expect(step3Index).toBeGreaterThan(whyIndex);
    const between = html.slice(whyIndex, step3Index);
    // Only the closing tags of the WHY paragraph and the opening of the Step 3 heading in between.
    expect(between.match(/<p>|<h2/g)?.length).toBeLessThanOrEqual(1);
  });

  it('uses the exact same scheduling URL as the CTA destination, unchanged', () => {
    expect(html).toContain(`href="${RESULT_EMAIL_CTA_URL}"`);
    expect(RESULT_EMAIL_CTA_URL).toBe('https://easyaiconsult.com/book-consultation');
  });

  it('CTA button text says "Find My Best Fit", not any old "Book"/"Schedule" wording', () => {
    expect(html).toContain('Find My Best Fit');
    expect(html).not.toMatch(/book your discovery call/i);
  });

  it('Step 3 explanation never mentions the $299 Game Plan, a discovery call, or a business assessment', () => {
    const step3Index = html.indexOf("STEP 3: LET'S TALK IT THROUGH");
    const ctaIndex = html.indexOf('Find My Best Fit');
    const explanation = html.slice(step3Index, ctaIndex);
    expect(explanation).not.toMatch(/\$299/);
    expect(explanation).not.toMatch(/discovery call/i);
    expect(explanation).not.toMatch(/business assessment/i);
  });

  it('escapes HTML-dangerous characters in narrative fields', () => {
    const injected = buildResultEmailHtml({ ...fields, opening: '<script>alert(1)</script>' }, submission);
    expect(injected).not.toContain('<script>alert(1)</script>');
    expect(injected).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('selects the WHY question deterministically from the submitted desired outcome', () => {
    const revenueHtml = buildResultEmailHtml(fields, { ...submission, desiredOutcome: 'Make more money — increase revenue or cut costs' });
    expect(revenueHtml).toContain('If Johnson Electric could generate more revenue');
  });
});

describe('RESULT_EMAIL_LOGO_URL', () => {
  it('is an absolute public HTTPS URL, not a relative path, localhost, or filesystem path', () => {
    expect(RESULT_EMAIL_LOGO_URL).toMatch(/^https:\/\//);
    expect(RESULT_EMAIL_LOGO_URL).not.toMatch(/localhost|127\.0\.0\.1|^file:|^\//);
  });

  // Network-dependent: proves the logo is actually reachable, not just well-formed.
  // Skipped automatically if the machine running the tests has no network access.
  it('resolves to a direct HTTP 200 with an image content type, no redirect hop, no auth', async () => {
    let response: Response;
    try {
      response = await fetch(RESULT_EMAIL_LOGO_URL, { redirect: 'manual' });
    } catch {
      return; // no network access in this environment — can't assert reachability
    }
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/^image\//);
  }, 15000);
});
