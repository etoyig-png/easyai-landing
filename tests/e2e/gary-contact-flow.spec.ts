import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  CONTACT_CONFIRM_CHANGE,
  CONTACT_CONFIRM_YES,
  CONTACT_FLOW_PROMPTS,
  CONTACT_REASON_OPTIONS,
  CONTACT_SOMETHING_ELSE,
  advanceContactFlow,
  contactOutcomeTexts,
  withOpeningDisclosure,
  type ContactDraft,
  type ContactFlowRequest,
} from '../../lib/gary/contactFlow';
import { GARY_OPENING_OPTIONS, garyOpeningMessage } from '../../lib/gary/openingQuestion';

/**
 * Browser coverage for the four-step Gary contact flow. The client is real; the server is
 * mocked at the network boundary with the SAME deterministic flow module the route uses
 * (lib/gary/contactFlow.ts), so the prompts, options and outcome texts here are the
 * production ones, not copies. No email, database, or production secret is involved.
 */
const DISCLOSURE = "Hi, I'm Gary, Easy AI's AI assistant.";
const TEXTS = contactOutcomeTexts('Easy AI');
const DIALOG_NAME = 'Chat with Gary from Accounting';

type Outcome = 'sent' | 'saved-not-notified' | 'already-processed' | 'in-progress';

interface MockState {
  outcomes: Outcome[];
  calls: { action?: string; text?: string; field?: string }[];
}

/** Stateless per request, exactly like the route: the draft is echoed by the client each turn. */
async function mockContactServer(page: Page, outcomes: Outcome[] = ['sent']): Promise<MockState> {
  const state: MockState = { outcomes: [...outcomes], calls: [] };
  await page.route('**/api/gary/message', async (route) => {
    const body = route.request().postDataJSON() as { sessionId?: string | null; contactFlow?: { action: string; draft?: ContactDraft; text?: string; field?: string } };
    const envelope = { sessionId: 'e2e-contact-session', sessionCapability: 'e2e-cap', offerAssessment: false };
    if (!body.contactFlow) {
      state.calls.push({ action: 'opening' });
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...envelope, reply: { text: garyOpeningMessage(DISCLOSURE), options: GARY_OPENING_OPTIONS } }) });
      return;
    }
    const cf = body.contactFlow;
    state.calls.push({ action: cf.action, text: cf.text, field: cf.field });
    const request = (cf.action === 'start' ? { action: 'start' } : cf.action === 'answer' ? { action: 'answer', draft: cf.draft!, text: cf.text ?? '' } : cf.action === 'change' ? { action: 'change', draft: cf.draft!, field: cf.field! } : { action: 'confirm', draft: cf.draft! }) as ContactFlowRequest;
    let reply = advanceContactFlow(request);
    if (request.action === 'start') reply = withOpeningDisclosure(reply, DISCLOSURE);
    let done = false;
    if (reply.send) {
      const outcome = state.outcomes.shift() ?? 'sent';
      const neutral = { options: undefined, freeText: true, placeholder: 'Type a message...' };
      if (outcome === 'sent') { reply = { ...reply, ...neutral, text: TEXTS.sent }; done = true; }
      else if (outcome === 'already-processed') { reply = { ...reply, ...neutral, text: TEXTS.alreadySent }; done = true; }
      else if (outcome === 'in-progress') { reply = { ...reply, ...neutral, text: TEXTS.inProgress }; done = true; }
      else { reply = { ...reply, text: TEXTS.savedNotSent }; }
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ...envelope, reply: { text: reply.text, options: reply.options }, contactFlow: { draft: reply.draft, freeText: reply.freeText, placeholder: reply.placeholder, done } }),
    });
  });
  return state;
}

async function openFromContactPage(page: Page, outcomes?: Outcome[]) {
  const state = await mockContactServer(page, outcomes);
  await page.goto('/contact');
  await page.getByRole('button', { name: 'Talk to Gary' }).click();
  const dialog = page.getByRole('dialog', { name: DIALOG_NAME });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(`${DISCLOSURE} ${CONTACT_FLOW_PROMPTS.name}`)).toBeVisible();
  return { dialog, state, input: dialog.getByRole('textbox') };
}

async function answer(dialog: ReturnType<Page['getByRole']>, text: string) {
  const input = dialog.getByRole('textbox');
  await input.fill(text);
  await dialog.getByRole('button', { name: 'Send' }).click();
}

async function completeToConfirmation(page: Page, outcomes?: Outcome[], contact = 'dana@example.com') {
  const opened = await openFromContactPage(page, outcomes);
  await answer(opened.dialog, 'Dana Reyes');
  await expect(opened.dialog.getByText(CONTACT_FLOW_PROMPTS.contact)).toBeVisible();
  await answer(opened.dialog, contact);
  await expect(opened.dialog.getByText(CONTACT_FLOW_PROMPTS.reason)).toBeVisible();
  await opened.dialog.getByRole('button', { name: CONTACT_REASON_OPTIONS[1] }).click();
  await expect(opened.dialog.getByText(CONTACT_FLOW_PROMPTS.confirm)).toBeVisible();
  return opened;
}

function luminance([r, g, b]: number[]): number {
  const [rs, gs, bs] = [r, g, b].map((c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}
function contrast(a: number[], b: number[]): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
function parseRgb(value: string): number[] {
  const m = value.match(/rgba?\(([^)]+)\)/);
  return m ? m[1].split(',').slice(0, 3).map((n) => Number(n.trim())) : [255, 255, 255];
}

test.describe('Gary contact flow from the Contact page', () => {
  test('opens the one existing Gary, discloses AI first, and the input is readable', async ({ page }) => {
    const { dialog, input } = await openFromContactPage(page);

    // One Gary: one dialog, one launcher button, one text field.
    await expect(page.getByRole('dialog')).toHaveCount(1);
    await expect(page.getByRole('button', { name: DIALOG_NAME })).toHaveCount(1);
    await expect(dialog.getByRole('textbox')).toHaveCount(1);

    // Disclosure is the first Gary line, before any personal information is requested.
    const firstGaryLine = await dialog.getByText('AI assistant').first().textContent();
    expect(firstGaryLine?.startsWith(DISCLOSURE)).toBe(true);
    expect(firstGaryLine?.indexOf('AI assistant')).toBeLessThan(firstGaryLine!.indexOf(CONTACT_FLOW_PROMPTS.name));

    // Computed colours, not class names: dark text on a white field, readable placeholder.
    await expect(input).toHaveAttribute('placeholder', 'Your name');
    const styles = await input.evaluate((el) => {
      const cs = getComputedStyle(el);
      const ps = getComputedStyle(el, '::placeholder');
      return { color: cs.color, background: cs.backgroundColor, placeholder: ps.color };
    });
    expect(contrast(parseRgb(styles.color), parseRgb(styles.background))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(parseRgb(styles.placeholder), parseRgb(styles.background))).toBeGreaterThanOrEqual(4.5);
    await input.fill('Dana');
    const typedColor = await input.evaluate((el) => getComputedStyle(el).color);
    expect(contrast(parseRgb(typedColor), parseRgb(styles.background))).toBeGreaterThanOrEqual(4.5);

    // Keyboard focus is visible: a ring/outline or border change on focus.
    await input.focus();
    const focused = await input.evaluate((el) => { const cs = getComputedStyle(el); return { border: cs.borderColor, shadow: cs.boxShadow, outline: cs.outlineStyle }; });
    expect(focused.shadow !== 'none' || focused.outline !== 'none' || focused.border !== 'rgb(203, 213, 225)').toBe(true);
  });

  test('walks name, email, reason choice, confirmation, a change, and a successful send', async ({ page, viewport }) => {
    const { dialog, state, input } = await completeToConfirmation(page);

    // Confirmation summarises every answer.
    await expect(dialog.getByText('Name: Dana Reyes.')).toBeVisible();
    await expect(dialog.getByText('Reach you at: dana@example.com.')).toBeVisible();
    await expect(dialog.getByText(`What you need: ${CONTACT_REASON_OPTIONS[1]}.`)).toBeVisible();

    // Make a change edits one field and returns to the confirmation without restarting.
    await dialog.getByRole('button', { name: CONTACT_CONFIRM_CHANGE }).click();
    await expect(dialog.getByText('Which one?')).toBeVisible();
    await dialog.getByRole('button', { name: 'My name' }).click();
    await expect(input).toHaveAttribute('placeholder', 'Your name');
    await answer(dialog, 'Dana R.');
    await expect(dialog.getByText('Name: Dana R.')).toBeVisible();
    // The second confirmation keeps the unchanged answers (the first confirmation stays in the transcript).
    await expect(dialog.getByText('Reach you at: dana@example.com.')).toHaveCount(2);

    await dialog.getByRole('button', { name: CONTACT_CONFIRM_YES }).click();
    await expect(dialog.getByText(TEXTS.sent)).toBeVisible();
    await expect(dialog.getByRole('button', { name: CONTACT_CONFIRM_YES })).toHaveCount(0);
    expect(state.calls.map((c) => c.action)).toEqual(['start', 'answer', 'answer', 'answer', 'change', 'answer', 'confirm']);

    // Exactly four prompts were asked, in order.
    const asked = state.calls.filter((c) => c.action === 'answer').length;
    expect(asked).toBe(4); // name, contact, reason, and the one edited field

    // Panel geometry: fullscreen on phones, anchored on desktop.
    const box = await dialog.boundingBox();
    if (viewport && viewport.width < 640) {
      expect(Math.round(box!.width)).toBe(viewport.width);
      expect(Math.round(box!.height)).toBe(viewport.height);
    } else {
      expect(Math.round(box!.width)).toBe(380);
    }
  });

  test('accepts a phone number, re-asks on invalid contact details, and takes a custom typed reason', async ({ page }) => {
    const { dialog, input } = await openFromContactPage(page);
    await answer(dialog, 'Dana');
    await answer(dialog, 'call me tomorrow');
    await expect(dialog.getByText('I need an email or a phone number to pass along. Which works best for you?')).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', 'Email, phone, or both');
    await answer(dialog, '(555) 010-0100');
    await expect(dialog.getByText(CONTACT_FLOW_PROMPTS.reason)).toBeVisible();

    // "Something else..." focuses the same field; nothing is sent and no step is added.
    await dialog.getByRole('button', { name: CONTACT_SOMETHING_ELSE }).click();
    await expect(input).toBeFocused();
    await expect(dialog.getByText(CONTACT_FLOW_PROMPTS.reason)).toBeVisible();
    await answer(dialog, 'Help me answer missed calls');
    await expect(dialog.getByText('Reach you at: (555) 010-0100.')).toBeVisible();
    await expect(dialog.getByText('What you need: Help me answer missed calls.')).toBeVisible();
  });

  test('saved-but-not-notified keeps the confirmation on screen and a retry succeeds', async ({ page }) => {
    const { dialog, state } = await completeToConfirmation(page, ['saved-not-notified', 'sent']);
    await dialog.getByRole('button', { name: CONTACT_CONFIRM_YES }).click();
    await expect(dialog.getByText(TEXTS.savedNotSent)).toBeVisible();
    await expect(dialog.getByRole('button', { name: CONTACT_CONFIRM_YES })).toBeVisible();
    await dialog.getByRole('button', { name: CONTACT_CONFIRM_YES }).click();
    await expect(dialog.getByText(TEXTS.sent)).toBeVisible();
    expect(state.calls.filter((c) => c.action === 'confirm')).toHaveLength(2);
  });

  test('already-processed and in-progress end the flow without a second send button', async ({ page }) => {
    for (const [outcome, text] of [['already-processed', TEXTS.alreadySent], ['in-progress', TEXTS.inProgress]] as const) {
      const { dialog } = await completeToConfirmation(page, [outcome]);
      await dialog.getByRole('button', { name: CONTACT_CONFIRM_YES }).click();
      await expect(dialog.getByText(text)).toBeVisible();
      await expect(dialog.getByRole('button', { name: CONTACT_CONFIRM_YES })).toHaveCount(0);
      await expect(dialog.getByRole('textbox')).toHaveAttribute('placeholder', 'Type a message...');
      await page.unroute('**/api/gary/message');
    }
  });

  test('Start Over confirms, then returns to a normal conversation that opens with the AI disclosure', async ({ page }) => {
    const { dialog, state } = await completeToConfirmation(page);
    const startOver = dialog.getByRole('button', { name: 'Start Over' });
    await startOver.click();
    await expect(dialog.getByRole('button', { name: 'Confirm?' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Confirm?' }).click();
    await expect(dialog.getByText(garyOpeningMessage(DISCLOSURE))).toBeVisible();
    await expect(dialog.getByText(CONTACT_FLOW_PROMPTS.confirm)).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: GARY_OPENING_OPTIONS[0] })).toBeVisible();
    await expect(dialog.getByRole('textbox')).toHaveAttribute('placeholder', 'Type a message...');
    expect(state.calls[state.calls.length - 1].action).toBe('opening');
  });

  test('has no serious or critical accessibility violations at step one and at the confirmation', async ({ page }) => {
    const { dialog } = await openFromContactPage(page);
    const atStepOne = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
    expect(atStepOne.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
    await answer(dialog, 'Dana');
    await answer(dialog, 'dana@example.com');
    await dialog.getByRole('button', { name: CONTACT_REASON_OPTIONS[0] }).click();
    await expect(dialog.getByText(CONTACT_FLOW_PROMPTS.confirm)).toBeVisible();
    const atConfirmation = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
    expect(atConfirmation.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  });
});
