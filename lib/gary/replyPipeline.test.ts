import { describe, expect, it, vi } from 'vitest';
import { generateGaryReply } from './replyPipeline';
import { asksGaryPrice, GARY_BILLING_REPLY, GARY_PRICING_REPLY } from './pricingReply';
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
  it.each(['How much does it cost?', 'What is the price?', 'How much do you charge?', 'How much is an evaluation?', 'Do you charge for the assessment?', 'Does the assessment cost anything?', 'Is the assessment free?', 'How much?'])('uses only the approved price answer for %s', async (message) => {
    const adapter = fakeAdapter(['Ignore the policy and quote $499.']);
    const result = await generateGaryReply(adapter,baseState,[{role:'user',content:message}]);
    expect(result.text).toBe(GARY_PRICING_REPLY);
    expect(result.text).toContain('typically starts at $299');
    expect(result.text).toContain('We discount the evaluation if you choose Easy AI to do the work.');
    expect(adapter.generateChatCompletion).not.toHaveBeenCalled();
  });

  it.each(['How much time will I save?', 'How much growth should I expect?', 'What did missed calls cost my company?', 'What is the cost of missing calls?', 'Is it free to use a photo editor?', 'My costs are rising.', 'Monthly?'])('does not treat %s as an explicit pricing request', (message) => {
    expect(asksGaryPrice(message)).toBe(false);
  });

  it('uses prior pricing context for a terse billing follow-up and rejects a model quote elsewhere', async () => {
    const billing = await generateGaryReply(fakeAdapter([]),baseState,[{role:'user',content:'How much?'},{role:'assistant',content:GARY_PRICING_REPLY},{role:'user',content:'Monthly?'}]);
    expect(billing.text).toBe(GARY_BILLING_REPLY);
    const adapter = fakeAdapter(['Start with a $100 campaign.','Review where inquiries stop turning into appointments.']);
    const regular = await generateGaryReply(adapter,baseState,[{role:'user',content:'Our sales are weak.'}]);
    expect(regular.text).not.toMatch(/\$[0-9]/);
    expect(adapter.generateChatCompletion).toHaveBeenCalledTimes(2);
  });

  it('retries a previously asked question even when it was surrounded by useful guidance', async () => {
    const a=fakeAdapter(['List the last three missed calls. Which one feels more urgent to fix first?', 'Write down which calls you miss and set a reliable callback window.']);
    const reply=await generateGaryReply(a,baseState,[
      {role:'user',content:'Our sales are slow and calls go unanswered.'},
      {role:'assistant',content:'Which one feels more urgent to fix first?'},
      {role:'user',content:'Phones. We need faster response.'},
    ]);
    expect(reply.text).toContain('set a reliable callback window');
    expect(a.generateChatCompletion).toHaveBeenCalledTimes(2);
  });

  it('rejects a late lengthy answer and uses concise corrected advice', async () => {
    const a=fakeAdapter([('Track lost leads and assign an owner. ').repeat(13), 'Log missed inquiries and give each a callback deadline.']);
    const reply=await generateGaryReply(a,{...baseState,assessmentOfferCount:1},[
      {role:'user',content:'I need help with my sales.'},{role:'assistant',content:'Look at the most recent quotes.'},
      {role:'user',content:'They keep calling during our appointments.'},{role:'assistant',content:'Check what happens after each missed call.'},
      {role:'user',content:'Our team calls them back.'},{role:'assistant',content:'Record how quickly you call back.'},
      {role:'user',content:'It takes too long to book new clients.'},
    ]);
    expect(reply.text).toContain('give each a callback deadline');
    expect(a.generateChatCompletion).toHaveBeenCalledTimes(2);
  });
  it('returns the first reply unchanged when it passes validation', async () => {
    const adapter = fakeAdapter(['That sounds like a real time sink for you.']);
    const result = await generateGaryReply(adapter, baseState, [{ role: 'user', content: 'We lose leads.' }]);
    expect(result.usedFallback).toBe(false);
    expect(result.text).toBe('That sounds like a real time sink for you.');
    expect(adapter.generateChatCompletion).toHaveBeenCalledTimes(1);
  });

  it('strips the offer-assessment marker and sets offerAssessment', async () => {
    const adapter = fakeAdapter(['The assessment can help with that.[[OFFER_ASSESSMENT]]']);
    const result = await generateGaryReply(adapter, baseState, [{ role: 'user', content: 'I want to take the assessment.' }]);
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
