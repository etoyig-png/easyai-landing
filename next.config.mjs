/** @type {import('next').NextConfig} */

// The intended restrictive policy, kept verbatim. It is shipped as
// Content-Security-Policy-REPORT-ONLY for this deployment: Next.js's App Router
// streams its RSC payload through inline `<script>self.__next_f.push(...)</script>`
// tags and the app renders inline `style` attributes, both of which fall back to
// `default-src 'self'` and would be blocked if this were enforced — hydration,
// Gary and the assessment form would stop working. Promoting this to an enforced
// header requires a nonce architecture, which forces dynamic rendering and has
// caching consequences; that is deliberately a separate, measured phase.
const contentSecurityPolicy = "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: https:; connect-src 'self' https:; media-src 'self'; font-src 'self' data:";

const securityHeaders = [
  { key: 'Content-Security-Policy-Report-Only', value: contentSecurityPolicy },
  // `frame-ancestors` above is report-only, so clickjacking protection is carried
  // by this enforced header until the CSP itself can be enforced.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
];

const nextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};
export default nextConfig;
