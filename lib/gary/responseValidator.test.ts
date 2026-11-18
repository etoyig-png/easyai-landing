import { describe, expect, it } from 'vitest';
import { validateGaryResponse } from './responseValidator';

const ctx = { lastVisitorMessage: 'We keep missing calls from leads.' };

describe('validateGaryResponse', () => {
  it('passes a clean, compliant reply', () => {
    const result = validateGaryResponse('That sounds like a lot of missed opportunity. What have you tried so far?', ctx);
    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('flags an em dash', () => {
    const result = validateGaryResponse('That sounds tough — a lot of owners deal with this.', ctx);
    expect(result.violations.some((v) => v.includes('em dash'))).toBe(true);
  });

  it('flags the "not X, but Y" construction', () => {
    const result = validateGaryResponse('This is not a small problem, but a real drain on your day.', ctx);
    expect(result.violations.some((v) => v.includes('not X, but Y'))).toBe(true);
  });

  it('flags canned empathy phrases', () => {
    const result = validateGaryResponse('I completely understand how you feel about that.', ctx);
    expect(result.violations.some((v) => v.includes('i completely understand'))).toBe(true);
  });

  it('flags buzzwords', () => {
    const result = validateGaryResponse('AI can really help you leverage your existing workflow.', ctx);
    expect(result.violations.some((v) => v.includes('leverage'))).toBe(true);
  });

  it('flags a blocklisted brand name', () => {
    const result = validateGaryResponse('You should really try GoHighLevel for that.', ctx);
    expect(result.violations.some((v) => v.includes('blocklisted'))).toBe(true);
  });

  it('flags any dollar figure', () => {
    const result = validateGaryResponse('Tools like that usually run about $40 a month.', ctx);
    expect(result.violations.some((v) => v.includes('dollar figure'))).toBe(true);
  });

  it('flags more than one of Feel/Felt/Found in a single reply', () => {
    const result = validateGaryResponse(
      "That sounds like a real drain. Owners I've talked to feel the same way. What usually helps is writing it down first.",
      ctx
    );
    expect(result.violations.some((v) => v.includes('Feel/Felt/Found'))).toBe(true);
  });

  it('allows a single Feel/Felt/Found technique', () => {
    const result = validateGaryResponse("A lot of owners in that position feel the exact same way about it.", ctx);
    expect(result.violations.some((v) => v.includes('Feel/Felt/Found'))).toBe(false);
  });

  it('flags more than one question in a single reply', () => {
    const result = validateGaryResponse('What is your biggest challenge? And how long has it been going on?', ctx);
    expect(result.violations.some((v) => v.includes('more than one question'))).toBe(true);
  });

  it('flags an overly long reply', () => {
    const longReply = Array(150).fill('word').join(' ');
    const result = validateGaryResponse(longReply, ctx);
    expect(result.violations.some((v) => v.includes('could likely be shorter'))).toBe(true);
  });

  it('flags "Wigglesworth" when the visitor never asked for it', () => {
    const result = validateGaryResponse('My name is Gary Wigglesworth, nice to meet you.', ctx);
    expect(result.violations.some((v) => v.includes('Wigglesworth'))).toBe(true);
  });

  it('allows "Wigglesworth" when the visitor asked for the last name', () => {
    const result = validateGaryResponse('My last name is Wigglesworth.', { lastVisitorMessage: "What's your last name?" });
    expect(result.violations.some((v) => v.includes('Wigglesworth'))).toBe(false);
  });

  it('allows "Wigglesworth" when the visitor asked for the full name', () => {
    const result = validateGaryResponse("Gary Wigglesworth. But around here, it's Gary from Accounting.", {
      lastVisitorMessage: "What's your full name?",
    });
    expect(result.violations.some((v) => v.includes('Wigglesworth'))).toBe(false);
  });

  it('flags an empty reply', () => {
    expect(validateGaryResponse('   ', ctx).valid).toBe(false);
  });

  it('flags injected script content', () => {
    const result = validateGaryResponse('Sure <script>alert(1)</script> happy to help.', ctx);
    expect(result.violations.some((v) => v.includes('injected'))).toBe(true);
  });
});

describe('unsupported guarantees and invented results (independent live scorecard)', () => {
  it.each([
    'An automated reply could cut your inbox by half.',
    'A shared checklist cuts the work by half for most offices.',
    'There is zero risk in trying this.',
    'This works for any small service business.',
    'We guarantee more booked jobs.',
    'This will reduce no-shows by 40%.',
  ])('rejects: %s', (reply) => {
    expect(validateGaryResponse(reply, { lastVisitorMessage: 'hi' }).violations).toContain('unsupported guarantee or result claim');
  });
  it.each([
    "I can't guarantee results, but tracking callbacks for a week will show the pattern.",
    'Start with the half of your calls that come in after 5pm.',
    'A pilot keeps the risk low because a person approves every message.',
    'Your no-show rate is 15%, so start with reminders.',
  ])('allows: %s', (reply) => {
    expect(validateGaryResponse(reply, { lastVisitorMessage: 'hi' }).violations).not.toContain('unsupported guarantee or result claim');
  });
});
