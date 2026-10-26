import { useId, type ReactNode } from 'react';

/** Original photographs, clipped in the browser. Hardware pixels are never regenerated. */
export default function PhotographicDevice({ kind, children, className = '', screenClassName = '' }: {
  kind: 'phone' | 'laptop'; children: ReactNode; className?: string; screenClassName?: string;
}) {
  const clipId = useId();
  const phone = kind === 'phone';
  // Project logical HTML planes onto measured source-photo corners (clockwise).
  // Phone260x600: (946,668),(1177,662),(1251,1244),(1018,1265).
  // Laptop1000x650: (900,61),(1974,84),(1835,851),(796,642).
  const matrix = phone
    ? 'matrix3d(1.00242672791,0.0410224443098,0,9.68268389528e-05,0.0918706620006,0.960045567221,0,-2.76319626713e-05,0,0,1,0,946,668,0,1)'
    : 'matrix3d(0.594653193117,0.00260226353691,0,-0.000242830195989,-0.158530694018,0.895031197113,0,0.00000184586178649,0,0,1,0,900,61,0,1)';
  return <div className={`photograph-device photograph-${kind} ${className}`}>
    <svg className="photograph-canvas" viewBox={phone ? '900 630 400 680' : '100 0 1950 1350'} xmlns="http://www.w3.org/2000/svg">
      <defs><clipPath id={clipId}><path d={phone
        ? 'M929 673 Q935 653 960 650 L1156 642 Q1180 644 1188 677 L1255 1215 Q1257 1246 1224 1257 L1032 1275 Q1001 1278 990 1244 Z'
        : 'M879 18 L2018 44 L1880 905 L1900 941 L1792 1090 L1390 1340 L617 1180 L148 1085 L742 748 L761 703 Z'} /></clipPath></defs>
      <image data-device-photograph={kind} href={phone ? "/devices/phone-photograph-crop.webp" : "/devices/laptop-photograph.webp"} x={phone ? 900 : 0} y={phone ? 630 : 0} width={phone ? 400 : 2400} height={phone ? 680 : 1350} clipPath={`url(#${clipId})`} />
      <foreignObject width={2400} height={phone ? 1622 : 1350} style={{ pointerEvents: 'none' }}>
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <div style={{ position: 'absolute', width: phone ? 260 : 1000, height: phone ? 600 : 650, transform: matrix, transformOrigin: '0 0', pointerEvents: 'auto' }}>
            <div className={`photograph-screen ${screenClassName}`}>{children}</div>
          </div>
        </div>
      </foreignObject>
    </svg>
  </div>;
}
