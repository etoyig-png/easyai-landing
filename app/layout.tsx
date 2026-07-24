import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
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
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}