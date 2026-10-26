import { useId, type ReactNode } from 'react';

/** Original photographs, clipped in the browser. Hardware pixels are never regenerated. */
export default function PhotographicDevice({ kind, children, className = '', screenClassName = '' }: {
  kind: 'phone' | 'laptop'; children: ReactNode; className?: string; screenClassName?: string;
}) {
  const clipId = useId();
  const phone = kind === 'phone';
  // Project logical HTML planes onto measured source-photo corners (clockwise).
  // Phone260x600: (946,668),(1177,662),(1251,1244),(1018,1265).
  // Laptop1000x650: (524,307),(1064,303),(1070,659),(519,666).
  const matrix = phone
    ? 'matrix3d(1.00242672791,0.0410224443098,0,9.68268389528e-05,0.0918706620006,0.960045567221,0,-2.76319626713e-05,0,0,1,0,946,668,0,1)'
    : 'matrix3d(0.5485467945646745, -0.0015660913974658115,0,8.032701658528629e-06, -0.023702397970025567,0.5317629521825283,0,-3.084795814589186e-05,0,0,1,0,524.0,307.0,0,1)';
  return <div className={`photograph-device photograph-${kind} ${className}`}>
    <svg className="photograph-canvas" viewBox={phone ? '900 630 400 680' : '420 265 760 600'} xmlns="http://www.w3.org/2000/svg">
      <defs><clipPath id={clipId}><path d={phone
        ? 'M929 673 Q935 653 960 650 L1156 642 Q1180 644 1188 677 L1255 1215 Q1257 1246 1224 1257 L1032 1275 Q1001 1278 990 1244 Z'
        : 'M508 288 Q511 283 530 283 L1065 283 Q1089 284 1090 307 L1094 674 L1147 806 Q1156 829 1128 832 L469 832 Q443 830 450 806 L502 675 Z'} /></clipPath></defs>
      <image data-device-photograph={kind} href={phone ? "/devices/phone-photograph-crop.webp" : "/devices/laptop-complete-photograph.webp"} x={phone ? 900 : 0} y={phone ? 630 : 0} width={phone ? 400 : 1600} height={phone ? 680 : 1067} clipPath={`url(#${clipId})`} />
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
