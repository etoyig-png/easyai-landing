import { describe, expect, it } from 'vitest';
import { INDUSTRY_RESEARCH } from './anthropic';
import { INDUSTRY_OPTIONS } from './quizQuestions';

// No new approved pain-point research document was supplied for this pass — the stat
// bank below predates this change and is already live in production. These tests only
// prove traceability (every stat maps to exactly one locked industry, none are orphaned
// or vague-authority claims), not that the numbers themselves are correct; validating
// the numbers against a source document requires that document.
describe('INDUSTRY_RESEARCH source mapping', () => {
  it('every research entry is keyed to a real, locked industry option', () => {
    for (const industry of Object.keys(INDUSTRY_RESEARCH)) {
      expect(INDUSTRY_OPTIONS).toContain(industry);
    }
  });

  it('does not invent vague, unsourced authority language', () => {
    for (const [industry, note] of Object.entries(INDUSTRY_RESEARCH)) {
      expect(note.toLowerCase(), `industry: ${industry}`).not.toMatch(/research proves|studies show|experts agree/);
    }
  });

  it('presents ranges, not guaranteed single numbers, for percentage-based claims', () => {
    for (const [industry, note] of Object.entries(INDUSTRY_RESEARCH)) {
      const percentMatches = note.match(/\d+%/g) ?? [];
      for (const match of percentMatches) {
        // A bare "X%" with no surrounding range language (e.g. "27-62%" or "~75%")
        // reads as a guaranteed number for this specific business rather than an
        // industry pattern — every entry should hedge with a range or an approx sign.
        const context = note.slice(Math.max(0, note.indexOf(match) - 12), note.indexOf(match) + match.length);
        expect(context, `industry: ${industry}, match: ${match}`).toMatch(/-|~|up to|roughly|about|nearly|approximately/i);
      }
    }
  });
});
