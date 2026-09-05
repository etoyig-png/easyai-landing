import { describe, expect, it } from 'vitest';
import { assessmentSubmissionSchema } from './validation';

function basePayload(overrides: Record<string, unknown> = {}) {
  return {
    workSituation: 'Small business, 1-10 employees ($100K-$1M/yr)',
    searchVisibility: 'We show up sometimes, but competitors seem more visible',
    aiChallenge: "I'm excited about AI but overwhelmed by where to start",
    desiredOutcome: 'Save time — automate tasks and free up my schedule',
    timeDrain: 'Answering calls & following up with leads quickly',
    privacyConcern: "Somewhat worried — I think about it, but it's not stopping me",
    industry: 'Construction & Trades (contractors, subs, home services)',
    leadResponse: 'We respond manually, but follow-up is not always consistent.',
    websiteConversion: 'We do not currently have a website',
    firstName: 'Taylor',
    lastName: 'Confirm',
    businessName: 'Confirm Trades Co',
    email: 'taylor@example.com',
    noWebsite: true,
    consent: true,
    companyUrl: '',
    formLoadedAt: Date.now() - 5000,
    ...overrides,
  };
}

describe('assessmentSubmissionSchema', () => {
  it('accepts a valid dual-gap payload', () => {
    expect(assessmentSubmissionSchema.safeParse(basePayload()).success).toBe(true);
  });

  it('requires the new discovery and website conversion answers', () => {
    expect(assessmentSubmissionSchema.safeParse(basePayload({ searchVisibility: undefined })).success).toBe(false);
    expect(assessmentSubmissionSchema.safeParse(basePayload({ websiteConversion: undefined })).success).toBe(false);
  });

  it('keeps the website answer consistent with contact information', () => {
    const withWebsite = {
      websiteConversion: 'Visitors can contact us, but the next step could be clearer',
      noWebsite: false,
      websiteUrl: 'https://example.com',
    };
    expect(assessmentSubmissionSchema.safeParse(basePayload(withWebsite)).success).toBe(true);
    expect(assessmentSubmissionSchema.safeParse(basePayload({ ...withWebsite, websiteUrl: 'ftp://example.com' })).success).toBe(false);
    expect(assessmentSubmissionSchema.safeParse(basePayload({ ...withWebsite, noWebsite: true, websiteUrl: undefined })).success).toBe(false);
    expect(assessmentSubmissionSchema.safeParse(basePayload({ noWebsite: false, websiteUrl: 'https://example.com' })).success).toBe(false);
  });

  it('still requires industryOther when industry is Something else', () => {
    expect(assessmentSubmissionSchema.safeParse(basePayload({ industry: 'Something else' })).success).toBe(false);
    expect(
      assessmentSubmissionSchema.safeParse(basePayload({ industry: 'Something else', industryOther: 'Landscaping company' })).success
    ).toBe(true);
  });

  it('rejects a non-empty honeypot field', () => {
    expect(assessmentSubmissionSchema.safeParse(basePayload({ companyUrl: 'http://spam.example' })).success).toBe(false);
  });

  it('rejects an invalid email', () => {
    expect(assessmentSubmissionSchema.safeParse(basePayload({ email: 'not-an-email' })).success).toBe(false);
  });
});
