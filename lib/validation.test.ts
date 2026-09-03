import { describe, expect, it } from 'vitest';
import { assessmentSubmissionSchema } from './validation';

function basePayload(overrides: Record<string, unknown> = {}) {
  return {
    workSituation: 'Small business, 1-10 employees ($100K-$1M/yr)',
    usingAiTools: 'Yes — using AI tools like ChatGPT or Claude at least a few times per week',
    aiChallenge: "I'm excited about AI but overwhelmed by where to start",
    desiredOutcome: 'Save time — automate tasks and free up my schedule',
    timeDrain: 'Answering calls & following up with leads quickly',
    privacyConcern: "Somewhat worried — I think about it, but it's not stopping me",
    industry: 'Construction & Trades (contractors, subs, home services)',
    leadResponse: 'We respond manually, but follow-up is not always consistent.',
    sportsFan: 'Not really a sports fan',
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
  it('accepts a valid payload matching the 11 data-entry screens', () => {
    const result = assessmentSubmissionSchema.safeParse(basePayload());
    expect(result.success).toBe(true);
  });

  it('requires favoriteTeam only for Football or Basketball', () => {
    expect(assessmentSubmissionSchema.safeParse(basePayload({ sportsFan: 'Football' })).success).toBe(false);
    expect(assessmentSubmissionSchema.safeParse(basePayload({ sportsFan: 'Football', favoriteTeam: 'Lions' })).success).toBe(true);
    expect(assessmentSubmissionSchema.safeParse(basePayload({ favoriteTeam: 'Lions' })).success).toBe(false);
  });

  it('requires an HTTP(S) website URL or noWebsite, but never both', () => {
    expect(assessmentSubmissionSchema.safeParse(basePayload({ noWebsite: false })).success).toBe(false);
    expect(assessmentSubmissionSchema.safeParse(basePayload({ noWebsite: false, websiteUrl: 'https://example.com' })).success).toBe(true);
    expect(assessmentSubmissionSchema.safeParse(basePayload({ noWebsite: false, websiteUrl: 'ftp://example.com' })).success).toBe(false);
    expect(assessmentSubmissionSchema.safeParse(basePayload({ noWebsite: true, websiteUrl: 'https://example.com' })).success).toBe(false);
  });

  it('still requires industryOther when industry is "Something else"', () => {
    const missing = assessmentSubmissionSchema.safeParse(
      basePayload({ industry: 'Something else' })
    );
    expect(missing.success).toBe(false);

    const provided = assessmentSubmissionSchema.safeParse(
      basePayload({ industry: 'Something else', industryOther: 'Landscaping company' })
    );
    expect(provided.success).toBe(true);
  });

  it('rejects a non-empty honeypot field', () => {
    const result = assessmentSubmissionSchema.safeParse(basePayload({ companyUrl: 'http://spam.example' }));
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const result = assessmentSubmissionSchema.safeParse(basePayload({ email: 'not-an-email' }));
    expect(result.success).toBe(false);
  });
});
