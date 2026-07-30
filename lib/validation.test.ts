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
    sportsFan: 'Not really a sports fan',
    firstName: 'Taylor',
    lastName: 'Confirm',
    businessName: 'Confirm Trades Co',
    email: 'taylor@example.com',
    consent: true,
    companyUrl: '',
    formLoadedAt: Date.now() - 5000,
    ...overrides,
  };
}

describe('assessmentSubmissionSchema', () => {
  it('accepts a valid payload matching the new UI collection order but unchanged flat shape', () => {
    // The reordered UI (intro step -> Q1-Q8 -> final contact step) still submits
    // the same 4 contact fields in the same flat shape as before — collection
    // order on the client has no bearing on schema validation.
    const result = assessmentSubmissionSchema.safeParse(basePayload());
    expect(result.success).toBe(true);
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
