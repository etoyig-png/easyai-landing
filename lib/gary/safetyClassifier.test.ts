import { describe, expect, it } from 'vitest';
import { classifyVisitorMessageSafety } from './safetyClassifier';

describe('classifyVisitorMessageSafety', () => {
  it('classifies an ordinary business question as none', () => {
    expect(classifyVisitorMessageSafety('We keep missing calls from leads.')).toBe('none');
  });

  it('classifies a medical mention as sensitive', () => {
    expect(classifyVisitorMessageSafety('My doctor gave me a diagnosis last week.')).toBe('sensitive');
  });

  it('classifies a legal mention as sensitive', () => {
    expect(classifyVisitorMessageSafety('I might need to sue a former contractor.')).toBe('sensitive');
  });

  it('classifies a financial emergency as sensitive', () => {
    expect(classifyVisitorMessageSafety("We're facing foreclosure on the shop.")).toBe('sensitive');
  });

  it('classifies an employment-risk mention as sensitive', () => {
    expect(classifyVisitorMessageSafety('I think I might get fired soon.')).toBe('sensitive');
  });

  it('classifies a security incident as sensitive', () => {
    expect(classifyVisitorMessageSafety('Our system just got hacked.')).toBe('sensitive');
  });

  it('classifies self-harm language as sensitive', () => {
    expect(classifyVisitorMessageSafety('I feel like I want to hurt myself.')).toBe('sensitive');
  });
});
