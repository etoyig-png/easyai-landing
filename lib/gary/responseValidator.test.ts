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
