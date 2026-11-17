import type { HTMLAttributes } from 'react';
import PhotographicDevice from '@/components/PhotographicDevice';

/** Existing adapter retained; both phone scenes use the actual photographed handset. */
export function Iphone({ children, className = '' }: HTMLAttributes<HTMLDivElement>) {
  return <PhotographicDevice kind="phone" className={`photo-phone ${className}`} screenClassName="magic-phone-screen">{children}</PhotographicDevice>;
}
