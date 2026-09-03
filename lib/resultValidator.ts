import { escapeHtmlText } from './htmlEscape';

export interface ValidationResult {
  valid: boolean;
  violations: string[];
  /** Informational only — not a pass/fail gate. See buildWhyQuestion / validateResultHtml comments. */
  businessNameMentionCount: number;
}

/** The single sentence the SYSTEM_PROMPT requires as the literal final narrative paragraph. */
export function buildWhyQuestion(businessName: string): string {
  const name = escapeHtmlText(businessName.trim());
  return `One final question worth thinking about: What made you build ${name}, and what do you want the business to make possible for you?`;
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let idx = 0;
  while (true) {
    const found = haystack.indexOf(needle, idx);
    if (found === -1) break;
    count += 1;
    idx = found + needle.length;
  }
  return count;
}

// Internal research/enrichment status leaking into customer-facing copy. These are the
// actual failure mode seen in production — Claude explaining its own search process or
// reasoning instead of silently complying with "skip the detail if nothing was found."
const NARRATION_PATTERNS: RegExp[] = [
  /\bi searched\b/i,
  /\bi could\s?n[o']?t (confirm|find|verify)\b/i,
  /\bi was\s?n[o']?t able to (confirm|find|verify)\b/i,
  /\bi didn[o']?t find\b/i,
  /\bno verifiable( public)? listing\b/i,
  /\bkept the hook centered\b/i,
  /\bno invented details\b/i,
  /\bbased on my (search|research)\b/i,
  /\bmy (search|research) (didn[o']?t|did not|turned up|found)\b/i,
  /\baccording to my (search|research)\b/i,
  /\bunable to (verify|confirm|find)\b/i,
  /\b(couldn[o']?t|could not) (confirm|verify) anything (verifiable|specific)\b/i,
];

// Literal AI-writing-habit phrases called out by name, plus the "not X, but Y"
// construction (matched as a same-sentence span rather than a fixed phrase).
const PROHIBITED_PHRASES: string[] = [
  "you're in good company",
  'you are in good company',
  'if any of this lands',
  'quietly saving',
  'low hum',
  'on-ramp',
  'on ramp',
  'move the needle',
  'genuinely fine',
  'reasonable place to be standing',
  'the thing that stood out most',
  "here's the part",
  'here is the part',
  'the deeper goal may be',
];
const NOT_BUT_PATTERN = /\bnot\b[^.!?]{0,80}?\bbut\b/i;

// Explicit brand blocklist. "Paige" is also a common first name — a submitter
// legitimately named Paige will false-positive here. Documented, not solved:
// the brief requires this exact blocklist and offers no way to distinguish
// "the product Paige" from "a customer named Paige" without semantic analysis.
const BRAND_BLOCKLIST: RegExp[] = [
  /\bCRR\b/i,
  /\bintelligent\s+website\b/i,
  /\bgo\s*high\s*level\b/i,
  /\bPaige\b/i,
  /\bMerchynt\b/i,
];

const CLIENT_CLAIM_PATTERNS: RegExp[] = [
  /\beasy ai'?s? clients?\b/i,
  /\bour clients?\b/i,
  /\bclients (we've|we have) (worked with|helped)\b/i,
  /\bclients (who|that) (saw|achieved|got|reported)\b/i,
  /\bpast clients?\b/i,
];

// Content that could only plausibly reach the email via unescaped/injected input —
// legitimate generated prose never contains these regardless of source.
const INJECTION_PATTERNS: RegExp[] = [/<script/i, /on\w+\s*=\s*["']/i, /javascript:/i];
const UNSUPPORTED_CLAIM_PATTERNS: RegExp[] = [
  /[$£€]\s*\d/i,
  /\bROI\b/i,
  /\baudit(?:ed|ing|s)?\b/i,
  /\b(?:football|basketball|sports?)\b/i,
];

export function validateResultHtml(html: string, submission: { businessName: string; firstName: string; favoriteTeam?: string }): ValidationResult {
  const violations: string[] = [];
  const plainText = stripTags(html);
  const whyQuestion = buildWhyQuestion(submission.businessName);
  // The exact required closing question necessarily repeats the submitted business
  // name. Exclude only that one required sentence from claim-pattern scanning so a
  // legitimate name such as "Smith Sports" cannot reject an otherwise safe result.
  const claimScanText = plainText.replace(whyQuestion, '');

  if (/—/.test(html)) violations.push('em dash present');
  if (/–/.test(html)) violations.push('en dash present');

  for (const pattern of NARRATION_PATTERNS) {
    if (pattern.test(plainText)) {
      violations.push(`internal research narration leaked ("${pattern.source}")`);
      break;
    }
  }

  for (const phrase of PROHIBITED_PHRASES) {
    if (plainText.toLowerCase().includes(phrase)) {
      violations.push(`prohibited AI phrase: "${phrase}"`);
    }
  }
  if (NOT_BUT_PATTERN.test(plainText)) {
    violations.push('prohibited "not X, but Y" construction');
  }

  for (const brand of BRAND_BLOCKLIST) {
    if (brand.test(plainText)) {
      violations.push(`blocklisted brand/product name matched ("${brand.source}")`);
    }
  }

  for (const pattern of CLIENT_CLAIM_PATTERNS) {
    if (pattern.test(plainText)) {
      violations.push(`invented Easy AI client claim ("${pattern.source}")`);
      break;
    }
  }

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(html)) {
      violations.push(`unescaped/injected content matched ("${pattern.source}")`);
    }
  }

  const freeActions = plainText.match(/\bFree action [1-3]:/g) ?? [];
  const hasOneOfEach = [1, 2, 3].every((number) => freeActions.filter((action) => action === `Free action ${number}:`).length === 1);
  if (freeActions.length !== 3 || !hasOneOfEach || /\bFree action \d+:/i.test(plainText.replace(/\bFree action [1-3]:/g, ''))) {
    violations.push('must contain exactly three free actions');
  }

  for (const pattern of UNSUPPORTED_CLAIM_PATTERNS) {
    if (pattern.test(claimScanText)) violations.push(`unsupported money, audit, or sports content matched ("${pattern.source}")`);
  }
  if (submission.favoriteTeam && plainText.toLowerCase().includes(submission.favoriteTeam.toLowerCase())) {
    violations.push('favorite team leaked into customer-facing content');
  }

  const whyCount = countOccurrences(plainText, whyQuestion);
  if (whyCount === 0) {
    violations.push('missing mandatory closing WHY question');
  } else if (whyCount > 1) {
    violations.push('duplicate WHY question');
  } else {
    const whyIndex = plainText.indexOf(whyQuestion);
    const remainder = plainText.slice(whyIndex + whyQuestion.length).trim();
    if (remainder.length > 0) {
      violations.push('WHY question is not the final narrative paragraph');
    }
  }

  const businessNameMentionCount = submission.businessName.trim()
    ? countOccurrences(plainText.toLowerCase(), submission.businessName.trim().toLowerCase())
    : 0;

  return { valid: violations.length === 0, violations, businessNameMentionCount };
}
