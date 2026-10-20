import type { MetadataRoute } from 'next';

const SITE_URL = process.env.SITE_URL ?? 'https://easyaiconsult.com';

// API routes are disallowed because they return JSON to server-to-server callers and have no
// crawlable content; /assessment/complete is a post-submission confirmation that only makes
// sense with submission state, so it should never appear as a search result on its own.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/assessment/complete'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
