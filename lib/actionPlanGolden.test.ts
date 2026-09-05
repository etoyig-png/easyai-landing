import { describe, expect, it } from 'vitest';
import { buildWhyQuestion, validateResultHtml } from './resultValidator';
import { buildResultEmailHtml, buildResultEmailText } from './resend';
import { buildFallbackResultHtml, rankCustomerLeak } from './anthropic';
import type { AssessmentSubmission } from './validation';

/**
 * GOLDEN FIXTURE — Riverside Plumbing.
 *
 * Recovered from 80e2c38 and re-pointed at the nine current assessment questions, then
 * approved by the owner on 2026-09-05 as the permanent behavioural contract for the answer
 * engine's reasoning, voice, and customer-facing writing.
 *
 * This is a behavioural contract, not a wording snapshot: the report is model-written and
 * will never be byte-identical twice. The email below is a representative report that
 * satisfies every approved rule, and each test asserts one rule against it. If the prompt or
 * the validator later drifts so that this email would no longer be acceptable, these fail.
 *
 * The rule that governs every other rule: IF A CHANGE WOULD REJECT THIS EMAIL, THE CHANGE IS
 * WRONG.
 */
const BUSINESS = 'Riverside Plumbing';
const FIRST_NAME = 'Dana';

const GOLDEN_BODY = `
<h2>Dana, a quick read on Riverside Plumbing</h2>
<p>The thing eating most of your week at Riverside Plumbing is finding more customers and keeping steady, qualified work coming in. That's a different problem from being busy, Dana, and it sits heavier, because the jobs on the books don't tell you whether next month is covered.</p>
<p>You've tried tools before and they fell apart, and you still think about how your business and customer information gets handled. Both are fair. That concern is common among owners who've tried tools that created more work instead of reducing it. It's rarely resistance to the technology. It's that nothing survived a real Tuesday.</p>
<p>Here's what stands out when the answers are read together. Missed inquiries and an informational website create the same problem: interested customers can reach Riverside Plumbing and still disappear. Pulling more people toward a business that already loses some of them raises the cost of every customer. So the first leak worth closing isn't how many people find you. It's what happens to the ones who already did.</p>
<p>Visibility still matters here. Showing up sometimes while competitors show up more often usually points to business details that read differently in different places. Fewer people finding you means every inquiry that arrives carries more weight. In the trades, that weight tends to land on missed calls and estimates that go quiet.</p>
<p>Three improvements fit what you described. Make it easier for customers to reach a person on the first try, so a missed call does not quietly become somebody else's job. Put one consistent follow-up step behind every estimate. Give the website one obvious next step. Each improvement will hold up better when a person still approves what goes out.</p>
<p>More steady work is the outcome you named. For a lot of owners in your position, what that really buys is room. Room to hire the help you keep putting off, room to take a week off without the phone deciding otherwise.</p>
<h2>Three things you can do this week, free</h2>
<p>First, check that your hours, phone number, services, and service area read the same everywhere a customer might find them. Second, put one clear way to reach Riverside Plumbing near the top of your website, then send yourself a message through it and see where it lands. Third, log every call, message, and form for seven days with how long each took to answer, then count the ones that never got a reply.</p>
<p>On cost, this isn't the part where anyone tells you to buy something. Easy AI looks for practical improvements that fit how Riverside Plumbing already runs, and the work should give you time back rather than another system to babysit.</p>
<p>If you'd rather have evidence than a read like this one, Easy AI measures how Riverside Plumbing shows up in Google and in Artificial Intelligence (AI) answers next to three local competitors. That's the Google + AI Presence (GAP) Score. This free read isn't that. It's what your own answers already say.</p>
<p>${buildWhyQuestion(BUSINESS)}</p>
`;

/** The submission the golden report was written against, using the current nine questions. */
const GOLDEN_SUBMISSION: AssessmentSubmission = {
  workSituation: 'Small business, 1-10 employees ($100K-$1M/yr)',
  searchVisibility: 'We show up sometimes, but competitors seem more visible',
  aiChallenge: "I've tried tools or automation before, but it fell apart or didn't stick",
  desiredOutcome: 'Make more money — increase revenue or cut costs',
  timeDrain: 'Finding more customers and generating a steady flow of qualified leads.',
  privacyConcern: "Somewhat worried — I think about it, but it's not stopping me",
  industry: 'Construction & Trades (contractors, subs, home services)',
  leadResponse: 'Some calls, messages, or website inquiries are probably missed.',
  websiteConversion: 'Our website mostly provides information and does not consistently capture interest',
  firstName: FIRST_NAME,
  lastName: 'Reyes',
  businessName: BUSINESS,
  email: 'dana@example.com',
  websiteUrl: 'https://example.com',
  noWebsite: false,
  consent: true,
  formLoadedAt: 1,
};

const submission = { businessName: BUSINESS, firstName: FIRST_NAME };
const plain = GOLDEN_BODY.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const sentences = plain.match(/[^.!?]+[.!?]/g) ?? [];

function words(text: string): number {
  return text.trim().split(/\s+/).length;
}

/**
 * Sentence-fragment heuristic. A sentence counts as a fragment when it carries no finite
 * verb from the list below. Deliberately conservative: it exists to catch a RUN of three
 * fragments, which the writing standard bans, not to grade grammar. A lone fragment is
 * allowed when it improves emphasis.
 */
const FINITE_VERB =
  /\b(?:is|are|was|were|be|been|am|has|have|had|do|does|did|can|could|will|would|should|shall|may|might|must|isn't|aren't|wasn't|don't|doesn't|didn't|won't|can't|it's|that's|here's|there's|you've|you'd|who've|let|make|makes|made|put|puts|give|gives|check|log|count|send|read|reads|keep|keeps|take|takes|find|finds|hold|holds|holds|land|lands|tend|tends|point|points|mean|means|create|creates|raise|raises|carry|carries|arrive|arrives|disappear|reach|survive|survived|fell|tried|think|thinks|get|gets|got|approve|approves|show|shows|sit|sits|tell|tells|told|said|say|says|name|named|buy|buys|want|wants|hire|answer|stand|stands|close|closing|deciding|measures|measure|fit|fits|look|looks|run|runs)\b/i;

function isFragment(sentence: string): boolean {
  return !FINITE_VERB.test(sentence.trim().replace(/[.!?]+$/, ''));
}

function longestFragmentRun(text: string): number {
  const parts = text.match(/[^.!?]+[.!?]/g) ?? [];
  let run = 0;
  let worst = 0;
  for (const part of parts) {
    if (isFragment(part)) {
      run += 1;
      worst = Math.max(worst, run);
    } else {
      run = 0;
    }
  }
  return worst;
}

describe('golden fixture — passes the deterministic validator', () => {
  it('passes every rule with no violations', () => {
    const result = validateResultHtml(GOLDEN_BODY, submission);
    expect(result.violations).toEqual([]);
    expect(result.valid).toBe(true);
  });
});

describe('golden fixture — recovered reasoning', () => {
  it('leads with the central business problem, with no long introduction', () => {
    const first = sentences[0] ?? '';
    expect(first).toContain('eating most of your week');
    expect(words(first)).toBeLessThanOrEqual(40);
  });

  it('connects several answers instead of reciting them one by one', () => {
    expect(plain).toMatch(/read together|are connected|sit right next to/i);
    expect(plain).not.toMatch(/you said[^.]{0,60}you said/i);
    expect(plain.match(/\bYou (?:said|also said|told us)\b/gi) ?? []).toHaveLength(0);
  });

  it('names a single largest customer leak instead of grading both areas evenly', () => {
    expect(plain).toMatch(/the first leak worth closing/i);
  });

  it('explains how the weaker second area makes that leak cost more', () => {
    expect(plain).toMatch(/Visibility still matters/i);
    expect(plain).toMatch(/carries more weight/i);
  });

  it('separates evidence it was given from inference it is making', () => {
    expect(plain).toMatch(/usually points to|tends to land/i);
  });

  it('grounds the reasoning in the industry without inventing a statistic', () => {
    expect(plain).toMatch(/In the trades/i);
    expect(plain).not.toMatch(/\d+\s?%/);
  });

  it('recommends two or three capabilities, not a menu', () => {
    expect(plain).toMatch(/Three improvements fit/i);
  });

  it('expands the desired outcome past money', () => {
    expect(plain).toMatch(/what that really buys is room/i);
  });

  it('delivers every piece of advice before Easy AI is named', () => {
    const all = plain.split(/\s+/);
    const easyAiAt = all.findIndex((word) => word.startsWith('Easy'));
    expect(easyAiAt).toBeGreaterThan(all.length * 0.6);
  });

  it('reassures on cost qualitatively, with no figure of any kind', () => {
    expect(plain).toMatch(/isn't the part where anyone tells you to buy something/i);
    expect(plain).not.toMatch(/[$£€]\s?\d/);
  });

  it('reassures on time without minimizing the problem', () => {
    expect(plain).toMatch(/give you time back rather than another system to babysit/i);
  });

  it('invites the Google + AI Presence Score softly and never claims it was performed', () => {
    expect(plain).toMatch(/Google \+ AI Presence \(GAP\) Score/);
    expect(plain).toMatch(/This free read isn't that/i);
  });
});

describe('golden fixture — recovered writing standard', () => {
  it('contains no em dash or en dash', () => {
    expect(GOLDEN_BODY).not.toMatch(/—/);
    expect(GOLDEN_BODY).not.toMatch(/–/);
  });

  it('contains no semicolons', () => {
    expect(plain).not.toMatch(/;/);
  });

  it('never prints a Feel, Felt or Found label', () => {
    expect(plain).not.toMatch(/\b(?:FEEL|FELT|FOUND)\b/);
    expect(GOLDEN_BODY).not.toMatch(/>\s*(?:Feel|Felt|Found):/);
  });

  it('never forces a Get found or Get chosen heading', () => {
    expect(plain).not.toMatch(/Get found:|Get chosen:/i);
    expect(GOLDEN_BODY).not.toMatch(/<strong>\s*Get (?:found|chosen)/i);
  });

  it('presents the three actions as natural prose, never as numbered labels', () => {
    const section = plain.match(/Three things you can do this week, free(.*?)On cost/)?.[1] ?? '';
    expect(section).toMatch(/\bFirst,/);
    expect(section).toMatch(/\bSecond,/);
    expect(section).toMatch(/\bThird,/);
    expect(section).not.toMatch(/\bFourth\b/);
    expect(plain).not.toMatch(/Free action \d/i);
  });

  it('uses no bold, no bullets and at most two headings', () => {
    expect(GOLDEN_BODY.match(/<strong>/g) ?? []).toHaveLength(0);
    expect(GOLDEN_BODY.match(/<li>/g) ?? []).toHaveLength(0);
    expect((GOLDEN_BODY.match(/<h[1-6]>/g) ?? []).length).toBeLessThanOrEqual(2);
  });

  it('uses contractions naturally without forcing one into every paragraph', () => {
    const contractions = plain.match(/\b\w+'(?:s|t|re|ve|ll|d|m)\b/g) ?? [];
    expect(contractions.length).toBeGreaterThanOrEqual(8);
    const paragraphs = GOLDEN_BODY.match(/<p>[\s\S]*?<\/p>/g) ?? [];
    const withoutContractions = paragraphs.filter((p) => !/\b\w+'(?:s|t|re|ve|ll|d|m)\b/.test(p));
    expect(withoutContractions.length).toBeGreaterThan(0);
  });

  it('varies sentence length instead of writing to one rhythm', () => {
    const lengths = sentences.map(words);
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    expect(mean).toBeGreaterThan(12);
    expect(mean).toBeLessThan(20);
    expect(Math.max(...lengths) / Math.min(...lengths)).toBeGreaterThan(3);
  });

  it('never runs three sentence fragments in a row', () => {
    expect(longestFragmentRun(plain)).toBeLessThan(3);
  });

  it('lands inside the approved word band', () => {
    expect(words(plain)).toBeGreaterThanOrEqual(450);
    expect(words(plain)).toBeLessThanOrEqual(550);
  });

  it('spells out every acronym on first use', () => {
    expect(plain.indexOf('Artificial Intelligence (AI)')).toBeGreaterThan(-1);
    expect(plain.indexOf('Artificial Intelligence (AI)')).toBeLessThan(plain.indexOf('(GAP) Score'));
    // "Easy AI" is the company's proper name, not an acronym being introduced, so it is
    // excluded before looking for the first bare use of AI as a common noun.
    const withoutBrand = plain.replace(/Easy AI/g, 'EasyAiBrand');
    const firstBareAi = withoutBrand.search(/\bAI\b/);
    expect(firstBareAi).toBeGreaterThanOrEqual(withoutBrand.indexOf('Artificial Intelligence (AI)'));
    expect(withoutBrand).not.toMatch(/\bGAP\b(?![^(]*\))/);
  });
});

describe('golden fixture — safety and secrecy', () => {
  it('claims no research, search, comparison, or verification', () => {
    for (const claim of [
      'we searched',
      'we audited',
      'we scanned',
      'we crawled',
      'we compared',
      'full audit',
      'your rankings are',
      'we checked your metadata',
      'based on our analysis',
    ]) {
      expect(plain.toLowerCase()).not.toContain(claim);
    }
  });

  it('claims no personal experience Easy AI never supplied', () => {
    expect(plain).not.toMatch(/owners i(?:'ve| have)? spoken/i);
    expect(plain).not.toMatch(/\bi have talked\b|\bin my years\b|\bclients we\b|\bour clients\b/i);
  });

  it('teaches no protected methodology in the free actions', () => {
    for (const term of [
      'schema',
      'structured data',
      'metadata',
      'keyword strategy',
      'entity optimization',
      'content architecture',
      'competitor analysis',
      'ai-search optimization',
    ]) {
      expect(plain.toLowerCase()).not.toContain(term);
    }
  });

  it('never names an internal Easy AI system or a third-party product', () => {
    for (const name of ['SmartSite', 'AIM', 'Digital GAP', 'GAP Scorecard', 'Command Center', 'Concierge', 'CRR', 'GoHighLevel', 'Merchynt']) {
      expect(plain).not.toContain(name);
    }
  });

  it('makes no price, savings, revenue or return claim', () => {
    expect(plain).not.toMatch(/[$£€]\s?\d/);
    expect(plain.toLowerCase()).not.toMatch(/\broi\b|return on investment/);
  });

  it('never leaks sports language', () => {
    for (const term of ['football', 'basketball', 'sports', 'game day', 'playbook']) {
      expect(plain.toLowerCase()).not.toContain(term);
    }
  });

  it('uses the exact approved WHY question, once, as the final sentence', () => {
    const why = buildWhyQuestion(BUSINESS);
    expect(plain.split(why).length - 1).toBe(1);
    expect(plain.trim().endsWith(why)).toBe(true);
  });
});

describe('golden fixture — email delivery', () => {
  it('sends the reader to the gated completion page, never straight to a calendar', () => {
    const html = buildResultEmailHtml(GOLDEN_BODY);
    expect(html).toContain('/assessment/complete');
    expect(html).not.toMatch(/calendar\.google|book-consultation/i);
    expect(html).toContain('Watch Your Next-Step Video');
  });

  it('keeps the assessment compliance line in the footer', () => {
    expect(buildResultEmailHtml(GOLDEN_BODY)).toContain('completed the Easy AI assessment');
  });

  it('produces a readable plain-text alternative carrying the same WHY question', () => {
    const text = buildResultEmailText(GOLDEN_BODY);
    expect(text).not.toMatch(/<[^>]+>/);
    expect(text).toContain(buildWhyQuestion(BUSINESS));
    expect(text).toContain('/assessment/complete');
  });
});

describe('deterministic fallback — same contract as the golden fixture', () => {
  it('ranks conversion as the leak for the golden submission', () => {
    expect(rankCustomerLeak(GOLDEN_SUBMISSION)).toBe('conversion');
  });

  it('passes the same validator', () => {
    const result = validateResultHtml(buildFallbackResultHtml(GOLDEN_SUBMISSION), GOLDEN_SUBMISSION);
    expect(result.violations).toEqual([]);
  });

  it('follows the same writing standard', () => {
    const html = buildFallbackResultHtml(GOLDEN_SUBMISSION);
    // Entities are decoded first: an escaped ampersand carries a semicolon that never
    // reaches the reader, so punctuation is checked against reader-visible text.
    const text = html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
    expect(html).not.toMatch(/[—–]/);
    expect(text).not.toMatch(/;/);
    expect(text).not.toMatch(/\b(?:FEEL|FELT|FOUND)\b/);
    expect(text).not.toMatch(/Get found:|Get chosen:|Free action \d/i);
    expect(html.match(/<strong>/g) ?? []).toHaveLength(0);
    expect(text).toMatch(/\bFirst,/);
    expect(text).toMatch(/\bSecond,/);
    expect(text).toMatch(/\bThird,/);
    expect(text).not.toMatch(/\bFourth\b/);
    expect(longestFragmentRun(text)).toBeLessThan(3);
    expect(text.trim().endsWith(buildWhyQuestion(BUSINESS))).toBe(true);
  });

  it('claims no personal experience and no research', () => {
    const text = buildFallbackResultHtml(GOLDEN_SUBMISSION).replace(/<[^>]+>/g, ' ');
    expect(text).not.toMatch(/owners i(?:'ve| have)? spoken/i);
    expect(text.toLowerCase()).not.toContain('we searched');
    expect(text.toLowerCase()).not.toContain('we compared');
  });

  it('delivers advice before naming Easy AI', () => {
    const all = buildFallbackResultHtml(GOLDEN_SUBMISSION).replace(/<[^>]+>/g, ' ').trim().split(/\s+/);
    expect(all.findIndex((word) => word.startsWith('Easy'))).toBeGreaterThan(all.length * 0.6);
  });

  it('ranks discovery as the leak when visibility is the weaker answer', () => {
    const discoveryFirst: AssessmentSubmission = {
      ...GOLDEN_SUBMISSION,
      searchVisibility: 'We rarely show up when customers search or ask AI for businesses like ours',
      websiteConversion: 'Visitors have one clear action, and we can track what happens next',
      leadResponse: 'They receive a fast response and are tracked through the next step.',
    };
    expect(rankCustomerLeak(discoveryFirst)).toBe('discovery');
    const result = validateResultHtml(buildFallbackResultHtml(discoveryFirst), discoveryFirst);
    expect(result.violations).toEqual([]);
  });
});
