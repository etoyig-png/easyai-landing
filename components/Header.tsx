'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

// Kept deliberately flat and short. No nav entry ever names an individual Easy AI product:
// visitors navigate by what they want to accomplish, not by the systems behind it.
// "How It Works" targets the homepage customer-journey section rather than a separate page,
// so the two service-oriented links stay distinct ("What We Do" = the services page).
const nav = [
  { label: 'Home',            href: '/' },
  { label: 'What We Do',      href: '/how-it-works' },
  { label: 'How It Works',    href: '/#how-easy-ai-works' },
  { label: 'Free Assessment', href: '/assessment' },
  { label: 'About',           href: '/about' },
  { label: 'Contact',         href: '/contact' },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-navy-900 border-b border-navy-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-24 md:h-28">

        {/* Logo */}
        <Link href="/" className="flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-silver rounded">
          <Image
            src="/easy-ai-logo.png"
            alt="Easy AI — Business AI Advisory"
            width={200}
            height={54}
            // Doubled at md+ (52px -> 104px). The mark is ~3.7:1, so a full 104px would render
            // ~385px wide and crowd the hamburger on a 360px phone; mobile therefore scales to
            // 72px, which is the largest size that still leaves room for the menu button.
            // w-auto + object-contain keep the original proportions; mixBlendMode preserves the
            // transparent background against navy with no box behind it.
            className="h-[72px] md:h-[104px] w-auto object-contain"
            priority
            style={{ mixBlendMode: 'screen' }}
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-5 lg:gap-7" aria-label="Main navigation">
          {nav.map(item => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-silver-light hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-silver rounded"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:block">
          {/* Deliberately about half the hero button's footprint. The hero CTA is the primary
              action; this one is a persistent convenience and was visually competing with it.
              px-5 py-2.5 text-sm -> px-3 py-1.5 text-xs roughly halves the box area, while
              min-h-[36px] keeps it a comfortable pointer target and the focus ring, green, and
              label are unchanged. */}
          <Link href="/assessment" className="btn-green text-xs px-3 py-1.5 min-h-[36px] leading-tight">
            Start Your Free Assessment
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 text-silver hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-silver rounded"
        >
          {open ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav className="md:hidden bg-navy-900 border-t border-navy-800 px-4 py-6 space-y-1" aria-label="Mobile navigation">
          {nav.map(item => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block text-base font-medium text-silver-light hover:text-white py-3 border-b border-navy-800/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-silver"
            >
              {item.label}
            </Link>
          ))}
          <div className="pt-4">
            <Link
              href="/assessment"
              onClick={() => setOpen(false)}
              className="btn-green w-full text-center py-3 block"
            >
              Start Your Free Assessment
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
