export const WORK_SITUATION_OPTIONS = [
  'Solopreneur, no employees (under $100K/yr)',
  'Small business, 1-10 employees ($100K-$1M/yr)',
  'Growing business, 10-50 employees ($1M-$5M/yr)',
  'Larger business, 50+ employees ($5M+/yr)',
  'Full-time employee, no business of my own',
] as const;

export const SEARCH_VISIBILITY_OPTIONS = [
  'We show up consistently in Google and AI answers for the services and locations we target',
  'We show up sometimes, but competitors seem more visible',
  'We rarely show up when customers search or ask AI for businesses like ours',
  "I'm not sure where we show up",
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

export const WEBSITE_CONVERSION_OPTIONS = [
  'Visitors have one clear action, and we can track what happens next',
  'Visitors can contact us, but the next step could be clearer',
  'Our website mostly provides information and does not consistently capture interest',
  'We do not currently have a website',
] as const;

export type WorkSituation = (typeof WORK_SITUATION_OPTIONS)[number];
export type SearchVisibility = (typeof SEARCH_VISIBILITY_OPTIONS)[number];
export type AiChallenge = (typeof AI_CHALLENGE_OPTIONS)[number];
export type DesiredOutcome = (typeof DESIRED_OUTCOME_OPTIONS)[number];
export type TimeDrain = (typeof TIME_DRAIN_OPTIONS)[number];
export type PrivacyConcern = (typeof PRIVACY_CONCERN_OPTIONS)[number];
export type Industry = (typeof INDUSTRY_OPTIONS)[number];
export type LeadResponse = (typeof LEAD_RESPONSE_OPTIONS)[number];
export type WebsiteConversion = (typeof WEBSITE_CONVERSION_OPTIONS)[number];

export type QuestionKey =
  | 'workSituation'
  | 'searchVisibility'
  | 'aiChallenge'
  | 'desiredOutcome'
  | 'timeDrain'
  | 'privacyConcern'
  | 'industry'
  | 'leadResponse'
  | 'websiteConversion';

export interface QuestionDef {
  key: QuestionKey;
  title: string;
  options: readonly string[];
  allowOther?: boolean;
}

/** Builds the 9-question assessment around discovery and website conversion. */
export function buildQuestions(businessName: string): QuestionDef[] {
  const name = businessName.trim();
  return [
    { key: 'workSituation', title: 'What best describes your work situation?', options: WORK_SITUATION_OPTIONS },
    {
      key: 'searchVisibility',
      title: name
        ? `When customers search Google or ask AI for the services you offer, how visible is ${name}?`
        : 'When customers search Google or ask AI for the services you offer, how visible is your business?',
      options: SEARCH_VISIBILITY_OPTIONS,
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
    {
      key: 'websiteConversion',
      title: name
        ? `When a potential customer visits ${name}'s website, what usually happens next?`
        : 'When a potential customer visits your website, what usually happens next?',
      options: WEBSITE_CONVERSION_OPTIONS,
    },
  ];
}
