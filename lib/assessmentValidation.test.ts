import { describe, it, expect } from 'vitest';
import { assessmentSubmissionSchema } from './validation';

const valid = {
  workSituation: 'Small business, 1-10 employees ($100K-$1M/yr)',
  usingAiTools: "No — played around with AI, but it hasn't become part of my routine yet",
  aiChallenge: "I'm excited about AI but overwhelmed by where to start",
  desiredOutcome: 'Make more money — increase revenue or cut costs',
  timeDrain: 'Finding more customers and generating a steady flow of qualified leads.',
  privacyConcern: "Somewhat worried — I think about it, but it's not stopping me",
  industry: 'Construction & Trades (contractors, subs, home services)',
  leadResponse: 'Some calls, messages, or website inquiries are probably missed.',
  sportsFan: 'Football',
  favoriteTeam: 'Buccaneers',
  websiteUrl: 'https://riversideplumbing.example.com',
  firstName: 'Dana',
  lastName: 'Reyes',
  businessName: 'Riverside Plumbing',
  email: 'dana@example.com',
  consent: true as const,
  formLoadedAt: Date.now() - 10_000,
};

describe('assessment submission validation', () => {
  it('accepts a complete submission', () => {
    expect(assessmentSubmissionSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts the no-website declaration with no URL', () => {
    const { websiteUrl, ...rest } = valid;
    expect(assessmentSubmissionSchema.safeParse({ ...rest, noWebsite: true }).success).toBe(true);
  });

  it('rejects a blank website when no-website was not selected', () => {
    const { websiteUrl, ...rest } = valid;
    const result = assessmentSubmissionSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects an invalid website address', () => {
    expect(assessmentSubmissionSchema.safeParse({ ...valid, websiteUrl: 'not a url' }).success).toBe(false);
  });

  it('rejects a non-http scheme, so javascript: and data: URLs cannot be submitted', () => {
    for (const bad of ['javascript:alert(1)', 'data:text/html,<script>', 'file:///etc/passwd']) {
      expect(assessmentSubmissionSchema.safeParse({ ...valid, websiteUrl: bad }).success).toBe(false);
    }
  });

  it('requires a favorite team when a sport is chosen', () => {
    const { favoriteTeam, ...rest } = valid;
    expect(assessmentSubmissionSchema.safeParse(rest).success).toBe(false);
    expect(assessmentSubmissionSchema.safeParse({ ...rest, sportsFan: 'Basketball' }).success).toBe(false);
  });

  it('does not require a favorite team for a non-sports-fan', () => {
    const { favoriteTeam, ...rest } = valid;
    expect(
      assessmentSubmissionSchema.safeParse({ ...rest, sportsFan: 'Not really a sports fan' }).success
    ).toBe(true);
  });

  it('accepts a business name containing punctuation and HTML-like text without executing it', () => {
    const result = assessmentSubmissionSchema.safeParse({
      ...valid,
      businessName: `O'Brien & Sons <script>alert(1)</script>`,
    });
    expect(result.success).toBe(true);
    // Stored verbatim as data. Escaping happens at render time (escapeHtml in the email, React
    // text nodes in the UI) rather than by mangling what the owner actually typed.
    if (result.success) expect(result.data.businessName).toContain('<script>');
  });

  it('still rejects a submission that trips the honeypot or the minimum fill time', () => {
    expect(assessmentSubmissionSchema.safeParse({ ...valid, companyUrl: 'bot' }).success).toBe(false);
    expect(assessmentSubmissionSchema.safeParse({ ...valid, formLoadedAt: 0 }).success).toBe(false);
  });

  it('requires consent', () => {
    const { consent, ...rest } = valid;
    expect(assessmentSubmissionSchema.safeParse(rest).success).toBe(false);
  });
});
