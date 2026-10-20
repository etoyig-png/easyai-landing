import { describe, expect, it } from 'vitest';
import { validateActionPlanFields, type ActionPlanFields } from './actionPlanValidator';

const cleanFields: ActionPlanFields = {
  opening: 'Thanks for walking through the assessment for Johnson Electric, Taylor.',
  challengeOneHeadline: 'Leads Are Going Cold While You Are Working',
  challengeOneStory:
    'You told us new inquiries are slipping through the cracks while you are heads down on a job. Owners I have spoken with in the trades describe this exact feeling. It is a common starting point, not a sign anything is broken.',
  actionOneHeadline: 'Stop Losing Leads to Slow Follow Up',
  actionOneDoNow: 'Write the three follow up messages you send most often and save them as reusable templates.',
  actionOneAutomationOpportunity:
    'New inquiries can receive an immediate first response and get organized for follow up without you stopping to answer every message personally.',
  challengeTwoHeadline: 'Administrative Work Is Taking Time From Clients',
  challengeTwoStory:
    'You named scheduling as the biggest drain on your week. That coordination layer, not the actual work, is usually where the time goes. It adds up fast across a busy season.',
  actionTwoHeadline: 'Reduce Appointment Back And Forth',
  actionTwoDoNow: 'Block two fixed windows each day for scheduling calls instead of answering them as they arrive.',
  actionTwoAutomationOpportunity:
    'Confirmations and reminders can go out automatically once a time is chosen, cutting down on the back and forth.',
  easyAiSummary:
    'Easy AI can help find the right tools for a business like Johnson Electric and confirm they fit how you already work. That frees up time for the clients and work that matter most.',
};

describe('validateActionPlanFields', () => {
  it('passes clean, compliant fields', () => {
    const result = validateActionPlanFields(cleanFields);
    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('flags an em dash in any field', () => {
    const result = validateActionPlanFields({ ...cleanFields, opening: 'Thanks for the assessment — Johnson Electric.' });
    expect(result.violations.some((v) => v.includes('em dash'))).toBe(true);
  });

  it('flags an en dash', () => {
    const result = validateActionPlanFields({ ...cleanFields, opening: 'Monday–Friday hours matter here.' });
    expect(result.violations.some((v) => v.includes('en dash'))).toBe(true);
  });

  it('catches a leaked research-status sentence in any narrative field', () => {
    const result = validateActionPlanFields({
      ...cleanFields,
      challengeOneStory: "I searched but couldn't confirm anything verifiable about this business.",
    });
    expect(result.violations.some((v) => v.includes('narration'))).toBe(true);
  });

  it('flags prohibited AI-writing phrases', () => {
    const result = validateActionPlanFields({ ...cleanFields, opening: "You're in good company here." });
    expect(result.violations.some((v) => v.includes('prohibited AI phrase'))).toBe(true);
  });

  it('flags the "not X, but Y" construction', () => {
    const result = validateActionPlanFields({
      ...cleanFields,
      challengeOneStory: 'This is not a small thing, but a real drain on your week.',
    });
    expect(result.violations.some((v) => v.includes('not X, but Y'))).toBe(true);
  });

  it('flags blocklisted brand names', () => {
    const result = validateActionPlanFields({
      ...cleanFields,
      actionOneAutomationOpportunity: 'GoHighLevel could route these leads automatically.',
    });
    expect(result.violations.some((v) => v.includes('blocklisted brand'))).toBe(true);
  });

  it('flags invented Easy AI client claims', () => {
    const result = validateActionPlanFields({ ...cleanFields, easyAiSummary: 'Our clients like you have seen great results. Easy AI can help.' });
    expect(result.violations.some((v) => v.includes('client claim'))).toBe(true);
  });

  it('flags the verified "Owners I\'ve speak with" grammar error', () => {
    const result = validateActionPlanFields({
      ...cleanFields,
      challengeOneStory: "Owners I've speak with describe this exact feeling.",
    });
    expect(result.violations.some((v) => v.includes('verified grammar error'))).toBe(true);
  });

  it('flags the verified "loose time tracking" grammar error', () => {
    const result = validateActionPlanFields({
      ...cleanFields,
      challengeTwoStory: 'Loose time tracking is common here.',
    });
    expect(result.violations.some((v) => v.includes('verified grammar error'))).toBe(true);
  });

  it('flags a dollar-figure mention anywhere in the narrative', () => {
    const result = validateActionPlanFields({ ...cleanFields, actionOneDoNow: 'This runs about $40 a month.' });
    expect(result.violations.some((v) => v.includes('dollar figure'))).toBe(true);
  });

  it('flags Easy AI being named inside Step 1 or Step 2 fields', () => {
    const result = validateActionPlanFields({ ...cleanFields, actionOneDoNow: 'Easy AI can set this up for you today.' });
    expect(result.violations.some((v) => v.includes('mentions Easy AI'))).toBe(true);
  });

  it('flags an easyAiSummary that is not exactly two sentences', () => {
    const result = validateActionPlanFields({
      ...cleanFields,
      easyAiSummary: 'Easy AI can help find the right fit for Johnson Electric.',
    });
    expect(result.violations.some((v) => v.includes('expected exactly 2 sentences'))).toBe(true);
  });

  it('flags an easyAiSummary that never mentions Easy AI', () => {
    const result = validateActionPlanFields({
      ...cleanFields,
      easyAiSummary: 'This will help your business grow. It will also save you time.',
    });
    expect(result.violations.some((v) => v.includes('does not mention Easy AI'))).toBe(true);
  });

  it('flags an empty field', () => {
    const result = validateActionPlanFields({ ...cleanFields, challengeTwoHeadline: '' });
    expect(result.violations.some((v) => v.includes('empty'))).toBe(true);
  });

  it('flags injected script content', () => {
    const result = validateActionPlanFields({ ...cleanFields, opening: 'Welcome <script>alert(1)</script> Taylor.' });
    expect(result.violations.some((v) => v.includes('injected'))).toBe(true);
  });
});
