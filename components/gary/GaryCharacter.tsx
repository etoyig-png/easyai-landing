export type GaryPose =
  | 'seated'
  | 'jump'
  | 'wave'
  | 'point'
  | 'wait'
  | 'frustrated'
  | 'idea'
  | 'sign'
  | 'signPoint'
  | 'signWave'
  | 'lowering';

type GaryCharacterProps = {
  pose: GaryPose;
  /** Ambient "occasionally glances/points upward" loop — only ever active in the seated resting
   * state, and only when the visitor hasn't turned on reduced motion. */
  idleGlanceActive: boolean;
};

/**
 * Gary from Accounting — a flat-vector illustrated human office character (not a robot, emoji,
 * orb, or generic AI symbol). One SVG, several swappable sub-groups (arms, face, sign) driven
 * entirely by the `pose` prop via CSS in globals.css's "Gary character" layer — see
 * `[data-gary-pose="..."]` selectors there for the actual animation keyframes/transforms. Kept
 * as plain inline SVG (no external image request, no layout shift, trivial byte size) so the
 * character itself never needs its own lazy-load boundary — only GaryPanel's heavier chat UI is
 * code-split (see GaryLauncher.tsx).
 */
export default function GaryCharacter({ pose, idleGlanceActive }: GaryCharacterProps) {
  return (
    <svg
      viewBox="0 0 160 200"
      width="100%"
      height="100%"
      role="img"
      aria-hidden="true"
      className="gary-character"
      data-gary-pose={pose}
      data-gary-idle={idleGlanceActive ? 'true' : 'false'}
    >
      {/* Desk edge — reads as "seated behind a counter," grounds the bust-only figure */}
      <rect x="0" y="178" width="160" height="22" rx="4" className="gary-desk" />

      {/* Right arm (viewer's right / Gary's left) — the wave / point / sign-holding arm */}
      <g className="gary-arm gary-arm-right">
        <rect x="103" y="108" width="20" height="56" rx="10" className="gary-sleeve" />
        <circle cx="113" cy="164" r="10" className="gary-hand" />
      </g>

      {/* Torso */}
      <rect x="38" y="108" width="84" height="80" rx="16" className="gary-shirt" />
      <path d="M80 108 L68 128 L80 122 L92 128 Z" className="gary-tie" />
      <rect x="52" y="140" width="6" height="18" rx="2" className="gary-pocket-pen" />

      {/* Left arm (viewer's left / Gary's right) — rests at side, crosses during frustration */}
      <g className="gary-arm gary-arm-left">
        <rect x="37" y="108" width="20" height="56" rx="10" className="gary-sleeve" />
        <circle cx="47" cy="164" r="10" className="gary-hand" />
      </g>

      {/* Neck + head */}
      <rect x="70" y="88" width="20" height="24" className="gary-neck" />
      <g className="gary-head">
        <circle cx="80" cy="62" r="36" className="gary-head-shape" />
        {/* Hair — a slightly receding, side-parted shape for a "middle-aged office worker" read */}
        <path
          d="M46 54 Q50 22 80 24 Q112 22 114 54 Q104 38 80 38 Q56 38 46 54 Z"
          className="gary-hair"
        />
        {/* Glasses — the single clearest "accounting" visual cue */}
        <g className="gary-glasses">
          <circle cx="65" cy="60" r="12" className="gary-glasses-lens" />
          <circle cx="95" cy="60" r="12" className="gary-glasses-lens" />
          <path d="M77 60 H83" className="gary-glasses-bridge" />
          <path d="M53 58 H46" className="gary-glasses-arm" />
          <path d="M107 58 H114" className="gary-glasses-arm" />
        </g>

        {/* Neutral face */}
        <g className="gary-face gary-face-neutral">
          <circle cx="65" cy="60" r="3.5" className="gary-pupil" />
          <circle cx="95" cy="60" r="3.5" className="gary-pupil" />
          <path d="M57 46 Q65 42 73 46" className="gary-eyebrow" />
          <path d="M87 46 Q95 42 103 46" className="gary-eyebrow" />
          <path d="M68 78 Q80 84 92 78" className="gary-mouth" />
        </g>

        {/* Frustrated face — furrowed brows + flat mouth; readable, never angry/red */}
        <g className="gary-face gary-face-frustrated">
          <circle cx="65" cy="61" r="3.5" className="gary-pupil" />
          <circle cx="95" cy="61" r="3.5" className="gary-pupil" />
          <path d="M56 44 L74 49" className="gary-eyebrow" />
          <path d="M104 44 L86 49" className="gary-eyebrow" />
          <path d="M69 80 H91" className="gary-mouth" />
        </g>

        {/* Idea face — wide eyes + raised brow + open "oh!" mouth */}
        <g className="gary-face gary-face-idea">
          <circle cx="65" cy="59" r="4.5" className="gary-pupil" />
          <circle cx="95" cy="59" r="4.5" className="gary-pupil" />
          <path d="M56 42 Q65 36 74 42" className="gary-eyebrow" />
          <path d="M86 40 Q95 34 104 40" className="gary-eyebrow-raised" />
          <circle cx="80" cy="80" r="5" className="gary-mouth-open" />
        </g>
      </g>
    </svg>
  );
}
