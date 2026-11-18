import { describe, expect, it, vi } from 'vitest';
import { generateGaryReply } from './replyPipeline';
import {
  GARY_DIRECT_LINK_REPLY,
  GARY_STOP_OFFERS_REPLY,
  isScheduledOfferReply,
  isStopOffersRequest,
  upcomingReplyNumber,
} from './assessmentCadence';
import { GARY_PRICING_REPLY } from './pricingReply';
import type { ChatMessage, LlmProviderAdapter } from './llm/types';
import type { GaryConversationState } from './systemPrompt';

const SCHEDULE = [4, 9, 14, 19, 24, 29, 34];

function modelAdapter(): LlmProviderAdapter {
  return {
    provider: 'openai',
    generateChatCompletion: vi.fn().mockImplementation(async () => ({
      text: 'Start with the last five calls that did not turn into a booking and check who owned the follow-up.',
      model: 'mock-model',
      provider: 'openai' as const,
      stopReason: 'stop',
    })),
  };
}

/** Mirrors app/api/gary/message: the counter advances only after a reply is completed. */
async function converse(messages: string[], adapter: LlmProviderAdapter = modelAdapter()) {
  const state: GaryConversationState = { knownAnswers: [], visitorTurnCount: 0, assessmentOfferCount: 0, lastVisitorSafetyClass: 'none' };
  const history: ChatMessage[] = [{ role: 'assistant', content: 'What would you like help with today?' }];
  const replies: { number: number; text: string; offer: boolean }[] = [];
  for (const message of messages) {
    history.push({ role: 'user', content: message });
    const reply = await generateGaryReply(adapter, state, history);
    history.push({ role: 'assistant', content: reply.text });
    state.visitorTurnCount += 1;
    if (reply.offerAssessment) state.assessmentOfferCount += 1;
    replies.push({ number: state.visitorTurnCount, text: reply.text, offer: reply.offerAssessment });
  }
  return replies;
}

const MIXED = [
  'I run a plumbing company and we miss calls after 5pm.',
  'Mostly emergency jobs.',
  'ok',
  'Who do you think wins the Super Bowl this year?',
  'Would an answering service sound robotic?',
  'thanks',
  'We have six trucks.',
  'What would you check first?',
  'Got it.',
];

describe('Start Your Journey schedule: replies 4, 9, 14, 19, 24, 29, 34', () => {
  it('matches the approved numbers exactly, not 4/8/12', () => {
    const scheduled = Array.from({ length: 40 }, (_, index) => index + 1).filter(isScheduledOfferReply);
    expect(scheduled).toEqual([4, 9, 14, 19, 24, 29, 34, 39]);
    expect(isScheduledOfferReply(8)).toBe(false);
    expect(isScheduledOfferReply(12)).toBe(false);
    expect(upcomingReplyNumber(0)).toBe(1);
    expect(upcomingReplyNumber(3)).toBe(4);
  });

  it('shows the button on exactly replies 4, 9 ... 34 through 34 mixed replies, including detours and acknowledgments', async () => {
    const messages = Array.from({ length: 34 }, (_, index) => MIXED[index % MIXED.length]);
    const replies = await converse(messages);
    expect(replies.filter((reply) => reply.offer).map((reply) => reply.number)).toEqual(SCHEDULE);
    // Business replies on the schedule carry a short invitation; a scheduled joke gets the button only.
    for (const reply of replies.filter((item) => item.offer && !/Super Bowl/.test(messages[item.number - 1]))) expect(reply.text).toMatch(/Start Your Journey/);
    for (const reply of replies.filter((item) => !item.offer)) expect(reply.text).not.toMatch(/Start Your Journey|free and optional/);
  });

  it('shows the button on a scheduled off-topic reply, with a real answer to the detour', async () => {
    const adapter: LlmProviderAdapter = {
      provider: 'openai',
      generateChatCompletion: vi.fn().mockResolvedValue({ text: 'My sports knowledge peaks at office fantasy league trash talk. Back to those after-hours calls.', model: 'mock-model' }),
    };
    const replies = await converse(['I run a plumbing company and we miss calls.', 'Mostly after 5pm.', 'ok', 'Who wins the Super Bowl?'], adapter);
    expect(replies[3]).toMatchObject({ number: 4, offer: true });
    expect(replies[3].text).toContain('fantasy league');
    // The joke is not turned into a pitch; the button alone carries the offer.
    expect(replies[3].text).not.toMatch(/Start Your Journey|assessment/i);
  });

  it('honors a direct link request immediately without shifting the schedule', async () => {
    const replies = await converse(['Send me the link please.', 'I run a cleaning company.', 'Quoting takes forever.', 'What would help?', 'ok', 'Can you give me the link to start?', 'thanks', 'Sure.', 'More ideas?']);
    expect(replies[0]).toMatchObject({ number: 1, offer: true, text: GARY_DIRECT_LINK_REPLY });
    expect(replies[5]).toMatchObject({ number: 6, offer: true, text: GARY_DIRECT_LINK_REPLY });
    expect(replies.filter((reply) => reply.offer).map((reply) => reply.number)).toEqual([1, 4, 6, 9]);
    for (const reply of replies) expect(reply.text).not.toMatch(/can(?:'|no)?t send links/i);
  });

  it('suspends scheduled offers after an explicit opt-out, and resumes on renewed interest', async () => {
    const messages = Array.from({ length: 19 }, (_, index) => MIXED[index % MIXED.length]);
    messages[4] = 'Stop offering me the assessment.';
    messages[10] = "Actually, I'm interested. Tell me about the assessment.";
    const replies = await converse(messages);
    expect(replies[4].text).toBe(GARY_STOP_OFFERS_REPLY);
    expect(replies[4].text).not.toMatch(/\bfree\b/i);
    expect(replies.filter((reply) => reply.offer).map((reply) => reply.number)).toEqual([4, 14, 19]);
  });

  it('still opens the assessment on an explicit start request while offers are suspended', async () => {
    const replies = await converse(['We miss calls.', 'Not interested in the assessment.', 'ok', 'Start the assessment.']);
    expect(replies[1].text).toBe(GARY_STOP_OFFERS_REPLY);
    expect(replies[3]).toMatchObject({ number: 4, offer: true, text: GARY_DIRECT_LINK_REPLY });
  });

  it('treats "maybe later" as a soft decline: asks why once and keeps the schedule', async () => {
    const replies = await converse(['We lose Zillow leads.', 'A few hours.', 'What would follow-up look like?', 'More detail?', 'Maybe later on the assessment.', 'Honestly I just do not want a sales call.', 'ok', 'thanks', 'What else?']);
    expect(replies[4].text).toMatch(/hesitant/);
    expect(replies.filter((reply) => /hesitant/.test(reply.text))).toHaveLength(1);
    expect(replies.filter((reply) => reply.offer).map((reply) => reply.number)).toEqual([4, 9]);
  });

  it.each([
    'What do you charge?', 'How much does Easy AI charge?', 'How much does this cost?',
    'What would it cost to set something up?', 'What would it cost to set something like that up?',
    'How much does it run?', 'How much does that run?', 'What does it cost?', 'What would something like this cost?',
    'What does a setup like that cost?', 'Is this expensive?', 'What kind of budget would I need?',
    'How much would it be to set this up?', 'What would setup cost?',
  ])('answers %s with the approved price statement', async (question) => {
    const replies = await converse([question]);
    expect(replies[0].text).toBe(GARY_PRICING_REPLY);
  });

  it('a failed request leaves the count unchanged, so the schedule does not advance', async () => {
    const adapter = modelAdapter();
    const state: GaryConversationState = { knownAnswers: [], visitorTurnCount: 3, assessmentOfferCount: 0, lastVisitorSafetyClass: 'none' };
    const history: ChatMessage[] = [{ role: 'user', content: 'We miss calls after hours.' }];
    vi.mocked(adapter.generateChatCompletion).mockRejectedValueOnce(new Error('provider down'));
    await expect(generateGaryReply(adapter, state, history)).rejects.toThrow('provider down');
    // The route increments visitorTurnCount only after a completed reply, so the retry is still reply 4.
    const retry = await generateGaryReply(adapter, state, history);
    expect(retry.offerAssessment).toBe(true);
  });

  it('distinguishes explicit opt-outs from soft declines and unrelated "not interested" remarks', () => {
    for (const text of ['Stop asking me about the assessment', 'No more offers', "I don't want the assessment", 'Not interested.', 'Why do you keep pushing it?', 'Just advice, do not sell to me.']) expect(isStopOffersRequest(text)).toBe(true);
    for (const text of ['Maybe later', 'Not right now', 'Keep chatting', 'Our customers are not interested in discounts', 'Stop asking so many questions']) expect(isStopOffersRequest(text)).toBe(false);
  });
});

describe("price intent does not swallow questions about the visitor's own losses", () => {
  it.each(['What would it cost me to keep missing calls?', 'How much did missed calls cost us?', 'What is the cost of missing calls?', 'How much time will I save?'])('%s is not a pricing request', async (question) => {
    const { asksGaryPrice } = await import('./pricingReply');
    expect(asksGaryPrice(question)).toBe(false);
  });
});

describe('correction leaks are removed before a visitor sees them', () => {
  it.each([
    ["You're right. Let me try again.\n\nSet up the after-hours message first.", 'Set up the after-hours message first.'],
    ["That's fair feedback. Let me restart.\n\nAI can read data from Dentrix.", 'AI can read data from Dentrix.'],
    ['Let me rephrase: check who owns the callback.', 'check who owns the callback.'],
  ])('strips %j', async (raw, expected) => {
    const { stripCorrectionLeak } = await import('./replyPipeline');
    expect(stripCorrectionLeak(raw)).toBe(expected);
  });
  it('keeps normal text untouched', async () => {
    const { stripCorrectionLeak } = await import('./replyPipeline');
    expect(stripCorrectionLeak("You're right that after-hours calls matter most.")).toBe("You're right that after-hours calls matter most.");
  });
});

describe('soft declines from the independent live scorecard', () => {
  it('asks why once after "maybe another day for the assessment" (cleaning scenario, reply 6)', async () => {
    const replies = await converse(['We quote cleaning jobs by phone and it takes forever.', 'About 20 quotes a week.', 'ok', 'What would you set up first?', 'Sounds good.', 'I am good with the general plan, but maybe another day for the assessment.']);
    expect(replies[5].text).toMatch(/hesitant/);
  });
  it.each(['Not today, thanks.', 'Maybe some other day for that.', 'Not this week for the assessment.'])('treats %s as a soft decline, not an opt-out', async (message) => {
    const replies = await converse(['We miss calls after hours.', 'ok', 'thanks', 'What would you check first?', message]);
    expect(replies[4].text).toMatch(/hesitant/);
  });
});
