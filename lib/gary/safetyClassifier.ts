export type SafetyClass = 'none' | 'sensitive';

// Keyword-based, not a second LLM call — cheap, deterministic, and only needs to catch the
// broad category, not a precise diagnosis. Errs toward "sensitive" on ambiguous input, since
// suppressing a joke costs nothing and telling one at the wrong moment costs trust.
const SENSITIVE_PATTERNS: RegExp[] = [
  // medical
  /\b(diagnos|symptom|medication|prescri|surgery|hospital|cancer|illness|disease|mental health|therapist|suicid)/i,
  // legal
  /\b(lawsuit|sue|sued|attorney|lawyer|legal action|subpoena|court date|divorce|custody)/i,
  // financial emergency
  /\b(bankrupt|foreclosure|eviction|can'?t pay|behind on (rent|payroll|payments)|debt collector|repossess)/i,
  // employment risk
  /\b(fired|laid off|layoff|getting fired|lose my job|losing my job|harassment|discriminat)/i,
  // security incident
  /\b(hacked|data breach|ransomware|phishing|leaked (data|password)|compromised account)/i,
  // self-harm / violence
  /\b(suicid|kill myself|self.?harm|hurt myself|going to hurt|violence|threat(en)?)/i,
  // illegal activity
  /\b(illegal|fraud|launder|steal|stolen|drugs?\b.*\bsell|weapon)/i,
];

export function classifyVisitorMessageSafety(text: string): SafetyClass {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(text)) ? 'sensitive' : 'none';
}
