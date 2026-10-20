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
  // Easy AI's own internal product names. These must never reach a customer-facing surface:
  // the public position is outcomes ("get found", "capture opportunities"), never the recipe.
  /\bSmartSite\b/i,
  /\bAIM\s+Voice\b/i,
  /\bDigital\s+GAP\b/i,
  /\bGAP\s+Scorecard\b/i,
  // GAP and AIM are matched CASE-SENSITIVELY (no /i) on purpose. Lowercase "gap"/"gaps" and
  // "aim" are ordinary, load-bearing words here - the approved assessment copy itself says
  // "identify likely gaps" - so a case-insensitive rule would reject legitimate output.
  // Only the all-caps product styling is blocked.
  /\bGAP\b/,
  /\bAIM\b/,
  // Added with the marketing/customer-growth pass - internal Easy AI system names.
  /\bCommand\s+Cent(er|re)\b/i,
  /\bConcierge\b/i,
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
// Money claims. The approved behavior forbids quoting prices, savings, revenue or ROI for this
// business - the reassurance is qualitative. Scoped to a currency figure attached to a rate or a
// gain so an owner's own revenue band (which can legitimately appear in their answers) is not
// mistaken for an invented price.
const MONEY_CLAIM_PATTERNS: RegExp[] = [
  // "$40-60/month", "$99 per month", "$1,200 a year"
  /\$\s?\d[\d,]*(\s*(?:-|to)\s*\$?\d[\d,]*)?\s*(?:\/|per\s+|a\s+)(?:month|mo\b|year|yr\b|week)/i,
  // "save $500", "$10k in savings", "ROI of $..."
  /\b(?:save|saves|saving|savings|revenue|profit|roi|return\s+on\s+investment)\b[^.!?]{0,40}\$\s?\d/i,
  /\$\s?\d[\d,]*\s*k?\s*(?:in\s+)?(?:savings|revenue|profit|roi)\b/i,
];

// Claims that something was inspected or measured. This assessment reads submitted answers plus
// whatever is publicly visible; it never audits rankings, metadata, schema, keywords, technical
// performance, competitors, or search configuration. Saying otherwise misrepresents the product.
const FALSE_AUDIT_PATTERNS: RegExp[] = [
  /\b(?:full|complete|comprehensive|detailed|in-depth)\s+(?:audit|analysis|review|scan|assessment\s+of\s+your\s+(?:site|website))\b/i,
  /\bwe\s+(?:audited|crawled|scanned|analyzed|analysed|inspected|measured|benchmarked)\b/i,
  /\bwe\s+(?:checked|reviewed|examined|verified|looked\s+at)\s+your\s+(?:metadata|schema|keywords?|rankings?|competitors?|site\s+speed|technical)/i,
  /\byour\s+(?:google\s+)?rankings?\s+(?:are|is|show|showed|sit|sits)\b/i,
  /\b(?:we\s+found|our\s+scan|our\s+audit|the\s+audit)\s+(?:that\s+)?your\s+(?:site|website|metadata|schema)/i,
];

const INJECTION_PATTERNS: RegExp[] = [/<script/i, /on\w+\s*=\s*["']/i, /javascript:/i];

export function validateResultHtml(html: string, submission: { businessName: string; firstName: string }): ValidationResult {
  const violations: string[] = [];
  const plainText = stripTags(html);

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


  for (const pattern of MONEY_CLAIM_PATTERNS) {
    if (pattern.test(plainText)) {
      violations.push(`unsupported money/ROI claim ("${pattern.source}")`);
      break;
    }
  }

  for (const pattern of FALSE_AUDIT_PATTERNS) {
    if (pattern.test(plainText)) {
      violations.push(`claims an audit/inspection this assessment never performed ("${pattern.source}")`);
      break;
    }
  }

  const whyQuestion = buildWhyQuestion(submission.businessName);
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
