import { expect, type Page } from '@playwright/test';

/** Wait for timer registration before advancing a fake clock; not for visibility. */
export async function gotoGaryReady(page: Page, url = '/') {
  const response = await page.goto(url);
  await expect.poll(() => page.evaluate(() =>
    document.documentElement.getAttribute('data-gary-ready')
  )).toBe('true');
  return response;
}

/** Gary pose checks advance time explicitly; protocol round trips must not age a pose. */
export async function installGaryClock(page: Page) {
  // Pause on about:blank, before application timers exist. A known later instant
  // avoids a round-trip race where pauseAt(Date.now()) is already in the past.
  await page.goto('about:blank');
  await page.clock.install({ time: new Date('2026-01-01T08:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T09:00:00Z'));
}
