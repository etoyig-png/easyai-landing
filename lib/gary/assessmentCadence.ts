import type { ChatMessage } from './llm/types';
import type { BusinessTopic } from './conversationPolicy';

/**
 * Toy's approved schedule: the Start Your Journey button appears on Gary's completed replies
 * 4, 9, 14, 19, 24, 29 and onward. The opening greeting is not a reply. Every completed reply
 * counts, including detours and brief acknowledgments. This is decided here, in code, never by
 * the model.
 */
export const FIRST_SCHEDULED_REPLY = 4;
export const SCHEDULE_INTERVAL = 5;

/**
 * `completedReplies` is the number of Gary replies already completed in this session
 * (PublicChatSession.visitorTurnCount, incremented only after a reply is persisted). The reply
 * being generated is therefore number completedReplies + 1. A failed request never persists a
 * reply or increments the counter, so it cannot advance the schedule, and the counter lives on
 * the server session so refresh/reopen keeps it.
 */
export function upcomingReplyNumber(completedReplies: number): number {
  return Math.max(0, Math.floor(completedReplies)) + 1;
}

export function isScheduledOfferReply(replyNumber: number): boolean {
  return replyNumber >= FIRST_SCHEDULED_REPLY && (replyNumber - FIRST_SCHEDULED_REPLY) % SCHEDULE_INTERVAL === 0;
}

// An explicit request to stop the offers. "Not now", "maybe later" and "keep chatting" are soft
// declines and do not suspend the schedule.
const STOP_OFFERS = /\b(?:stop|quit)\s+(?:asking(?!\s+(?:me\s+)?(?:so many\s+|more\s+|all these\s+)?questions)|offering|pitching|selling|pushing|mentioning|bringing up|suggesting)\b|\b(?:no|don'?t|do not|never)\s+(?:more\s+)?(?:offers?|pitch(?:es|ing)?|sell(?:ing)?|pushing)\b|^\s*(?:no[,.!]*\s*)?(?:i'?m |i am )?not interested[.!\s]*$|\bnot interested in (?:the |your |any |an |this |that )?(?:assessment|offers?|pitch|it)\b|\b(?:don'?t|do not)\s+want\b[^.!?]{0,30}\b(?:assessment|start your journey|offers?)\b|\bno\b[^.!?]{0,12}\bassessment\b|\bleave me alone\b|\bwhy do you keep (?:pushing|asking|offering|pitching)\b/i;
// Renewed interest after an opt-out. An explicit request to start is handled separately and
// always works.
const RENEWED_INTEREST = /\b(?:changed my mind|i'?m (?:now )?interested|actually[, ]+(?:i'?d like|let'?s do|i want)|tell me (?:more )?about (?:the |your )?(?:assessment|start your journey)|what(?:'s| is| does) (?:the |your )?(?:assessment|start your journey)|ok(?:ay)?[, ]+(?:send|give|show) (?:me )?(?:the )?(?:link|assessment)|i(?:'ll| will) (?:take|try|do) (?:it|the assessment))\b/i;

export function isStopOffersRequest(text: string): boolean {
  return STOP_OFFERS.test(normalize(text));
}

export function isRenewedInterest(text: string): boolean {
  return RENEWED_INTEREST.test(normalize(text));
}

function normalize(text: string): string {
  return text.replace(/[’‘]/g, "'").replace(/start your journey/gi, 'assessment');
}

/** Derived from the persisted transcript, so it survives refresh and needs no new schema. */
export function offersSuspended(history: ChatMessage[], isDirectRequest: (text: string) => boolean): boolean {
  let suspended = false;
  for (const message of history) {
    if (message.role !== 'user') continue;
    if (isStopOffersRequest(message.content)) suspended = true;
    else if (isRenewedInterest(message.content) || isDirectRequest(message.content)) suspended = false;
  }
  return suspended;
}

/** Toy's approved reply to an explicit request to stop offering. Not a "free" pitch. */
export const GARY_STOP_OFFERS_REPLY = 'Start Your Journey helps connect what’s happening in your business with what you want to accomplish. That insight can help you see what deserves attention first and make better decisions about your next step. Is there anything else I can help you with?';

/** A direct request for the link or to start: the button appears immediately. */
export const GARY_DIRECT_LINK_REPLY = 'Here you go. Tap Start Your Journey below and it takes you straight to the assessment. If you want to keep chatting first, I’m right here.';

// Used only when the model left the invitation out of a scheduled reply. Tied to the visitor's
// known business area, short, and not a repeated sticker.
const INVITATIONS: Record<BusinessTopic | 'none', string> = {
  discovery: 'If you want to see where you are getting missed, Start Your Journey below lays that out.',
  response: 'Start Your Journey below can show where replies and follow-up are slipping, if you want a clearer picture.',
  conversion: 'If you want to see where visitors are dropping off, Start Your Journey below is a good place to start.',
  knowledge: 'Start Your Journey below can help sort out which answers and sources to fix first.',
  workflow: 'If you want to see which of those tasks deserves attention first, try Start Your Journey below.',
  reporting: 'Start Your Journey below can help you decide which numbers matter first.',
  sales: 'If you want to see where deals and leads are stalling, Start Your Journey below lays that out.',
  marketing: 'Start Your Journey below can help you see which message and channel deserve attention first.',
  business: 'If you want a clearer picture of what to tackle first, Start Your Journey below is a good next step.',
  none: 'Whenever you want a clearer picture of what to tackle first in your business, Start Your Journey is right below.',
};

export function scheduledInvitation(topic: BusinessTopic | null): string {
  return INVITATIONS[topic ?? 'none'];
}

/** Crisis disclosures are the one place a scheduled offer is held back. */
const CRISIS = /\b(suicid|kill myself|self.?harm|hurt myself|end my life)/i;
export function isCrisisMessage(text: string): boolean {
  return CRISIS.test(text);
}
