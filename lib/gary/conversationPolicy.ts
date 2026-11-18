import { classifyVisitorMessageSafety } from './safetyClassifier';
import { EASY_AI_CONTACT_EMAIL } from '../emailRouting';
import type { ChatMessage } from './llm/types';
import type { GaryConversationState } from './systemPrompt';

const BUSINESS = /\b(SEO|search engine|business|scheduling|team|staff|operations|sales|leads?|clients?|customers?|book(?:ing|ings)?|plumb(?:er|ing)|strateg(?:y|ies)|marketing|visib(?:le|ility)|follow.up|website|site|GAP|AIM|SmartSite|workflow|admin(?:istration)?|delivery|revenue)\b/i;
const FOLLOWUP = /\b(it|that|they|them|we|our|next|already|tried|going|same|how much|monthly|annually|yearly|pricing|costs?|prices?|per month|how long|this|those|more|less|instead|actually|because|why|how|what else|which one|not really|not yet|every day|at lunch|during|usually|mostly|only|twice|about ten|a few|each time|all day)\b/i;
const ACKNOWLEDGMENT = /^\s*(?:hi|hello|hey|good morning|good afternoon|good evening|ok|okay|thanks|thank you|got it|understood|that makes sense|makes sense|sounds good|sure|yes|yep|no|nope)(?:[,! .]*(?:thanks|thank you))?[.!?\s]*$/i;
export type BusinessTopic = 'discovery' | 'response' | 'conversion' | 'knowledge' | 'workflow' | 'reporting' | 'sales' | 'marketing' | 'business';
// Symptoms describe the work, not an industry or a product the visitor must know.
const TOPICS: Array<[BusinessTopic, RegExp]> = [
  ['discovery', /\b(SEO|search engine|Google|GAP|visib(?:le|ility)|getting noticed|find(?:ing)? (?:me|us)|nobody (?:finds|notices) (?:me|us)|not (?:getting|being) (?:noticed|found)|found online|show(?:ing)? up|search results|new clients|people nearby|other crews first)\b/i],
  ['response', /\b(AIM|phones?|calls?|voicemail|missed messages|inbox|respond(?:ing)?|repl(?:y|ies)|response|after hours|callers?)\b/i],
  ['conversion', /\b(SmartSite|website|site|visitors?|checkout|cart|landing page|contact form|inquir(?:y|ies)|book(?:ing|ings)?|appointments?)\b/i],
  ['knowledge', /\b(BRIQ|Company ?IQ|company knowledge|same questions|same things|inconsistent answers|answers? (?:are|is) wrong|different versions|asks? me how|wrong answers|product information|FAQ|documents?|knowledge base)\b/i],
  ['reporting', /\b(dashboards?|reports?|reporting|metrics|numbers|spreadsheets?|performance|data scattered|different systems|falling behind|can't see|cannot see)\b/i],
  ['workflow', /\b(workflow|operations|scheduling|admin(?:istration)?|manual(?:ly)?|retypes?|retyping|copy(?:ing)?|paste|repetitive|repeating|paperwork|hours? (?:on|doing)|time drains?|tasks?|handoffs?|bottlenecks?|team|staff|delivery)\b/i],
  ['sales', /\b(sales|leads?|clients?|customers?|proposals?|quotes?|deals?|pipeline|revenue|follow.up|closing|buy(?:ers|ing)?|sell(?:ing)?)\b/i],
  ['marketing', /\b(marketing|promotion|advertis(?:e|ing|ements?)|ads|clicks|campaigns?|social media|content|audience|reach|traffic|posts?)\b/i],
  ['business', /\b(business|strategy|strategies|plumb(?:er|ing))\b/i],
];
function detectTopic(text: string): BusinessTopic | null {
  // Prefer an explicit corrected problem clause over the superseded symptom.
  const corrected = text.split(/(?:the (?:real )?(?:issue|problem) is|instead[, :]?|but (?:really|actually))/i).at(-1) ?? text;
  return TOPICS.find(([, pattern]) => pattern.test(corrected))?.[0] ?? null;
}
const FACTUAL = /^\s*(?:(?:can you |please )?(?:explain|define)|what (?:is|are|does)|what(?:'s| is) (?:a|an|the meaning)|how does)\b/i;
const CONCERN = /\b(because|worried|concerned|skeptical|hesitant|afraid|too (?:much|long|expensive)|waste(?:d)?|wasting|tried AI|paperwork|privacy|confidential|trust|not useful|won't help|would not help|don't see|do not see|no time|sounds like|cost|budget)\b/i;
const READY = /\b(?:ready|want|need|would like)\b[^.!?]{0,35}\b(?:tailored|personalized|specific|hands.on)\b[^.!?]{0,25}\b(?:help|advice|plan|guidance)\b/i;
const NO_QUESTIONS = /\b(?:no (?:more )?questions|stop asking|(?:do not|don't) (?:want|ask)(?: any| more)? questions|quit asking)\b/i;
const OFF_TOPIC = /\b(weather|sky|jokes?|trivia|sports?|recipes?|capital city|dinosaurs?|pizza|movies?|video games?|football|basketball|baseball|soccer|hockey|super ?bowl|world series|playoffs|election|vot(?:e|ing)|president|politic(?:s|al)?|celebrit(?:y|ies)|tv shows?|netflix|horoscope|zodiac|favou?rite (?:food|color|colour|movie|team|topping|song|band|show|book)|cats?|dogs?|prime numbers|planets?|solar system|music|song|capital of|history of)\b/i;
const POLITICS = /\b(election|vot(?:e|ing)|president|politic(?:s|al)?|democrat|republican)\b/i;
export const VISIT_QUESTION = "What brought you to the Easy AI website today?";
const SOFT_DECLINE = /\b(?:no thanks|not interested|just advice|do not sell|don't sell|stop pitching|maybe later|not (?:right )?now|another time|some other time|pass for now|i'll pass|i will pass)\b|\b(?:no|skip|decline|don't want|do not want|not ready for)\b[^.!?]{0,35}\bassessment\b/i;
const HARD_STOP = /(?:^\s*stop[.!?\s]*$|^\s*stop[.!]\s*I(?:'m| am) done[.!\s]*$|^\s*I(?:'m| am) done[.!\s]*$)|\b(?:stop (?:selling|pitching|asking|offering)|quit (?:selling|pitching|asking|offering)|do not sell|don't sell|just advice|no (?:more )?questions|leave me alone|never (?:ask|offer))\b/i;
// Access requests require an action/destination, not a broad "want" or "how do I".
const ASK = /\b(?:start|take|begin|open|launch)\s+(?:(?:the|a|an|my|free|business|AI|opportunity)\s+)*assessment\b|\bready for\s+(?:(?:the|a|free|business|AI)\s+)*assessment\b/i;
const ASK_LINK = /\b(?:send|give|share|drop|show|get)\s+(?:me\s+)?(?:the|a|that|your)\s+link\b|\blink to (?:start|begin|get started|it)\b|\bassessment\s+(?:link|button)\b|\b(?:link|button)\b[^.!?]{0,40}\bassessment\b|\b(?:give|send|show) me\s+(?:(?:the|a|free|business|AI)\s+)*assessment\b|\bhelp me with\s+(?:(?:the|a|free|business|AI)\s+)*assessment\b/i;
const ASK_ACCESS = /\bwhere is\s+(?:(?:the|a|free|business|AI)\s+)*assessment\b|\bhow (?:do|can) I (?:get to|access|open|start|take)\s+(?:(?:the|a|free|business|AI)\s+)*assessment\b/i;
const NEGATED_ACCESS = /\b(?:do not|don't|not ready to|not asking to)\b[^.!?]{0,35}\b(?:start|take|begin|open|access|send|give|show)\b[^.!?]{0,40}\bassessment\b/i;
const ASSESSMENT_INFORMATION = /\bassessment\b/i;
const INFORMATION_VERBS = /\b(?:understand|explain|prepare|preparing|covers?|involves?|learn about|tell me about)\b|\bwhat (?:is|does|will|the assessment)|\b(?:link|button) (?:does|means|is for)\b/i;
const OLD_FALLBACK = /I want to make sure I get this right for you/i;
/** True when the visitor explicitly asks for the assessment link or to start it. */
export function isDirectAssessmentRequest(raw: string): boolean {
  const normalized = raw.replace(/[’‘]/g, "'");
  const text = /^\s*Start Your Journey[.! ]*$/i.test(normalized) ? 'start the assessment' : normalized.replace(/Start Your Journey/gi, 'assessment');
  const negatedAccess = NEGATED_ACCESS.test(text) || /\b(?:never asked|not asking|do not want|don't want|not interested in)\b[^.!?]{0,60}\bassessment\b/i.test(text);
  if (negatedAccess || SOFT_DECLINE.test(text) || HARD_STOP.test(text)) return false;
  if (/\b(?:where is|what(?:'s| is))\b[^.!?]{0,20}\b(?:link|button)\b[^.!?]{0,40}\bassessment\b/i.test(text)) return true;
  const informationQuestion = ASSESSMENT_INFORMATION.test(text) && INFORMATION_VERBS.test(text);
  return !informationQuestion && (ASK.test(text) || ASK_LINK.test(text) || ASK_ACCESS.test(text));
}
export type ConversationPolicy = { topic: BusinessTopic | null; factualQuestion: boolean; deferred: boolean; substantiveReplyCount: number; business: boolean; assessmentInfo: boolean; stage: 0 | 1 | 2 | 3; offer: boolean; refused: boolean; direct: boolean; askWhy: boolean; noQuestions: boolean; offTopic: boolean; redirectTo: "ask" | "resume" | "none" };

/** Derive from persisted transcript; no new schema, hidden counter or provider call. */
export function conversationPolicy(state: GaryConversationState, history: ChatMessage[]): ConversationPolicy {
  let context = false, count = 0, refused = false, pending = false;
  let topic: BusinessTopic | null = null, factualQuestion = false, deferred = false;
  let offeredInHistory = false;
  let lastAssistant = '', business = false, assessmentInfo = false, direct = false, offTopic = false, visitQuestionAsked = false;
  let softDeclines = 0, waitingForReason = false, restarted = false, askWhy = false, hardStop = false, noQuestions = false;
  for (const message of history) {
    if (message.role === 'assistant') {
      if (pending && !OLD_FALLBACK.test(message.content) && !/^\s*[^.!]*\?\s*$/.test(message.content)) count++;
      pending = false; lastAssistant = message.content;
      offeredInHistory ||= /(?:assessment|Start Your Journey)/i.test(message.content) && /(?:optional|button|start|take|try|if you want|next step)/i.test(message.content);
      visitQuestionAsked ||= message.content.includes(VISIT_QUESTION);
      continue;
    }
    if (message.role !== 'user') continue;
    const normalized = message.content.replace(/[’‘]/g, "'");
    const text = /^\s*Start Your Journey[.! ]*$/i.test(normalized) ? 'start the assessment' : normalized.replace(/Start Your Journey/gi, 'assessment');
    const acknowledgment = ACKNOWLEDGMENT.test(text);
    const currentTopic = detectTopic(text);
    offTopic = OFF_TOPIC.test(text) && !BUSINESS.test(text);
    factualQuestion = FACTUAL.test(text);
    askWhy = false;
    if (NO_QUESTIONS.test(text)) noQuestions = true;
    const negatedAccess = NEGATED_ACCESS.test(text) || /\b(?:never asked|not asking|do not want|don't want|not interested in)\b[^.!?]{0,60}\bassessment\b/i.test(text);
    const informationQuestion = ASSESSMENT_INFORMATION.test(text) && INFORMATION_VERBS.test(text);
    direct = !negatedAccess && !informationQuestion && (ASK.test(text) || ASK_LINK.test(text) || ASK_ACCESS.test(text)) && !SOFT_DECLINE.test(text) && !HARD_STOP.test(text);
    // "What is the link ..." still explicitly requests access rather than an explanation.
    if (!negatedAccess && /\b(?:where is|what(?:'s| is))\b[^.!?]{0,20}\b(?:link|button)\b[^.!?]{0,40}\bassessment\b/i.test(text) && !SOFT_DECLINE.test(text) && !HARD_STOP.test(text)) direct = true;
    if (offeredInHistory && !negatedAccess && !informationQuestion && !SOFT_DECLINE.test(text) && !HARD_STOP.test(text) && /\b(?:help me|can you help me) (?:get started|start)\b/i.test(text)) direct = true;
    assessmentInfo = informationQuestion && !direct;
    const decline = negatedAccess || SOFT_DECLINE.test(text) || (/^\s*(?:no|nope|not now|keep chatting)[.!\s]*$/i.test(text) && (offeredInHistory || /assessment/i.test(lastAssistant)));
    if (HARD_STOP.test(text) || NO_QUESTIONS.test(text)) { hardStop = true; refused = true; waitingForReason = false; }
    else if (decline) {
      softDeclines++; refused = true; deferred = true;
      if (softDeclines === 1 && !hardStop && !restarted && (offeredInHistory || /assessment/i.test(lastAssistant))) { waitingForReason = true; askWhy = true; }
      else { waitingForReason = false; }
    }
    let objection = false;
    if (!hardStop && !restarted && !decline && !direct && !offTopic && !acknowledgment && !assessmentInfo && !factualQuestion && ((waitingForReason && CONCERN.test(text)) || (offeredInHistory && (READY.test(text) || (/\b(?:assessment|AI|evaluation)\b/i.test(text) && CONCERN.test(text)))))) {
      waitingForReason = false; restarted = true; refused = false; deferred = false; count = 0; objection = true;
    }
    if (direct) { refused = false; waitingForReason = false; deferred = false; }
    const choiceWords = text.toLowerCase().match(/[a-z]{3,}/g) ?? [];
    const answersOfferedChoice = context && lastAssistant.includes('?') && choiceWords.length > 0 && choiceWords.length <= 4 && choiceWords.some(word => !/^(?:the|and|but|yes|not|that|this|what|how|can|you|are|for|with|please|thanks)$/.test(word) && new RegExp(`\\b${word}\\b`, 'i').test(lastAssistant));
    business = !offTopic && !acknowledgment && !assessmentInfo && (objection || Boolean(currentTopic) || (context && FOLLOWUP.test(text)) || answersOfferedChoice);
    if (business && currentTopic && !(factualQuestion && waitingForReason)) topic = currentTopic;
    if (business) context = true;
    pending = business && !decline && !askWhy && classifyVisitorMessageSafety(text) === 'none';
  }
  const safe = state.lastVisitorSafetyClass === 'none';
  const stage = safe && business && !askWhy ? Math.min(count + 1, 3) as 1 | 2 | 3 : 0;
  const canOffer = state.assessmentOfferCount === 0 || (restarted && state.assessmentOfferCount < 2);
  const harmlessDetour = safe && offTopic && !direct;
  const redirectTo = !harmlessDetour || hardStop || noQuestions ? "none" : context ? "resume" : visitQuestionAsked ? "none" : "ask";
  return { topic, factualQuestion, deferred, substantiveReplyCount: count, business, assessmentInfo, stage, refused, direct, noQuestions, offTopic: harmlessDetour, redirectTo, askWhy: safe && askWhy, offer: safe && !refused && (!hardStop || direct) && (direct || (stage === 3 && canOffer)) };

}

export function conversationInstruction(p: ConversationPolicy): string {
  if (p.assessmentInfo) return 'Answer the informational assessment question directly using approved public facts. Explain preparation or scope as requested, without an invitation, button marker or unnecessary follow-up. Do not imply a website audit or completed GAP Score.';
  if (p.offTopic) return 'This is a harmless detour. Give one short reply to what they actually said with a real bit of tongue-in-cheek wit, polite and never mocking. Be accurate or say you cannot verify. For politics or religion, stay neutral and do not pick a side. ' + (p.redirectTo === 'resume' ? 'Then briefly reconnect to the actual goal they already shared. Do not ask another question.' : 'Do not ask a question or add a redirect; the application handles that.')
    + (p.offer ? ' This reply is on the Start Your Journey schedule: after the detour, add one brief, friendly sentence inviting them to try Start Your Journey with the button below.' : ' Do not pitch the assessment.');
  const phase = p.stage === 1 ? 'FEEL: briefly recognize the stated business difficulty, then give a concrete useful first step. Use natural wording, not a mandatory opening phrase.'
    : p.stage === 2 ? 'FELT: acknowledge why the concern or skepticism is reasonable without claiming other customers experienced it. In natural wording, give the next practical check, honoring corrections.'
    : p.stage === 3 ? 'FOUND: give a grounded practical direction. Use natural wording without repeating an earlier opening. Do not invent results or testimonials.' : 'Answer directly without a sales technique.';
  return `Known business area: ${p.topic ?? 'not yet stated'}. Do not demand an industry name before helping. ${p.deferred ? 'The assessment is deferred: answer knowledge questions normally; do not treat them as an objection or renewed consent.' : ''}\nCurrent reply: ${phase}\nAnswer the concrete question first with useful detail; never substitute a vague clarification for an answer. At most one genuinely necessary question, and only after useful guidance. Do not repeat a question already answered. ${p.noQuestions ? 'The visitor asked for no more questions. Do not ask any.' : ''}\n${p.offer ? 'This reply is on the Start Your Journey schedule. Answer their actual question first, then end with ONE brief sentence inviting them to try the free Start Your Journey assessment with the button below, tied to what they are working on. Never say you cannot send links.' : 'Do not pitch or invite the assessment in this reply. Answer factual questions about it if asked.'}`;
}

export function safeConversationFallback(last: string, p: ConversationPolicy): string {
  if (p.assessmentInfo) return /prepare|preparing/i.test(last)
    ? 'To prepare, think about your business goal, current tools and recurring tasks or time drains. Answer from what you know, and leave passwords or confidential customer details out. The assessment uses your submitted answers; it is not a verified website audit.'
    : 'Start Your Journey uses your answers about your business, goals and current challenges to suggest practical next steps. It is not a verified website audit or a completed GAP Score.';
  if (p.offTopic) {
    const remark = /\bcat(?:s)?\b/i.test(last) && /knead|biscuits/i.test(last) ? 'Cats often knead when comfortable; it is a habit carried over from nursing. Tiny paws, unpaid bakery shift.'
      : /\bsky\b/i.test(last) && /\bblue\b/i.test(last) ? 'Air scatters blue light more strongly than red light. The sky didn’t even need a branding team.'
      : /\bweather\b/i.test(last) ? 'No live forecast on my desk, and I’d rather not cook the weather books.'
      : POLITICS.test(last) ? 'I stay neutral on politics. Gary from Accounting only takes sides on decimal points.'
      : /\bjokes?\b/i.test(last) ? 'Why did the spreadsheet break up with the calculator? It needed more space. I’ll keep my day job.'
      : /\b(?:sports?|super ?bowl|football|basketball|baseball|soccer|hockey|playoffs|world series)\b/i.test(last) ? 'My sports knowledge peaks at office fantasy league trash talk, so I’ll stay out of the predictions business.'
      : /\b(?:movies?|tv shows?|netflix)\b/i.test(last) ? 'My screen time is mostly spreadsheets, so no hot takes from me there.'
      : /\b(?:pizza|recipes?|topping|food)\b/i.test(last) ? 'Gary from Accounting keeps his topping opinions strictly off the books.'
      : 'That one’s a little outside my accounting department.';
    return p.redirectTo === 'resume' ? remark + (p.topic === 'response' ? ' Back to those missed responses: check who owns the next reply.' : p.topic === 'discovery' ? ' Back to getting found: start with the search result people actually see.' : ' Let’s get back to the business issue you raised.') : remark;
  }
  if (/\bSEO\b|search engine optimi[sz]ation/i.test(last)) return 'SEO means search engine optimization: improving how search engines understand and show your website. For a local business, start with clear service pages, accurate business details and useful answers to customer questions.' + (p.offer ? ' Start Your Journey below is an optional next step.' : '');
  if (p.direct && p.offer) return 'Here you go. Tap Start Your Journey below, or keep chatting if you prefer.';
  if (!p.business || p.stage === 0) return `Good question. I'd rather not guess on that one. Tell me what's going on in the business and I'll give you a straight answer, or reach the team at ${EASY_AI_CONTACT_EMAIL}.`;
  if (/\b(?:how much|monthly|annually|yearly|pricing|costs?|prices?|per month)\b/i.test(last)) return 'I do not have verified pricing or billing terms to quote. The right scope depends on the business problem and what needs to change; I cannot confirm a monthly plan.' + (p.offer ? ' Start Your Journey below is an optional starting point.' : '');
  if (p.topic === 'response' && /\bcapture\b/i.test(last)) return 'Capture the caller’s name, contact details and reason for calling, then assign an owner to follow up. Keep sensitive details out of the message and confirm the next action.' + (p.offer ? ' Start Your Journey below is optional if you want a tailored next step.' : '');
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
              : topicFallback(p);
  return prefix + answer + (p.offer ? ' If you want help prioritizing that, Start Your Journey is right below.' : '');
}

function topicFallback(p: ConversationPolicy): string {
  const options: Record<BusinessTopic, [string, string, string]> = {
    discovery: ['Check whether your public business details match what people search for and whether you appear for your main service.', 'Compare one relevant search result with your public listing. Look for missing services, unclear descriptions or outdated contact details.', 'Start with the biggest discovery gap you can verify, then track whether qualified inquiries improve.'],
    response: ['Trace a missed call or unanswered message. Check whether somebody owns the reply and offers a clear next action.', 'Separate slow replies from replies that never turn into a next step. Fix the repeated break, not just response speed.', 'Pick one response path, assign an owner and track how many inquiries reach an appointment or useful next step.'],
    conversion: ['Check the first screen and contact path. People should see what you offer and an obvious next step without hunting.', 'Try the inquiry path on a phone. Look for unclear wording, unnecessary fields or a broken contact option.', 'Prioritize the point where visitors stop, and measure completed inquiries rather than visits alone.'],
    knowledge: ['Choose one frequently asked question and identify the approved source for its answer before adding automation.', 'Compare conflicting answers against the current approved document. Give that source an owner and a review date.', 'Start with a small reviewed knowledge set and a human escalation path when the answer is missing.'],
    workflow: ['Map one repeated task from trigger to result. Mark each handoff and where information gets copied twice.', 'Check whether the task needs clearer ownership before automation. Remove duplicate entry and keep a human check for exceptions.', 'Pilot one low-risk step and measure time saved and corrections needed before expanding it.'],
    reporting: ['Pick the decision you need to make, then identify which source holds the number that supports it.', 'Compare definitions and update times before combining reports. Two dashboards can disagree without either being useful.', 'Build a small decision-focused view with clear sources and owners, rather than another wall of charts.'],
    sales: ['Review five recent opportunities and identify the last step each reached: discovery, inquiry, proposal or follow-up.', 'Look for a repeated reason opportunities stall, and check whether each had a clear owner and next action.', 'Fix the most common stalled step first, then track whether more opportunities progress.'],
    marketing: ['Choose the audience and action you want from one campaign. Check whether the message makes that action clear.', 'Compare which messages produce useful inquiries rather than only views or clicks.', 'Focus on the channel producing qualified interest and improve one message before expanding spend.'],
    business: ['Start with the outcome you need to improve and the step that currently prevents it.', 'Separate the process problem from the tool choice. A clearer next action may help more than another app.', 'Pick one measurable improvement with a clear owner before deciding whether AI is needed.'],
  };
  return options[p.topic ?? 'business'][Math.max(0, p.stage - 1)];
}
