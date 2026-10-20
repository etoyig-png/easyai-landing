export interface ActionPlanFields {
  opening: string;
  challengeOneHeadline: string;
  challengeOneStory: string;
  actionOneHeadline: string;
  actionOneDoNow: string;
  actionOneAutomationOpportunity: string;
  challengeTwoHeadline: string;
  challengeTwoStory: string;
  actionTwoHeadline: string;
  actionTwoDoNow: string;
  actionTwoAutomationOpportunity: string;
  easyAiSummary: string;
}

export interface ActionPlanValidationResult {
  valid: boolean;
  violations: string[];
}

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
];

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

// "Paige" is also a common first name; a submitter legitimately named Paige will
// false-positive here. This is an accepted, documented limitation of a literal
// blocklist, not something a regex can resolve without semantic analysis.
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

const INJECTION_PATTERNS: RegExp[] = [/<script/i, /on\w+\s*=\s*["']/i, /javascript:/i];

// The two verified grammar errors from production, banned outright everywhere.
const VERIFIED_GRAMMAR_ERRORS: RegExp[] = [/owners i've speak with/i, /loose time tracking/i];

const EASY_AI_MENTION = /\beasy ai\b/i;
const PRICE_MENTION = /\$\d/;

function checkSharedRules(fieldName: string, text: string, violations: string[]): void {
  if (!text || !text.trim()) {
    violations.push(`${fieldName}: empty`);
    return;
  }
  if (/—/.test(text)) violations.push(`${fieldName}: em dash present`);
  if (/–/.test(text)) violations.push(`${fieldName}: en dash present`);

  for (const pattern of NARRATION_PATTERNS) {
    if (pattern.test(text)) {
      violations.push(`${fieldName}: internal research narration leaked`);
      break;
    }
  }

  for (const phrase of PROHIBITED_PHRASES) {
    if (text.toLowerCase().includes(phrase)) {
      violations.push(`${fieldName}: prohibited AI phrase "${phrase}"`);
    }
  }
  if (NOT_BUT_PATTERN.test(text)) {
    violations.push(`${fieldName}: prohibited "not X, but Y" construction`);
  }

  for (const brand of BRAND_BLOCKLIST) {
    if (brand.test(text)) {
      violations.push(`${fieldName}: blocklisted brand/product name matched`);
    }
  }

  for (const pattern of CLIENT_CLAIM_PATTERNS) {
    if (pattern.test(text)) {
      violations.push(`${fieldName}: invented Easy AI client claim`);
      break;
    }
  }

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      violations.push(`${fieldName}: unescaped/injected content matched`);
    }
  }

  for (const pattern of VERIFIED_GRAMMAR_ERRORS) {
    if (pattern.test(text)) {
      violations.push(`${fieldName}: contains a known verified grammar error ("${pattern.source}")`);
    }
  }

  if (PRICE_MENTION.test(text)) {
    violations.push(`${fieldName}: mentions a dollar figure — cost/pricing sections were removed from the narrative`);
  }
}

/** Rough sentence count via terminal punctuation — not perfect grammar analysis, just a countable heuristic. */
function countSentences(text: string): number {
  const matches = text.trim().match(/[^.!?]+[.!?]+/g);
  return matches ? matches.length : text.trim().length > 0 ? 1 : 0;
}

export function validateActionPlanFields(fields: ActionPlanFields): ActionPlanValidationResult {
  const violations: string[] = [];

  const allFields: [string, string][] = [
    ['opening', fields.opening],
    ['challengeOneHeadline', fields.challengeOneHeadline],
    ['challengeOneStory', fields.challengeOneStory],
    ['actionOneHeadline', fields.actionOneHeadline],
    ['actionOneDoNow', fields.actionOneDoNow],
    ['actionOneAutomationOpportunity', fields.actionOneAutomationOpportunity],
    ['challengeTwoHeadline', fields.challengeTwoHeadline],
    ['challengeTwoStory', fields.challengeTwoStory],
    ['actionTwoHeadline', fields.actionTwoHeadline],
    ['actionTwoDoNow', fields.actionTwoDoNow],
    ['actionTwoAutomationOpportunity', fields.actionTwoAutomationOpportunity],
    ['easyAiSummary', fields.easyAiSummary],
  ];

  for (const [name, text] of allFields) {
    checkSharedRules(name, text ?? '', violations);
  }

  // Easy AI must not be named inside Step 1 / Step 2 (the do-now + automation fields).
  for (const name of [
    'actionOneDoNow',
    'actionOneAutomationOpportunity',
    'actionTwoDoNow',
    'actionTwoAutomationOpportunity',
  ] as const) {
    if (EASY_AI_MENTION.test(fields[name] ?? '')) {
      violations.push(`${name}: mentions Easy AI, which is only allowed in the How Easy AI Helps section`);
    }
  }

  const summarySentences = countSentences(fields.easyAiSummary ?? '');
  if (summarySentences !== 2) {
    violations.push(`easyAiSummary: expected exactly 2 sentences, counted ${summarySentences}`);
  }
  if (!EASY_AI_MENTION.test(fields.easyAiSummary ?? '')) {
    violations.push('easyAiSummary: does not mention Easy AI');
  }

  return { valid: violations.length === 0, violations };
}
