import Anthropic from '@anthropic-ai/sdk';
import type { AssessmentSubmission } from './validation';

// Constructed lazily so this module can be imported at build time without ANTHROPIC_API_KEY set.
let anthropicClient: Anthropic | undefined;
function getClient(): Anthropic {
  if (!anthropicClient) anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropicClient;
}

// Internal research bank — cited stats the model can draw on for the FOUND section.
// Never shown to the visitor in the quiz; only used to ground the generated email.
const INDUSTRY_RESEARCH: Record<string, string> = {
  'Construction & Trades (contractors, subs, home services)':
    'Trade businesses miss 27-62% of incoming calls. Only 5-12% of dormant/old leads convert without automated follow-up.',
  'Healthcare & Wellness (chiropractic, medical, dental, therapy)':
    'No-shows cost the average chiropractic-style clinic $15,000-$40,000/year. Solo practitioners lose 15-20 hrs/week to insurance and scheduling admin. Do not reference or ask about any patient medical history, diagnoses, or health data — stay focused on practice operations only.',
  'Professional Services (consulting, legal, accounting, financial)':
    'Unbilled time is the "leaky faucet" of professional services — loose time tracking quietly drains profit.',
  'Retail & E-commerce':
    '~75% of online carts are abandoned with no recovery process. 43% of small businesses still run inventory manually.',
  'Hospitality & Food Service':
    '40% of restaurant calls go unanswered at peak hours. Scheduling alone eats 8-12 hrs/week of a manager’s time.',
  'Real Estate':
    'Responding to a lead within 5 minutes makes an agent up to 21x more likely to qualify it. Admin eats 30-40% of an agent’s week.',
};

function researchForIndustry(industry: string, industryOther?: string): string {
  if (INDUSTRY_RESEARCH[industry]) return INDUSTRY_RESEARCH[industry];
  return `The business describes itself as: "${industryOther ?? industry}". No specific stat bank is available — speak generally about how businesses their size typically lose time to manual, repetitive work, without citing a fabricated statistic.`;
}

const SYSTEM_PROMPT = `You are writing a personalized "AI Action Plan" preview email on behalf of Easy AI Consulting, sent to a small business owner who just completed a free AI-readiness assessment.

Tone: warm, empathetic, specific, and grounded — never hype-y, never a hard sell, never a guaranteed-results promise. This is roughly 70% emotional connection, 30% concrete substance.

Structure the email using this Feel-Felt-Found arc, in this order:
1. Personal hook — open using their first name and business name. If your web search turned up anything real and specific about the business (their site, services, reviews, location), weave in ONE concrete detail naturally. If you found nothing verifiable, skip the specific detail rather than inventing one — do not fabricate facts about their business.
2. FEEL — reflect their stated data-privacy/security worry and their #1 AI challenge back to them empathetically, in their own terms, so they feel heard.
3. FELT — normalize it: something like "most [their industry] owners feel exactly the same way before they see it working" (paraphrase naturally, don't use that literal sentence).
4. FOUND — where their industry is headed and what's been found to work, grounded in the research note provided below. Cite the stat naturally, not as a bullet list of data.
5. Mirror their specific biggest time drain, framed as "businesses like yours typically..." — this must never read as a personal guarantee about their specific results.
6. Money reassurance tied to their desired outcome — most of the tools that would realistically help run $40-60/month, not thousands.
7. Time reassurance — make clear their time is the asset being protected here, not something else being asked of them.
8. A soft closing CTA inviting them to book a discovery call / the paid $299 deeper assessment — inviting, not pushy. Do not repeat the price more than once.

Hard rules:
- Do NOT invent specific promises, numbers, or guarantees about THIS business's results. Stats from the research note describe industry patterns, not this business.
- Do NOT collect, reference, infer, or discuss any medical/health details, diagnoses, or patient data, even if the business is in healthcare/wellness — stay strictly at the level of business operations (scheduling, admin, no-shows).
- Do NOT mention that you performed a web search, cite your search process, or name any AI-tool directories or research methodology. Speak only as Easy AI.
- Do NOT use any sports, game, or team metaphors or headers of any kind.
- Do NOT wrap the output in markdown code fences or mention that this is HTML.
- Output ONLY a clean HTML fragment for the body of an email (use <h2>, <p>, <strong> — no <html>, <head>, <body>, no inline <style> blocks, no scripts). Keep it skimmable: short paragraphs, one idea per paragraph, no walls of text.
- Do not use the word "guarantee" or promise specific ROI figures for this business.`;

export interface GenerateResultInput {
  submission: AssessmentSubmission;
}

export async function generateAssessmentResult({ submission }: GenerateResultInput): Promise<string> {
  const research = researchForIndustry(submission.industry, submission.industryOther);

  const userPrompt = `Generate the personalized AI Action Plan email body for this lead.

First name: ${submission.firstName}
Last name: ${submission.lastName}
Business name: ${submission.businessName}
Industry: ${submission.industryOther ? `${submission.industry} — specifically: ${submission.industryOther}` : submission.industry}
Work situation: ${submission.workSituation}
Already using AI tools regularly: ${submission.usingAiTools}
Their #1 AI challenge: ${submission.aiChallenge}
Outcome they most want: ${submission.desiredOutcome}
Biggest time drain: ${submission.timeDrain}
Data privacy/security worry level: ${submission.privacyConcern}

Industry research note to draw on for the FOUND section: ${research}

Before writing, use web search to look up "${submission.businessName}" to see if there's a real, public website, Google listing, or reviews you can reference for one specific, true detail. If you can't confidently confirm anything about this specific business, don't guess — just skip the specific detail and keep the hook centered on their name and industry.`;

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

  // With the server-side web_search tool, Claude's response can include an early
  // narration text block ("I'll search for X first...") before the tool call,
  // followed by the actual email as a separate text block after the search
  // results come back. Only the last text block is the finished answer — joining
  // every text block would leak that narration into the customer-facing email.
  const textBlocks = response.content.filter((block): block is Anthropic.TextBlock => block.type === 'text');
  const html = textBlocks[textBlocks.length - 1]?.text.trim();

  if (!html) {
    throw new Error('Claude returned no text content for the assessment result');
  }

  return html;
}

/** Deterministic fallback used only if the Claude call fails or refuses — the lead should never get nothing. */
export function buildFallbackResultHtml(submission: AssessmentSubmission): string {
  const research = researchForIndustry(submission.industry, submission.industryOther);
  return `
    <h2>Hi ${submission.firstName},</h2>
    <p>Thanks for taking the time to walk us through ${submission.businessName}. We're putting together your full AI Action Plan now, and wanted to make sure you heard from us right away.</p>
    <p>You mentioned ${submission.aiChallenge.toLowerCase()} — that's an extremely common starting point, and it's exactly what a short discovery call is for.</p>
    <p>${research.split('.')[0]}. Businesses like yours typically find the biggest win is tackling "${submission.timeDrain.toLowerCase()}" first.</p>
    <p>Most of the tools that realistically fit a business your size run $40-60/month — not thousands — and the goal is always to protect your time, not add more to your plate.</p>
    <p>When you're ready, we'd love to set up a short discovery call to go deeper.</p>
  `;
}
