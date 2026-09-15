// Fixed, deterministic — not model-authored — matching the master spec's exact wording (6.2).
// The first turn of any Gary session returns this without ever calling the LLM.
export const GARY_OPENING_QUESTION = 'What would you like help with today?';

export const GARY_OPENING_OPTIONS = [
  'Saving time or reducing repetitive work',
  'Getting more leads or improving follow-up',
  'Understanding how AI could help my business',
  'Improving my current software or workflows',
] as const;

/**
 * The first thing Gary says in a new conversation: the site's artificial-intelligence
 * disclosure, then the fixed opening question. The disclosure comes from server-side site
 * configuration so a white-label site names its own assistant and brand.
 */
export function garyOpeningMessage(disclosure: string): string {
  return `${disclosure.trim()} ${GARY_OPENING_QUESTION}`;
}
