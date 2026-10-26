import Image from 'next/image';
import type { HTMLAttributes } from 'react';

/** Native screen over a photographic device frame; shared by search and AIM. */
export function Iphone({ children, className = '', style, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`photo-phone ${className}`} style={style} {...props}>
    <Image className="photo-phone-frame" src="/devices/phone-front.webp" alt="" width={400} height={600} sizes="320px" />
    <div className="magic-phone-screen">{children}</div>
  </div>;
}
