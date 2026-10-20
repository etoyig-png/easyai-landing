import { describe, expect, it } from 'vitest';
import {
  WHY_QUESTION_BANK,
  buildWhyQuestionText,
  isApprovedWhyQuestionId,
  selectWhyQuestionId,
} from './whyQuestions';
import { DESIRED_OUTCOME_OPTIONS } from './quizQuestions';

describe('WHY_QUESTION_BANK', () => {
  it('contains exactly 10 questions', () => {
    expect(WHY_QUESTION_BANK).toHaveLength(10);
  });

  it('every question has at least one valid tag', () => {
    const validTags = new Set(['time', 'revenue', 'growth', 'quality']);
    for (const q of WHY_QUESTION_BANK) {
      expect(q.tags.length).toBeGreaterThan(0);
      for (const tag of q.tags) {
        expect(validTags.has(tag)).toBe(true);
      }
    }
  });

  it('every question has a unique id', () => {
    const ids = new Set(WHY_QUESTION_BANK.map((q) => q.id));
    expect(ids.size).toBe(WHY_QUESTION_BANK.length);
  });

  it('every question is phrased as a question', () => {
    for (const q of WHY_QUESTION_BANK) {
      expect(q.template.trim().endsWith('?')).toBe(true);
    }
  });
});

describe('selectWhyQuestionId', () => {
  it('is deterministic — same input always returns the same id', () => {
    for (const outcome of DESIRED_OUTCOME_OPTIONS) {
      const first = selectWhyQuestionId(outcome);
      const second = selectWhyQuestionId(outcome);
      expect(first).toBe(second);
    }
  });

  it('maps every locked desired-outcome option to an approved question id', () => {
    for (const outcome of DESIRED_OUTCOME_OPTIONS) {
      expect(isApprovedWhyQuestionId(selectWhyQuestionId(outcome))).toBe(true);
    }
  });

  it('falls back to an approved id for an unrecognized outcome value', () => {
    expect(isApprovedWhyQuestionId(selectWhyQuestionId('something unexpected'))).toBe(true);
  });
});

describe('buildWhyQuestionText', () => {
  it('substitutes the business name into the selected template', () => {
    const id = selectWhyQuestionId('Save time — automate tasks and free up my schedule');
    const text = buildWhyQuestionText(id, 'Johnson Electric');
    expect(text).toContain('Johnson Electric');
    expect(text).not.toContain('[Business Name]');
  });

  it('escapes HTML-dangerous characters without entity-encoding quotes', () => {
    const id = selectWhyQuestionId('Save time — automate tasks and free up my schedule');
    const text = buildWhyQuestionText(id, "<Bob's> Plumbing");
    expect(text).toContain("&lt;Bob's&gt; Plumbing");
  });

  it('throws on an unknown question id', () => {
    expect(() => buildWhyQuestionText('not-a-real-id', 'Acme')).toThrow();
  });
});
