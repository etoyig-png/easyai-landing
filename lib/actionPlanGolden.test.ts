import { describe, it, expect } from 'vitest';
import { validateResultHtml, buildWhyQuestion } from './resultValidator';
import { buildResultEmailHtml, buildResultEmailText } from './resend';

/**
 * GOLDEN FIXTURE — Riverside Plumbing.
 *
 * This is a behavioral contract, not a wording snapshot: the Action Plan is model-written and
 * will never be byte-identical twice. The fixture below is a representative email that satisfies
 * every approved rule, and each test asserts one rule against it. If the prompt or the validator
 * later drifts so that this email would no longer be acceptable, these fail.
 */
const BUSINESS = 'Riverside Plumbing';
const FIRST_NAME = 'Dana';

const GOLDEN_BODY = `
<h2>Dana, a quick read on Riverside Plumbing</h2>
<p>You said the thing eating most of your week at Riverside Plumbing is finding more customers and keeping a steady flow of qualified leads coming in. That is a different problem from being busy, and it usually feels heavier, because the work you do have does not tell you whether next month is covered.</p>
<p>You also told me you are somewhat worried about data privacy, and that you have tried AI a bit without it sticking. Both of those are fair. A lot of owners in the trades describe the same thing. They are not against the technology, they just have not seen a version of it that survives a real Tuesday.</p>
<p>Here is what stands out when your answers are read together. You want more customers, but you also mentioned that after someone contacts Riverside Plumbing, some calls, messages, or website inquiries are probably missed. Those two answers are connected. Adding more leads to a process that already loses some of them tends to raise the cost of every lead instead of the revenue. The cheaper move is usually to stop the leak first.</p>
<p>There are three things worth separating. Whether customers can find and understand you. Whether your site gives a visitor a clear reason and an obvious way to act. And whether the calls and messages that do come in get answered and followed up. Your own answers point hardest at the third one.</p>
<p>A few opportunities fit what you described. Making it easier for someone to reach a person on the first try, so a missed call does not quietly become someone else's job. Putting a consistent follow-up step behind estimates, so a quote that goes quiet gets one more touch instead of none. And tightening how Riverside Plumbing shows up in local search, so the people already looking for a plumber nearby actually see you.</p>
<h2>Three things you can do this week, free</h2>
<p>First, confirm your hours, phone number, services, and service area are correct on your Google Business Profile. Second, ask two or three recent, genuinely happy customers for an honest review. Third, set a simple response-time goal for new inquiries, even if it is just same day before close, so there is a standard to hit.</p>
<p>On cost, this is not the part where I tell you to buy something. Easy AI looks for practical improvements that fit how Riverside Plumbing already runs, without handing you another system to babysit.</p>
<p>${buildWhyQuestion(BUSINESS)}</p>
`;

const submission = { businessName: BUSINESS, firstName: FIRST_NAME };
const plain = GOLDEN_BODY.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

describe('Action Plan golden fixture — Riverside Plumbing', () => {
  it('passes every deterministic validator rule', () => {
    const result = validateResultHtml(GOLDEN_BODY, submission);
    expect(result.violations).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('uses the business name naturally, several times, not just once', () => {
    const count = plain.split(BUSINESS).length - 1;
    expect(count).toBeGreaterThanOrEqual(4);
    expect(count).toBeLessThanOrEqual(8);
  });

  it('uses the first name', () => {
    expect(plain).toContain(FIRST_NAME);
  });

  it('addresses the stated time drain rather than reciting answers back', () => {
    expect(plain.toLowerCase()).toContain('finding more customers');
    expect(plain).not.toMatch(/you said[^.]{0,60}you said/i);
  });

  it('acknowledges a stated concern', () => {
    expect(plain.toLowerCase()).toMatch(/privacy/);
  });

  it('synthesizes multiple answers into one insight', () => {
    expect(plain.toLowerCase()).toMatch(/read together|are connected|those two answers/);
  });

  it('represents visibility, engagement and response without naming them as a framework', () => {
    const t = plain.toLowerCase();
    expect(t).toMatch(/find and understand/);
    expect(t).toMatch(/way to act/);
    expect(t).toMatch(/answered and followed up/);
  });

  it('claims no audit and reports nothing it never inspected', () => {
    const t = plain.toLowerCase();
    for (const claim of ['we audited', 'we scanned', 'we crawled', 'full audit', 'your rankings are', 'we checked your metadata']) {
      expect(t).not.toContain(claim);
    }
  });

  it('offers roughly three opportunities', () => {
    const para = plain.match(/A few opportunities fit what you described\.(.*?)Three things you can do/)?.[1] ?? '';
    const sentences = para.split(/(?<=\.)\s+/).filter((x) => x.trim().length > 20);
    expect(sentences.length).toBeGreaterThanOrEqual(2);
    expect(sentences.length).toBeLessThanOrEqual(4);
  });

  it('gives exactly three free actions', () => {
    const section = plain.match(/Three things you can do this week, free(.*?)On cost/)?.[1] ?? '';
    expect(section).toMatch(/\bFirst\b/);
    expect(section).toMatch(/\bSecond\b/);
    expect(section).toMatch(/\bThird\b/);
    expect(section).not.toMatch(/\bFourth\b/);
  });

  it('never names a proprietary Easy AI system or a third-party product', () => {
    for (const name of ['GAP', 'AIM', 'SmartSite', 'Digital GAP', 'CRR', 'Command Center', 'Concierge', 'GoHighLevel', 'Merchynt']) {
      expect(plain).not.toContain(name);
    }
  });

  it('teaches no protected methodology in the free actions', () => {
    const t = plain.toLowerCase();
    for (const term of ['schema', 'structured data', 'metadata', 'keyword strategy', 'entity optimization', 'content architecture', 'competitor analysis', 'ai-search optimization']) {
      expect(t).not.toContain(term);
    }
  });

  it('makes no price, savings, revenue or ROI claim', () => {
    expect(plain).not.toMatch(/\$\s?\d/);
    expect(plain.toLowerCase()).not.toMatch(/\broi\b|return on investment/);
  });

  it('asks the WHY question exactly once, as the final narrative sentence', () => {
    const why = buildWhyQuestion(BUSINESS);
    expect(plain.split(why).length - 1).toBe(1);
    expect(plain.trim().endsWith(why)).toBe(true);
  });

  it('never leaks the stored sports answer or favorite team', () => {
    const t = plain.toLowerCase();
    for (const term of ['football', 'basketball', 'buccaneers', 'sports', 'game day', 'playbook']) {
      expect(t).not.toContain(term);
    }
  });

  it('never labels the Feel/Felt/Found arc in the output', () => {
    expect(plain).not.toMatch(/\b(FEEL|FELT|FOUND)\b/);
  });

  it('uses the exact approved WHY sentence, not a paraphrase', () => {
    expect(plain).toContain(
      'One final question worth thinking about: What made you build Riverside Plumbing, and what do you want the business to make possible for you?'
    );
  });

  it('sends the reader to the gated completion page, never straight to a calendar', () => {
    const html = buildResultEmailHtml(GOLDEN_BODY);
    expect(html).toContain('/assessment/complete');
    expect(html).not.toMatch(/calendar\.google|appointment|book-consultation/i);
    expect(html).toContain('Watch Your Next-Step Video');
  });

  it('keeps the assessment compliance line in the footer', () => {
    expect(buildResultEmailHtml(GOLDEN_BODY)).toContain('completed the Easy AI assessment');
  });

  it('produces a readable plain-text alternative carrying the same WHY question', () => {
    const text = buildResultEmailText(GOLDEN_BODY, BUSINESS);
    expect(text).not.toMatch(/<[^>]+>/);
    expect(text).toContain(buildWhyQuestion(BUSINESS));
    expect(text).toContain('/assessment/complete');
  });
});
