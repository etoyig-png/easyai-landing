import { describe, expect, it, vi } from 'vitest';
import { generateGaryReply } from './replyPipeline';
import type { GaryConversationState } from './systemPrompt';
import type { LlmProviderAdapter } from './llm/types';

const baseState: GaryConversationState = {
  firstName: null,
  businessName: null,
  knownAnswers: [],
  visitorTurnCount: 1,
  assessmentOfferCount: 0,
  lastVisitorSafetyClass: 'none',
};

function fakeAdapter(responses: string[]): LlmProviderAdapter {
  const queue = [...responses];
  return {
    provider: 'openai',
    generateChatCompletion: vi.fn().mockImplementation(async () => ({
      text: queue.shift() ?? '',
      model: 'gpt-5.4-mini',
      provider: 'openai' as const,
      stopReason: 'stop',
    })),
  };
}

describe('generateGaryReply', () => {
  it('returns the first reply unchanged when it passes validation', async () => {
    const adapter = fakeAdapter(['That sounds like a real time sink for you.']);
    const result = await generateGaryReply(adapter, baseState, [{ role: 'user', content: 'We lose leads.' }]);
    expect(result.usedFallback).toBe(false);
    expect(result.text).toBe('That sounds like a real time sink for you.');
    expect(adapter.generateChatCompletion).toHaveBeenCalledTimes(1);
  });

  it('strips the offer-assessment marker and sets offerAssessment', async () => {
    const adapter = fakeAdapter(['The assessment can help with that.[[OFFER_ASSESSMENT]]']);
    const result = await generateGaryReply(adapter, baseState, [{ role: 'user', content: 'We lose leads.' }]);
    expect(result.offerAssessment).toBe(true);
    expect(result.text).not.toContain('[[OFFER_ASSESSMENT]]');
  });

  it('retries once when the first reply fails validation, and uses the corrected reply if it passes', async () => {
    const adapter = fakeAdapter([
      'This is not a small thing, but a real drain on your day.', // violates "not X but Y"
      'That sounds like a real drain on your day.',
    ]);
    const result = await generateGaryReply(adapter, baseState, [{ role: 'user', content: 'We lose leads.' }]);
    expect(result.usedFallback).toBe(false);
    expect(result.text).toBe('That sounds like a real drain on your day.');
    expect(adapter.generateChatCompletion).toHaveBeenCalledTimes(2);
  });

  it('falls back to the safe deterministic reply when both attempts fail validation', async () => {
    const adapter = fakeAdapter([
      'This is not a small thing, but a real drain — leverage it.',
      'Still not great, but leverage it anyway.',
    ]);
    const result = await generateGaryReply(adapter, baseState, [{ role: 'user', content: 'We lose leads.' }]);
    expect(result.usedFallback).toBe(true);
    expect(result.offerAssessment).toBe(false);
    expect(adapter.generateChatCompletion).toHaveBeenCalledTimes(2);
  });
});
