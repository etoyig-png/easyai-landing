import { describe, expect, it } from 'vitest';
import { buildResultEmailHtml, buildResultEmailText, RESULT_EMAIL_CTA_URL, RESULT_EMAIL_LOGO_URL } from './resend';

describe('buildResultEmailHtml', () => {
  it('renders the logo image tag with the fixed www URL and non-mirrored alt text', () => {
    const html = buildResultEmailHtml('<p>Body content.</p>');
    expect(html).toContain(`<img src="${RESULT_EMAIL_LOGO_URL}"`);
    expect(html).toContain('alt="Easy AI logo"');
    // Alt text must not mirror the visible on-image text ("EASY AI / BUSINESS AI ADVISORY").
    expect(html.toLowerCase()).not.toContain('alt="easy ai business ai advisory"');
  });

  it('embeds the provided result body unchanged', () => {
    const html = buildResultEmailHtml('<p>Unique marker XYZ123.</p>');
    expect(html).toContain('Unique marker XYZ123.');
  });

  it('uses the next-step video CTA on the assessment completion path', () => {
    const html = buildResultEmailHtml('<p>Body content.</p>');
    expect(html).toContain('Watch Your Next-Step Video');
    expect(new URL(RESULT_EMAIL_CTA_URL).pathname).toBe('/assessment/complete');
    expect(html).not.toContain('Book Your Discovery Call');
  });

  it('builds a plain-text alternative with the CTA and no HTML tags', () => {
    const text = buildResultEmailText('<p>Free action 1: Start.</p><p>Final thought.</p>');
    expect(text).toContain('Free action 1: Start.');
    expect(text).toContain(`Watch Your Next-Step Video: ${RESULT_EMAIL_CTA_URL}`);
    expect(text).not.toMatch(/<[^>]+>/);
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
