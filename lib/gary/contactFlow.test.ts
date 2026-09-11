import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  CONTACT_CHANGE_OPTIONS,
  CONTACT_CONFIRM_CHANGE,
  CONTACT_CONFIRM_YES,
  CONTACT_FLOW_PROMPTS,
  CONTACT_REASON_OPTIONS,
  CONTACT_SENT_TEXT,
  CONTACT_SOMETHING_ELSE,
  advanceContactFlow,
  detectContactIntent,
  parseContactDetails,
  type ContactDraft,
} from './contactFlow';

/** Walks the happy path and returns the reply at each of the four steps. */
function walk() {
  const step1 = advanceContactFlow({ action: 'start' });
  const step2 = advanceContactFlow({ action: 'answer', draft: step1.draft, text: 'Dana Reyes' });
  const step3 = advanceContactFlow({ action: 'answer', draft: step2.draft, text: 'dana@example.com and 555-0100' });
  const step4 = advanceContactFlow({ action: 'answer', draft: step3.draft, text: CONTACT_REASON_OPTIONS[1] });
  return { step1, step2, step3, step4 };
}

describe('the flow is exactly four steps', () => {
  it('asks name, contact, reason, then confirms, in that order', () => {
    const { step1, step2, step3, step4 } = walk();
    expect(step1.text).toBe(CONTACT_FLOW_PROMPTS.name);
    expect(step2.text).toBe(CONTACT_FLOW_PROMPTS.contact);
    expect(step3.text).toBe(CONTACT_FLOW_PROMPTS.reason);
    expect(step4.text).toContain(CONTACT_FLOW_PROMPTS.confirm);
    expect([step1, step2, step3, step4].map((s) => s.draft.step)).toEqual(['name', 'contact', 'reason', 'confirm']);
  });

  it('has no hidden step: confirming sends, and nothing is asked after', () => {
    const { step4 } = walk();
    const final = advanceContactFlow({ action: 'confirm', draft: step4.draft });
    expect(final.send).toEqual({ name: 'Dana Reyes', email: 'dana@example.com', phone: '555-0100', reason: CONTACT_REASON_OPTIONS[1] });
    expect(CONTACT_SENT_TEXT).not.toMatch(/\?/);
  });

  it('asks no qualification, goal, company, or service question anywhere', () => {
    const allText = Object.values(CONTACT_FLOW_PROMPTS).join(' ').toLowerCase();
    for (const banned of ['goal', 'company', 'budget', 'industry', 'how many', 'what service', 'tell me about']) {
      expect(allText).not.toContain(banned);
    }
  });

  it('uses no em dash or en dash in any prompt, option, or message', () => {
    const source = fs.readFileSync(path.resolve(__dirname, 'contactFlow.ts'), 'utf8');
    const strings = source.match(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g) ?? [];
    for (const literal of strings) expect(literal).not.toMatch(/[—–]/);
  });
});

describe('step 1: name', () => {
  it('is a single free-text field', () => {
    const step1 = advanceContactFlow({ action: 'start' });
    expect(step1.freeText).toBe(true);
    expect(step1.options).toBeUndefined();
  });

  it('re-asks the same step rather than moving on with an empty name', () => {
    const step1 = advanceContactFlow({ action: 'start' });
    const again = advanceContactFlow({ action: 'answer', draft: step1.draft, text: '   ' });
    expect(again.draft.step).toBe('name');
    expect(again.draft.name).toBeUndefined();
  });
});

describe('step 2: contact, one field for email, phone, or both', () => {
  it('offers exactly one text field and no choice buttons', () => {
    const { step2 } = walk();
    expect(step2.freeText).toBe(true);
    expect(step2.options).toBeUndefined();
    expect(step2.placeholder).toBe('Email, phone, or both');
  });

  it.each([
    ['dana@example.com', { email: 'dana@example.com' }],
    ['555-010-0100', { phone: '555-010-0100' }],
    ['(555) 010 0100', { phone: '(555) 010 0100' }],
    ['+1 555 010 0100', { phone: '+1 555 010 0100' }],
    ['dana@example.com, 555-0100', { email: 'dana@example.com', phone: '555-0100' }],
    ['call me at 5550100100 or email dana@example.com', { email: 'dana@example.com', phone: '5550100100' }],
  ])('accepts %s in the one field', (input, expected) => {
    expect(parseContactDetails(input)).toEqual(expected);
  });

  it('re-asks the same step when neither an email nor a phone number is present', () => {
    const { step2 } = walk();
    const again = advanceContactFlow({ action: 'answer', draft: step2.draft, text: 'just message me' });
    expect(again.draft.step).toBe('contact');
    expect(again.text).toMatch(/email or a phone number/);
    expect(parseContactDetails('no thanks')).toBeNull();
    expect(parseContactDetails('123')).toBeNull();
  });
});

describe('step 3: reason, quick choices with free typing in the same step', () => {
  it('shows the suggested choices plus Something else', () => {
    const { step3 } = walk();
    expect(step3.options).toEqual([...CONTACT_REASON_OPTIONS, CONTACT_SOMETHING_ELSE]);
    expect(step3.freeText).toBe(true);
  });

  it('treats typed text as the reason with no follow-up question', () => {
    const { step3 } = walk();
    const next = advanceContactFlow({ action: 'answer', draft: step3.draft, text: 'My invoices keep going out late.' });
    expect(next.draft.step).toBe('confirm');
    expect(next.draft.reason).toBe('My invoices keep going out late.');
  });

  it('never turns Something else into another step', () => {
    const { step3 } = walk();
    const same = advanceContactFlow({ action: 'answer', draft: step3.draft, text: CONTACT_SOMETHING_ELSE });
    expect(same.draft.step).toBe('reason');
    expect(same.draft.reason).toBeUndefined();
  });
});

describe('step 4: confirm and send', () => {
  it('summarises name, contact info, and reason', () => {
    const { step4 } = walk();
    expect(step4.text).toContain('Dana Reyes');
    expect(step4.text).toContain('dana@example.com and 555-0100');
    expect(step4.text).toContain(CONTACT_REASON_OPTIONS[1]);
    expect(step4.options).toEqual([CONTACT_CONFIRM_YES, CONTACT_CONFIRM_CHANGE]);
  });

  it('lets the visitor change one field and returns straight to confirmation', () => {
    const { step4 } = walk();
    const edit = advanceContactFlow({ action: 'change', draft: step4.draft, field: 'contact' });
    expect(edit.draft.step).toBe('contact');
    // Other answers survive the edit.
    expect(edit.draft.name).toBe('Dana Reyes');
    expect(edit.draft.reason).toBe(CONTACT_REASON_OPTIONS[1]);
    const back = advanceContactFlow({ action: 'answer', draft: edit.draft, text: 'dana@example.com' });
    // Not step 3 again: the flow does not restart.
    expect(back.draft.step).toBe('confirm');
    expect(back.draft.contact).toBe('dana@example.com');
    expect(back.text).toContain('dana@example.com');
  });

  it('offers exactly three things to change, one per step', () => {
    expect(CONTACT_CHANGE_OPTIONS.map((o) => o.field)).toEqual(['name', 'contact', 'reason']);
  });

  it('refuses to send with a missing field and returns to that step', () => {
    const draft: ContactDraft = { step: 'confirm', name: 'Dana', reason: 'Help' };
    const reply = advanceContactFlow({ action: 'confirm', draft });
    expect(reply.send).toBeUndefined();
    expect(reply.draft.step).toBe('contact');
  });
});

describe('entering the flow from a plain request to reach a person', () => {
  it.each([
    'I need to talk to the owner.',
    'Have someone call me.',
    'I want to contact Easy AI.',
    'Can someone email me?',
    'I need to speak with someone.',
    'how do I get in touch',
    'can I speak to a real person',
    'please call me',
    'I want a callback',
    'leave a message for the team',
  ])('recognises: %s', (message) => {
    expect(detectContactIntent(message)).toBe(true);
  });

  it.each([
    'My email marketing is not working.',
    'We miss too many calls at the shop.',
    'How could AI help my plumbing business?',
    'What is the assessment?',
    'I need help with follow-up after estimates.',
    'Customers contact us through the website form.',
  ])('does not misfire on ordinary business talk: %s', (message) => {
    expect(detectContactIntent(message)).toBe(false);
  });

  it('goes straight to step one, with no qualification first', () => {
    const start = advanceContactFlow({ action: 'start' });
    expect(start.text).toBe(CONTACT_FLOW_PROMPTS.name);
  });
});

describe('the contact page and launcher', () => {
  const repoRoot = path.resolve(__dirname, '..', '..');

  it('directs visitors to Gary instead of a form or contact block', () => {
    const page = fs.readFileSync(path.join(repoRoot, 'app/contact/page.tsx'), 'utf8');
    expect(page).toContain('Need to reach Easy AI? Talk to Gary.');
    expect(page).toContain('TalkToGaryButton');
    expect(page).not.toContain('ContactForm');
    expect(page).not.toMatch(/Location|Response time|<form/);
  });

  it('opens the one mounted Gary through the shared event, never a second Gary', () => {
    const button = fs.readFileSync(path.join(repoRoot, 'components/TalkToGaryButton.tsx'), 'utf8');
    expect(button).toContain("openGary('contact')");
    expect(button).not.toMatch(/GaryPanel|GaryLauncher/);
    const launcher = fs.readFileSync(path.join(repoRoot, 'components/gary/GaryLauncher.tsx'), 'utf8');
    expect(launcher).toContain('OPEN_GARY_EVENT');
    expect(launcher).toContain('setVisible(true)');
  });
});
