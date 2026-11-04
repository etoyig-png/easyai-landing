'use client';

import { useState } from 'react';

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
  idleGlanceActive: boolean;
  animate?: boolean;
  onFinished?: () => void;
};

/** Exact recovered assets. Scale the sheet to its reference coordinates, then show cell zero. */
export default function GaryCharacter({ pose, idleGlanceActive, animate = false, onFinished }: GaryCharacterProps) {
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const showVideo = animate && !finished;
  function finish() { setFinished(true); onFinished?.(); }
  return (
    <div className="relative h-full w-full" aria-hidden="true" data-gary-media>
      <svg viewBox="0 0 360 360" width="100%" height="100%" className="gary-character"
        data-gary-pose={pose} data-gary-idle={idleGlanceActive ? 'true' : 'false'}
        style={{ overflow: 'hidden', visibility: showVideo && playing ? 'hidden' : 'visible' }}>
        <image href="/gary/gary-poses.webp" width="1440" height="1080" />
      </svg>
      {showVideo && <video src="/gary/gary-approved.webm" className="absolute inset-0 h-full w-full" autoPlay muted playsInline preload="none"
        onPlaying={() => setPlaying(true)} onEnded={finish} onError={finish}
        aria-hidden="true" tabIndex={-1}>
      </video>}
    </div>
  );
}
