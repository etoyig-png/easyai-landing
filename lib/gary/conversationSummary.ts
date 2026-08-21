import type { LlmProviderAdapter, ChatMessage } from './llm/types';
import { GARY_MAX_TRANSCRIPT_CHARS, PROVIDER_TIMEOUT_MS, withTimeout } from '../requestSafety';

export interface GaryConversationSummary {
  conversationReason: string;
  mainProblem: string;
  businessContext: string;
  moneyImpact: string;
  trustImpact: string;
  desiredOutcome: string;
  importantConcern: string;
  assessmentPositioning: string;
  assessmentResponse: string;
  humanHelpRequested: string;
  contactDetailsProvided: string;
  finalOutcome: string;
  recommendedNextStep: string;
}

const NOT_ESTABLISHED = 'Not established';

const SUMMARY_FIELDS: (keyof GaryConversationSummary)[] = [
  'conversationReason',
  'mainProblem',
  'businessContext',
  'moneyImpact',
  'trustImpact',
  'desiredOutcome',
  'importantConcern',
  'assessmentPositioning',
  'assessmentResponse',
  'humanHelpRequested',
  'contactDetailsProvided',
  'finalOutcome',
  'recommendedNextStep',
];

const SUMMARY_SYSTEM_PROMPT = `You summarize a completed Gary chat conversation for Easy AI's internal Command Center. Read the transcript and fill in exactly these fields, one short sentence or phrase each: ${SUMMARY_FIELDS.join(', ')}.

Rules:
- Use "${NOT_ESTABLISHED}" for any field the conversation genuinely did not cover. Never guess or invent an answer to fill a field.
- Do not fabricate facts, numbers, or claims the visitor never stated.
- Keep this a business summary, not a transcript restatement.
- Respond with a single JSON object with exactly these keys and string values, nothing else — no markdown, no code fences, no commentary.`;

function buildTranscriptText(history: ChatMessage[]): string {
  return history.map((m) => `${m.role === 'user' ? 'Visitor' : 'Gary'}: ${m.content}`).join('\n').slice(-GARY_MAX_TRANSCRIPT_CHARS);
}

function parseSummary(raw: string): GaryConversationSummary | null {
  let parsed: unknown;
  try {
    // Model output may still be wrapped in a code fence despite the instruction not to — strip it defensively.
    const cleaned = raw.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const record = parsed as Record<string, unknown>;
  const summary: Partial<GaryConversationSummary> = {};
  for (const field of SUMMARY_FIELDS) {
    const value = record[field];
    summary[field] = typeof value === 'string' && value.trim() ? value.trim() : NOT_ESTABLISHED;
  }
  return summary as GaryConversationSummary;
}

/** Builds Toy's exact structured-summary field list from the conversation. Never guesses — unset fields read "Not established". */
export async function buildGaryConversationSummary(adapter: LlmProviderAdapter, history: ChatMessage[]): Promise<GaryConversationSummary> {
  if (history.length === 0) {
    return Object.fromEntries(SUMMARY_FIELDS.map((f) => [f, NOT_ESTABLISHED])) as unknown as GaryConversationSummary;
  }

  const result = await withTimeout(adapter.generateChatCompletion({
    systemPrompt: SUMMARY_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildTranscriptText(history) }],
    maxTokens: 800,
  }), PROVIDER_TIMEOUT_MS, 'summary provider');

  const parsed = parseSummary(result.text);
  if (parsed) return parsed;

  // Unparseable summary — never invent one. Every field reads "Not established" rather than
  // showing malformed or partial model output as if it were real.
  return Object.fromEntries(SUMMARY_FIELDS.map((f) => [f, NOT_ESTABLISHED])) as unknown as GaryConversationSummary;
}
