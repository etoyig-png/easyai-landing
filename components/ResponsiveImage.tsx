import Image, { type ImageProps } from 'next/image';

type ResponsiveImageProps = Omit<ImageProps, 'className'> & {
  /** Drives which clamp() bounds apply (see .responsive-media--* in globals.css) — landscape and
   * portrait illustrations need different floors/ceilings to both read as intentionally sized. */
  orientation: 'landscape' | 'portrait';
  className?: string;
};

/**
 * Shared responsive wrapper for every homepage illustration image. Sizes fluidly relative to
 * the image's actual parent container (clamp() with a percentage preferred value, not a fixed
 * Tailwind fraction or raw vw) so the same component works whether it sits in a full-width
 * section or a narrower flex column, at any viewport from a phone up through a wide desktop —
 * never a fixed pixel value that only looks right at one size.
 */
export default function ResponsiveImage({ orientation, className = '', alt, ...props }: ResponsiveImageProps) {
  return (
    <Image
      {...props}
      alt={alt}
      className={`responsive-media responsive-media--${orientation} object-contain ${className}`.trim()}
    />
  );
}
