import Anthropic from '@anthropic-ai/sdk';
import type { AssessmentSubmission } from './validation';
import { escapeHtmlText } from './htmlEscape';
import { buildWhyQuestion, validateResultHtml } from './resultValidator';
import { renderUntrustedAssessmentContent } from './safeEmailContent';

// Constructed lazily so this module can be imported at build time without ANTHROPIC_API_KEY set.
let anthropicClient: Anthropic | undefined;
function getClient(): Anthropic {
  if (!anthropicClient) anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropicClient;
}

// Internal research bank — cited stats the model can draw on for the FOUND section.
// Never shown to the visitor in the quiz; only used to ground the generated email.
// Keyed 1:1 against the locked INDUSTRY_OPTIONS list (see industryResearch.test.ts) so
// every statistic Claude is allowed to cite traces back to exactly one approved entry —
// there is no path for Claude to cite a number that isn't in this table.
export const INDUSTRY_RESEARCH: Record<string, string> = {
  'Construction & Trades (contractors, subs, home services)':
    'Trade businesses miss 27-62% of incoming calls. Only 5-12% of dormant/old leads convert without automated follow-up.',
  'Healthcare & Wellness (chiropractic, medical, dental, therapy)':
    'Solo practitioners can lose substantial time each week to insurance and scheduling administration. Do not reference or ask about any patient medical history, diagnoses, or health data — stay focused on practice operations only.',
  'Professional Services (consulting, legal, accounting, financial)':
    'Unbilled time is the "leaky faucet" of professional services — loose time tracking quietly drains profit.',
  'Retail & E-commerce':
    '~75% of online carts are abandoned with no recovery process. Roughly 43% of small businesses still run inventory manually.',
  'Hospitality & Food Service':
    'Up to 40% of restaurant calls go unanswered at peak hours. Scheduling alone eats 8-12 hrs/week of a manager’s time.',
  'Real Estate':
    'Responding to a lead within 5 minutes makes an agent up to 21x more likely to qualify it. Admin eats 30-40% of an agent’s week.',
};

function researchForIndustry(industry: string, industryOther?: string): string {
  if (INDUSTRY_RESEARCH[industry]) return INDUSTRY_RESEARCH[industry];
  return `The business describes itself as: "${industryOther ?? industry}". No specific stat bank is available — speak generally about how businesses their size typically lose time to manual, repetitive work, without citing a fabricated statistic.`;
}

const SYSTEM_PROMPT = `You are writing a personalized "Customer Opportunity Action Plan" email on behalf of Easy AI Consulting, sent to a small business owner who completed a free business visibility and conversion assessment.

Tone: warm, empathetic, specific, and grounded — never hype-y, never a hard sell, never a guaranteed-results promise. This is roughly 70% emotional connection, 30% concrete substance. Sound supportive, intelligent, practical, and human. Use plain language, avoid technical jargon, avoid fear-selling, and avoid sounding like therapy, a motivational speech, or a generic AI advertisement.

Structure the email using this Feel-Felt-Found arc, in this order:
1. Personal hook — open using their first name and business name. If your web search turned up anything real and specific about the business (their site, services, reviews, location), weave in ONE concrete detail naturally. If you found nothing verifiable, skip the specific detail rather than inventing one — do not fabricate facts about their business.
2. FEEL — reflect their stated data-privacy/security worry and their #1 AI challenge back to them empathetically, in their own terms, so they feel heard.
3. FELT — normalize it by connecting to real founder experience. Etoyi (Easy AI's founder) has personally talked with business owners in these industries — you may write in that honest founder voice, e.g. "Owners I've spoken with often describe...", "In my years working with business owners in [industry]...", "A common concern I hear is...". Never describe these people as Easy AI clients and never claim Easy AI produced results for them — this is about shared experience, not a case study or testimonial.
4. GET FOUND diagnosis. Start one paragraph exactly with "<strong>Get found:</strong>". Interpret their self-reported Google and AI visibility, industry, and desire for customers. Explain the likely discovery gap without claiming this assessment verified rankings, listings, or competitor performance. This assessment is directional and does not replace a verified GAP Score.
5. GET CHOSEN diagnosis. Start one paragraph exactly with "<strong>Get chosen:</strong>". Interpret their website-conversion answer together with lead response and biggest time drain. Explain where interest may be lost after discovery. If they have no website, focus on creating one dependable path from discovery to contact.
6. Ground the two diagnoses in the approved industry research note where it is relevant. Keep every statistic in its original context and never present an industry pattern as a result for this business.
7. Give exactly three practical actions the reader can take for free, without buying a tool or hiring anyone. "Free action 1:" must improve discovery today. "Free action 2:" must improve the website or contact path today. "Free action 3:" must improve tracking or follow-up for the next seven days. Format them as three separate paragraphs beginning exactly "Free action 1:", "Free action 2:", and "Free action 3:". Do not include any other numbered or labeled actions.
8. After the free actions, explain in one short paragraph that Easy AI's verified GAP Score can compare their Google and AI presence against three local competitors. Present it as an optional next step that supplies evidence, never as something this free assessment already performed.
9. Time reassurance. Make clear their time is the asset being protected here.
10. End with the mandatory closing question described under "Closing question" below. Do not write your own call-to-action, button, or booking link. That is added automatically after your content.

Personalization requirements:
- Use the business name naturally 4-6 times across the email, not just in the opening line.
- Use their first name at least once beyond the initial greeting.
- Do not simply list their answers back to them ("You said X, you said Y..."). Interpret how discovery, website conversion, lead response, and their desired outcome connect. The email must answer both where they may be hard to find and where a found opportunity may be lost.

Desired-outcome angle — expand on whichever of these matches their stated desired outcome, without claiming to know their personal reason:
- "Make more money": don't stop at "increase revenue." Explore what the extra revenue could make possible — financial breathing room, hiring help, taking time away from the business, family experiences or vacations, education expenses, retirement savings, reinvesting in the company, giving a spouse more options, growing without personally working more hours. Then connect the revenue goal to their selected time drain.
- "Save time": connect it to reclaiming evenings and weekends, being more present outside work, or freeing up space for higher-value work.
- "Improve quality": connect it to fewer mistakes, less rework, more consistent service, a stronger reputation, and more confidence that work is being handled correctly.
Never guarantee any personal, financial, or operational outcome.

Deeper motivation (use sparingly, at most one or two per email): business goals often connect to something deeper than the surface answer. Possible angles — working late after a normal day, losing evenings or weekends to paperwork, being physically home but mentally stuck in the business, missing time with family or friends, carrying financial uncertainty alone, feeling responsible for employees and customers, having no room for a vacation, wanting to hire help, wanting to fund a child's education, wanting to give a spouse the option to leave a job, wanting more retirement security, wanting the business to create freedom instead of another demanding job. These are possibilities, not facts — never state or imply the reader has a spouse, children, financial problems, or family conflict unless they explicitly told you so (nothing in the data provided here ever supplies that). Use hedged language: "for many owners in your position…", "that can mean…", "it might come down to…", "whether that means more time at home, room to hire help, or greater financial security…". Never stack more than one or two of these angles into one email. Never use the exact phrase "the deeper goal may be" — it's banned as a repeated formulaic tell.

Recommended capabilities — pick only 2-3 that clearly match their discovery signal, website-conversion signal, lead response, time drain, desired outcome, and industry. Do not list the whole menu. Describe outcomes, not technology (good: "Easy AI can help create a system that responds to new leads within minutes, so fewer of them go cold." bad: "Product X connected through API Y with an LLM orchestration layer can auto-respond to leads."). Never name or recommend a specific third-party product or brand — including but not limited to CRR, Intelligent Website, GoHighLevel, Paige, or Merchynt. Describe capabilities generically, never by brand name. Approved categories:
- Google/local-search growth (when marketing, new customers, or missed opportunities are relevant): improving a Google Business Profile, local-search visibility, consistent business info, review requests/responses, organized photos, accurate service areas. Never guarantee rankings, top placement, lead volume, or revenue.
- Website conversion (always address it): making one primary next step obvious, placing the call or booking action where visitors can see it quickly, reducing competing choices, confirming submissions, and tracking whether inquiries reach a human. If there is no website, focus on one dependable contact path from the business listing.
- Lead sourcing and organization (when new-customer growth is relevant): identifying and organizing leads from approved/public sources, capturing contact info, prioritizing follow-up. Never imply private data collection or unauthorized scraping.
- Call answering and appointment booking (when missed calls, lead response, or front-desk overload is relevant): answering/responding to inquiries, collecting caller info, answering common questions, booking appointments, sending confirmations/reminders, transferring urgent situations to a human.
- Lead and estimate follow-up (when follow-up is the problem): following up on missed calls and estimates, reconnecting with dormant leads, sending reminders, alerting a human when personal attention is needed.
- Paperwork and documentation (when paperwork, invoicing, or repetitive communication is the problem): drafting estimates/invoices/job notes, organizing documentation, drafting follow-up messages, routing everything through human review before sending.
- Scheduling and customer communication (when scheduling is the problem): scheduling/rescheduling, confirmations, reminders, basic intake, staff notifications, escalating exceptions to a human.
- Privacy and human oversight (when privacy concern is high): careful tool selection, clear data rules, human approval checkpoints, limiting what's entered into AI systems, keeping sensitive decisions under human control. Never collect or include medical information or PHI.

Closing question — the final paragraph of your output, and there must be nothing after it (no further paragraphs, no CTA, no sign-off). It must read, with the business name substituted in:
"One final question worth thinking about: What made you build [Business Name], and what do you want the business to make possible for you?"

Hard rules:
- Do NOT invent specific promises, numbers, or guarantees about THIS business's results. Stats from the research note describe industry patterns, not this business.
- Do NOT collect, reference, infer, or discuss any medical/health details, diagnoses, or patient data, even if the business is in healthcare/wellness — stay strictly at the level of business operations (scheduling, admin, no-shows).
- Do NOT mention that you performed a web search, cite your search process, or name any AI-tool directories or research methodology. Speak only as Easy AI.
- Do NOT explain, justify, or reference the outcome of your research in any way, under any framing, anywhere in the output — not as an opening sentence, not comma-spliced into another sentence, not wrapped inside a paragraph tag, not as an aside. Forbidden content includes (and is not limited to) any variation of: "I searched...", "I couldn't confirm...", "No verifiable public listing...", "I kept the hook centered...", "no invented details", or any other sentence that describes enrichment success, failure, research limitations, prompting, or your own generation decisions. This applies whether or not the web search found anything. If nothing verifiable was found, the correct behavior is total silence about that fact — begin directly with the personal hook sentence, with zero transition, zero acknowledgment, and zero explanation of the gap.
- Do NOT invent or assert facts about this specific business that were not confirmed by web search or given in the submitted answers. Only use a specific factual claim about this business if it was actually verified.
- Do NOT describe anyone as an Easy AI client or claim Easy AI produced results for them. Founder-experience language ("owners I've spoken with...") is allowed; testimonials or case-study framing are not.
- Do NOT use any sports, game, or team metaphors or headers of any kind.
- Do NOT include sports preferences, favorite teams, financial figures, prices, ROI, savings estimates, or claims about an audit.
- Do NOT use em dashes (—) or en dashes (–) anywhere in your output. Rewrite the sentence naturally with commas, periods, or separate sentences instead of substituting a different repetitive punctuation mark in their place.
- Do NOT use any of these AI-writing tells: "not X, but Y" constructions (including "not because X, but because Y"), repeated negative comparisons, three consecutive dramatic sentence fragments in a row, a rhetorical question immediately followed by its own answer, "you're in good company", "if any of this lands", "quietly saving", "low hum", "on-ramp", "move the needle", "genuinely fine", "reasonable place to be standing", "the thing that stood out most", "here's the part", "the deeper goal may be", decorative metaphors that don't clarify anything, or generic motivational filler. Vary paragraph and sentence length naturally rather than writing every paragraph to a similar rhythm. Use contractions naturally.
- Do NOT name a specific third-party product or brand anywhere in the output, including but not limited to CRR, Intelligent Website, GoHighLevel, or Merchynt. Describe outcomes and capabilities only, never named tools.
- Do NOT wrap the output in markdown code fences or mention that this is HTML.
- Output ONLY a clean HTML fragment for the body of an email (use <h2>, <p>, <strong> — no <html>, <head>, <body>, no inline <style> blocks, no scripts). Keep it skimmable: short paragraphs, one idea per paragraph, no walls of text. Your response must begin with an HTML tag — no text of any kind before the first tag.
- Do not use the word "guarantee" or promise specific ROI figures for this business.`;

export interface GenerateResultInput {
  submission: AssessmentSubmission;
}

/**
 * The system prompt requires Claude's output to be an HTML fragment starting
 * with a tag. If Claude still writes a leaked reasoning sentence before the
 * real content (e.g. "No verifiable public listing was found, so I've kept
 * the hook..."), that text appears before the first "<" — anything before
 * the first tag is, by the prompt's own contract, not supposed to be there.
 * Returns the cleaned HTML, or null if no HTML tag is present at all (an
 * unsalvageable, non-conforming response — the caller should fall back).
 */
export function stripLeakedPreamble(text: string): string | null {
  const trimmed = text.trim();
  const tagIndex = trimmed.indexOf('<');
  if (tagIndex === -1) return null;
  return trimmed.slice(tagIndex);
}

function buildUserPrompt(submission: AssessmentSubmission): string {
  const research = researchForIndustry(submission.industry, submission.industryOther);
  return `Generate the personalized AI Action Plan email body for this lead.

First name: ${submission.firstName}
Last name: ${submission.lastName}
Business name: ${submission.businessName}
Industry: ${submission.industryOther ? `${submission.industry} — specifically: ${submission.industryOther}` : submission.industry}
Work situation: ${submission.workSituation}
Self-reported Google and AI visibility: ${submission.searchVisibility}
Website conversion path: ${submission.websiteConversion}
Their #1 AI challenge: ${submission.aiChallenge}
Outcome they most want: ${submission.desiredOutcome}
Biggest time drain: ${submission.timeDrain}
Current lead response: ${submission.leadResponse}
Data privacy/security worry level: ${submission.privacyConcern}
Business website: ${submission.noWebsite ? 'No website provided' : submission.websiteUrl}

Industry research note to draw on for the FOUND section: ${research}

Before writing, use web search to look up "${submission.businessName}" to see if there is a real public website, Google listing, or review source you can reference for one specific true detail. The search can enrich the hook, but it is not a verified GAP Score and must never be presented as a ranking or competitor analysis. If you cannot confidently confirm anything about this specific business, skip the detail. Do not write anything about the search process, its outcome, or your reasoning anywhere in the output.`;
}

/** Extracts the final text block, tool-search narration and all — see stripLeakedPreamble for why only the last block is used. */
function extractRawHtml(response: Anthropic.Message): string | undefined {
  const textBlocks = response.content.filter((block): block is Anthropic.TextBlock => block.type === 'text');
  return textBlocks[textBlocks.length - 1]?.text.trim();
}

export async function generateAssessmentResult({ submission }: GenerateResultInput): Promise<string> {
  const userPrompt = buildUserPrompt(submission);

  const response = await getClient().messages.create({
    model: 'claude-opus-5',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 3 }],
    messages: [{ role: 'user', content: userPrompt }],
  });

  if (response.stop_reason === 'refusal') {
    throw new Error('Claude declined to generate the assessment result');
  }

  const rawHtml = extractRawHtml(response);
  if (!rawHtml) {
    throw new Error('Claude returned no text content for the assessment result');
  }

  // First line of defense: strip anything before the first HTML tag (catches a
  // leaked preamble that arrived as its own separate sentence/block). This alone
  // does NOT catch narration comma-spliced into the same paragraph as real content
  // (e.g. "<p>I searched but couldn't confirm anything, so I've kept the hook
  // centered on Acme's name. Hi Jamie, ...</p>") — that requires the deterministic
  // phrase-level validator below, which runs regardless of where in the HTML the
  // leak landed.
  const strippedHtml = stripLeakedPreamble(rawHtml);
  if (!strippedHtml) {
    throw new Error('Claude returned non-HTML content with no tag found — likely a leaked reasoning response');
  }

  const firstAttempt = validateResultHtml(strippedHtml, submission);
  if (firstAttempt.valid) {
    return renderUntrustedAssessmentContent(strippedHtml);
  }

  // One controlled correction attempt: tell Claude exactly what it violated and ask
  // for a full rewrite. No web-search tool on this pass — the research/hook decision
  // already happened; we just need the same content rewritten to comply.
  const correctionPrompt = `Your previous response violated the following rules and must be rewritten from scratch:
${firstAttempt.violations.map((v) => `- ${v}`).join('\n')}

Rewrite the entire email body from scratch, following every instruction in the system prompt exactly, with none of the violations above. Output ONLY the corrected HTML fragment, starting with a tag, nothing else.`;

  const correctionResponse = await getClient().messages.create({
    model: 'claude-opus-5',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: userPrompt },
      { role: 'assistant', content: strippedHtml },
      { role: 'user', content: correctionPrompt },
    ],
  });

  if (correctionResponse.stop_reason === 'refusal') {
    throw new Error('Claude declined to generate the corrected assessment result');
  }

  const rawCorrectedHtml = extractRawHtml(correctionResponse);
  const strippedCorrectedHtml = rawCorrectedHtml ? stripLeakedPreamble(rawCorrectedHtml) : null;
  if (!strippedCorrectedHtml) {
    throw new Error('Claude returned non-HTML content on the correction attempt — likely a leaked reasoning response');
  }

  const secondAttempt = validateResultHtml(strippedCorrectedHtml, submission);
  if (!secondAttempt.valid) {
    // Never send invalid output merely because the API returned HTML — fall through
    // to the caller's existing fallback path instead.
    throw new Error(
      `Claude's corrected output still failed validation: ${secondAttempt.violations.join('; ')}`
    );
  }

  return renderUntrustedAssessmentContent(strippedCorrectedHtml);
}

/**
 * Deterministic fallback used only if the Claude call fails, refuses, or never passes
 * validation — the lead should never get nothing. Every submitted field is escaped
 * before interpolation (escapeHtmlText — safe for text-node content, keeps natural
 * punctuation like apostrophes literal) since these are raw user-submitted strings,
 * not model output.
 */
export function buildFallbackResultHtml(submission: AssessmentSubmission): string {
  const research = researchForIndustry(submission.industry, submission.industryOther);
  const firstName = escapeHtmlText(submission.firstName);
  const businessName = escapeHtmlText(submission.businessName);
  const aiChallenge = escapeHtmlText(submission.aiChallenge.toLowerCase());
  const timeDrain = escapeHtmlText(submission.timeDrain.toLowerCase());
  const searchVisibility = escapeHtmlText(submission.searchVisibility.toLowerCase());
  const websiteConversion = escapeHtmlText(submission.websiteConversion.toLowerCase());
  return `
    <h2>Hi ${firstName},</h2>
    <p>Thanks for walking us through ${businessName}. Your answers point to two places where customer opportunities may be getting harder to win, discovery and the path from interest to action.</p>
    <p>Your concern that ${aiChallenge} is common for owners who are also trying to protect time. For ${businessName}, the useful starting point is a clear customer path instead of adding more disconnected tools.</p>
    <p><strong>Get found:</strong> You described your current Google and AI visibility this way: "${searchVisibility}." That is a directional signal, not verified ranking evidence. ${research.split('.')[0]}.</p>
    <p><strong>Get chosen:</strong> You described the website path this way: "${websiteConversion}." Combined with "${timeDrain}," this suggests ${businessName} may benefit from making one next step obvious and consistently tracked.</p>
    <p><strong>Free action 1:</strong> Search one important service and location phrase in Google, then ask one AI search tool for businesses that provide it. Record whether ${businessName} appears and which three competitors do.</p>
    <p><strong>Free action 2:</strong> Open your website on a phone and make sure one primary action, such as call, book, or request information, is visible before scrolling. Remove or demote competing actions.</p>
    <p><strong>Free action 3:</strong> Track every new call, form, and message for seven days in one shared list with the response time, owner, and next step.</p>
    <p>A verified Easy AI GAP Score can compare ${businessName}'s Google and AI presence against three local competitors if you want evidence beyond this directional assessment.</p>
    <p>This plan is meant to protect your time by showing where to focus first.</p>
    <p>${buildWhyQuestion(submission.businessName)}</p>
  `;
}
