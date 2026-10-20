import { describe, expect, it } from 'vitest';
import { buildFallbackActionPlanFields } from './anthropic';
import { validateActionPlanFields } from './actionPlanValidator';
import type { AssessmentSubmission } from './validation';

const baseSubmission: AssessmentSubmission = {
  workSituation: 'Small business, 1-10 employees ($100K-$1M/yr)',
  usingAiTools: "No — played around with AI, but it hasn't become part of my routine yet",
  aiChallenge: "I'm excited about AI but overwhelmed by where to start",
  desiredOutcome: 'Make more money — increase revenue or cut costs',
  timeDrain: 'Answering calls & following up with leads quickly',
  privacyConcern: 'Somewhat worried — I think about it, but it\'s not stopping me',
  industry: 'Construction & Trades (contractors, subs, home services)',
  sportsFan: 'Not really a sports fan',
  firstName: 'Taylor',
  lastName: 'Doe',
  businessName: 'Johnson Electric',
  email: 'taylor@example.com',
  consent: true,
  formLoadedAt: 1,
};

describe('buildFallbackActionPlanFields', () => {
  it('passes the real deterministic content validator', () => {
    const fields = buildFallbackActionPlanFields(baseSubmission);
    const result = validateActionPlanFields(fields);
    expect(result.violations).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('escapes HTML-dangerous characters in submitted fields', () => {
    const fields = buildFallbackActionPlanFields({ ...baseSubmission, businessName: '<script>alert(1)</script>' });
    const combined = JSON.stringify(fields);
    expect(combined).not.toContain('<script>alert(1)</script>');
    expect(combined).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('contains no em dash or en dash across any field', () => {
    const fields = buildFallbackActionPlanFields(baseSubmission);
    const combined = Object.values(fields).join(' ');
    expect(combined).not.toMatch(/—/);
    expect(combined).not.toMatch(/–/);
  });

  it('keeps ordinary apostrophes in business names literal, not entity-encoded', () => {
    const fields = buildFallbackActionPlanFields({ ...baseSubmission, businessName: "Bob's Plumbing" });
    expect(fields.opening).toContain("Bob's Plumbing");
  });

  it('mentions Easy AI only in easyAiSummary, never in the Step 1/2 action fields', () => {
    const fields = buildFallbackActionPlanFields(baseSubmission);
    expect(fields.easyAiSummary.toLowerCase()).toContain('easy ai');
    expect(fields.actionOneDoNow.toLowerCase()).not.toContain('easy ai');
    expect(fields.actionOneAutomationOpportunity.toLowerCase()).not.toContain('easy ai');
    expect(fields.actionTwoDoNow.toLowerCase()).not.toContain('easy ai');
    expect(fields.actionTwoAutomationOpportunity.toLowerCase()).not.toContain('easy ai');
  });
});
