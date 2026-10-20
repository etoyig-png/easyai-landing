import type { MetadataRoute } from 'next';

// Mirrors the real, crawlable routes under app/. Kept as an explicit list rather than a
// filesystem scan so an internal or in-progress page can never be published to crawlers by
// accident. SITE_URL matches app/layout.tsx so a preview deployment lists its own URLs.
const SITE_URL = process.env.SITE_URL ?? 'https://easyaiconsult.com';

const ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { path: '/', priority: 1.0, changeFrequency: 'weekly' },
  { path: '/how-it-works', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/assessment', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/ai-product-consulting', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/implementation', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/ai-trust', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/resources', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/book-consultation', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
