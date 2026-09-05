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

/**
 * Exported as ASSESSMENT_SYSTEM_PROMPT so lib/anthropic.test.ts can assert that the recovered
 * writing rules are actually stated in the prompt, not only enforced by the validator. Silent
 * prompt drift is how the money-reassurance beat and the invisible-arc rule were lost before.
 */
export const ASSESSMENT_SYSTEM_PROMPT = `You are writing a personalized "Customer Opportunity Action Plan" email on behalf of Easy AI Consulting, sent to a small business owner who completed a free business visibility and conversion assessment.

Tone: warm, empathetic, specific, and grounded — never hype-y, never a hard sell, never a guaranteed-results promise. This is roughly 70% emotional connection, 30% concrete substance. Sound supportive, intelligent, practical, and human. Use plain language, avoid technical jargon, avoid fear-selling, and avoid sounding like therapy, a motivational speech, or a generic AI advertisement.

Write at roughly a 6th-grade reading level: short sentences, everyday words, no jargon. It should read personal, intelligent, practical, calm, credible and useful, never robotic, over-enthusiastic, generic, corporate, preachy, salesy, or like a recap of a questionnaire.

WRITING METHOD (internal only): Feel, Felt, Found is how you think, not how you format. These are instructions to you, not headings for the reader. Never write the words "Feel", "Felt", or "Found" as labels, headers, or section markers anywhere in the output, and never describe the method. The arc must be invisible.
- Feel: acknowledge the real challenge using their answers. Sound observant and human. Never use canned empathy such as "We completely understand your frustration."
- Felt: normalize the problem inside their industry and business situation. Say the concern is common among owners in similar situations. Never claim that anyone at Easy AI has personally spoken with owners, customers, or businesses. Never invent testimonials, customers, statistics, case studies, research, or results, and never imply Easy AI has worked with a particular business.
- Found: explain the practical business lesson their answers reveal, then turn it into actions they can take immediately. Show the connection between the problem, the action, and the benefit. Never promise rankings, leads, revenue, savings, or specific results.

ANALYSIS (internal only, never named in the output). Assess two areas:
1. Discovery. Whether customers can find and understand the business, from their self-reported Google and AI visibility, industry, and stated goals.
2. Conversion. Whether interest turns into a real inquiry that reaches a person, from their website-conversion answer, lead response, and biggest time drain.
Then:
- Rank them. Name the SINGLE largest customer leak and say plainly why that one comes first. Do not grade both areas evenly, and do not recommend every service.
- Explain how the second area contributes to the first. The weaker area should make the main leak more expensive, never read as a separate list item.
- Separate evidence from assumption. An answer they gave is evidence and may be stated directly. Anything you infer is an assumption and must be hedged, for example "that often points to..." or "it usually means...". Never present an inference as something they told you.
- Never write "Get found", "Get chosen", or any other framework label as a heading or paragraph opener. The two areas appear as reasoning inside ordinary sentences, never as sections.
- This assessment reads their submitted answers only. It did NOT inspect or verify any of the following, so never state or imply that it did: Google rankings, metadata, schema, AI visibility, keyword structure, website technical performance, competitors, local rankings, review optimization, or search-engine configuration. You have no search tool in this task.

REPORT SHAPE:
1. Open on the central business problem in their own terms, using their first name and business name naturally. No long introduction before the problem.
2. The Feel, Felt, Found narrative, applied naturally with no visible labels. Short and specific.
3. The connection they may not have noticed, drawn from several answers at once, then the ranked leak stated plainly.
4. How the weaker second area makes that leak cost more, grounded in the approved industry note where it is relevant. Keep every statistic in its original context and never present an industry pattern as a result for this business.
5. Two or three capabilities that clearly match the ranked leak, described as outcomes.
6. Their desired outcome expanded past its surface. Money is never only money and time is never only time.
7. Exactly three free actions, written as ordinary prose beginning "First,", "Second,", and "Third,". Never label or number them, and never write "Free action". Each says what to do, how to do it, and what to watch for.
8. One qualitative cost reassurance carrying no figure of any kind, and one time reassurance that does not minimize the problem.
9. One soft, pressure-free invitation to the Google + AI Presence (GAP) Score, which measures how the business shows up in Google and in AI answers next to three local competitors. Say plainly that this free read is not that. Never present it as something already performed. This is the only call to action in your output.
10. The mandatory closing question described under "Closing question" below. Do not write your own call-to-action, button, or booking link. That is added automatically after your content.

Deliver all of the advice before Easy AI is named anywhere in the output.

FREE ACTIONS, approved safe list. Choose three that fit their answers: confirm hours, phone number, services and service area are accurate and consistent everywhere a customer might find them; add current business or project photos; ask recent satisfied customers for honest reviews; respond to existing reviews; make the primary phone or contact button easier to find; test the website contact form from a phone and watch where the message lands; state the main service and area served near the top of the homepage; set a simple response-time goal for new inquiries; keep one shared list so every inquiry gets a follow-up; create a consistent follow-up step for estimates.
These free actions must NEVER include, hint at, or explain: making content easier for Google or AI systems to parse, AI-search optimization, keyword strategy, metadata, schema or structured data, entity optimization, content architecture, prompt testing, competitor analysis or competitor comparison, scoring methodology, or a complete content rewrite. You may say a website is not clearly communicating what the business does. You may NOT explain how to fix that technically. That method is paid work.

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
- Use contractions naturally where they make a sentence sound spoken. Do not force a contraction into every paragraph.
- Do not explain what Artificial Intelligence is unless it is genuinely necessary.
- Spell out an acronym in full the first time it appears, then use the short form. Write "Artificial Intelligence (AI)" before you use "AI", and "Google + AI Presence (GAP) Score" before you use "GAP Score".
- Punctuation: no em dashes and no en dashes. Use commas, periods, or separate sentences. Colons and parentheses are allowed but must not become a repeated tic. Avoid semicolons unless nothing else works.
- Shape: roughly 8 to 10 blocks, at most 2 headings, no bold, no bullet lists, no numbered lists. Paragraphs of 30 to 90 words. Sentences ranging from about 5 to 35 words, averaging near 16. Never write two paragraphs to the same rhythm.
- Target 450 to 525 words. Never exceed 550.
- Never write three sentence fragments in a row. A single fragment is allowed only when it genuinely improves emphasis.
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
- Do NOT mention searching, researching, checking, or looking anything up. You have no search tool and nothing about this business was verified. Speak only as Easy AI.
- Do NOT explain, justify, or reference the outcome of your research in any way, under any framing, anywhere in the output — not as an opening sentence, not comma-spliced into another sentence, not wrapped inside a paragraph tag, not as an aside. Forbidden content includes (and is not limited to) any variation of: "I searched...", "I couldn't confirm...", "No verifiable public listing...", "I kept the hook centered...", "no invented details", or any other sentence that describes enrichment success, failure, research limitations, prompting, or your own generation decisions. Begin directly with the central business problem, with zero transition, zero acknowledgment, and zero explanation of what you do or do not know about them.
- Do NOT invent or assert any fact about this specific business that was not given in the submitted answers. The submitted answers are the only source you have.
- Do NOT claim personal experience Easy AI never supplied. Never write that you, Etoyi, or anyone at Easy AI has spoken with, worked with, talked to, or helped other owners, customers, or businesses. Normalize impersonally instead: "that concern is common among owners who...". Testimonials, client claims, and case-study framing are all banned.
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

You have no search tool. Write only from the answers above and the industry note. Do not state or imply that anything about this business was looked up, checked, compared, or verified.`;
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
    system: ASSESSMENT_SYSTEM_PROMPT,
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
    system: ASSESSMENT_SYSTEM_PROMPT,
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
 * validator bans from output, so neither is ever quoted verbatim. Both are mapped to
 * derived phrasing instead.
 */
function outcomeOpening(desiredOutcome: string): string {
  if (desiredOutcome.startsWith('Save time')) return 'Getting your schedule back is the outcome you named.';
  if (desiredOutcome.startsWith('Improve quality')) return 'More consistent work is the outcome you named.';
  return 'More steady work is the outcome you named.';
}

function privacySentence(privacyConcern: string): string {
  if (privacyConcern.startsWith('Very worried')) {
    return 'Keeping control of your business and customer information is the thing holding you back most.';
  }
  if (privacyConcern.startsWith('Somewhat worried')) {
    return 'You still think about how your business and customer information gets handled.';
  }
  return "You're open to new tools as long as your business and customer information is handled properly.";
}

/**
 * Qualitative industry grounding. Derived from the approved INDUSTRY_RESEARCH bank but
 * carrying no statistic, because a number presented to one owner reads as a claim about
 * that owner. The free-text "Something else" description is never interpolated: it is raw
 * visitor input and the fallback path does not run through renderUntrustedAssessmentContent.
 */
const INDUSTRY_WEIGHT_SENTENCE: Record<string, string> = {
  'Construction & Trades (contractors, subs, home services)':
    'In the trades, that weight tends to land on missed calls and estimates that go quiet.',
  'Healthcare & Wellness (chiropractic, medical, dental, therapy)':
    'In practice work, that weight tends to land on scheduling and whoever is covering the front desk.',
  'Professional Services (consulting, legal, accounting, financial)':
    'In professional services, that weight tends to land on time that never gets captured.',
  'Retail & E-commerce': 'In retail, that weight tends to land on carts and questions nobody answered.',
  'Hospitality & Food Service': 'In hospitality, that weight tends to land on the calls that come in at the busiest hour.',
  'Real Estate': 'In real estate, that weight tends to land on the lead that waited too long for a reply.',
};

function industryWeightSentence(industry: string): string {
  return INDUSTRY_WEIGHT_SENTENCE[industry] ?? 'In most local businesses, that weight tends to land on the inquiry nobody got back to.';
}

/**
 * Deterministic ranking of the two customer-opportunity areas. The recovered methodology
 * requires naming the SINGLE largest leak rather than grading both evenly, so the fallback
 * has to reach the same verdict the model is asked to reach. Conversion wins a tie: a
 * business that loses the inquiries it already gets should stop that before paying to
 * attract more.
 */
const DISCOVERY_SCORES: Record<string, number> = {
  'We show up consistently in Google and AI answers for the services and locations we target': 0,
  'We show up sometimes, but competitors seem more visible': 2,
  'We rarely show up when customers search or ask AI for businesses like ours': 4,
  "I'm not sure where we show up": 3,
};

const WEBSITE_SCORES: Record<string, number> = {
  'Visitors have one clear action, and we can track what happens next': 0,
  'Visitors can contact us, but the next step could be clearer': 2,
  'Our website mostly provides information and does not consistently capture interest': 3,
  'We do not currently have a website': 3,
};

const LEAD_SCORES: Record<string, number> = {
  'They receive a fast response and are tracked through the next step.': 0,
  'We respond manually, but follow-up is not always consistent.': 1,
  'Responses are sometimes delayed because our team is busy.': 1,
  'Some calls, messages, or website inquiries are probably missed.': 2,
  "I don't have a clear way to track what happens.": 2,
};

export function rankCustomerLeak(submission: AssessmentSubmission): 'conversion' | 'discovery' {
  const discovery = DISCOVERY_SCORES[submission.searchVisibility] ?? 2;
  const conversion = (WEBSITE_SCORES[submission.websiteConversion] ?? 2) + (LEAD_SCORES[submission.leadResponse] ?? 1);
  return discovery > conversion ? 'discovery' : 'conversion';
}

const WEBSITE_PHRASES: Record<string, string> = {
  'Visitors have one clear action, and we can track what happens next': 'a website that already offers one clear action',
  'Visitors can contact us, but the next step could be clearer': "a website where the next step isn't obvious",
  'Our website mostly provides information and does not consistently capture interest':
    'a website that mostly informs rather than captures interest',
  'We do not currently have a website': 'no website to catch that interest',
};

const LEAD_PHRASES: Record<string, string> = {
  'They receive a fast response and are tracked through the next step.': 'inquiries that already get a fast, tracked reply',
  'We respond manually, but follow-up is not always consistent.': "follow-up that isn't always consistent",
  'Responses are sometimes delayed because our team is busy.': 'replies that slow down once the team gets busy',
  'Some calls, messages, or website inquiries are probably missed.': 'inquiries that are probably being missed',
  "I don't have a clear way to track what happens.": 'no clear way to track what happens next',
};

const VISIBILITY_PHRASES: Record<string, string> = {
  'We show up consistently in Google and AI answers for the services and locations we target':
    'Showing up consistently is worth protecting, and it',
  'We show up sometimes, but competitors seem more visible': 'Showing up sometimes while competitors show up more often',
  'We rarely show up when customers search or ask AI for businesses like ours': 'Rarely showing up when customers go looking',
  "I'm not sure where we show up": 'Not knowing where you show up',
};

/**
 * Deterministic fallback used only if the Claude call fails, refuses, or never passes
 * validation. The lead should never get nothing. It follows the same recovered methodology
 * as the prompt: invisible Feel, Felt, Found, no framework labels, a ranked single leak,
 * evidence stated and inference hedged, three safe free actions in prose, advice before
 * Easy AI is named, and the exact closing question last.
 *
 * Every submitted field is escaped before interpolation (escapeHtmlText, safe for text-node
 * content and keeps apostrophes literal) since these are raw user-submitted strings, not
 * model output. lib/actionPlanGolden.test.ts proves the result clears the same
 * validateResultHtml gate the model output has to clear.
 */
export function buildFallbackResultHtml(submission: AssessmentSubmission): string {
  const firstName = escapeHtmlText(submission.firstName);
  const businessName = escapeHtmlText(submission.businessName);
  const timeDrain = quoteAnswer(submission.timeDrain.toLowerCase());
  const aiChallenge = quoteAnswer(submission.aiChallenge);
  const leak = rankCustomerLeak(submission);
  const sitePhrase = WEBSITE_PHRASES[submission.websiteConversion] ?? 'a website that could be clearer';
  const leadPhrase = LEAD_PHRASES[submission.leadResponse] ?? "follow-up that isn't always consistent";
  const visibilityPhrase = VISIBILITY_PHRASES[submission.searchVisibility] ?? 'How often you show up when customers go looking';

  const diagnosis =
    leak === 'conversion'
      ? `<p>Here's what stands out when the answers are read together. ${capitalize(leadPhrase)} and ${sitePhrase} create the same problem: interested customers can reach ${businessName} and still disappear. Pulling more people toward a business that already loses some of them raises the cost of every customer. So the first leak worth closing isn't how many people find ${businessName}. It's what happens to the ones who already did.</p>
    <p>Visibility still matters here. ${visibilityPhrase} usually points to business details that read differently in different places. Fewer people finding you means every inquiry that arrives carries more weight. ${industryWeightSentence(submission.industry)}</p>`
      : `<p>Here's what stands out when the answers are read together. ${visibilityPhrase} usually points to business details that read differently in different places, which is the quietest way for a business to go unseen. Customers who never find ${businessName} cannot choose it, so this is the leak worth closing first.</p>
    <p>What happens afterward makes it cost more. ${capitalize(leadPhrase)} and ${sitePhrase} mean the few customers who do arrive are not all landing somewhere useful. ${industryWeightSentence(submission.industry)}</p>`;

  const improvements =
    leak === 'conversion'
      ? 'Make it easier for customers to reach a person on the first try, so a missed call does not quietly become somebody else\'s job. Put one consistent follow-up step behind every estimate or inquiry. Give the website one obvious next step.'
      : 'Make sure your business details read the same everywhere a customer might check. Give the website one obvious next step for someone who is ready to act. Put one consistent follow-up step behind every estimate or inquiry.';

  const secondAction = submission.noWebsite
    ? `Second, make sure one clear way to reach ${businessName} sits at the top of your business listing and anywhere else customers find you, then try it yourself and see where the message lands.`
    : `Second, put one clear way to reach ${businessName} near the top of your website, then send yourself a message through it and see where it lands.`;

  return `
    <h2>${firstName}, a quick read on ${businessName}</h2>
    <p>The thing eating most of your week at ${businessName} is ${timeDrain}. That's a different problem from being busy, ${firstName}, and it sits heavier, because the work on the books now doesn't tell you whether next month is covered.</p>
    <p>Underneath it is what you called the hardest part right now: "${aiChallenge}." ${privacySentence(submission.privacyConcern)} That kind of concern is common among owners who have watched new tools create more work instead of less. It's rarely resistance to the technology. It's that most of it never survives a normal week.</p>
    ${diagnosis}
    <p>Three improvements fit what you described. ${improvements} Each improvement will hold up better when a person still approves what goes out.</p>
    <p>${outcomeOpening(submission.desiredOutcome)} For a lot of owners in your position, what that really buys is room. Room to hire the help you keep putting off, room to take a week off without the phone deciding otherwise.</p>
    <h2>Three things you can do this week, free</h2>
    <p>First, check that your hours, phone number, services, and service area read the same everywhere a customer might find them. ${secondAction} Third, log every call, message, and form for seven days with how long each took to answer, then count the ones that never got a reply.</p>
    <p>On cost, this isn't the part where anyone tells you to buy something. Easy AI looks for practical improvements that fit how ${businessName} already runs, and the work should give you time back rather than another system to babysit.</p>
    <p>If you'd rather have evidence than a read like this one, Easy AI measures how ${businessName} shows up in Google and in Artificial Intelligence (AI) answers next to three local competitors. That's the Google + AI Presence (GAP) Score. This free read isn't that. It's what your own answers already say.</p>
    <p>${buildWhyQuestion(submission.businessName)}</p>
  `;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
