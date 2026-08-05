'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

// Gary must never appear on the assessment (it collects prefill-sensitive form state) or the
// booking placeholder — the master spec calls these out explicitly, plus any future
// privacy-sensitive/provider-callback route added under the same prefixes.
const EXCLUDED_PREFIXES = ['/assessment', '/book-consultation'];

function isExcludedRoute(pathname: string): boolean {
  return EXCLUDED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function GaryRouteGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (isExcludedRoute(pathname ?? '')) return null;
  return <>{children}</>;
}
