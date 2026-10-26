import { expect, type Page } from '@playwright/test';

/** Wait for timer registration before advancing a fake clock; not for visibility. */
export async function gotoGaryReady(page: Page, url = '/') {
  const response = await page.goto(url);
  await expect.poll(() => page.evaluate(() =>
    document.documentElement.getAttribute('data-gary-ready')
  )).toBe('true');
  return response;
}
