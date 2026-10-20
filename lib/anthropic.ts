import Anthropic from '@anthropic-ai/sdk';
import type { AssessmentSubmission } from './validation';
import { escapeHtmlText } from './htmlEscape';
import { validateActionPlanFields, type ActionPlanFields } from './actionPlanValidator';

// Constructed lazily so this module can be imported at build time without ANTHROPIC_API_KEY set.
let anthropicClient: Anthropic | undefined;
function getClient(): Anthropic {
  if (!anthropicClient) anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropicClient;
}

// Internal research bank — grounding context the model can draw on when writing the
// challenge/action narrative. Never shown to the visitor in the quiz; never surfaced as
// a cited statistic in the customer email (the validator rejects any dollar figure, and
// the prompt below forbids citing numbers as guarantees for this specific business).
// Keyed 1:1 against the locked INDUSTRY_OPTIONS list (see industryResearch.test.ts).
export const INDUSTRY_RESEARCH: Record<string, string> = {
  'Construction & Trades (contractors, subs, home services)':
    'Trade businesses miss 27-62% of incoming calls. Only 5-12% of dormant/old leads convert without automated follow-up.',
  'Healthcare & Wellness (chiropractic, medical, dental, therapy)':
    'No-shows cost the average chiropractic-style clinic $15,000-$40,000/year. Solo practitioners lose 15-20 hrs/week to insurance and scheduling admin. Do not reference or ask about any patient medical history, diagnoses, or health data — stay focused on practice operations only.',
  'Professional Services (consulting, legal, accounting, financial)':
    'Unbilled time is the "leaky faucet" of professional services. Lost or incomplete time tracking drains profit a little at a time.',
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

const SUBMIT_ACTION_PLAN_TOOL: Anthropic.Tool = {
  name: 'submit_action_plan',
  description: 'Submit the completed 3-Step AI Action Plan narrative content as structured fields.',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: [
      'opening',
      'challengeOneHeadline',
      'challengeOneStory',
      'actionOneHeadline',
      'actionOneDoNow',
      'actionOneAutomationOpportunity',
      'challengeTwoHeadline',
      'challengeTwoStory',
      'actionTwoHeadline',
      'actionTwoDoNow',
      'actionTwoAutomationOpportunity',
      'easyAiSummary',
    ],
    properties: {
      opening: { type: 'string', description: 'Short personalized opening, 1-2 sentences.' },
      challengeOneHeadline: { type: 'string', description: 'Bold, personalized headline for Challenge 1, based on their #1 AI challenge.' },
      challengeOneStory: { type: 'string', description: 'Up to 4 sentences: state the challenge, make it relatable, use Feel-Felt-Found naturally, build enough tension to make the action meaningful.' },
      actionOneHeadline: { type: 'string', description: 'Bold, outcome-based action headline for Step 1.' },
      actionOneDoNow: { type: 'string', description: 'One practical, low-risk, no-purchase action completable in 10-20 minutes that directly addresses Challenge 1.' },
      actionOneAutomationOpportunity: { type: 'string', description: 'Brief reveal of what part of that action could happen automatically and the benefit, with no brand names, vendors, or setup steps, and no mention of Easy AI.' },
      challengeTwoHeadline: { type: 'string', description: 'Bold, personalized headline for Challenge 2, based on their biggest time drain.' },
      challengeTwoStory: { type: 'string', description: 'Up to 4 sentences, same structure as Challenge 1 story, about their biggest time drain.' },
      actionTwoHeadline: { type: 'string', description: 'Bold, outcome-based action headline for Step 2.' },
      actionTwoDoNow: { type: 'string', description: 'One practical, low-risk, no-purchase action completable in 10-20 minutes that directly addresses Challenge 2.' },
      actionTwoAutomationOpportunity: { type: 'string', description: 'Same as actionOneAutomationOpportunity but for Step 2 — vary the phrasing from Step 1, do not repeat the same sentence pattern.' },
      easyAiSummary: {
        type: 'string',
        description:
          'Exactly two sentences explaining how Easy AI can help (finding the right tools, verifying fit, building dependable processes, strengthening the two actions above, supporting revenue and time savings). Must mention "Easy AI" by name. No sales pitch, no guarantees.',
      },
    },
  },
  strict: true,
};

const SYSTEM_PROMPT = `You write the narrative content for a free "3-Step AI Action Plan" preview email from Easy AI Consulting, sent to a small business owner who just completed a free AI-readiness assessment. You do this by calling the submit_action_plan tool with the completed fields — you never write raw HTML, headings, titles, or a call-to-action; the application renders all of that around your content deterministically.

Tone: warm, empathetic, specific, and grounded. Never hype-y, never a hard sell, never a guaranteed-results promise. Sound like a thoughtful person who understands small business, not an advertisement. Use plain contractions and natural sentence rhythm. Vary sentence and paragraph length. Prefer concrete business language over polished motivational copy.

Structure Claude must follow, twice: Challenge, then Relatability, then a clear Action. The story must lead quickly to the action, not delay it.

Challenge 1 is always based on their submitted #1 AI challenge. Challenge 2 is always based on their submitted biggest time drain. Do not invent a third challenge or swap these two sources.

For each challenge story (up to 4 sentences):
1. State the submitted challenge in your own words.
2. Make the situation relatable.
3. Use a Feel-Felt-Found arc naturally, without ever writing "Feel," "Felt," or "Found" as a heading or label. FEEL: reflect the challenge back empathetically, in their own terms. FELT: normalize it using honest founder-experience language — Etoyi, Easy AI's founder, has personally talked with business owners in these industries. Use phrasing like "Owners I've spoken with often describe...", "In my years working with business owners in [industry]...", "A common concern I hear is...". Never describe anyone as an Easy AI client and never claim Easy AI produced results for them — this is shared experience, not a testimonial or case study.
4. Build enough emotional weight to make the action that follows feel worth doing, without inventing facts, results, or emotional claims the recipient never gave you and that cannot reasonably be inferred from the assessment. Never invent a spouse, children, a family problem, or a financial crisis. At most once across the whole plan, you may use a single carefully hedged possibility about a deeper motivation (e.g. "for many owners in your position, that can mean...") — never more than once, and never framed as fact.

For each action (Step 1 and Step 2):
- actionOneHeadline / actionTwoHeadline: a specific, outcome-based headline, never vague. Good examples: "Stop Losing Leads to Slow Follow-Up", "Capture Client Notes Before Details Get Lost", "Reduce Appointment Back-and-Forth", "Create a Consistent Review Process", "Protect Your Time From Repetitive Administrative Work". Avoid vague phrasing like "Improve Your Business," "Use More AI," "Become More Efficient," or "Consider Automation."
- actionOneDoNow / actionTwoDoNow: one practical, low-risk action the owner can complete manually today, addressing the challenge directly above it. Usually 10-20 minutes. Deliver immediate value. Require no software purchase. Be specific enough to complete without extra instructions. Do not expose the complete paid Game Plan. Example: "Write the three follow-up messages you send most often and save them as reusable templates."
- actionOneAutomationOpportunity / actionTwoAutomationOpportunity: briefly reveal what portion of that manual action could happen automatically and the business benefit, in your own words each time (never the same sentence pattern twice, and never mechanically reused across emails). Reveal the opportunity without exposing the solution design: describe what activity could happen automatically and the benefit, never a brand, vendor, platform, integration, trigger, or technical setup step, and never a build guide. Do not mention Easy AI in either Step 1 or Step 2 — these two fields are about the opportunity itself, not who provides it. Example: "New inquiries can receive an immediate first response and be organized for follow-up without requiring you to stop working and answer every message personally."

Desired-outcome framing — use whichever matches their stated desired outcome to color the challenge stories and actions, without claiming to know their personal reason:
- "Make more money": explore what additional revenue could make possible without asserting a personal why — hiring help, financial breathing room, time away, family experiences, education, retirement, reinvestment, or growing without adding more personal hours.
- "Save time": connect it to fewer late nights, protected evenings, less administrative work, or more time for higher-value work.
- "Improve quality": connect it to consistency, fewer mistakes, reduced rework, stronger customer service, and less mental load.
Never guarantee any personal, financial, or operational outcome.

The user message includes an industry grounding note. It is for your own understanding of the space, not something to quote, cite, or turn into a number in your output.

easyAiSummary: exactly two sentences, no more and no fewer. It must mention "Easy AI" by name. It explains that Easy AI can find the right tools for this specific business, verify the tools fit the owner's workflow and concerns, help establish dependable business processes, strengthen the two actions above, support additional revenue opportunities, save the owner time, and help return time to what matters most to them — pick what's most relevant, do not try to fit everything into two sentences. Do not repeat the two actions verbatim. Do not turn this into a sales pitch.

Personalization: use the submitted business name naturally 4-6 times across all the fields combined, not clustered in one field. Use the owner's first name at least once beyond a simple greeting, where it reads naturally. Connect the challenge, desired outcome, time drain, privacy concern, AI usage, company size, and industry where relevant — do not mechanically repeat their answers back to them ("You said X, you said Y...").

Hard rules:
- Do NOT invent specific promises, numbers, guarantees, or dollar figures about this business's results or costs. Never mention a price, a monthly cost, or any dollar amount anywhere in your output — pricing is handled entirely outside your content.
- Do NOT collect, reference, infer, or discuss any medical/health details, diagnoses, or patient data, even if the business is in healthcare/wellness — stay at the level of business operations (scheduling, admin, no-shows).
- Do NOT explain, justify, or reference any research process, search, or your own generation decisions, anywhere, under any framing. You have no search tool in this task — write only from the submitted answers and the grounding note above.
- Do NOT describe anyone as an Easy AI client or claim Easy AI produced results for them. Founder-experience language ("owners I've spoken with...") is allowed; testimonials or case-study framing are not.
- Do NOT use any sports, game, or team metaphors of any kind.
- Do NOT use em dashes (—) or en dashes (–) anywhere in your output. Rewrite the sentence naturally instead of substituting a different repetitive punctuation mark.
- Do NOT use any of these AI-writing tells: "not X, but Y" constructions (including "not because X, but because Y"), repeated negative comparisons, three consecutive dramatic sentence fragments in a row, a rhetorical question immediately followed by its own answer, "you're in good company", "if any of this lands", "quietly saving", "low hum", "on-ramp", "move the needle", "genuinely fine", "reasonable place to be standing", "the thing that stood out most", "here's the part", "the deeper goal may be", decorative metaphors that don't clarify anything, or generic motivational filler.
- Do NOT name a specific third-party product, vendor, platform, or brand anywhere in your output, including but not limited to CRR, Intelligent Website, GoHighLevel, Paige, or Merchynt. Describe outcomes and capabilities only, never named tools.
- Write "Owners I've spoken with" (not "speak with") and use correct verb tense throughout — check subject-verb agreement, avoid duplicate words, and avoid incomplete sentences before submitting.
- Call the submit_action_plan tool exactly once with every field filled in. Do not write any text outside the tool call.`;

function buildUserPrompt(submission: AssessmentSubmission): string {
  const research = researchForIndustry(submission.industry, submission.industryOther);
  return `Generate the 3-Step AI Action Plan content for this lead by calling submit_action_plan.

First name: ${submission.firstName}
Last name: ${submission.lastName}
Business name: ${submission.businessName}
Industry: ${submission.industryOther ? `${submission.industry}, specifically: ${submission.industryOther}` : submission.industry}
Work situation: ${submission.workSituation}
Already using AI tools regularly: ${submission.usingAiTools}
Their #1 AI challenge (use this for Challenge 1): ${submission.aiChallenge}
Outcome they most want: ${submission.desiredOutcome}
Biggest time drain (use this for Challenge 2): ${submission.timeDrain}
Data privacy/security worry level: ${submission.privacyConcern}

Industry grounding note (context only, never cite as a number in your output): ${research}`;
}

function extractToolInput(response: Anthropic.Message): Record<string, unknown> | undefined {
  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use' && block.name === 'submit_action_plan'
  );
  return toolUse?.input as Record<string, unknown> | undefined;
}

function toActionPlanFields(input: Record<string, unknown> | undefined): ActionPlanFields | null {
  if (!input) return null;
  const keys: (keyof ActionPlanFields)[] = [
    'opening',
    'challengeOneHeadline',
    'challengeOneStory',
    'actionOneHeadline',
    'actionOneDoNow',
    'actionOneAutomationOpportunity',
    'challengeTwoHeadline',
    'challengeTwoStory',
    'actionTwoHeadline',
    'actionTwoDoNow',
    'actionTwoAutomationOpportunity',
    'easyAiSummary',
  ];
  const fields: Partial<ActionPlanFields> = {};
  for (const key of keys) {
    const value = input[key];
    if (typeof value !== 'string') return null;
    fields[key] = value;
  }
  return fields as ActionPlanFields;
}

export interface GenerateResultInput {
  submission: AssessmentSubmission;
}

export async function generateActionPlanFields({ submission }: GenerateResultInput): Promise<ActionPlanFields> {
  const userPrompt = buildUserPrompt(submission);

  const response = await getClient().messages.create({
    model: 'claude-opus-5',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [SUBMIT_ACTION_PLAN_TOOL],
    tool_choice: { type: 'tool', name: 'submit_action_plan' },
    messages: [{ role: 'user', content: userPrompt }],
  });

  if (response.stop_reason === 'refusal') {
    throw new Error('Claude declined to generate the assessment result');
  }

  const firstFields = toActionPlanFields(extractToolInput(response));
  if (!firstFields) {
    throw new Error('Claude did not return a valid submit_action_plan tool call');
  }

  const firstAttempt = validateActionPlanFields(firstFields);
  if (firstAttempt.valid) {
    return firstFields;
  }

  // One controlled correction attempt: tell Claude exactly what it violated and force
  // a fresh tool call. The assistant turn here is reconstructed as the tool_use block
  // only (no other content), matching what a real assistant turn containing a forced
  // tool call looks like — safe to send back to the API as history.
  const correctionPrompt = `Your previous submit_action_plan call violated the following rules and must be resubmitted from scratch:
${firstAttempt.violations.map((v) => `- ${v}`).join('\n')}

Call submit_action_plan again with all fields corrected, following every instruction in the system prompt exactly, with none of the violations above.`;

  const firstToolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
  if (!firstToolUse) {
    throw new Error('Claude did not return a valid submit_action_plan tool call');
  }

  const correctionResponse = await getClient().messages.create({
    model: 'claude-opus-5',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [SUBMIT_ACTION_PLAN_TOOL],
    tool_choice: { type: 'tool', name: 'submit_action_plan' },
    messages: [
      { role: 'user', content: userPrompt },
      { role: 'assistant', content: [firstToolUse] },
      {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: firstToolUse.id,
            content: 'Recorded. See the correction instructions in the next message.',
          },
          { type: 'text', text: correctionPrompt },
        ],
      },
    ],
  });

  if (correctionResponse.stop_reason === 'refusal') {
    throw new Error('Claude declined to generate the corrected assessment result');
  }

  const secondFields = toActionPlanFields(extractToolInput(correctionResponse));
  if (!secondFields) {
    throw new Error('Claude did not return a valid submit_action_plan tool call on the correction attempt');
  }

  const secondAttempt = validateActionPlanFields(secondFields);
  if (!secondAttempt.valid) {
    // Never send invalid output merely because the API returned a well-formed tool call —
    // fall through to the caller's existing fallback path instead.
    throw new Error(`Claude's corrected output still failed validation: ${secondAttempt.violations.join('; ')}`);
  }

  return secondFields;
}

/**
 * Deterministic fallback used only if the Claude call fails, refuses, or never passes
 * validation — the lead should never get nothing. Every submitted field is escaped
 * before interpolation (escapeHtmlText — safe for text-node content, keeps natural
 * punctuation like apostrophes literal) since these are raw user-submitted strings,
 * not model output.
 */
export function buildFallbackActionPlanFields(submission: AssessmentSubmission): ActionPlanFields {
  const firstName = escapeHtmlText(submission.firstName);
  const businessName = escapeHtmlText(submission.businessName);
  const aiChallenge = escapeHtmlText(submission.aiChallenge.toLowerCase());
  const timeDrain = escapeHtmlText(submission.timeDrain.toLowerCase());

  return {
    opening: `Thanks for taking the time to walk through the assessment for ${businessName}, ${firstName}. Here is a first look at your AI Action Plan.`,
    challengeOneHeadline: 'Where Your Attention Is Being Pulled Away',
    challengeOneStory: `You told us ${aiChallenge} is the challenge weighing on ${businessName} most right now. Owners I've spoken with in similar situations describe the same thing: it is hard to know where to start when everything feels urgent at once. That is a common starting point, not a sign anything is broken.`,
    actionOneHeadline: 'Write Down Your Single Biggest Time Cost',
    actionOneDoNow: `Take ten minutes and write down the one task that ate the most time at ${businessName} this week, and roughly how long it took.`,
    actionOneAutomationOpportunity: 'Once a task like that is written down clearly, it usually becomes obvious which parts of it are repetitive enough to hand off.',
    challengeTwoHeadline: 'The Drain That Keeps Coming Back',
    challengeTwoStory: `You named ${timeDrain} as the biggest drain on your time. That kind of recurring task rarely feels urgent in the moment, which is exactly why it quietly adds up. A common concern I hear is that there is never a good time to fix it because it never stops long enough to look at.`,
    actionTwoHeadline: 'Block Time Before It Gets Taken',
    actionTwoDoNow: `Pick one recurring block on your calendar this week and protect it specifically for ${timeDrain}, instead of letting it happen in the gaps.`,
    actionTwoAutomationOpportunity: 'Recurring tasks like this are often the easiest to hand off in part, once the pattern is clear.',
    easyAiSummary: `Easy AI can help find tools that fit how ${businessName} already works and confirm they solve the right problem before anything changes. That frees up more of your time for the parts of the business only you can do.`,
  };
}
