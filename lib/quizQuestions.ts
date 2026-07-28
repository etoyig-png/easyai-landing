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

export const SPORTS_OPTIONS = ['Football', 'Basketball', 'Not really a sports fan'] as const;

export type WorkSituation = (typeof WORK_SITUATION_OPTIONS)[number];
export type UsingAiTools = (typeof USING_AI_TOOLS_OPTIONS)[number];
export type AiChallenge = (typeof AI_CHALLENGE_OPTIONS)[number];
export type DesiredOutcome = (typeof DESIRED_OUTCOME_OPTIONS)[number];
export type TimeDrain = (typeof TIME_DRAIN_OPTIONS)[number];
export type PrivacyConcern = (typeof PRIVACY_CONCERN_OPTIONS)[number];
export type Industry = (typeof INDUSTRY_OPTIONS)[number];
export type SportsAnswer = (typeof SPORTS_OPTIONS)[number];
