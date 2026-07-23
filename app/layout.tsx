import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: { default: 'EasyAI — AI Product Consulting & Implementation', template: '%s | EasyAI' },
  description: 'EasyAI helps businesses find and implement AI tools, software, automations, and custom agents that save time, reduce expenses, and increase profitability. Tampa, FL.',
  keywords: ['AI consulting', 'AI implementation', 'business automation', 'Tampa', 'AI tools', 'custom agents'],
  openGraph: {
    title: 'EasyAI — AI Product Consulting & Implementation',
    description: 'Find the AI and software tools your business actually needs. Consultation-first. Human-reviewed. Tampa, FL.',
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
