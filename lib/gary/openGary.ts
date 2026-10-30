/**
 * The one way for page content to open Gary. The launcher is mounted once in the root layout
 * and listens for this event, so a "Talk to Gary" button anywhere on the site opens the SAME
 * Gary rather than mounting a second one. Client-safe: no server imports.
 *
 * Gary is position:fixed in the bottom-right corner on every viewport (mobile only scales the
 * cluster, it never moves it), so opening him needs no scrolling on either layout. On phones
 * the panel then covers the screen; on desktop it anchors bottom-right at 380 by 600.
 */
export const OPEN_GARY_EVENT = 'easyai:open-gary';

export type OpenGaryIntent = 'contact';

export function openGary(intent?: OpenGaryIntent): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_GARY_EVENT, { detail: { intent: intent ?? null } }));
}
