import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const OPENING_QUESTION = 'What would you like help with today?';
const OPENING_OPTIONS = [
  'Saving time or reducing repetitive work',
  'Getting more leads or improving follow-up',
  'Understanding how AI could help my business',
  'Improving my current software or workflows'
];

// Gary's replies always go through POST /api/gary/message — including the very first, fixed
// opening question (the server decides that whenever a request arrives with no sessionId, i.e.
// a brand-new session — including after "Start Over", which clears the stored session id
// client-side). Mocked here for deterministic, LLM/DB-free E2E: one stateful handler per test
// that returns the opening question whenever the request has no sessionId, and a test-supplied
// follow-up reply otherwise — mirroring the real server's own per-session behavior rather than a
// simple call counter (which breaks across a Start Over, a second "new session" within the same
// test). Unit tests already cover the reply pipeline/validator/system prompt directly — these
// E2E tests verify the widget shell and the handoff flow around a reply.
async function mockGaryConversation(
  page: Page,
  followUp: { text: string; options?: string[] } = { text: OPENING_QUESTION, options: OPENING_OPTIONS },
  offerAssessment = false
) {
  await page.route('**/api/gary/message', async (route) => {
    const body = route.request().postDataJSON() as { sessionId?: string | null };
    const isOpeningTurn = !body.sessionId;
    const reply = isOpeningTurn ? { text: OPENING_QUESTION, options: OPENING_OPTIONS } : followUp;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        sessionId: 'e2e-session-1',
        reply,
        offerAssessment: !isOpeningTurn && offerAssessment
      })
    });
  });
}

async function openGary(page: Page, followUp?: { text: string; options?: string[] }, offerAssessment?: boolean) {
  await mockGaryConversation(page, followUp, offerAssessment);
  await page.clock.install();
  await page.goto('/');
  await page.clock.fastForward(6000);
  const launcher = page.getByRole('button', { name: 'Chat with Gary from Accounting' });
  await expect(launcher).toBeVisible();
  await launcher.click();
  const dialog = page.getByRole('dialog', { name: 'Chat with Gary from Accounting' });
  await expect(dialog.getByText(OPENING_QUESTION)).toBeVisible();
  return dialog;
}

test.describe('Gary widget', () => {
  test('does not appear immediately on load, then appears after the launch delay', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Chat with Gary from Accounting' })).toBeHidden();
    await page.clock.fastForward(6000);
    await expect(page.getByRole('button', { name: 'Chat with Gary from Accounting' })).toBeVisible();
  });

  test('never appears on the assessment page', async ({ page }) => {
    await page.clock.install();
    await page.goto('/assessment');
    await page.clock.fastForward(6000);
    await expect(page.getByRole('button', { name: 'Chat with Gary from Accounting' })).toBeHidden();
  });

  test('opens to the fixed opening question with four shortcut options', async ({ page }) => {
    const dialog = await openGary(page);
    for (const option of OPENING_OPTIONS) {
      await expect(dialog.getByRole('button', { name: option })).toBeVisible();
    }
    await expect(dialog.getByRole('button', { name: 'Something different' })).toBeVisible();
  });

  test('header and dialog never say "Wigglesworth" unprompted', async ({ page }) => {
    const dialog = await openGary(page);
    const dialogText = await dialog.innerText();
    expect(dialogText).not.toContain('Wigglesworth');
  });

  test("selecting an option sends it and renders Gary's reply", async ({ page }) => {
    const dialog = await openGary(page, { text: 'Got it — tell me a bit more about the scheduling side.' });
    await dialog.getByRole('button', { name: 'Saving time or reducing repetitive work' }).click();
    await expect(dialog.getByText('Saving time or reducing repetitive work')).toBeVisible();
    await expect(dialog.getByText('Got it — tell me a bit more about the scheduling side.')).toBeVisible();
  });

  test('free text entry works alongside the option shortcuts', async ({ page }) => {
    const dialog = await openGary(page, { text: 'Understood, thanks for sharing that.' });
    await dialog.getByPlaceholder('Type a message...').fill('We keep missing follow-ups with new leads.');
    await dialog.getByRole('button', { name: 'Send' }).click();
    await expect(dialog.getByText('We keep missing follow-ups with new leads.')).toBeVisible();
    await expect(dialog.getByText('Understood, thanks for sharing that.')).toBeVisible();
  });

  test('shows the assessment offer only when the reply signals it, with both actions available', async ({ page }) => {
    const dialog = await openGary(
      page,
      { text: "Since money's slipping through the cracks there, the free assessment could help." },
      true
    );
    await dialog.getByPlaceholder('Type a message...').fill('I keep losing track of invoices.');
    await dialog.getByRole('button', { name: 'Send' }).click();
    await expect(dialog.getByRole('button', { name: 'Start My Free Assessment' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Keep Chatting' })).toBeVisible();
  });

  test('accepting the assessment offer hands off to /assessment and Gary stops rendering there', async ({ page }) => {
    const dialog = await openGary(page, { text: 'Here is the assessment link.' }, true);
    await dialog.getByPlaceholder('Type a message...').fill("Sure, let's do the assessment.");
    await dialog.getByRole('button', { name: 'Send' }).click();
    await expect(dialog.getByRole('button', { name: 'Start My Free Assessment' })).toBeVisible();

    await page.route('**/api/gary/handoff', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ redirectUrl: '/assessment?token=e2e-fake-token&funnelCorrelationId=e2e-correlation' })
      });
    });
    await dialog.getByRole('button', { name: 'Start My Free Assessment' }).click();
    await page.waitForURL('**/assessment**');
    await expect(page.getByRole('button', { name: 'Chat with Gary from Accounting' })).toHaveCount(0);
  });

  test('Escape closes the panel', async ({ page }) => {
    const dialog = await openGary(page);
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('Start Over asks for confirmation once messages exist, then resets on confirm', async ({ page }) => {
    const dialog = await openGary(page, { text: 'Sure thing.' });
    await dialog.getByPlaceholder('Type a message...').fill('A quick question.');
    await dialog.getByRole('button', { name: 'Send' }).click();
    await expect(dialog.getByText('Sure thing.')).toBeVisible();

    const startOver = dialog.getByRole('button', { name: 'Start Over' });
    await startOver.click();
    await expect(dialog.getByRole('button', { name: 'Confirm?' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Confirm?' }).click();
    await expect(dialog.getByText('A quick question.')).toHaveCount(0);
    await expect(dialog.getByText(OPENING_QUESTION)).toBeVisible();
  });

  test('has no serious or critical accessibility violations while open', async ({ page }) => {
    const dialog = await openGary(page);
    await expect(dialog).toBeVisible();
    const results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
    const seriousOrWorse = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(seriousOrWorse, JSON.stringify(seriousOrWorse, null, 2)).toEqual([]);
  });
});
