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

  it('accepts a submission with a valid website', () => {
    const withWebsite = {
      websiteConversion: 'Visitors can contact us, but the next step could be clearer',
      noWebsite: false,
      websiteUrl: 'https://example.com',
    };
    expect(assessmentSubmissionSchema.safeParse(basePayload(withWebsite)).success).toBe(true);
  });

  it('still rejects an incomplete or non-http website when one is provided', () => {
    const withWebsite = { websiteConversion: 'Visitors can contact us, but the next step could be clearer', noWebsite: false };
    for (const websiteUrl of ['ftp://example.com', 'example.com', 'javascript:alert(1)', undefined]) {
      expect(assessmentSubmissionSchema.safeParse(basePayload({ ...withWebsite, websiteUrl })).success, String(websiteUrl)).toBe(false);
    }
  });

  // noWebsite is the single source of truth for whether a URL exists, and it is deliberately
  // allowed to differ from the websiteConversion answer. The previous cross-field consistency
  // rule rejected both directions below, which is exactly what stopped an owner without a
  // website from finishing the assessment.
  it('accepts no website even when the website question was answered differently', () => {
    const pressedTheButton = {
      websiteConversion: 'Visitors can contact us, but the next step could be clearer',
      noWebsite: true,
      websiteUrl: undefined,
    };
    expect(assessmentSubmissionSchema.safeParse(basePayload(pressedTheButton)).success).toBe(true);
  });

  it('accepts a real website even when the website question said there was none', () => {
    const undidTheButton = { noWebsite: false, websiteUrl: 'https://example.com' };
    expect(assessmentSubmissionSchema.safeParse(basePayload(undidTheButton)).success).toBe(true);
  });

  it('never lets a URL ride along with the no-website state', () => {
    expect(assessmentSubmissionSchema.safeParse(basePayload({ noWebsite: true, websiteUrl: 'https://example.com' })).success).toBe(false);
  });

  it('preserves historical submissions, where the two answers always agreed', () => {
    expect(
      assessmentSubmissionSchema.safeParse(basePayload({ websiteConversion: 'We do not currently have a website', noWebsite: true, websiteUrl: undefined }))
        .success
    ).toBe(true);
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
