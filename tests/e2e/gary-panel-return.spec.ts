import { test, expect, type Page } from '@playwright/test';

const OPENING = 'What would you like help with today?';

async function openGary(page: Page) {
  await page.clock.install();
  await page.goto('/');
  await page.clock.fastForward(6000);
  await page.getByRole('button', { name: 'Chat with Gary from Accounting' }).click();
  return page.getByRole('dialog', { name: 'Chat with Gary from Accounting' });
}

test('a returning visitor sees their earlier conversation and the button they were offered', async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('gary-session-id', 'returning-session');
    window.sessionStorage.setItem('gary-session-capability', 'returning-capability');
  });
  let messageCalls = 0;
  await page.route('**/api/gary/message', (route) => { messageCalls += 1; return route.fulfill({ status: 500, body: '' }); });
  await page.route('**/api/gary/history', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      sessionId: 'returning-session',
      messages: [
        { role: 'gary', text: OPENING },
        { role: 'visitor', text: 'We miss calls after 5pm.' },
        { role: 'gary', text: 'Start with who owns the after-hours callback.' },
      ],
      options: [],
      offerAssessment: true,
    }),
  }));
  const dialog = await openGary(page);
  await expect(dialog.getByText('We miss calls after 5pm.')).toBeVisible();
  await expect(dialog.getByText('Start with who owns the after-hours callback.')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Start Your Journey' })).toBeInViewport();
  expect(messageCalls).toBe(0); // no new greeting, no duplicate session
});

test('an expired stored session starts a fresh conversation instead of an empty panel', async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('gary-session-id', 'expired-session');
    window.sessionStorage.setItem('gary-session-capability', 'expired-capability');
  });
  await page.route('**/api/gary/history', (route) => route.fulfill({ status: 403, contentType: 'application/json', body: '{"error":"Invalid session authorization"}' }));
  await page.route('**/api/gary/message', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ sessionId: 'new-session', sessionCapability: 'new-cap', reply: { text: OPENING, options: [] }, offerAssessment: false }),
  }));
  const dialog = await openGary(page);
  await expect(dialog.getByText(OPENING)).toBeVisible();
});

test('after Browser Back restores the page, the button is usable again instead of stuck on "Opening..."', async ({ page }) => {
  await page.route('**/api/gary/message', (route) => {
    const body = route.request().postDataJSON() as { sessionId?: string | null };
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ sessionId: 's1', sessionCapability: 'c1', reply: { text: body.sessionId ? 'Here you go. Tap Start Your Journey below.' : OPENING }, offerAssessment: Boolean(body.sessionId) }),
    });
  });
  // Hold the handoff open so the panel stays in its "Opening Start Your Journey..." state, which
  // is exactly what the back/forward cache freezes and restores.
  await page.route('**/api/gary/handoff', () => new Promise(() => {}));
  const dialog = await openGary(page);
  await dialog.getByPlaceholder('Type a message...').fill('Send me the link');
  await dialog.getByRole('button', { name: 'Send' }).click();
  const button = dialog.getByRole('button', { name: 'Start Your Journey' });
  await button.click();
  await expect(dialog.getByText('Opening Start Your Journey...')).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expect(dialog.getByText('Opening Start Your Journey...')).toHaveCount(0);
  await expect(button).toBeEnabled();
});
