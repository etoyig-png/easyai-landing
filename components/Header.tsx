'use client';
import Link from 'next/link';
import { useState } from 'react';

const nav = [
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'AI Consulting', href: '/ai-product-consulting' },
  { label: 'Implementation', href: '/implementation' },
  { label: 'AI Trust', href: '/ai-trust' },
  { label: 'About', href: '/about' },
  { label: 'Resources', href: '/resources' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-brand-700">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-brand-600 text-white text-sm font-bold">E</span>
          EasyAI
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          {nav.map(n => (
            <Link key={n.href} href={n.href} className="hover:text-brand-700 transition-colors">{n.label}</Link>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <Link href="/book-consultation" className="btn-secondary py-2 text-sm">Book a Call</Link>
          <Link href="/assessment" className="btn-primary py-2 text-sm">Take the Assessment</Link>
        </div>
        <button
          className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            {open
              ? <path fillRule="evenodd" clipRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
              : <path fillRule="evenodd" clipRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />}
          </svg>
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 pb-4">
          {nav.map(n => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="block py-3 text-sm font-medium text-slate-700 border-b border-slate-50 hover:text-brand-700">{n.label}</Link>
          ))}
          <div className="flex flex-col gap-2 mt-4">
            <Link href="/book-consultation" onClick={() => setOpen(false)} className="btn-secondary text-center">Book a Call</Link>
            <Link href="/assessment" onClick={() => setOpen(false)} className="btn-primary text-center">Take the Assessment</Link>
          </div>
        </div>
      )}
    </header>
  );
}
