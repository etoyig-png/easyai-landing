import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { NO_WEBSITE_ANSWER, WEBSITE_NOT_PROVIDED_SENTENCE, websiteNotificationValue, websitePromptLine, websiteStatus } from './websiteStatus';
import type { AssessmentSubmission } from './validation';

/**
 * The correction this file guards: skipping the website field does NOT prove the business has
 * no website. Only the assessment question carries that claim, because only there did the
 * owner actually say it.
 */
const base = { websiteUrl: 'https://example.com', noWebsite: false, websiteConversion: 'Visitors can contact us, but the next step could be clearer' } as Pick<
  AssessmentSubmission,
  'websiteUrl' | 'noWebsite' | 'websiteConversion'
>;

const skipped = { ...base, websiteUrl: undefined, noWebsite: true };
const declaredNone = { ...base, websiteUrl: undefined, noWebsite: true, websiteConversion: NO_WEBSITE_ANSWER };

describe('three website states', () => {
  it('recognises a supplied address', () => {
    expect(websiteStatus(base)).toBe('provided');
  });

  it('treats a skipped address as not provided, never as proof of no website', () => {
    expect(websiteStatus(skipped)).toBe('not-provided');
  });

  it('recognises the owner actually stating they have no website', () => {
    expect(websiteStatus(declaredNone)).toBe('declared-none');
  });

  it('keeps historical rows working, where the flag and the answer always agreed', () => {
    expect(websiteStatus({ ...declaredNone })).toBe('declared-none');
    expect(websiteStatus({ websiteUrl: 'https://old.example.com', noWebsite: false, websiteConversion: base.websiteConversion })).toBe('provided');
  });
});

describe('what the internal notification shows', () => {
  it('shows the address when there is one', () => {
    expect(websiteNotificationValue(base)).toBe('https://example.com');
  });

  it('says the address was not provided, not that none exists', () => {
    expect(websiteNotificationValue(skipped)).toBe('Website address not provided');
  });

  it('reports the stated answer only when the owner gave it', () => {
    expect(websiteNotificationValue(declaredNone)).toBe('Owner stated the business has no website');
  });
});

describe('what the answer engine is told', () => {
  it('never claims the live website was inspected when an address is supplied', () => {
    const line = websitePromptLine(base);
    expect(line).toContain('https://example.com');
    expect(line).toContain('was NOT visited, opened, inspected, or evaluated');
  });

  it('never claims the business has no website when the address was skipped', () => {
    const line = websitePromptLine(skipped);
    expect(line).toContain('No website address was provided');
    expect(line).toContain('does NOT mean the business has no website');
    expect(line).toContain(WEBSITE_NOT_PROVIDED_SENTENCE);
    expect(line).not.toMatch(/the business does not currently have a website/i);
  });

  it('passes on the no-website answer only when the owner gave it', () => {
    expect(websitePromptLine(declaredNone)).toContain('does not currently have a website');
  });

  it('claims no external search in any state', () => {
    for (const state of [base, skipped, declaredNone]) {
      expect(websitePromptLine(state)).not.toMatch(/we searched|we looked up|we checked your (?:site|website)/i);
    }
  });
});

describe('customer-facing wording', () => {
  it('turns the missing address into a next step, not a failure', () => {
    expect(WEBSITE_NOT_PROVIDED_SENTENCE).toContain('reply to this email or call us');
    expect(WEBSITE_NOT_PROVIDED_SENTENCE).not.toMatch(/[—–]/);
    expect(WEBSITE_NOT_PROVIDED_SENTENCE).not.toMatch(/no website|missing|failure|problem/i);
  });

  it('offers the skip as a choice rather than a declaration about the business', () => {
    const page = fs.readFileSync(path.resolve(__dirname, '..', 'app/assessment/page.tsx'), 'utf8');
    expect(page).toContain('Continue without sharing a website');
    expect(page).not.toMatch(/I don.{1,8}t have a website/);
  });
});
