// Deterministic coverage of Toy's 12-point quality check: banned phrases/dashes/"not X but
// Y" (criterion 7), no named third-party products or prices (8, partial — "invented result/
// fact/case study" is not mechanically checkable and is prompt-governed only), Feel/Felt/Found
// used more than once (4), more than one question per reply (3, and feeds into 12), reply
// length (11), and the Wigglesworth naming rule. Criteria 1, 2, 5, 6, 9, and 10 (did it answer
// the question, is it specific to this conversation, forced sales technique, unnecessary
// repetition, humor appropriateness, natural assessment tie-in) are not reliably checkable by
// regex/heuristic and are enforced at the prompt level plus the correction-retry pass, not here
// — same limitation already documented in lib/actionPlanValidator.ts for the assessment email.

export interface GaryValidationContext {
  /** The visitor's most recent message — needed for the naming-reveal check below. */
  lastVisitorMessage: string;
}

export interface GaryValidationResult {
  valid: boolean;
  violations: string[];
}

// Same core list as lib/actionPlanValidator.ts (the assessment email's validator) — kept as a
// separate, independent list rather than imported, since Gary's rules are allowed to diverge
// (e.g. Gary is conversational, so the assessment's structural checks don't apply here).
const NARRATION_PATTERNS: RegExp[] = [
  /\bi searched\b/i,
  /\bas an ai\b/i,
  /\bi'?m just an ai\b/i,
  /\bi cannot browse\b/i,
];

const PROHIBITED_PHRASES: string[] = [
  "it's not just",
  "this isn't about",
  'i completely understand',
  'that must be frustrating',
  "you're absolutely right",
  'unlock',
  'leverage',
  'revolutionize',
  'game-changing',
  'transformative',
  'seamless',
  'robust',
  'cutting-edge',
];
const NOT_BUT_PATTERN = /\bnot\b[^.!?]{0,80}?\bbut\b/i;

// Gary must never name a specific third-party product — including the same brand blocklist
// used in the assessment email, since these are the exact products Easy AI has decided not to
// publicly recommend.
const BRAND_BLOCKLIST: RegExp[] = [/\bCRR\b/i, /\bintelligent\s+website\b/i, /\bgo\s*high\s*level\b/i, /\bMerchynt\b/i];

const PRICE_MENTION = /\$\d/;

const INJECTION_PATTERNS: RegExp[] = [/<script/i, /on\w+\s*=\s*["']/i, /javascript:/i];

// Feel / Felt / Found — at most one may fire per response, never more.
const FEEL_PATTERN = /\bsounds like\b|\bthat sounds\b|\byou'?re dealing with\b/i;
const FELT_PATTERN = /\bowners? (i'?ve|we'?ve)\b|\ba lot of (owners|business owners)\b|\bothers? in (that|your) (position|situation)\b/i;
const FOUND_PATTERN = /\bwhat usually helps\b|\bwhat (tends to|often) (help|work)\b|\bthe assessment can\b/i;

const MAX_REPLY_WORDS = 120;

function countSentenceQuestions(text: string): number {
  const matches = text.match(/[^.!?]*\?/g);
  return matches ? matches.length : 0;
}

function nameRevealContextAllows(lastVisitorMessage: string): boolean {
  return /\b(last name|full name|surname|wigglesworth)\b/i.test(lastVisitorMessage);
}

export function validateGaryResponse(replyText: string, context: GaryValidationContext): GaryValidationResult {
  const violations: string[] = [];
  const text = replyText ?? '';

  if (!text.trim()) {
    violations.push('empty reply');
    return { valid: false, violations };
  }

  if (/—/.test(text)) violations.push('em dash present');
  if (/–/.test(text)) violations.push('en dash present');

  for (const pattern of NARRATION_PATTERNS) {
    if (pattern.test(text)) violations.push(`meta/narration leak ("${pattern.source}")`);
  }

  for (const phrase of PROHIBITED_PHRASES) {
    if (text.toLowerCase().includes(phrase)) violations.push(`prohibited AI phrase "${phrase}"`);
  }
  if (NOT_BUT_PATTERN.test(text)) violations.push('prohibited "not X, but Y" construction');

  for (const brand of BRAND_BLOCKLIST) {
    if (brand.test(text)) violations.push('named a blocklisted third-party product');
  }

  if (PRICE_MENTION.test(text)) violations.push('mentions a dollar figure — Gary never discusses pricing');

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) violations.push('unescaped/injected content matched');
  }

  const triadHits = [FEEL_PATTERN, FELT_PATTERN, FOUND_PATTERN].filter((pattern) => pattern.test(text)).length;
  if (triadHits > 1) violations.push('used more than one of Feel/Felt/Found in a single response');

  const questionCount = countSentenceQuestions(text);
  if (questionCount > 1) violations.push('asked more than one question in a single response');

  const wordCount = text.trim().split(/\s+/).length;
  if (wordCount > MAX_REPLY_WORDS) violations.push(`reply is longer than ${MAX_REPLY_WORDS} words — could likely be shorter`);

  if (/wigglesworth/i.test(text) && !nameRevealContextAllows(context.lastVisitorMessage)) {
    violations.push('revealed the last name "Wigglesworth" without being asked for it');
  }

  return { valid: violations.length === 0, violations };
}
