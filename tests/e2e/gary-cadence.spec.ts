import { test, expect, type Page } from '@playwright/test';
import { generateGaryReply } from '../../lib/gary/replyPipeline';
import type { ChatMessage, LlmProviderAdapter } from '../../lib/gary/llm/types';
import type { GaryConversationState } from '../../lib/gary/systemPrompt';

// Browser check of the real Start Your Journey button on Gary's fixed schedule. The server's
// database and the AI model are replaced by an in-test stand-in that runs Gary's REAL reply
// pipeline (lib/gary/replyPipeline.ts) and advances the reply count only after a completed reply,
// exactly as app/api/gary/message does. This proves what the visitor sees; it is not a live-model
// result.
const OPENING = 'What would you like help with today?';
const adapter: LlmProviderAdapter = {
  provider: 'openai',
  generateChatCompletion: async () => ({ text: 'Start by checking who owns the callback for calls that come in after 5pm.', model: 'browser-test-stand-in' }),
};

async function serveRealPipeline(page: Page) {
  const state: GaryConversationState = { knownAnswers: [], visitorTurnCount: 0, assessmentOfferCount: 0, lastVisitorSafetyClass: 'none' };
  const history: ChatMessage[] = [];
  await page.route('**/api/gary/message', async (route) => {
    const body = route.request().postDataJSON() as { sessionId?: string | null; message?: string };
    if (!body.sessionId) {
      history.length = 0; state.visitorTurnCount = 0;
      history.push({ role: 'assistant', content: OPENING });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sessionId: 'browser-session', sessionCapability: 'browser-cap', reply: { text: OPENING }, offerAssessment: false }) });
    }
    history.push({ role: 'user', content: body.message ?? '' });
    const reply = await generateGaryReply(adapter, state, history);
    history.push({ role: 'assistant', content: reply.text });
    state.visitorTurnCount += 1;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sessionId: 'browser-session', sessionCapability: 'browser-cap', reply: { text: reply.text }, offerAssessment: reply.offerAssessment }) });
  });
}

const MESSAGES = [
  'I run a plumbing company and we miss calls after 5pm.', // 1
  'Mostly emergency jobs.', // 2
  'ok', // 3
  'Would an answering service sound robotic?', // 4 scheduled
  'We have six trucks.', // 5
  'Can you give me the link to start?', // 6 direct request, button immediately
  'thanks', // 7
  'What would you check first?', // 8
  'Who do you think wins the Super Bowl this year?', // 9 scheduled, off-topic
  'Ha. Back to the calls.', // 10
  'Got it.', // 11
  'How long would setup take?', // 12
  'ok', // 13
  'What else should I know?', // 14 scheduled
  'Makes sense.', // 15
  'What about weekends?', // 16
  'thanks', // 17
  'Anything else?', // 18
  'Okay.', // 19 scheduled
];
const EXPECTED_BUTTON = new Set([4, 6, 9, 14, 19]);

test('the Start Your Journey button appears on replies 4, 9, 14 and 19 (plus a direct request), and opens the assessment', async ({ page }) => {
  test.setTimeout(180_000);
  await serveRealPipeline(page);
  await page.route('**/api/gary/handoff', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ redirectUrl: '/assessment' }) }));
  await page.clock.install();
  await page.goto('/');
  await page.clock.fastForward(6000);
  await page.getByRole('button', { name: 'Chat with Gary from Accounting' }).click();
  const dialog = page.getByRole('dialog', { name: 'Chat with Gary from Accounting' });
  await expect(dialog.getByText(OPENING)).toBeVisible();
  const button = dialog.getByRole('button', { name: 'Start Your Journey' });
  const seen: number[] = [];

  for (const [index, message] of MESSAGES.entries()) {
    const replyNumber = index + 1;
    await dialog.getByPlaceholder('Type a message...').fill(message);
    await dialog.getByRole('button', { name: 'Send' }).click();
    await expect(dialog.getByText('Gary is typing...')).toHaveCount(0);
    await expect(dialog.locator('text=' + message).first()).toBeVisible();
    if (EXPECTED_BUTTON.has(replyNumber)) {
      await expect(button, `button on reply ${replyNumber}`).toBeVisible();
      // In view inside the chat panel, not just present below the fold.
      await expect(button, `button in view on reply ${replyNumber}`).toBeInViewport();
      seen.push(replyNumber);
    } else {
      await expect(button, `no button on reply ${replyNumber}`).toHaveCount(0);
    }
    if (replyNumber === 19) await page.screenshot({ path: 'test-results/gary-reply-19-button.png' });
  }
  expect(seen).toEqual([4, 6, 9, 14, 19]);
  await expect(dialog.getByText(/can(?:'|no)?t send links/i)).toHaveCount(0);

  await button.click();
  await page.waitForURL('**/assessment');
  await expect(page.getByText('CUSTOMER OPPORTUNITY ASSESSMENT', { exact: false })).toBeVisible();
});
