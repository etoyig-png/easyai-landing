import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import GaryRouteGate from '@/components/gary/GaryRouteGate';
import GaryLauncher from '@/components/gary/GaryLauncher';

// Single source for absolute URL resolution. metadataBase is what lets Next emit absolute
// canonical and Open Graph URLs from the relative values used per page; without it those tags
// are emitted relative and are ignored by most crawlers. Override via SITE_URL per environment
// so a preview deployment never advertises itself as the canonical production site.
const SITE_URL = process.env.SITE_URL ?? 'https://easyaiconsult.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Easy AI | Get Found, Get Chosen, Turn Attention Into Customers',
    template: '%s | Easy AI',
  },
  description:
    'Easy AI helps local businesses appear when customers search Google or ask AI who to call, turn website attention into inquiries, and respond before interest fades.',
  keywords: [
    'local business AI',
    'Google Business Profile visibility',
    'AI search visibility',
    'website lead capture',
    'missed call follow-up',
    'Tampa AI consulting',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Easy AI | Get Found, Get Chosen, Turn Attention Into Customers',
    description:
      'Easy AI helps local businesses appear when customers search Google or ask AI who to call, turn website attention into inquiries, and respond before interest fades.',
    url: '/',
    siteName: 'Easy AI',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Easy AI | Get Found, Get Chosen, Turn Attention Into Customers',
    description:
      'Easy AI helps local businesses appear when customers search Google or ask AI who to call, turn website attention into inquiries, and respond before interest fades.',
  },
  robots: { index: true, follow: true },
};

/**
 * Organization + LocalBusiness structured data. Only facts that are already true and public
 * belong here: name, URL, logo, service area, and the services actually described on the site.
 * No reviews, no ratings, no awards, no invented service areas - fabricated structured data is
 * both a policy violation and a manual-action risk. Proprietary product names are deliberately
 * absent; services are described by customer outcome, exactly as the visible copy does.
 */
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  name: 'Easy AI',
  url: SITE_URL,
  logo: `${SITE_URL}/easy-ai-logo.png`,
  description:
    'Easy AI helps local businesses appear when customers search Google or ask AI who to call, turn website attention into inquiries, and respond before interest fades.',
  areaServed: [
    { '@type': 'City', name: 'Tampa' },
    { '@type': 'State', name: 'Florida' },
  ],
  address: { '@type': 'PostalAddress', addressLocality: 'Tampa', addressRegion: 'FL', addressCountry: 'US' },
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Services',
    itemListElement: [
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Google and AI search visibility' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Website engagement and opportunity capture' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Customer response and follow-up' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Business AI assessment and strategy' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Workflow automation and custom business systems' } },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          // Serialized from a literal object defined in this file, never from user input.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <Header />
        <main>{children}</main>
        <Footer />
        <GaryRouteGate>
          <GaryLauncher />
        </GaryRouteGate>
      </body>
    </html>
  );
}