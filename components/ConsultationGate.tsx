'use client';

import { useState } from 'react';

/**
 * Consultation video gate.
 *
 * The scheduling button stays disabled until the visitor has actually watched the consultation
 * video through to the end (the <video> element's own `ended` event), so the required order is
 * enforced rather than suggested.
 *
 * Both URLs arrive as props resolved on the server from environment variables. They are NOT
 * NEXT_PUBLIC_ values baked into the JS bundle — a booking link and a video link have to reach
 * the browser to be usable, but nothing else about the configuration does, and no token, calendar
 * id, or credential is ever passed here.
 *
 * When either value is unconfigured the component says so plainly instead of rendering a dead
 * button or a fake confirmation.
 */
export default function ConsultationGate({
  videoUrl,
  schedulerUrl,
}: {
  videoUrl?: string;
  schedulerUrl?: string;
}) {
  const [watched, setWatched] = useState(false);

  return (
    <div>
      {videoUrl ? (
        <video
          className="w-full rounded-xl bg-navy-900"
          controls
          playsInline
          preload="metadata"
          onEnded={() => setWatched(true)}
        >
          <source src={videoUrl} />
          Your browser cannot play this video.
        </video>
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-navy-800 bg-navy-900 px-6 text-center">
          <p className="text-sm text-silver-light">
            The consultation video has not been configured yet, so scheduling is not open from this
            page. Easy AI will follow up by email with your next step.
          </p>
        </div>
      )}

      <div className="mt-6">
        {schedulerUrl ? (
          <>
            <a
              href={watched && videoUrl ? schedulerUrl : undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!watched || !videoUrl}
              tabIndex={watched && videoUrl ? 0 : -1}
              className={`btn-green px-7 py-3.5 text-base ${
                watched && videoUrl ? '' : 'pointer-events-none opacity-50'
              }`}
            >
              Request a Consult Time
            </a>
            <p aria-live="polite" className="mt-3 font-sans text-xs text-silver-dark">
              {!videoUrl
                ? 'Scheduling opens once the consultation video is available.'
                : watched
                  ? 'Opens the Easy AI scheduler. You are requesting a time — it is not confirmed until Easy AI confirms it.'
                  : 'Watch the short video above to unlock scheduling.'}
            </p>
          </>
        ) : (
          <p className="font-sans text-sm text-silver-light">
            Online scheduling is not connected yet. Easy AI will reach out by email to arrange your
            consultation time.
          </p>
        )}
      </div>
    </div>
  );
}
