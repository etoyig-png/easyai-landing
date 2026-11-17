import { classifyVisitorMessageSafety } from './safetyClassifier';
import type { ChatMessage } from './llm/types';
import type { GaryConversationState } from './systemPrompt';

const BUSINESS = /\b(SEO|search engine|business|scheduling|team|staff|operations|sales|leads?|clients?|customers?|book(?:ing|ings)?|plumb(?:er|ing)|strateg(?:y|ies)|marketing|visib(?:le|ility)|follow.up|website|site|GAP|AIM|SmartSite|workflow|admin(?:istration)?|delivery|revenue)\b/i;
const FOLLOWUP = /\b(it|that|they|them|we|our|next|already|tried|going|same)\b/i;
const OFF_TOPIC = /\b(weather|sky|jokes?|trivia|sports?|recipes?|capital city|dinosaurs?|pizza|movies?|video games?|football|basketball|cats?|dogs?)\b/i;
export const VISIT_QUESTION = "What brought you to the Easy AI website today?";
const SOFT_DECLINE = /\b(?:no thanks|not interested|just advice|do not sell|don't sell|stop pitching)\b|\b(?:no|skip|decline|don't want|do not want|not ready for)\b[^.!?]{0,35}\bassessment\b/i;
const HARD_STOP = /\b(?:stop (?:selling|pitching|asking)|do not sell|don't sell|just advice|no (?:more )?questions|leave me alone|never (?:ask|offer))\b/i;
const ASK = /\b(?:start|take|begin|want|ready for|give me|send me|where is|how do i)\b[^.!?]{0,40}\bassessment\b/i;
const ASK_LINK = /\bassessment\b[^.!?]{0,40}\b(?:link|button|please)\b|\b(?:link|button|help me with)\b[^.!?]{0,40}\bassessment\b/i;
const OLD_FALLBACK = /I want to make sure I get this right for you/i;
export type ConversationPolicy = { business: boolean; stage: 0 | 1 | 2 | 3; offer: boolean; refused: boolean; direct: boolean; askWhy: boolean; noQuestions: boolean; offTopic: boolean; redirectTo: "ask" | "resume" | "none" };

/** Derive from persisted transcript; no new schema, hidden counter or provider call. */
export function conversationPolicy(state: GaryConversationState, history: ChatMessage[]): ConversationPolicy {
  let context = false, count = 0, refused = false, pending = false;
  let lastAssistant = '', business = false, direct = false, offTopic = false, visitQuestionAsked = false;
  let softDeclines = 0, waitingForReason = false, restarted = false, askWhy = false, hardStop = false, noQuestions = false;
  for (const message of history) {
    if (message.role === 'assistant') {
      if (pending && !OLD_FALLBACK.test(message.content) && !/^\s*[^.!]*\?\s*$/.test(message.content)) count++;
      pending = false; lastAssistant = message.content;
      visitQuestionAsked ||= message.content.includes(VISIT_QUESTION);
      continue;
    }
    if (message.role !== 'user') continue;
    const text = message.content;
    offTopic = OFF_TOPIC.test(text) && !BUSINESS.test(text);
    askWhy = false;
    if (/no (?:more )?questions|stop asking/i.test(text)) noQuestions = true;
    direct = (ASK.test(text) || ASK_LINK.test(text)) && !SOFT_DECLINE.test(text) && !HARD_STOP.test(text);
    const decline = SOFT_DECLINE.test(text) || (/^\s*(?:no|nope|not now|keep chatting)[.!\s]*$/i.test(text) && /assessment/i.test(lastAssistant));
    if (HARD_STOP.test(text)) { hardStop = true; refused = true; waitingForReason = false; }
    else if (decline) {
      softDeclines++; refused = true;
      if (softDeclines === 1 && !hardStop && !restarted && /assessment/i.test(lastAssistant)) { waitingForReason = true; askWhy = true; }
      else { hardStop = true; waitingForReason = false; }
    }
    let objection = false;
    if (waitingForReason && !decline && !HARD_STOP.test(text) && !direct && !offTopic && !/^\s*(?:hi|hello|ok|okay|thanks|sure)[.!\s]*$/i.test(text)) {
      waitingForReason = false; restarted = true; refused = false; count = 0; objection = true;
    }
    if (direct) { refused = false; waitingForReason = false; }
    business = !offTopic && (objection || BUSINESS.test(text) || (context && FOLLOWUP.test(text)));
    if (business) context = true;
    pending = business && !decline && !askWhy && classifyVisitorMessageSafety(text) === 'none';
  }
  const safe = state.lastVisitorSafetyClass === 'none';
  const stage = safe && business && !askWhy ? Math.min(count + 1, 3) as 1 | 2 | 3 : 0;
  const canOffer = state.assessmentOfferCount === 0 || (restarted && state.assessmentOfferCount < 2);
  const harmlessDetour = safe && offTopic && !direct;
  const redirectTo = !harmlessDetour || hardStop || noQuestions ? "none" : context ? "resume" : visitQuestionAsked ? "none" : "ask";
  return { business, stage, refused, direct, noQuestions, offTopic: harmlessDetour, redirectTo, askWhy: safe && askWhy, offer: safe && !refused && (!hardStop || direct) && (direct || (stage === 3 && canOffer)) };

}

export function conversationInstruction(p: ConversationPolicy): string {
  if (p.offTopic) return 'This is a harmless detour. Give one short, playful reply to what they actually said. Be accurate or say you cannot verify, and do not mock anyone. Do not pitch the assessment. ' + (p.redirectTo === 'resume' ? 'Then briefly reconnect to the actual goal they already shared. Do not ask another question.' : 'Do not ask a question or add a redirect; the application handles that.');
  const phase = p.stage === 1 ? 'FEEL: briefly recognize the stated business difficulty, then give a concrete useful first step. Use natural wording, not a mandatory opening phrase.'
    : p.stage === 2 ? 'FELT: acknowledge why the concern or skepticism is reasonable without claiming other customers experienced it. In natural wording, give the next practical check, honoring corrections.'
    : p.stage === 3 ? 'FOUND: give a grounded practical direction. Use natural wording without repeating an earlier opening. Do not invent results or testimonials.' : 'Answer directly without a sales technique.';
  return `Current reply: ${phase}\nAnswer the concrete question first with useful detail; never substitute a vague clarification for an answer. At most one genuinely necessary question, and only after useful guidance. Do not repeat a question already answered. ${p.noQuestions ? 'The visitor asked for no more questions. Do not ask any.' : ''}\n${p.offer ? 'Include a short OPTIONAL free Business AI Assessment invitation and the native [[OFFER_ASSESSMENT]] marker. Do not require it to continue chatting.' : 'Do not pitch or invite the assessment or emit its marker in this reply. Answer factual questions about it if asked.'}`;
}

export function safeConversationFallback(last: string, p: ConversationPolicy): string {
  if (p.offTopic) {
    const remark = /\bsky\b/i.test(last) && /\bblue\b/i.test(last) ? 'Air scatters blue light more strongly than red light. The sky didn’t even need a branding team.'
      : /\bweather\b/i.test(last) ? 'No live forecast on my desk, and I’d rather not cook the weather books.'
      : 'That one’s a little outside my accounting department.';
    return p.redirectTo === 'resume' ? remark + ' Let’s get back to what you came here to work on.' : remark;
  }
  if (/\bSEO\b|search engine optimi[sz]ation/i.test(last)) return 'SEO means search engine optimization: improving how search engines understand and show your website. For a local business, start with clear service pages, accurate business details and useful answers to customer questions.' + (p.offer ? ' The free Business AI Assessment is an optional next step.' : '');
  if (p.direct && p.offer) return 'You can start the free Business AI Assessment using the button below, or keep chatting if you prefer.';
  if (!p.business || p.stage === 0) return "I couldn't produce a reliable answer just now. You can try again or use /contact for human help.";
  const prefix = p.stage === 1 ? 'That sounds like a business problem worth narrowing down. ' : p.stage === 2 ? 'That concern makes sense. ' : 'A useful next step is to isolate where the customer journey stops. ';
  const answer = /\b(?:GAP|AIM|SmartSite)\b/i.test(last)
    ? 'GAP addresses discovery through Google and AI answers. AIM covers customer response. SmartSite addresses visits becoming inquiries, so that is the closest fit when visitors leave without contacting you.'
    : /tried AI|waste of time/i.test(last)
      ? 'Easy AI starts with the business problem, checks whether a simpler process would work, and keeps recommendations human-reviewed. Start with one measurable task; AI may not be the right answer.'
      : /five minutes|already.*(?:quick|fast)|(?:quick|fast).*already/i.test(last)
        ? 'Since response is already quick, check that callers receive a clear appointment option and that someone owns confirming it. Review a few unbooked calls for where the decision stopped.'
        : /plumb|calls|book/i.test(last)
          ? 'Review a few calls that did not become bookings. Check service fit, whether a clear appointment was offered, and what happened after the call before assuming more leads are needed.'
          : /visib|new clients/i.test(last)
            ? 'GAP addresses discovery through Google and AI answers. Start by checking that your public Google business information accurately describes your services and contact details, then check whether your website makes the next step clear. This is guidance, not a completed visibility audit.'
            : /\bbusiness\b/i.test(last) && !BUSINESS.test(last.replace(/business/gi, ''))
              ? 'Easy AI can help with customer discovery, response, workflow and practical AI strategy. Start with the business outcome you need to improve; the right fix may be a simpler process rather than another tool.'
              : 'Review five recent opportunities and identify the last step each reached: discovery, inquiry, proposal or follow-up. Start with the repeated point where progress stops.';
  return prefix + answer + (p.offer ? ' The free Business AI Assessment can help prioritize that work, if you want.' : '');
}
