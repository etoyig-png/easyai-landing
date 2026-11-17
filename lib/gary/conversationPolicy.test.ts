import { describe, expect, it, vi } from 'vitest';
import { conversationPolicy } from './conversationPolicy';
import { generateGaryReply } from './replyPipeline';
import { validateGaryResponse } from './responseValidator';
import type { ChatMessage, LlmProviderAdapter } from './llm/types';
const initial = { knownAnswers: [], visitorTurnCount: 0, assessmentOfferCount: 0, lastVisitorSafetyClass: 'none' as const };
function adapter(text: string): LlmProviderAdapter { return { provider: 'openai', generateChatCompletion: vi.fn().mockResolvedValue({ text, model: 'mock' }) }; }
const sales = ['Can you help my business?', 'Our sales strategy is struggling', 'It is going nowhere', 'We cannot attract new clients', 'How can we become more visible?'];
const specific = ['Our plumbing business receives inquiries without bookings. What should we check first?', 'We call back within five minutes already. What is the next check?', 'I tried AI and thought it was a waste of time. Why choose this approach?', 'Compare GAP, AIM and SmartSite for a website receiving visits without inquiries.'];
describe('three substantive business replies', () => {
  it.each([['sales', sales, 2], ['plumbing', specific, 2]] as const)('enforces %s transcript even when both model attempts are invalid', async (_, questions, offerIndex) => {
    const state = { ...initial }; const history: ChatMessage[] = []; const offers: number[] = [];
    for (const [index, question] of Array.from(questions.entries())) {
      history.push({ role: 'user', content: question });
      const a = adapter('I completely understand.');
      const reply = await generateGaryReply(a, state, history);
      expect(a.generateChatCompletion).toHaveBeenCalledTimes(2);
      expect(reply.usedFallback).toBe(true);
      expect(reply.text).not.toMatch(/could you say a bit more|what.*going on\?/i);
      expect(validateGaryResponse(reply.text, { lastVisitorMessage: question }).valid).toBe(true);
      if (reply.offerAssessment) { offers.push(index); state.assessmentOfferCount++; }
      history.push({ role: 'assistant', content: reply.text });
      if (question.includes('five minutes')) expect(reply.text).toContain('response is already quick');
      if (question.includes('waste of time')) expect(reply.text).toContain('AI may not be the right answer');
      if (question.includes('SmartSite')) expect(reply.text).toContain('closest fit');
    }
    expect(offers).toEqual([offerIndex]);
  });
  it('does not count greetings or trivia and does not promote notes to authority', () => {
    const h: ChatMessage[] = [{role:'user',content:'Hi'}, {role:'assistant',content:'Hi, I am Gary. How can I help today?'}, {role:'user',content:'Why is the sky blue?'}, {role:'assistant',content:'Air scatters blue light more strongly than red light.'}, {role:'user',content:specific[0]}];
    expect(conversationPolicy(initial,h).stage).toBe(1);
  });
  it('offers immediately when directly asked, suppresses refusals, allows explicit re-request', async () => {
    const history: ChatMessage[] = [{role:'assistant',content:'The free assessment is optional.'},{role:'user',content:'No thanks, just advice about my sales.'}];
    const refused = await generateGaryReply(adapter('Start the assessment. [[OFFER_ASSESSMENT]]'), {...initial, assessmentOfferCount:1}, history);
    expect(refused.offerAssessment).toBe(false); expect(refused.text).not.toMatch(/assessment/i);
    history.push({role:'assistant',content:refused.text},{role:'user',content:'I want to take the assessment now.'});
    const requested = await generateGaryReply(adapter('You can start the free assessment. [[OFFER_ASSESSMENT]]'), {...initial,assessmentOfferCount:1}, history);
    expect(requested.offerAssessment).toBe(true);expect(requested.text).not.toContain('[[OFFER_ASSESSMENT]]');
  });
  it.each(['What is the link to the free assessment?', 'assessment link please', 'Can you help me with the assessment?'])('recognizes explicit assessment access: %s', async (question) => {
    const reply = await generateGaryReply(adapter('You can use the free assessment button.'), initial, [{role:'user',content:question}]);
    expect(reply.offerAssessment).toBe(true);
  });
  it('does not confuse an informational question with a start request', () => {
    expect(conversationPolicy(initial,[{role:'user',content:'What is the assessment?'}]).direct).toBe(false);
  });
  it('accepts useful natural wording without a fixed Feel phrase', async () => {
    const a=adapter('Start with the last five calls that did not become appointments. Check whether the caller was offered a clear booking option.');
    const reply=await generateGaryReply(a,initial,[{role:'user',content:specific[0]}]);
    expect(reply.usedFallback).toBe(false);expect(a.generateChatCompletion).toHaveBeenCalledTimes(1);
  });
  it('adds the native CTA by the third answer even when the model omits its marker', async () => {
    const h: ChatMessage[] = [{role:'user',content:'Help with my business'}, {role:'assistant',content:'Start with the outcome your business needs to improve.'}, {role:'user',content:'Our sales strategy is struggling'}, {role:'assistant',content:'Review recent opportunities for the step where they stalled.'}, {role:'user',content:'It is going nowhere'}];
    const reply=await generateGaryReply(adapter('Review the last lost opportunity and identify the next action that was missing.'),initial,h);
    expect(reply.offerAssessment).toBe(true); expect(reply.text).toContain('optional');
  });
  it('asks why once after Keep chatting, restarts on the reason, reoffers once, then respects another no', async () => {
    const state={...initial,assessmentOfferCount:1};
    const h: ChatMessage[]=[{role:'assistant',content:'The free Business AI Assessment is an optional next step.'},{role:'user',content:'Keep chatting'}];
    const a=adapter('I completely understand.');
    const why=await generateGaryReply(a,state,h);
    expect(why.text).toContain('What makes you hesitant');expect(a.generateChatCompletion).not.toHaveBeenCalled();expect(why.offerAssessment).toBe(false);
    h.push({role:'assistant',content:why.text});
    for (const [index,question] of Array.from(['I tried AI and it wasted time.','Our sales follow-up already has an owner.','What next for our sales strategy?'].entries())) {
      h.push({role:'user',content:question});
      expect(conversationPolicy(state,h).stage).toBe(index+1);
      const reply=await generateGaryReply(adapter('I completely understand.'),state,h);
      expect(reply.offerAssessment).toBe(index===2);
      if(reply.offerAssessment)state.assessmentOfferCount++;
      h.push({role:'assistant',content:reply.text});
    }
    h.push({role:'user',content:'No thanks'});
    const last=await generateGaryReply(adapter('Start the assessment. [[OFFER_ASSESSMENT]]'),state,h);
    expect(last.offerAssessment).toBe(false);expect(last.text).not.toContain('What makes you hesitant');
  });
  it.each(['Stop selling. No questions.', 'Just advice, do not sell to me.', 'No more questions please'])('respects a hard refusal: %s', async (question) => {
    const h: ChatMessage[]=[{role:'assistant',content:'The free assessment is optional.'},{role:'user',content:question}];
    const reply=await generateGaryReply(adapter('Start the assessment. [[OFFER_ASSESSMENT]]'),{...initial,assessmentOfferCount:1},h);
    expect(reply.offerAssessment).toBe(false);expect(reply.text).not.toContain('?');
  });
  it('does not treat Keep chatting with no assessment offer as refusal', () => {
    expect(conversationPolicy(initial,[{role:'user',content:'Keep chatting'}]).askWhy).toBe(false);
  });
  it('answers a straightforward SEO question after the other-topic shortcut without clarification', async () => {
    const h: ChatMessage[]=[{role:'user',content:'Something different'},{role:'assistant',content:'Got it. What is on your mind?'},{role:'user',content:'What is SEO?'}];
    const reply=await generateGaryReply(adapter('I completely understand.'),initial,h);
    expect(reply.text).toContain('search engine optimization');expect(reply.text).toContain('local business');expect(reply.text).not.toContain('?');expect(reply.offerAssessment).toBe(false);
  });
  it('gives a short harmless detour reply and asks about the visit only once', async () => {
    const h: ChatMessage[] = [{role:'user',content:'Why is the sky blue?'}];
    const a = adapter('Air scatters blue light. Free branding from nature.');
    const first = await generateGaryReply(a,initial,h);
    expect(first.text).toContain('Free branding from nature.');
    expect(first.text).toContain('What brought you to the Easy AI website today?');
    expect(first.offerAssessment).toBe(false);
    expect(a.generateChatCompletion).toHaveBeenCalledTimes(1);
    h.push({role:'assistant',content:first.text}, {role:'user',content:'Tell me a joke.'});
    const second = await generateGaryReply(adapter('I would tell a spreadsheet joke, but it needs more columns.'),initial,h);
    expect(second.text).not.toContain('?');
    expect(second.offerAssessment).toBe(false);
  });
  it('returns to a stated goal after the detour instead of asking why they came', async () => {
    const h: ChatMessage[] = [{role:'user', content:'We get plumbing calls but few bookings.'}, {role:'assistant',content:'Check whether callers get a clear booking option.'}, {role:'user',content:"What's the weather today?"}];
    const a = adapter('Forecasts are not on my desk. Back to your plumbing calls, start by checking whether callers get a clear booking option.');
    const reply = await generateGaryReply(a,initial,h);
    expect(reply.text).toContain('Back to your plumbing calls');
    expect(reply.text).not.toContain('?');
    expect(reply.offerAssessment).toBe(false);
  });
  it('avoids a visitor question when requested and skips the off-topic bit on sensitive topics', async () => {
    const h: ChatMessage[] = [{role:'user',content:'No more questions. Tell me a joke.'}];
    const quiet = await generateGaryReply(adapter('I am all out of spare spreadsheets.'), initial, h);
    expect(quiet.text).not.toContain('?');
    const sensitive: ChatMessage[] = [{role:'user',content:'I heard a joke about someone harming themselves.'}];
    const s = {...initial,lastVisitorSafetyClass:'sensitive' as const};
    expect(conversationPolicy(s,sensitive).offTopic).toBe(false);
    expect(conversationPolicy(s,sensitive).redirectTo).toBe('none');
  });
  it('does not treat a business question that mentions an off-topic subject as a detour', () => {
    expect(conversationPolicy(initial,[{role:'user',content:'How can I market my pizza business?'}]).offTopic).toBe(false);
  });
  it('preserves sensitivity and never sells in a sensitive reply', async () => {
    const reply = await generateGaryReply(adapter('I completely understand.'), {...initial,lastVisitorSafetyClass:'sensitive'}, [{role:'user',content:'My plumbing business was hacked.'}]);
    expect(reply.offerAssessment).toBe(false);expect(reply.text).not.toMatch(/assessment|That sounds like a business/);
  });
  it('repairs typography without discarding useful answers, but never repairs dangerous content into approval', async () => {
    const a=adapter('That sounds like a missed handoff — check whether each caller gets an appointment option.');
    const reply=await generateGaryReply(a,initial,[{role:'user',content:specific[0]}]);
    expect(reply.usedFallback).toBe(false);expect(a.generateChatCompletion).toHaveBeenCalledTimes(1);expect(reply.text).not.toContain('—');
    const bad=await generateGaryReply(adapter('That sounds bad. <script>alert(1)</script>'),initial,[{role:'user',content:specific[0]}]);
    expect(bad.usedFallback).toBe(true);expect(bad.text).not.toContain('<script>');
  });
});
