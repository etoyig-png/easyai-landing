import { expect, test } from '@playwright/test';

const instances = () => (window as unknown as { ScrollCraft?: { instances: unknown[] } }).ScrollCraft?.instances.length ?? 0;

test('Scroll-Craft cleans up on navigation and remounts once on return', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.home-story')).toHaveAttribute('data-motion-ready', 'true');
  expect(await page.evaluate(instances)).toBe(1);
  await page.locator('#free-assessment').scrollIntoViewIfNeeded();
  await expect(page.locator('#free-assessment h2')).toBeInViewport();
  await page.locator('#free-assessment a[href="/assessment"]').click();
  await expect(page).toHaveURL(/\/assessment$/);
  await expect.poll(() => page.evaluate(instances)).toBe(0);
  await page.getByRole('navigation', { name: 'Main navigation', exact: true }).getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.locator('.home-story')).toHaveAttribute('data-motion-ready', 'true');
  expect(await page.evaluate(instances)).toBe(1);
});

test('changing motion preference stops the engine without hiding content', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.home-story')).toHaveAttribute('data-motion-ready', 'true');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => page.evaluate(instances)).toBe(0);
  await expect(page.locator('.story-chapter h2')).toHaveCount(3);
  await expect(page.locator('.story-hero-plane')).toHaveCSS('transform', 'none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(() => page.evaluate(instances)).toBe(1);
});

test('failed motion script leaves the page readable and navigable', async ({ page }) => {
  await page.route('**/scrollcraft/scrollcraft.js', route => route.abort());
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.locator('#response h2').scrollIntoViewIfNeeded();
  await expect(page.locator('#response h2')).toBeInViewport();
  await expect(page.locator('#response .story-chapter-copy')).toHaveCSS('opacity', '1');
});


test('initial reduced motion does not download the engine and can enable real movement', async ({ page }) => {
  let engineRequests = 0;
  page.on('request', request => { if (request.url().endsWith('/scrollcraft/scrollcraft.js')) engineRequests++; });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(engineRequests).toBe(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('.home-story')).toHaveAttribute('data-motion-ready', 'true');
  await expect.poll(() => page.locator('.story-hero-plane').evaluate(el => (el as HTMLElement).style.transform)).toContain('translate3d');
  expect(engineRequests).toBe(1);
});
