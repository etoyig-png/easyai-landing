import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  WEBSITE_URL_ERROR,
  clearNoWebsite,
  isValidWebsiteUrl,
  selectNoWebsite,
  typeWebsiteUrl,
  websiteFieldError,
  websiteSubmissionValue,
} from './websiteAnswer';

/**
 * A business without a website is a real customer path. These tests pin the behaviour the
 * contact screen depends on, so the skip button cannot regress into the
 * URL error it was added to remove.
 */
describe('website field validation', () => {
  it('accepts a complete http or https address', () => {
    for (const url of ['https://example.com', 'http://example.com', 'https://sub.example.co.uk/path?q=1']) {
      expect(isValidWebsiteUrl(url), url).toBe(true);
      expect(websiteFieldError({ websiteUrl: url, noWebsite: false }), url).toBeNull();
    }
  });

  it('rejects an incomplete or non-http address', () => {
    for (const url of ['example.com', 'www.example.com', 'ftp://example.com', 'javascript:alert(1)', 'not a url', '']) {
      expect(isValidWebsiteUrl(url), url).toBe(false);
      expect(websiteFieldError({ websiteUrl: url, noWebsite: false }), url).toBe(WEBSITE_URL_ERROR);
    }
  });

  it('never reports an error while no website is selected, even with leftover text', () => {
    expect(websiteFieldError({ websiteUrl: '', noWebsite: true })).toBeNull();
    expect(websiteFieldError({ websiteUrl: 'not a url', noWebsite: true })).toBeNull();
  });

  it('is only consulted on Continue, so a blank field carries no error until then', () => {
    // The error text exists for a blank field, but the form calls websiteFieldError only from
    // validateContactStep. This asserts the shape the form relies on: computing the error is
    // separate from showing it.
    const blank = { websiteUrl: '', noWebsite: false };
    expect(websiteFieldError(blank)).toBe(WEBSITE_URL_ERROR);
    const page = fs.readFileSync(path.resolve(__dirname, '..', 'app/assessment/page.tsx'), 'utf8');
    expect(page.match(/websiteFieldError\(/g) ?? []).toHaveLength(1);
    expect(page).toMatch(/function validateContactStep[\s\S]{0,800}websiteFieldError\(/);
  });
});

describe('selecting and undoing "I don\'t have a website"', () => {
  it('clears the typed website when the button is pressed', () => {
    expect(selectNoWebsite()).toEqual({ websiteUrl: '', noWebsite: true });
  });

  it('can be undone, leaving an empty editable field', () => {
    expect(clearNoWebsite()).toEqual({ websiteUrl: '', noWebsite: false });
  });

  it('releases the no-website state as soon as a website is typed', () => {
    expect(typeWebsiteUrl('https://example.com')).toEqual({ websiteUrl: 'https://example.com', noWebsite: false });
    expect(typeWebsiteUrl('h')).toEqual({ websiteUrl: 'h', noWebsite: false });
  });
});

describe('what gets submitted', () => {
  it('stores no fake URL when no address was shared', () => {
    expect(websiteSubmissionValue({ websiteUrl: '', noWebsite: true })).toBeUndefined();
    // Even if stale text somehow survived in state, nothing false is sent.
    expect(websiteSubmissionValue({ websiteUrl: 'https://example.com', noWebsite: true })).toBeUndefined();
  });

  it('omits an empty field rather than sending an empty string', () => {
    expect(websiteSubmissionValue({ websiteUrl: '', noWebsite: false })).toBeUndefined();
    expect(websiteSubmissionValue({ websiteUrl: '   ', noWebsite: false })).toBeUndefined();
  });

  it('sends a trimmed real URL unchanged', () => {
    expect(websiteSubmissionValue({ websiteUrl: '  https://example.com  ', noWebsite: false })).toBe('https://example.com');
  });

  it('never contains a placeholder domain in the shipped form or helper', () => {
    const page = fs.readFileSync(path.resolve(__dirname, '..', 'app/assessment/page.tsx'), 'utf8');
    const helper = fs.readFileSync(path.resolve(__dirname, 'websiteAnswer.ts'), 'utf8');
    // A placeholder attribute is fine as a visual hint; a hard-coded fallback value is not.
    expect(page).not.toMatch(/websiteUrl:\s*['"`]https?:\/\//);
    expect(helper).not.toMatch(/return\s+['"`]https?:\/\//);
  });
});

describe('contact screen copy', () => {
  const page = fs.readFileSync(path.resolve(__dirname, '..', 'app/assessment/page.tsx'), 'utf8');

  it('labels the website field optional', () => {
    expect(page).toContain('Business website (optional)');
  });

  it('offers a visible skip button with an obvious selected state', () => {
    // The label offers a choice. It never asserts anything about the business, because
    // skipping the field does not prove a website does not exist.
    expect(page).toContain('Continue without sharing a website');
    expect(page).toContain('aria-pressed={answers.noWebsite}');
  });

  it('shows no em dash or en dash in any copy a visitor can read', () => {
    // Code comments are excluded: they are not customer-facing, and rewriting them would be
    // churn. Everything a visitor actually sees has to be clear of both dashes.
    const withoutComments = page
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .split(/\r?\n/)
      .map((line) => (/^\s*\/\//.test(line) ? '' : line.replace(/\s\/\/.*$/, '')))
      .join('\n');
    expect(withoutComments).not.toMatch(/[—–]/);
  });

  it('asks the final-screen question without an em dash', () => {
    expect(page).toContain('Almost there. Where should we send your plan?');
  });
});
