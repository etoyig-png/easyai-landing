import { escapeHtmlText } from './htmlEscape';
import type { DesiredOutcome } from './quizQuestions';

export type WhyQuestionTag = 'time' | 'revenue' | 'growth' | 'quality';

export interface WhyQuestionDef {
  id: string;
  tags: WhyQuestionTag[];
  /** Template text with a literal `[Business Name]` placeholder. */
  template: string;
}

/**
 * Fixed bank of exactly 10 approved WHY questions. This is the ONLY place their
 * wording lives — Claude never sees this bank and never authors WHY-question text;
 * selectWhyQuestionId() below picks one deterministically from the submitted
 * desired outcome, and buildWhyQuestionHtml() substitutes the business name.
 */
export const WHY_QUESTION_BANK: readonly WhyQuestionDef[] = [
  {
    id: 'time-control',
    tags: ['time', 'growth'],
    template: 'If [Business Name] gave you more control over your time, who or what would you want more of that time to go toward?',
  },
  {
    id: 'fewer-late-nights',
    tags: ['time', 'quality'],
    template: 'What would fewer late nights and less administrative work make possible for you outside [Business Name]?',
  },
  {
    id: 'revenue-without-time',
    tags: ['revenue', 'time'],
    template: 'If [Business Name] could generate more revenue without demanding more of your personal time, what would that change for you?',
  },
  {
    id: 'stronger-revenue',
    tags: ['revenue', 'growth'],
    template: 'What would stronger, more consistent revenue allow you to build, protect, or enjoy?',
  },
  {
    id: 'growth-without-sacrifice',
    tags: ['growth', 'time'],
    template: 'What would meaningful growth look like if it did not require sacrificing more evenings or weekends?',
  },
  {
    id: 'why-grow',
    tags: ['growth', 'revenue'],
    template: 'Why do you want [Business Name] to grow, and what would that growth make possible for you?',
  },
  {
    id: 'consistency-attention',
    tags: ['quality', 'time'],
    template: 'If [Business Name] ran more consistently with fewer mistakes, where would you want to redirect your attention?',
  },
  {
    id: 'known-for-consistency',
    tags: ['quality', 'growth'],
    template: 'What would delivering more consistent work allow [Business Name] to become known for?',
  },
  {
    id: 'what-made-you-build-it',
    tags: ['time', 'revenue', 'growth', 'quality'],
    template: 'What made you build [Business Name], and what do you want the business to make possible for you?',
  },
  {
    id: 'ultimately-for',
    tags: ['time', 'revenue', 'growth', 'quality'],
    template: 'Beyond keeping [Business Name] moving, who or what do you ultimately want the business to create more time and opportunity for?',
  },
] as const;

const WHY_QUESTION_BY_ID = new Map(WHY_QUESTION_BANK.map((q) => [q.id, q]));

/**
 * Deterministic desired-outcome -> question mapping. Selection is done entirely
 * in code, never by the model — an LLM "choosing" from the bank isn't guaranteed
 * to reproduce the same pick for the same input across calls, which would violate
 * the "identical assessment data produces the same question" requirement.
 */
const OUTCOME_TO_QUESTION_ID: Record<DesiredOutcome, string> = {
  'Make more money — increase revenue or cut costs': 'revenue-without-time',
  'Save time — automate tasks and free up my schedule': 'time-control',
  'Improve quality — better product/service, fewer errors, happier customers': 'consistency-attention',
};

/** Defensive fallback for any desired-outcome value not in the map above (the schema is a locked enum, so this should be unreachable). */
const FALLBACK_QUESTION_ID = 'what-made-you-build-it';

export function selectWhyQuestionId(desiredOutcome: string): string {
  return OUTCOME_TO_QUESTION_ID[desiredOutcome as DesiredOutcome] ?? FALLBACK_QUESTION_ID;
}

export function isApprovedWhyQuestionId(id: string): boolean {
  return WHY_QUESTION_BY_ID.has(id);
}

/** Builds the fully-substituted, safely-escaped WHY question text (no HTML tags — caller wraps/bolds it). */
export function buildWhyQuestionText(id: string, businessName: string): string {
  const def = WHY_QUESTION_BY_ID.get(id);
  if (!def) throw new Error(`Unknown WHY question id: ${id}`);
  return def.template.replace('[Business Name]', escapeHtmlText(businessName.trim()));
}
