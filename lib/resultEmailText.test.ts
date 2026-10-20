import { describe, it, expect } from 'vitest';
import { buildResultEmailText } from './resend';

describe('plain-text result email fallback', () => {
  const html =
    '<h2>Hi Dana</h2><p>Riverside Plumbing has a real follow-up problem.</p>' +
    '<p>Owners often feel that&rsquo;s just how it goes &amp; move on.</p>';

  it('renders readable prose with no markup left behind', () => {
    const text = buildResultEmailText(html, 'Riverside Plumbing');
    expect(text).not.toMatch(/<[^>]+>/);
    expect(text).toContain('Hi Dana');
    expect(text).toContain('Riverside Plumbing has a real follow-up problem.');
  });

  it('decodes the entities the generator actually emits', () => {
    const text = buildResultEmailText(html, 'Riverside Plumbing');
    expect(text).toContain("that's just how it goes & move on");
    expect(text).not.toContain('&rsquo;');
    expect(text).not.toContain('&amp;');
  });

  it('sends the reader back to the gated completion page, never straight to a calendar', () => {
    const text = buildResultEmailText(html, 'Riverside Plumbing');
    expect(text).toContain('/assessment/complete');
    expect(text).not.toMatch(/calendar|appointment|book-consultation/i);
  });

  it('stands on its own instead of telling the reader to view the HTML version', () => {
    const text = buildResultEmailText(html, 'Riverside Plumbing');
    expect(text.toLowerCase()).not.toContain('view this email');
    expect(text.toLowerCase()).not.toContain('html version');
    expect(text.length).toBeGreaterThan(120);
  });
});
