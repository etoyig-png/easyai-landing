/**
 * Gary's contact flow. Locked to four steps and nothing else:
 *
 *   1. NAME      What's your name?
 *   2. CONTACT   What's the best way to reach you: email, phone, or both?   (ONE field)
 *   3. REASON    What can we help you with?                                 (choices + free typing)
 *   4. CONFIRM   Summary, then "Yes, send it" or "Make a change"
 *
 * This is deterministic script, not a model conversation. Every prompt, option and transition
 * lives here so the four-step ceiling is enforced by code, the wording cannot drift, and the
 * whole thing is unit-testable without a language model or a database.
 *
 * The draft is carried by the client and echoed back with every turn, so the server keeps no
 * flow state between requests and no migration is needed. The server validates each answer
 * and only ever persists anything at the final send. Tampering with the draft changes only
 * what the visitor sends about themselves, which they control anyway.
 */

export type ContactFlowStep = 'name' | 'contact' | 'reason' | 'confirm';
export type ContactField = 'name' | 'contact' | 'reason';

export interface ContactDraft {
  step: ContactFlowStep;
  name?: string;
  contact?: string;
  reason?: string;
}

export type ContactFlowRequest =
  | { action: 'start' }
  | { action: 'answer'; draft: ContactDraft; text: string }
  | { action: 'change'; draft: ContactDraft; field: ContactField }
  | { action: 'confirm'; draft: ContactDraft };

export interface ContactFlowReply {
  text: string;
  draft: ContactDraft;
  /** Whether the text field should be the primary input for this turn. */
  freeText: boolean;
  placeholder?: string;
  options?: string[];
  /** Only set by 'confirm': the caller performs the send, then reports the outcome. */
  send?: { name: string; email?: string; phone?: string; reason: string };
}

export const CONTACT_FLOW_PROMPTS = {
  name: "What's your name?",
  // The brief's wording carries an em dash. Gary never uses em dashes, so the same question is
  // punctuated with a colon.
  contact: "What's the best way to reach you: email, phone, or both?",
  reason: 'What can we help you with?',
  confirm: 'Does everything look right?',
} as const;

export const CONTACT_REASON_OPTIONS = [
  'I have a question about Easy AI',
  'I want to talk about my business',
  "I'm interested in an AI assessment",
  "I'm interested in a SmartSite / website",
  "I'm interested in Gary / AIM",
  'I need help with something I already have',
] as const;

/** Rendered by the client as a hint that focuses the text field. It is never sent as an answer. */
export const CONTACT_SOMETHING_ELSE = 'Something else...';

export const CONTACT_CONFIRM_YES = 'Yes, send it';
export const CONTACT_CONFIRM_CHANGE = 'Make a change';
export const CONTACT_CHANGE_OPTIONS: Array<{ label: string; field: ContactField }> = [
  { label: 'My name', field: 'name' },
  { label: 'How to reach me', field: 'contact' },
  { label: 'What I need', field: 'reason' },
];

/** Marker stored as a system-role message so a session can send exactly one contact request. */
export const CONTACT_SENT_MARKER = 'contact-request:sent';

/**
 * Outcome messages, parameterised by brand so a white-label site reads naturally. The bare
 * constants are the Easy AI wording and remain the source of truth for tests.
 */
export function contactOutcomeTexts(brandName: string) {
  return {
    sent: `Sent. Your message is with the ${brandName} team, and someone will reach out using the contact info you gave.`,
    alreadySent: `That message already reached the ${brandName} team. If you want to add something, press Start Over and send a new one.`,
    limited: "I can't send another message from here right now. Please try again in a little while, or take the free assessment and we'll follow up.",
    failed: "I couldn't send that just now. Please try again in a moment.",
    // The contact and its handoff are saved; only the email to the team failed. Say exactly that.
    savedNotSent: `I've saved your details for the ${brandName} team, but the message itself didn't go through just now. Please press Yes, send it again in a moment.`,
    // A second confirmation arrived while the first is still being sent. Nothing is duplicated.
    inProgress: "I'm sending that now. Give me a moment.",
  } as const;
}

const EASY_AI_TEXTS = contactOutcomeTexts('Easy AI');
export const CONTACT_SENT_TEXT = EASY_AI_TEXTS.sent;
export const CONTACT_ALREADY_SENT_TEXT = EASY_AI_TEXTS.alreadySent;
export const CONTACT_LIMITED_TEXT = EASY_AI_TEXTS.limited;
export const CONTACT_FAILED_TEXT = EASY_AI_TEXTS.failed;

const NAME_MAX = 120;
const CONTACT_MAX = 200;
const REASON_MAX = 1000;

/**
 * Phrases that mean "I want to reach a person." Deterministic on purpose: the brief requires
 * Gary to enter the contact flow immediately, with no qualification first, and a model cannot
 * be relied on to do that every time. Kept tight so ordinary business talk that happens to
 * mention email or a phone does not trigger it.
 */
const CONTACT_INTENT_PATTERNS: RegExp[] = [
  /\b(?:talk|speak|chat)\s+(?:to|with)\s+(?:the\s+)?(?:owner|founder|someone|somebody|a\s+(?:real\s+)?(?:person|human)|a\s+human|toy|etoyi|the\s+team)\b/i,
  /\b(?:have|get|let)\s+(?:someone|somebody|a\s+person|the\s+owner|toy)\s+(?:call|email|contact|reach|text|message)\s+me\b/i,
  /\b(?:call|email|text|phone|contact)\s+me\b/i,
  /\b(?:i\s+(?:want|need|would\s+like|'d\s+like)\s+to|can\s+i|how\s+(?:do|can)\s+i)\s+(?:contact|reach|email|call|talk\s+to|speak\s+to|speak\s+with|get\s+in\s+touch\s+with|get\s+a\s+hold\s+of)\s+(?:easy\s*ai|you\s+guys|someone|somebody|the\s+team|the\s+owner|a\s+person|a\s+human)\b/i,
  /\bcan\s+(?:someone|somebody|you\s+guys|the\s+owner)\s+(?:call|email|contact|reach\s+out|get\s+back)\b/i,
  /\b(?:get|be)\s+in\s+touch\b/i,
  /\bleave\s+(?:a|my)\s+(?:message|number|email|contact)\b/i,
  /\bcontact\s+(?:easy\s*ai|the\s+team|the\s+owner|you\s+guys)\b/i,
  /\b(?:i\s+)?(?:want|need)\s+(?:a\s+)?(?:call|callback|call\s+back)\b/i,
  /\bspeak\s+with\s+(?:someone|somebody)\b/i,
];

export function detectContactIntent(message: string): boolean {
  const text = message.trim();
  if (!text) return false;
  return CONTACT_INTENT_PATTERNS.some((pattern) => pattern.test(text));
}

// The top-level domain stops at the first punctuation so "dana@example.com, 555-0100" yields a
// clean address rather than one with a comma glued on.
const EMAIL_PATTERN = /[^\s@<>,;]+@[^\s@<>,;]+\.[A-Za-z]{2,}/;

/**
 * Pulls an email and/or a phone number out of one free-typed field. Returns null when neither
 * is present, so step 2 can ask again instead of moving on with nothing to reach the visitor at.
 */
export function parseContactDetails(input: string): { email?: string; phone?: string } | null {
  const text = input.trim();
  const email = text.match(EMAIL_PATTERN)?.[0];
  const withoutEmail = email ? text.replace(email, ' ') : text;
  const digits = withoutEmail.replace(/\D/g, '');
  const phone = digits.length >= 7 && digits.length <= 15 ? withoutEmail.replace(/[^\d+()\-.\s]/g, ' ').replace(/\s+/g, ' ').trim() : undefined;
  if (!email && !phone) return null;
  return { ...(email ? { email } : {}), ...(phone ? { phone } : {}) };
}

function firstMissing(draft: ContactDraft): ContactFlowStep {
  if (!draft.name) return 'name';
  if (!draft.contact) return 'contact';
  if (!draft.reason) return 'reason';
  return 'confirm';
}

function promptFor(step: ContactFlowStep, draft: ContactDraft): ContactFlowReply {
  switch (step) {
    case 'name':
      return { text: CONTACT_FLOW_PROMPTS.name, draft: { ...draft, step }, freeText: true, placeholder: 'Your name' };
    case 'contact':
      return {
        text: CONTACT_FLOW_PROMPTS.contact,
        draft: { ...draft, step },
        freeText: true,
        placeholder: 'Email, phone, or both',
      };
    case 'reason':
      return {
        text: CONTACT_FLOW_PROMPTS.reason,
        draft: { ...draft, step },
        freeText: true,
        placeholder: 'Or type it here',
        options: [...CONTACT_REASON_OPTIONS, CONTACT_SOMETHING_ELSE],
      };
    case 'confirm':
      return {
        text: `Here's what I have. Name: ${draft.name}. Reach you at: ${draft.contact}. What you need: ${draft.reason}. ${CONTACT_FLOW_PROMPTS.confirm}`,
        draft: { ...draft, step },
        freeText: false,
        options: [CONTACT_CONFIRM_YES, CONTACT_CONFIRM_CHANGE],
      };
  }
}

/**
 * Prefixes the AI disclosure onto the reply that opens the flow, for the case where a contact
 * button opens Gary straight into step one and no conversation came first. The step itself,
 * its draft and its input are untouched: this is wording on step one, not a step.
 */
export function withOpeningDisclosure(reply: ContactFlowReply, disclosure: string): ContactFlowReply {
  return { ...reply, text: `${disclosure.trim()} ${reply.text}` };
}

/**
 * Advances the flow by exactly one step, or re-asks the current step when the answer is not
 * usable. Never adds a step: after any edit, the next prompt is the first field still missing,
 * which is the confirmation when nothing is missing.
 */
export function advanceContactFlow(request: ContactFlowRequest): ContactFlowReply {
  if (request.action === 'start') {
    return promptFor('name', { step: 'name' });
  }

  const draft: ContactDraft = { ...request.draft };

  if (request.action === 'change') {
    return promptFor(request.field, draft);
  }

  if (request.action === 'confirm') {
    if (!draft.name || !draft.contact || !draft.reason) return promptFor(firstMissing(draft), draft);
    const details = parseContactDetails(draft.contact);
    if (!details) return promptFor('contact', { ...draft, contact: undefined });
    return {
      ...promptFor('confirm', draft),
      send: { name: draft.name, ...details, reason: draft.reason },
    };
  }

  // action === 'answer'
  const text = request.text.trim();
  switch (draft.step) {
    case 'name': {
      if (!text) return { ...promptFor('name', draft), text: "I didn't catch a name. What should I call you?" };
      draft.name = text.slice(0, NAME_MAX);
      break;
    }
    case 'contact': {
      if (!text || !parseContactDetails(text)) {
        return { ...promptFor('contact', draft), text: 'I need an email or a phone number to pass along. Which works best for you?' };
      }
      draft.contact = text.slice(0, CONTACT_MAX);
      break;
    }
    case 'reason': {
      // "Something else..." is a hint, not an answer. If it arrives anyway, stay on this step.
      if (!text || text === CONTACT_SOMETHING_ELSE) {
        return { ...promptFor('reason', draft), text: 'Go ahead and type what you need help with.' };
      }
      draft.reason = text.slice(0, REASON_MAX);
      break;
    }
    case 'confirm': {
      // Free text at the confirmation is treated as a reason correction, the most likely intent.
      if (text) draft.reason = text.slice(0, REASON_MAX);
      break;
    }
  }
  return promptFor(firstMissing(draft), draft);
}
