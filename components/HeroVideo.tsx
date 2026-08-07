'use client';
import { useRef, useEffect, useState } from 'react';

export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying]           = useState(false);
  const [muted, setMuted]               = useState(true);
  const [autoplayFailed, setAutoplayFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setAutoplayFailed(true);
      return;
    }
    video.play()
      .then(() => setPlaying(true))
      .catch(() => setAutoplayFailed(true));
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) { video.pause(); setPlaying(false); }
      },
      { threshold: 0.15 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) { video.play(); setPlaying(true); setAutoplayFailed(false); }
    else { video.pause(); setPlaying(false); }
  }

  function toggleSound() {
    const video = videoRef.current;
    if (!video) return;
    if (muted) {
      video.muted = false; video.currentTime = 0; video.play();
      setPlaying(true); setMuted(false); setAutoplayFailed(false);
    } else { video.muted = true; setMuted(true); }
  }

  return (
    <div className="relative w-full overflow-hidden bg-navy-950" style={{ aspectRatio: '16/9' }}>
      <video
        ref={videoRef}
        src="/easy-ai-buy-back-time-hero.mp4"
        muted loop playsInline preload="metadata"
        className="w-full h-full object-contain"
        aria-label="An electrician uses AI to finish business work and return home sooner to his family."
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      {autoplayFailed && (
        <div className="absolute inset-0 flex items-center justify-center bg-navy-950/50">
          <button onClick={togglePlay} aria-label="Play video"
            className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-900">
            <svg className="w-7 h-7 text-navy-900 ml-1" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><polygon points="5,3 19,12 5,21" /></svg>
          </button>
        </div>
      )}
      <div className="absolute bottom-3 right-3 flex gap-2">
        <button onClick={togglePlay} aria-label={playing ? 'Pause video' : 'Play video'}
          className="w-8 h-8 rounded-full bg-navy-900/80 backdrop-blur-sm text-white flex items-center justify-center hover:bg-navy-900 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
          {playing ? (
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
          ) : (
            <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><polygon points="5,3 19,12 5,21" /></svg>
          )}
        </button>
        <button onClick={toggleSound} aria-label={muted ? 'Enable sound (restarts video)' : 'Mute video'}
          className="w-8 h-8 rounded-full bg-navy-900/80 backdrop-blur-sm text-white flex items-center justify-center hover:bg-navy-900 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
          {muted ? (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path d="M11 5L6 9H2v6h4l5 4V5z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}