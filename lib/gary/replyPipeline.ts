import type { LlmProviderAdapter, ChatMessage } from './llm/types';
import { buildGarySystemPrompt, type GaryConversationState } from './systemPrompt';
import { validateGaryResponse } from './responseValidator';

const OFFER_ASSESSMENT_MARKER = '[[OFFER_ASSESSMENT]]';

export interface GaryReply {
  text: string;
  offerAssessment: boolean;
  model: string;
  usedFallback: boolean;
}

function extractOfferMarker(rawText: string): { text: string; offerAssessment: boolean } {
  const offerAssessment = rawText.includes(OFFER_ASSESSMENT_MARKER);
  const text = rawText.replace(OFFER_ASSESSMENT_MARKER, '').trim();
  return { text, offerAssessment };
}

const FALLBACK_REPLY = "I want to make sure I get this right for you — could you say a bit more about what's going on?";

export async function generateGaryReply(
  adapter: LlmProviderAdapter,
  state: GaryConversationState,
  history: ChatMessage[]
): Promise<GaryReply> {
  const systemPrompt = buildGarySystemPrompt(state);
  const lastVisitorMessage = [...history].reverse().find((m) => m.role === 'user')?.content ?? '';

  const first = await adapter.generateChatCompletion({ systemPrompt, messages: history });
  const firstExtracted = extractOfferMarker(first.text);
  const firstValidation = validateGaryResponse(firstExtracted.text, { lastVisitorMessage });

  if (firstValidation.valid) {
    return { text: firstExtracted.text, offerAssessment: firstExtracted.offerAssessment, model: first.model, usedFallback: false };
  }

  // One controlled correction attempt — same validate/correct/fallback pattern used for the
  // assessment email (lib/anthropic.ts's generateActionPlanFields).
  const correctionMessages: ChatMessage[] = [
    ...history,
    { role: 'assistant', content: first.text },
    {
      role: 'user',
      content: `Your last reply violated these rules and must be rewritten: ${firstValidation.violations.join('; ')}. Reply again, following the system prompt exactly, with none of those violations. Keep it natural and conversational.`,
    },
  ];
  const second = await adapter.generateChatCompletion({ systemPrompt, messages: correctionMessages });
  const secondExtracted = extractOfferMarker(second.text);
  const secondValidation = validateGaryResponse(secondExtracted.text, { lastVisitorMessage });

  if (secondValidation.valid) {
    return { text: secondExtracted.text, offerAssessment: secondExtracted.offerAssessment, model: second.model, usedFallback: false };
  }

  // Never show an unvalidated reply merely because the API returned text — fall back to a safe,
  // deterministic redirect instead.
  return { text: FALLBACK_REPLY, offerAssessment: false, model: 'fallback', usedFallback: true };
}
