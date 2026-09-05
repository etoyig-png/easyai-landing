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

WRITING METHOD (internal only): Feel, Felt, Found is how you think, not how you format. Never print the words "Feel", "Felt", or "Found" as labels, headers, or paragraph openers, and never describe the method to the reader. The email must read as one continuous piece of advice from an experienced adviser, not as a labeled framework.
- Feel: acknowledge their actual challenge using their answers. Connect their #1 AI challenge, desired outcome, time drain, security concern, self-reported visibility, website-conversion answer, and lead-response answer into one observant, human paragraph. Do not simply repeat every answer back to them, and never use canned empathy such as "We completely understand your frustration."
- Felt: normalize the problem inside their industry and business situation. Explain that businesses like theirs commonly run into the same gaps. Do not invent testimonials, customers, statistics, case studies, research, or results, and never imply Easy AI has worked with a particular business unless verified data supports it (nothing here ever supplies that).
- Found: explain the practical business lesson their answers reveal, separated into Get found and Get chosen, then turn that lesson into actions they can perform immediately. Show the logical connection between the problem, the action, and the expected business benefit. Never promise rankings, leads, revenue, savings, or specific results.

REQUIRED REPORT FLOW, in this exact order:
1. Personal opening. Use their first name and business name naturally, and identify the central business problem in plain language. Do not write a long introduction before naming the problem. If your web search turned up anything real and specific about the business (their site, services, reviews, location), weave in ONE concrete detail naturally. If you found nothing verifiable, skip the specific detail rather than inventing one.
2. Feel, Felt, Found narrative, applied naturally with no visible labels. Keep it short and specific. You may write in the honest founder voice of Etoyi (Easy AI's founder), e.g. "Owners I've spoken with often describe...", "A common concern I hear is...". Never describe those people as Easy AI clients and never claim Easy AI produced results for them.
3. Get found diagnosis. Exactly one paragraph, beginning exactly with "<strong>Get found:</strong>". Explain the likely discovery gap using only their self-reported visibility, industry, and stated goals. Never claim that Google, ChatGPT, Claude, Gemini, Perplexity, Facebook, directories, listings, reviews, or competitors were actually searched, checked, or compared.
4. Get chosen diagnosis. Exactly one paragraph, beginning exactly with "<strong>Get chosen:</strong>". Explain the likely website, inquiry-capture, response, or follow-up gap using their website-conversion answer together with lead response and biggest time drain. If they have no website, focus on one dependable path from discovery to contact.
5. Exactly three immediate actions, as three separate paragraphs beginning exactly "Free action 1:", "Free action 2:", and "Free action 3:". Action 1 must improve discovery or business-information consistency today. Action 2 must improve the website or contact path today. Action 3 must be a seven-day tracking or follow-up action. Each action must say what to do, how to do it, and what to observe. Every action must be useful without buying anything from Easy AI. Do not include any other numbered or labeled actions.
6. Optional next step, one short paragraph. Explain that Easy AI's verified Google + AI Presence Score (spell it out in full before you ever shorten it to "GAP Score") can test the business's actual Google and AI visibility against three local competitors. State plainly that this free assessment is directional and is not a completed Google + AI Presence review. Keep the invitation soft and pressure free. This is the only call to action in your output.
7. Closing question. End with the mandatory closing question described under "Closing question" below. Do not write your own call-to-action, button, or booking link. That is added automatically after your content.

Ground the two diagnoses in the approved industry research note where it is relevant. Keep every statistic in its original context and never present an industry pattern as a result for this business.

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

Writing standard:
- Use plain language a nontechnical business owner understands. Short paragraphs, active verbs, specific nouns and instructions instead of marketing language.
- Sound like an experienced business adviser speaking directly to one owner. Empathetic without being sentimental, confident without exaggerating.
- Do not explain what Artificial Intelligence is unless it is genuinely necessary.
- Spell out "Google + AI Presence" in full before ever using the short form "GAP".
- Target roughly 350 to 550 words.
- Every sentence must diagnose, explain, instruct, reassure, or move the reader toward a decision. Delete anything that does none of those.

Banned AI-slop language. Never use any of these, in any capitalization or word form: unlock, leverage, game-changing, revolutionary, transformative, cutting-edge, seamless, robust, supercharge, elevate your business, take your business to the next level, in today's digital landscape, in today's fast-paced world, harness the power of AI, AI-powered solutions, streamline your operations, maximize your potential, embark on a journey, tailored solutions, valuable insights, drive growth, stay ahead of the curve, the possibilities are endless.

Also prohibited:
- Generic lists of AI tools.
- Empty motivational language and excessive adjectives.
- Repeating the reader's complete set of answers back to them.
- A long introduction before you identify the problem.
- Fake quotations or testimonials.
- Unsupported statistics or dollar figures.
- Any claim that research, a web search, a competitor comparison, or a completed review of their business occurred. Never use the word "audit" anywhere in your output.
- Recommendations that could apply unchanged to any business.
- More than one primary call to action.
- Any recommendation that requires buying Easy AI services before the reader gets value.

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

/**
 * Exported for lib/assessmentGarySeparation.test.ts, which proves that no Gary session,
 * message, or correlation metadata reaches the generation prompt. Not part of the public
 * generation path — generateAssessmentResult is the only caller in production.
 */
export function buildUserPrompt(submission: AssessmentSubmission): string {
  const research = researchForIndustry(submission.industry, submission.industryOther);
  return `Generate the personalized Customer Opportunity Action Plan email body for this lead.

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
 * Quotes one of the visitor's selected answers back to them. Escaped for a text node and
 * stripped of a trailing period so the sentence it lands in reads correctly (some option
 * lists end their options with a period, others do not).
 */
function quoteAnswer(value: string): string {
  return escapeHtmlText(value.trim().replace(/\.+$/, ''));
}

/**
 * The desired-outcome and privacy-concern option lists both contain em dashes, which the
 * validator bans from generated output. Map them to safe derived phrasing rather than
 * quoting them verbatim.
 */
function outcomeFocus(desiredOutcome: string): string {
  if (desiredOutcome.startsWith('Save time')) return 'free up your schedule';
  if (desiredOutcome.startsWith('Improve quality')) return 'deliver more consistent work with fewer mistakes';
  return 'bring in more revenue';
}

function privacyPosture(privacyConcern: string): string {
  if (privacyConcern.startsWith('Very worried')) {
    return 'keeping control of your business and customer information is the main thing holding you back';
  }
  if (privacyConcern.startsWith('Somewhat worried')) {
    return 'you still think carefully about how your business and customer information gets handled';
  }
  return 'you are open to new tools as long as your business and customer information is handled properly';
}

/** Reader-facing industry phrasing. Never uses the free-text "Something else" description. */
function industryLabel(industry: string): string {
  if (industry === 'Something else') return 'businesses like yours';
  return `${industry.split('(')[0].trim().toLowerCase()} businesses`;
}

/**
 * First sentence of the approved research note. Only entries from the locked
 * INDUSTRY_RESEARCH table are ever interpolated: the "Something else" free-text
 * description is raw visitor input and the fallback path does not run through
 * renderUntrustedAssessmentContent, so it must not reach the email body here.
 */
function fallbackResearchSentence(industry: string): string {
  const note = INDUSTRY_RESEARCH[industry];
  if (!note) {
    return 'Businesses this size usually lose the most ground in the places customers look first, long before anyone picks up a phone.';
  }
  // Some notes punctuate with an em dash (Professional Services), which the validator
  // bans from generated output. The notes are written for the model, not for the reader,
  // so normalize the punctuation before it lands in a customer-facing sentence.
  return `${note.split('.')[0].replace(/\s*[—–]\s*/g, ', ')}.`;
}

/**
 * Deterministic fallback used only if the Claude call fails, refuses, or never passes
 * validation — the lead should never get nothing. It follows the same Feel, Felt, Found
 * method and report flow as the prompt, and anthropic.test.ts proves it passes the same
 * validateResultHtml gate the model output has to clear.
 *
 * Every submitted field is escaped before interpolation (escapeHtmlText — safe for
 * text-node content, keeps natural punctuation like apostrophes literal) since these are
 * raw user-submitted strings, not model output.
 */
export function buildFallbackResultHtml(submission: AssessmentSubmission): string {
  const firstName = escapeHtmlText(submission.firstName);
  const businessName = escapeHtmlText(submission.businessName);
  // Answers shown inside quotation marks keep their original casing; timeDrain is the only
  // one folded into a sentence, so it is the only one lowercased.
  const aiChallenge = quoteAnswer(submission.aiChallenge);
  const timeDrain = quoteAnswer(submission.timeDrain.toLowerCase());
  const searchVisibility = quoteAnswer(submission.searchVisibility);
  const websiteConversion = quoteAnswer(submission.websiteConversion);
  const leadResponse = quoteAnswer(submission.leadResponse);
  const industry = escapeHtmlText(industryLabel(submission.industry));
  const research = escapeHtmlText(fallbackResearchSentence(submission.industry));
  const outcome = outcomeFocus(submission.desiredOutcome);
  const privacy = privacyPosture(submission.privacyConcern);
  return `
    <h2>Hi ${firstName},</h2>
    <p>Thanks for walking us through ${businessName}, ${firstName}. Reading your answers together, one problem stands out: customers who should be finding ${businessName} and customers who should be choosing it are slipping away at two different points, and you are trying to fix both while the work of the day keeps moving.</p>
    <p>You told us the hardest part right now is this: "${aiChallenge}." What you want out of it is to ${outcome}, while ${timeDrain} takes the hours you would need to get there, and ${privacy}. That is a normal place to be. Most ${industry} hit the same two gaps, because getting found and getting chosen look like one job and are really two.</p>
    <p><strong>Get found:</strong> You described how ${businessName} shows up in Google and AI answers this way: "${searchVisibility}." Read that as a directional signal about discovery, never as proof of where you actually stand. ${research} When customers cannot quickly confirm who you are and what you do in the places they look first, the opportunity is gone before you ever hear about it.</p>
    <p><strong>Get chosen:</strong> You described the path on your website this way: "${websiteConversion}." What usually happens after someone reaches out sounds like this: "${leadResponse}." Interest that survives discovery still has to land somewhere and reach a person quickly. When the next step is unclear or the reply is slow, most customers simply move on to whoever answers first.</p>
    <p><strong>Free action 1:</strong> Search one of your main services plus your city in Google, then ask one AI assistant the same question. Write down whether ${businessName} appears at all and which three businesses do. Then check that your name, phone number, and service area read the same way everywhere you found yourself listed.</p>
    <p><strong>Free action 2:</strong> Open your website on your phone the way a customer would. Before scrolling, one action should be obvious: call, book, or request information. Move or remove anything competing with it, then submit the form yourself and watch where the message actually lands and how long it takes to arrive.</p>
    <p><strong>Free action 3:</strong> For the next seven days, log every call, form, and message in one shared list with the time it came in, who responded, how long that took, and the next step. At the end of the week, count how many never got a reply. That number is usually the fastest thing to fix.</p>
    <p>If you would rather have evidence than a directional read, Easy AI's verified Google + AI Presence Score, which we shorten to GAP Score, tests how ${businessName} actually shows up in Google and AI answers against three local competitors. This free assessment points you in a direction. It is not that completed review.</p>
    <p>${buildWhyQuestion(submission.businessName)}</p>
  `;
}
