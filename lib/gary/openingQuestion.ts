// Fixed, deterministic — not model-authored — matching the master spec's exact wording (6.2).
// The first turn of any Gary session returns this without ever calling the LLM.
export const GARY_OPENING_QUESTION = 'What would you like help with today?';

export const GARY_OPENING_OPTIONS = [
  'Saving time or reducing repetitive work',
  'Getting more leads or improving follow-up',
  'Understanding how AI could help my business',
  'Improving my current software or workflows',
] as const;

// Contact-page opening. Also deterministic and LLM-free, so the Contact page's primary
// experience still works when the model is unavailable — the visitor always gets a real reply.
export const GARY_CONTACT_OPENING =
  "Happy to help you reach the team. I can pass your message to the right person at Easy AI. To start, what is your name, and what is this about?";

export const GARY_CONTACT_OPTIONS = [
  'I have a question about your services',
  'I would like to talk about my business',
  'Something about an existing project',
  'Something else',
] as const;
