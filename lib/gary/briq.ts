/** Server-owned BRIQ seed. Public facts only; no private documents or visitor data.
 * Ownership: Toy/Easy AI. Review source evidence before updating; Git retains history.
 * This module is imported only by the server reply pipeline's system prompt.
 */
export const EASY_AI_BRIQ = {
  version: 'easy-ai-public-2026-11-16.1',
  sources: {
    products: '10480e7404f2bbaa5057857893512eb65fbed639:app/page.tsx',
    services: '10480e7404f2bbaa5057857893512eb65fbed639:app/how-it-works/page.tsx',
    principles: '10480e7404f2bbaa5057857893512eb65fbed639:app/about/page.tsx',
    contact: '10480e7404f2bbaa5057857893512eb65fbed639:lib/emailRouting.ts',
    briq: 'Toy approval 2026-11-16; public Brand IQ definition',
  },
  facts: [
    { source: 'products', status: 'public-approved', text: 'GAP means Google and AI Presence: helping businesses get discovered through Google and AI answers. Demonstration scores/charts are illustrative, not measured customer results.' },
    { source: 'products', status: 'public-approved', text: 'SmartSite helps turn website visits into conversations and inquiries. AIM means AI Interaction Manager; Digital and Voice concern online and phone customer response. Gary demonstrates AIM. Do not claim a particular phone integration is active.' },
    { source: 'services', status: 'public-approved', text: 'Services include business AI assessment and strategy, ready-to-configure and custom AI assistants, workflow automation, business dashboards, implementation and support. Marketing scope confirmed here is visibility, discovery, inquiry capture and follow-up; other campaign capabilities are unconfirmed. Customer relationship and follow-up systems are marked coming soon, not a deployed offering.' },
    { source: 'principles', status: 'public-approved', text: 'Understand the problem first. Recommend the simplest effective process or tool. Reserve custom agents for problems without a better existing solution. People approve implementation and remain in control; never claim work has already been performed.' },
    { source: 'briq', status: 'public-approved', text: 'BRIQ means Brand IQ, Easy AI\'s Company Brain: a central maintained knowledge source teaching AI how the company thinks, operates, communicates and makes decisions. This Gary seed contains public approved facts only, not private documents or customer records. Packaging and rollout are unconfirmed.' },
    { source: 'services', status: 'public-approved', text: 'The free business assessment is an optional starting point based on submitted answers, not a verified website audit or completed GAP Score. A visitor can keep chatting or request a person without taking it.' },
    { source: 'contact', status: 'public-approved', text: 'Use the public company contact address supplied separately from the shared routing module. Offer the existing contact flow or /contact for human help, and the existing assessment action or /assessment when appropriate. Ask permission before collecting contact details. Only application confirmation establishes a saved request; never promise delivery, a booking or a response deadline.' },
  ],
  unavailable: ['Unapproved prices, discounts, timelines, availability, guaranteed outcomes, client results, private knowledge and unverified integrations'],
} as const;

/**
 * Third-party tools Gary may name when a visitor asks what to use. Company knowledge, owned by
 * Toy: add a name here only after Easy AI approves recommending it publicly. While the list is
 * empty Gary keeps describing capabilities instead of naming products.
 */
export const EASY_AI_APPROVED_TOOL_NAMES: readonly string[] = [];

/** The tool-naming rule for Gary's prompt, derived from the approved list above. */
export function toolNamingRule(approved: readonly string[] = EASY_AI_APPROVED_TOOL_NAMES): string {
  return approved.length
    ? `When it genuinely helps, you may name these Easy AI approved tools: ${approved.join(', ')}. Never name any other third-party AI tool, product or vendor; describe the type of capability instead.`
    : 'Never name a specific third-party AI tool, product, or vendor, even if asked what to buy. Describe the type of capability instead.';
}

export function buildPublicBriqContext(): string {
  return `Easy AI BRIQ public knowledge (${EASY_AI_BRIQ.version}). Use only confirmed company facts. If information is absent or unconfirmed, acknowledge uncertainty and offer human help.\n${EASY_AI_BRIQ.facts.filter(fact => fact.status === 'public-approved').map(fact => fact.text).join('\n')}\nUnavailable: ${EASY_AI_BRIQ.unavailable.join('; ')}.`;
}
