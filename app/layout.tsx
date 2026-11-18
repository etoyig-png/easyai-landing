import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import GaryRouteGate from '@/components/gary/GaryRouteGate';
import GaryLauncher from '@/components/gary/GaryLauncher';

const SITE_URL = 'https://www.easyaiconsult.com';

export const metadata: Metadata = {
  // Canonical and social links always point at the real domain, never a vercel.app address.
  metadataBase: new URL(SITE_URL),
  title: { default: 'Easy AI | Practical AI Guidance for Small and Midsize Businesses', template: '%s | Easy AI' },
  description: 'Easy AI helps business owners find trustworthy AI tools, software, and workflows that reduce busywork, improve operations, and help them buy back their time.',
  keywords: ['AI consulting', 'AI advisory', 'business automation', 'AI tools', 'small business AI'],
  openGraph: {
    title: 'Easy AI | Practical AI Guidance for Small and Midsize Businesses',
    description: 'Easy AI helps business owners find trustworthy AI tools, software, and workflows that reduce busywork, improve operations, and help them buy back their time.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="site-scroll-frame" role="region" aria-label="Website content" tabIndex={0}>
          <Header />
          <main>{children}</main>
          <Footer />
        </div>
        <GaryRouteGate>
          <GaryLauncher />
        </GaryRouteGate>
      </body>
    </html>
  );
}