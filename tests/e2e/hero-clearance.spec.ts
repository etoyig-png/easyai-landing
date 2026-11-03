import { gotoGaryReady } from './garyReady';
import { expect, test } from '@playwright/test';

for (const [width, height] of [[360, 800], [390, 844], [412, 915], [768, 1024], [1440, 1000]]) {
  test(`hero headline, discovery link and Gary remain usable at ${width}x${height}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.route('**/api/gary/message', route => route.fulfill({
      json: { sessionId: 'clearance-fixture', reply: { text: 'What would you like help with today?', options: [] }, offerAssessment: false },
    }));
    await page.clock.install();
    await gotoGaryReady(page);
    await page.evaluate(() => document.fonts.ready);
    await page.clock.fastForward(6000);
    const hero = page.locator('.home-story > section').first();
    const disclaimer = hero.locator('h1');
    const video = hero.locator('.story-link');
    const launcher = page.locator('.gary-launcher');
    const boxes = { disclaimer: await disclaimer.boundingBox(), video: await video.boundingBox(), gary: await launcher.boundingBox() };
    console.log(JSON.stringify({ width, boxes }));
    await testInfo.attach('geometry', { body: JSON.stringify(boxes), contentType: 'application/json' });
    const overlap = (a: NonNullable<typeof boxes.video>, b: NonNullable<typeof boxes.video>) =>
      Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
      Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
    expect(overlap(boxes.disclaimer!, boxes.video!), 'disclaimer and video overlap area').toBe(0);
    expect(boxes.video!.height).toBeGreaterThanOrEqual(48);
    expect(overlap(boxes.video!, boxes.gary!), 'video and Gary overlap area').toBe(0);
    for (const button of await hero.getByRole('link').all()) {
      await button.click({ trial: true });
    }
    await page.screenshot({ path: testInfo.outputPath('hero-closed.png') });
    await page.getByRole('button', { name: 'Chat with Gary from Accounting', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('What would you like help with today?')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('hero-open.png') });
    await dialog.getByRole('button', { name: 'Close chat' }).click();
    await expect(dialog).toHaveCount(0);
    for (const button of await hero.getByRole('link').all()) {
      await button.click({ trial: true });
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}
