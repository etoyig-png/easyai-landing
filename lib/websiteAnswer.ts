/**
 * One source of truth for the "business website" answer, shared by the assessment form and
 * the server-side submission schema so the two can never disagree about what a valid website
 * answer looks like.
 *
 * A visitor may continue without sharing a website address. The visitor declares that by pressing "Continue without sharing a website" on the contact screen, which
 * clears the URL. Nothing is ever stored in its place: no placeholder, no example.com, no
 * empty string pretending to be a URL.
 */

/** The single message the form shows when a supplied website is not a complete http(s) address. */
export const WEBSITE_URL_ERROR = 'Enter a valid http:// or https:// URL';

export interface WebsiteAnswer {
  websiteUrl: string;
  noWebsite: boolean;
}

/** A complete absolute http(s) URL. Deliberately strict: this is the only URL rule in the app. */
export function isValidWebsiteUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * The error to show for the website field, or null when the answer is acceptable.
 *
 * Returns null while noWebsite is selected, so declaring "no website" never produces a URL
 * error. Callers decide WHEN to show this: the form only calls it once the customer presses
 * Continue, so a blank field is never marked wrong while it is still being filled in.
 */
export function websiteFieldError(answer: WebsiteAnswer): string | null {
  if (answer.noWebsite) return null;
  return isValidWebsiteUrl(answer.websiteUrl) ? null : WEBSITE_URL_ERROR;
}

/** Pressing "Continue without sharing a website": mark it and drop whatever was typed. */
export function selectNoWebsite(): WebsiteAnswer {
  return { websiteUrl: '', noWebsite: true };
}

/** Undoing that selection: the field becomes editable again and starts empty. */
export function clearNoWebsite(): WebsiteAnswer {
  return { websiteUrl: '', noWebsite: false };
}

/** Typing in the field always means the business has a website, so the selection is released. */
export function typeWebsiteUrl(value: string): WebsiteAnswer {
  return { websiteUrl: value, noWebsite: false };
}

/**
 * What actually gets submitted. `undefined` (an omitted optional) when there is no website,
 * never a placeholder URL, so nothing false is persisted and the existing schema needs no
 * migration to represent the state.
 */
export function websiteSubmissionValue(answer: WebsiteAnswer): string | undefined {
  if (answer.noWebsite) return undefined;
  const trimmed = answer.websiteUrl.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
