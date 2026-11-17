/** The approved public pricing statement. It is returned by code, never by model output. */
export const GARY_PRICING_REPLY = "Start Your Journey is free. You’ll get a clearer picture of what’s working, where you might be missing opportunities, and what to look at first. If you want a more detailed evaluation, that typically starts at $299. We discount the evaluation if you choose Easy AI to do the work.";
const PERIOD = /^(?:monthly|annual(?:ly)?|yearly|per month|one.time)[?.!\s]*$/;
export const GARY_BILLING_REPLY = "I don’t have monthly billing terms to quote. Start Your Journey is free, and the paid evaluation is separate.";

export function isGaryBillingFollowUp(text: string): boolean {
  return PERIOD.test(text.trim().toLowerCase());
}

/** Product affordability questions, not estimates of a visitor's losses, time or gains. */
export function asksGaryPrice(text: string, recentVisitorMessages: string[] = []): boolean {
  const normalized = text.trim().toLowerCase().replace(/[‘’]/g, "'");
  if (!normalized || /\b(?:don't|do not|never)\s+(?:tell|quote|mention|give)\b/.test(normalized)) return false;
  if (/^how much[?.!\s]*$/.test(normalized)) return true;
  if (isGaryBillingFollowUp(normalized)) {
    return recentVisitorMessages.slice(-2).some((message) => asksGaryPrice(message));
  }
  if (/\b(?:how much (?:is|are) (?:it|that|this|(?:the|an?|your) (?:assessment|evaluation|service)|start your journey)|(?:do|would|will) you charge (?:for (?:it|that|this|(?:the|an?|your) (?:assessment|evaluation|service)|start your journey)|anything)|does (?:the|your) (?:assessment|evaluation|service) cost anything)\b/.test(normalized)) return true;
  return /\b(?:how much (?:does|would|will) (?:it|this|that|the (?:assessment|evaluation)|start your journey|a(?:n)? (?:assessment|evaluation)) cost(?!\s+(?:me|us|my|our)\b)|how much (?:do|would|will) (?:you charge|i pay)|(?:what(?:'s| is| are)|tell me|can you share)\s+(?:your|easy ai'?s)\s+(?:price|pricing|rates?|fees?|cost)|(?:price|pricing|fees?|cost) (?:for|of) (?:an? |the |your )?(?:assessment|evaluation|services?|start your journey)|(?:is|are) (?:your assessment|the assessment|start your journey) (?:actually |really )?free)\b/.test(normalized)
    || /^(?:(?:what(?:'s| is| are) (?:the )?(?:starting )?)?(?:pricing|cost|price|rates?|fees?)|is (?:it|that|this) (?:actually |really )?free)[?.!\s]*$/.test(normalized);
}
