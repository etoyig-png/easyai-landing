import { test, expect } from '@playwright/test';
import { gotoGaryReady } from './garyReady';

for (const motion of ['no-preference', 'reduce'] as const) {
  test(`approved Gary stays visible through repeated chat open/close with ${motion} motion`, async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: motion });
    await page.clock.install();
    let openings = 0;
    const mediaRequests: string[] = [];
    page.on('request', request => { if (request.url().includes('/gary/')) mediaRequests.push(request.url()); });
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== 'http://127.0.0.1:3200') return route.abort();
      if (url.pathname === '/api/gary/message') {
        openings++;
        return route.fulfill({ json: { sessionId: 'approved-media-fixture', sessionCapability: 'synthetic-capability', reply: { text: 'Synthetic Gary opening.' } } });
      }
      if (url.pathname.startsWith('/api/')) return route.abort();
      return route.continue();
    });
    await gotoGaryReady(page);
    await page.clock.fastForward(6000);
    const button = page.getByRole('button', { name: 'Chat with Gary from Accounting', exact: true });
    const still = page.locator('.gary-character-wrap svg.gary-character');
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(button.locator('[data-gary-media]')).toHaveCount(0);
    if (motion === 'reduce') {
      await expect(page.locator('[data-gary-media] video')).toHaveCount(0);
      await expect(still).toBeVisible();
    } else {
      const video = page.locator('[data-gary-media] video');
      await expect(video).toBeVisible();
      await expect(video).toHaveAttribute('src', '/gary/gary-approved.webm');
      await expect.poll(() => video.evaluate(el => (el as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
      expect(await video.evaluate(el => ({ muted: (el as HTMLVideoElement).muted, loop: (el as HTMLVideoElement).loop }))).toEqual({ muted: true, loop: false });
      await expect(page.locator('.gary-sign-board')).toHaveCount(0);
      await expect(page.getByTestId('gary-speech-bubble')).toHaveCount(0);
    }
    await page.screenshot({ path: info.outputPath('closed.png') });
    for (let cycle = 0; cycle < 3; cycle++) {
      await button.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText('Synthetic Gary opening.', { exact: true })).toBeVisible();
      const character = dialog.getByTestId('gary-chat-character');
      await expect(character).toBeVisible();
      await expect(character.locator('svg')).toHaveAttribute('viewBox', '0 0 360 360');
      await expect(character.locator('image')).toHaveAttribute('href', '/gary/gary-poses.webp');
      expect(await character.locator('svg').evaluate(el => getComputedStyle(el).overflow)).toBe('hidden');
      await expect(dialog.locator('video')).toHaveCount(0);
      const box = await character.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await dialog.getByRole('button', { name: 'Start Over', exact: true }).focus();
      await page.keyboard.press('Shift+Tab');
      expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role=dialog]')))).toBe(true);
      if (cycle === 0) await page.screenshot({ path: info.outputPath('open.png') });
      if (cycle === 1) await dialog.getByRole('button', { name: 'Close chat' }).click();
      else await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(button).toBeFocused();
      await expect(still).toBeVisible();
    }
    expect(openings).toBe(1);
    if (motion === 'reduce') expect(mediaRequests.some(url => url.endsWith('gary-approved.webm'))).toBe(false);
  });
}

test('approved seated fallback survives unavailable video and the introduction is not replayed after refresh', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await page.route('**/gary/gary-approved.webm', route => route.abort());
  await gotoGaryReady(page);
  await page.clock.fastForward(6000);
  await expect(page.locator('.gary-character-wrap video')).toHaveCount(0);
  await expect(page.locator('.gary-character-wrap svg')).toBeVisible();
  await expect(page.getByTestId('gary-speech-bubble')).toBeVisible();
  await page.reload();
  await expect.poll(() => page.evaluate(() => document.documentElement.getAttribute('data-gary-ready'))).toBe('true');
  await page.clock.fastForward(6000);
  await expect(page.locator('.gary-character-wrap video')).toHaveCount(0);
  await expect(page.locator('.gary-character-wrap svg')).toBeVisible();
});

test('approved video finishes on the seated fallback without looping', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await gotoGaryReady(page);
  await page.clock.fastForward(6000);
  const video = page.locator('.gary-character-wrap video');
  await expect.poll(() => video.evaluate(el => (el as HTMLVideoElement).duration)).toBeGreaterThan(20);
  await video.evaluate(el => { const media = el as HTMLVideoElement; media.currentTime = media.duration - 0.05; });
  await expect(video).toHaveCount(0);
  await expect(page.locator('.gary-character-wrap svg')).toBeVisible();
  await expect(page.getByTestId('gary-speech-bubble')).toBeVisible();
});
