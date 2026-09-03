export const WORK_SITUATION_OPTIONS = [
  'Solopreneur, no employees (under $100K/yr)',
  'Small business, 1-10 employees ($100K-$1M/yr)',
  'Growing business, 10-50 employees ($1M-$5M/yr)',
  'Larger business, 50+ employees ($5M+/yr)',
  'Full-time employee, no business of my own',
] as const;

export const USING_AI_TOOLS_OPTIONS = [
  'Yes — using AI tools like ChatGPT or Claude at least a few times per week',
  "No — played around with AI, but it hasn't become part of my routine yet",
] as const;

export const AI_CHALLENGE_OPTIONS = [
  "I'm excited about AI but overwhelmed by where to start",
  "I'm behind my competitors who are using AI more effectively",
  "I don't have time to learn where AI can fit into my business",
  "I've tried tools or automation before, but it fell apart or didn't stick",
] as const;

export const DESIRED_OUTCOME_OPTIONS = [
  'Make more money — increase revenue or cut costs',
  'Save time — automate tasks and free up my schedule',
  'Improve quality — better product/service, fewer errors, happier customers',
] as const;

export const TIME_DRAIN_OPTIONS = [
  'Answering calls & following up with leads quickly',
  'Scheduling & appointments',
  'Invoicing, billing & payments',
  'Paperwork & documentation',
  'Finding more customers and generating a steady flow of qualified leads.',
] as const;

export const LEAD_RESPONSE_OPTIONS = [
  'They receive a fast response and are tracked through the next step.',
  'We respond manually, but follow-up is not always consistent.',
  'Responses are sometimes delayed because our team is busy.',
  'Some calls, messages, or website inquiries are probably missed.',
  "I don't have a clear way to track what happens.",
] as const;

export const PRIVACY_CONCERN_OPTIONS = [
  "Very worried — it's the main thing holding me back",
  "Somewhat worried — I think about it, but it's not stopping me",
  "Not very worried — I trust it if it's set up right",
  "Honestly, I haven't thought about it much",
] as const;

export const INDUSTRY_OPTIONS = [
  'Construction & Trades (contractors, subs, home services)',
  'Healthcare & Wellness (chiropractic, medical, dental, therapy)',
  'Professional Services (consulting, legal, accounting, financial)',
  'Retail & E-commerce',
  'Hospitality & Food Service',
  'Real Estate',
  'Something else',
] as const;

export const SPORTS_OPTIONS = ['Football', 'Basketball', 'Not really a sports fan'] as const;

export type WorkSituation = (typeof WORK_SITUATION_OPTIONS)[number];
export type UsingAiTools = (typeof USING_AI_TOOLS_OPTIONS)[number];
export type AiChallenge = (typeof AI_CHALLENGE_OPTIONS)[number];
export type DesiredOutcome = (typeof DESIRED_OUTCOME_OPTIONS)[number];
export type TimeDrain = (typeof TIME_DRAIN_OPTIONS)[number];
export type PrivacyConcern = (typeof PRIVACY_CONCERN_OPTIONS)[number];
export type Industry = (typeof INDUSTRY_OPTIONS)[number];
export type SportsAnswer = (typeof SPORTS_OPTIONS)[number];
export type LeadResponse = (typeof LEAD_RESPONSE_OPTIONS)[number];

export type QuestionKey =
  | 'workSituation'
  | 'usingAiTools'
  | 'aiChallenge'
  | 'desiredOutcome'
  | 'timeDrain'
  | 'privacyConcern'
  | 'industry'
  | 'leadResponse'
  | 'sportsFan';

export interface QuestionDef {
  key: QuestionKey;
  title: string;
  options: readonly string[];
  allowOther?: boolean;
}

/**
 * Builds the 9 quiz questions, naturally interpolating the submitted business
 * name into Q2-Q7. Q1, Q8 (leadResponse), and Q9 (sportsFan) keep their
 * original, unpersonalized wording. Business name is inserted as plain text —
 * safe against HTML/script injection because callers render `title` as JSX
 * text content (React auto-escapes), never via dangerouslySetInnerHTML.
 */
export function buildQuestions(businessName: string): QuestionDef[] {
  const name = businessName.trim();
  return [
    { key: 'workSituation', title: 'What best describes your work situation?', options: WORK_SITUATION_OPTIONS },
    {
      key: 'usingAiTools',
      title: name ? `Are you regularly using AI tools at ${name}?` : 'Are you regularly using AI tools in your business?',
      options: USING_AI_TOOLS_OPTIONS,
    },
    {
      key: 'aiChallenge',
      title: name ? `What's ${name}'s #1 AI challenge right now?` : "What's your #1 AI challenge right now?",
      options: AI_CHALLENGE_OPTIONS,
    },
    {
      key: 'desiredOutcome',
      title: name
        ? `What's the #1 outcome you're hoping AI can help ${name} achieve?`
        : "What's the #1 outcome you're hoping AI can help you achieve?",
      options: DESIRED_OUTCOME_OPTIONS,
    },
    {
      key: 'timeDrain',
      title: name ? `Which area of ${name} eats up the most of your time?` : 'Which area of your business eats up the most of your time?',
      options: TIME_DRAIN_OPTIONS,
    },
    {
      key: 'privacyConcern',
      title: name
        ? `When you think about using AI at ${name}, how worried are you about you and your customers' data privacy and security?`
        : "When you think about using AI in your business, how worried are you about you and your customers' data privacy and security?",
      options: PRIVACY_CONCERN_OPTIONS,
    },
    {
      key: 'industry',
      title: name ? `What kind of business is ${name}?` : 'What kind of business do you run?',
      options: INDUSTRY_OPTIONS,
      allowOther: true,
    },
    {
      key: 'leadResponse',
      title: 'What usually happens after a potential customer contacts your business?',
      options: LEAD_RESPONSE_OPTIONS,
    },
    { key: 'sportsFan', title: 'Are you a sports fan? If so, which do you like more?', options: SPORTS_OPTIONS },
  ];
}
