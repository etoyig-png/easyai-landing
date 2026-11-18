import type { Metadata } from 'next';

// The assessment page is a client component and cannot export metadata itself.
export const metadata: Metadata = { alternates: { canonical: '/assessment' } };

export default function AssessmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
