import type { AssessmentSubmission } from './validation';

/**
 * Three distinct states, derived from data the schema already stores. No migration, and
 * historical rows keep working: they were written under the old rule where the skip flag and
 * the website answer always agreed, which still resolves correctly here.
 *
 * The important correction: skipping the website field does NOT prove the business has no
 * website. A person may have one and simply choose not to share it. Only the assessment
 * question itself carries that claim, because only there did the owner actually say it.
 */
export type WebsiteStatus = 'provided' | 'declared-none' | 'not-provided';

/** The exact answer that means the owner stated the business has no website. */
export const NO_WEBSITE_ANSWER = 'We do not currently have a website';

export function websiteStatus(submission: Pick<AssessmentSubmission, 'websiteUrl' | 'noWebsite' | 'websiteConversion'>): WebsiteStatus {
  const url = submission.websiteUrl?.trim();
  if (url && !submission.noWebsite) return 'provided';
  if (submission.websiteConversion === NO_WEBSITE_ANSWER) return 'declared-none';
  return 'not-provided';
}

/** How the internal notification should show the website field. */
export function websiteNotificationValue(submission: Pick<AssessmentSubmission, 'websiteUrl' | 'noWebsite' | 'websiteConversion'>): string {
  switch (websiteStatus(submission)) {
    case 'provided':
      return submission.websiteUrl?.trim() ?? '';
    case 'declared-none':
      return 'Owner stated the business has no website';
    case 'not-provided':
      return 'Website address not provided';
  }
}

/**
 * The sentence the report uses when no website address was supplied. Honest about what was
 * and was not looked at, and turns the gap into a next step instead of a failure.
 */
export const WEBSITE_NOT_PROVIDED_SENTENCE =
  'We could not include your website in this assessment because a website address was not provided. If you have one and want a full evaluation, reply to this email or call us for the next steps.';

/**
 * What the generation prompt is told about the website. Each branch states only what is
 * actually known. None of them claims the live site was inspected, because it never is: the
 * assessment reads submitted answers and performs no external search.
 */
export function websitePromptLine(submission: Pick<AssessmentSubmission, 'websiteUrl' | 'noWebsite' | 'websiteConversion'>): string {
  switch (websiteStatus(submission)) {
    case 'provided':
      return `${submission.websiteUrl?.trim()}. This address was supplied by the owner and was NOT visited, opened, inspected, or evaluated. Never say or imply that anyone looked at it. You may reason only from their own website-conversion answer.`;
    case 'declared-none':
      return 'The owner answered the website question by saying the business does not currently have a website. That is their own stated answer, not something that was looked up or found missing. Give advice that works without a website, such as a complete and accurate business listing and one dependable way to reach a person. Never tell them to improve pages, buttons, or forms they do not have.';
    case 'not-provided':
      return `No website address was provided. This does NOT mean the business has no website: the owner may have one and simply chose not to share it. Never state or imply that the business has no website, that there is nothing to capture interest, or that anything was searched for or evaluated. Include one sentence with this meaning, worded naturally for the report: "${WEBSITE_NOT_PROVIDED_SENTENCE}"`;
  }
}
