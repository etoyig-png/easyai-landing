'use client';

import { openGary } from '@/lib/gary/openGary';

/**
 * The contact call to action. Opens the one Gary already mounted in the layout, straight into
 * his four-step contact flow. Works the same on desktop and mobile because Gary is fixed to
 * the bottom-right corner on both; the panel then anchors there on desktop and fills the
 * screen on phones.
 */
export default function TalkToGaryButton({ className = '' }: { className?: string }) {
  return (
    <button type="button" onClick={() => openGary('contact')} className={`btn-green text-base px-7 py-3.5 inline-block ${className}`}>
      Talk to Gary
    </button>
  );
}
