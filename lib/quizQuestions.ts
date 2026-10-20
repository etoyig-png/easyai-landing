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
  'Marketing, new customers & missed leads',
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

/* ── Customer-growth questions ──────────────────────────────────────────────
 * Added for the customer-growth repositioning. These feed the three assessment
 * output areas: Discovery and Visibility, Website Engagement and Opportunity
 * Capture, and Customer Response and Missed Opportunities.
 * Every option is written in plain business language. None of them ask for
 * protected health information, medical details, financial account data, legal
 * case details, credentials, or any other sensitive record - the closest we get
 * is SENSITIVE_INFO_OPTIONS, which asks only whether such information exists in
 * the business so human-control boundaries can be respected, never what it is.
 */
export const CUSTOMER_DISCOVERY_OPTIONS = [
  'Word of mouth and referrals',
  'Google search or Google Maps',
  'Social media',
  'Paid ads',
  'Repeat customers',
  'Honestly, I am not sure where most of them come from',
] as const;

export const SEARCH_VISIBILITY_OPTIONS = [
  'Confident - we usually show up for our services nearby',
  'Somewhat - we show up sometimes, but not consistently',
  'Not confident - I rarely see us come up',
  'I have never checked',
] as const;

export const WEBSITE_ACTION_OPTIONS = [
  'Most interested visitors contact us',
  'Some contact us, but I think we lose a lot of them',
  'Very few ever reach out',
  'We do not really have a website that does this',
  'I have no way to tell',
] as const;

export const RESPONSE_SPEED_OPTIONS = [
  'Within minutes',
  'Within a few hours',
  'Usually the same day',
  'A day or more, depending on how busy we are',
  'It varies a lot and some get missed',
] as const;

export const MISSED_CALLS_OPTIONS = [
  'Rarely - almost every call gets answered',
  'A few each week',
  'Several every day',
  'Often, especially when we are on jobs or with customers',
  'I do not track this',
] as const;

export const FOLLOW_UP_OPTIONS = [
  'We follow up consistently until we get an answer',
  'We follow up once, then usually move on',
  'Only when someone remembers',
  'We rarely follow up at all',
] as const;

export const SENSITIVE_INFO_OPTIONS = [
  'Yes - we handle sensitive customer information',
  'Some - a limited amount',
  'No - nothing sensitive',
  'I am not sure',
] as const;

export type CustomerDiscovery = (typeof CUSTOMER_DISCOVERY_OPTIONS)[number];
export type SearchVisibility = (typeof SEARCH_VISIBILITY_OPTIONS)[number];
export type WebsiteAction = (typeof WEBSITE_ACTION_OPTIONS)[number];
export type ResponseSpeed = (typeof RESPONSE_SPEED_OPTIONS)[number];
export type MissedCalls = (typeof MISSED_CALLS_OPTIONS)[number];
export type FollowUpConsistency = (typeof FOLLOW_UP_OPTIONS)[number];
export type SensitiveInfo = (typeof SENSITIVE_INFO_OPTIONS)[number];

export const SPORTS_OPTIONS = ['Football', 'Basketball', 'Not really a sports fan'] as const;

export type WorkSituation = (typeof WORK_SITUATION_OPTIONS)[number];
export type UsingAiTools = (typeof USING_AI_TOOLS_OPTIONS)[number];
export type AiChallenge = (typeof AI_CHALLENGE_OPTIONS)[number];
export type DesiredOutcome = (typeof DESIRED_OUTCOME_OPTIONS)[number];
export type TimeDrain = (typeof TIME_DRAIN_OPTIONS)[number];
export type PrivacyConcern = (typeof PRIVACY_CONCERN_OPTIONS)[number];
export type Industry = (typeof INDUSTRY_OPTIONS)[number];
export type SportsAnswer = (typeof SPORTS_OPTIONS)[number];

export type QuestionKey =
  | 'workSituation'
  | 'usingAiTools'
  | 'aiChallenge'
  | 'desiredOutcome'
  | 'timeDrain'
  | 'privacyConcern'
  | 'industry'
  | 'customerDiscovery'
  | 'searchVisibility'
  | 'websiteAction'
  | 'responseSpeed'
  | 'missedCalls'
  | 'followUpConsistency'
  | 'sensitiveInfo'
  | 'sportsFan';

export interface QuestionDef {
  key: QuestionKey;
  title: string;
  options: readonly string[];
  allowOther?: boolean;
}

/**
 * Builds the 8 quiz questions, naturally interpolating the submitted business
 * name into Q2-Q7. Q1 (workSituation) and Q8 (sportsFan) always keep their
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
      key: 'customerDiscovery',
      title: name ? `How do most new customers find ${name} today?` : 'How do most new customers find you today?',
      options: CUSTOMER_DISCOVERY_OPTIONS,
    },
    {
      key: 'searchVisibility',
      title: name
        ? `When someone nearby searches for what ${name} does, how confident are you that ${name} shows up?`
        : 'When someone nearby searches for what you do, how confident are you that your business shows up?',
      options: SEARCH_VISIBILITY_OPTIONS,
    },
    {
      key: 'websiteAction',
      title: name ? `When someone visits the ${name} website, what usually happens?` : 'When someone visits your website, what usually happens?',
      options: WEBSITE_ACTION_OPTIONS,
    },
    {
      key: 'responseSpeed',
      title: 'When a new inquiry comes in, how quickly does it usually get a response?',
      options: RESPONSE_SPEED_OPTIONS,
    },
    {
      key: 'missedCalls',
      title: 'How often do calls go unanswered during the workday?',
      options: MISSED_CALLS_OPTIONS,
    },
    {
      key: 'followUpConsistency',
      title: 'If a customer goes quiet after an estimate or inquiry, what usually happens next?',
      options: FOLLOW_UP_OPTIONS,
    },
    {
      key: 'sensitiveInfo',
      title: name
        ? `Does ${name} handle sensitive customer information as part of normal work?`
        : 'Does your business handle sensitive customer information as part of normal work?',
      options: SENSITIVE_INFO_OPTIONS,
    },
    { key: 'sportsFan', title: 'Are you a sports fan? If so, which do you like more?', options: SPORTS_OPTIONS },
  ];
}
