import { describe, expect, it } from 'vitest';
import config from './next.config.mjs';

async function securityHeaders(): Promise<Record<string, string>> {
  const entries = await config.headers();
  return Object.fromEntries(entries[0].headers.map(({ key, value }) => [key, value]));
}

describe('security headers', () => {
  it('ships the restrictive policy as report-only', async () => {
    const headers = await securityHeaders();
    const policy = headers['Content-Security-Policy-Report-Only'];
    expect(policy).toBeDefined();
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'self'");
    expect(policy).toContain("form-action 'self'");
  });

  it('never emits an enforced CSP, which would block Next.js inline bootstrap scripts', async () => {
    const headers = await securityHeaders();
    expect(headers['Content-Security-Policy']).toBeUndefined();
    expect(Object.keys(headers)).not.toContain('Content-Security-Policy');
  });

  it('does not relax the policy while it is report-only', async () => {
    const policy = (await securityHeaders())['Content-Security-Policy-Report-Only'];
    expect(policy).not.toContain('unsafe-eval');
    expect(policy).not.toContain('unsafe-inline');
  });

  it('keeps frame protection enforced while frame-ancestors is only reported', async () => {
    expect((await securityHeaders())['X-Frame-Options']).toBe('DENY');
  });

  it('keeps HSTS enforced', async () => {
    const value = (await securityHeaders())['Strict-Transport-Security'];
    expect(value).toContain('max-age=');
    expect(value).toContain('includeSubDomains');
  });

  it('keeps nosniff, Referrer-Policy and Permissions-Policy enforced', async () => {
    expect(await securityHeaders()).toMatchObject({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    });
  });

  it('applies the baseline to every route', async () => {
    const entries = await config.headers();
    expect(entries).toHaveLength(1);
    expect(entries[0].source).toBe('/(.*)');
  });
});
