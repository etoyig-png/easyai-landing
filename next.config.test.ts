import { describe, expect, it } from 'vitest';
import config from './next.config.mjs';
describe('security headers', () => {
  it('sets the application baseline without unsafe script directives', async () => {
    const entries = await config.headers();
    const headers = Object.fromEntries(entries[0].headers.map(({ key, value }) => [key, value]));
    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(headers['Content-Security-Policy']).not.toContain('unsafe-eval');
    expect(headers['Content-Security-Policy']).not.toContain('unsafe-inline');
    expect(headers).toMatchObject({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
    expect(headers['Strict-Transport-Security']).toContain('max-age=');
  });
});
