import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('initial HTML includes approved content and real fallback links', async ({ request, browser }) => {
  const html = await (await request.get('/')).text();
  for (const text of ['Customers are searching Google', 'Someone found your business', 'A potential customer has a question.']) expect(html).toContain(text);
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.locator('#discovery a[data-open-gary]').click();
  await expect(page).toHaveURL(/\/contact$/);
  await context.close();
});

test('product scenes fit and product links open existing Gary panel', async ({ page }) => {
  await page.route('**/api/gary/message', route => route.fulfill({ json: { sessionId: 'design-test', reply: { text: 'How can I help?' } } }));
  await page.goto('/');
  await page.waitForTimeout(4800);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  for (const id of ['discovery', 'engagement', 'response']) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await expect(page.locator(`#${id} h2`)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
  await page.locator('#response a[data-open-gary]').click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('motion fallback, accessibility and screenshots', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.discovery-brand')).toHaveCSS('opacity', '1');
  const scan = await new AxeBuilder({ page }).include('.home-story').analyze();
  expect(scan.violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('discovery-full.png'), fullPage: true });
});

test('opening Gary early cancels the pending entrance routine', async ({ page }) => {
  await page.route('**/api/gary/message', route => route.fulfill({ json: { sessionId: 'early-test', reply: { text: 'How can I help?' } } }));
  await page.clock.install();
  await page.goto('/');
  await page.locator('#discovery a[data-open-gary]').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.clock.fastForward(6000);
  await page.getByRole('button', { name: 'Close chat', exact: true }).click();
  await expect(page.locator('[data-gary-pose]')).toHaveAttribute('data-gary-pose', 'seated');
  await page.clock.fastForward(5000);
  await expect(page.locator('[data-gary-pose]')).toHaveAttribute('data-gary-pose', 'seated');
});

test('opening advances from search to brand without layout shift', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const metrics = { lcp: 0, cls: 0 };
    Object.assign(window, { designMetrics: metrics });
    new PerformanceObserver(list => { for (const entry of list.getEntries()) metrics.lcp = entry.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(list => { for (const entry of list.getEntries()) { const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean }; if (!shift.hadRecentInput) metrics.cls += shift.value; } }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto('/');
  await expect(page.locator('.home-story')).toHaveAttribute('data-motion-ready', 'true');
  await page.screenshot({ path: testInfo.outputPath('opening-search.png') });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: testInfo.outputPath('opening-transition.png') });
  await expect(page.locator('.discovery-brand')).toHaveCSS('opacity', '1');
  await expect(page.locator('.discovery-search')).toHaveCSS('opacity', '0');
  await page.screenshot({ path: testInfo.outputPath('opening-brand.png') });
  const metrics = await page.evaluate(() => (window as unknown as { designMetrics: { lcp: number; cls: number } }).designMetrics);
  console.log(JSON.stringify({ project: testInfo.project.name, metrics }));
  expect(metrics.cls).toBeLessThanOrEqual(0.1);
});

test('latest visual direction keeps header, centers copy and uses real device art', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('header')).toBeVisible();
  await expect(page.locator('.story-nav')).toHaveCount(0);
  await expect(page.locator('#discovery img')).toHaveAttribute('src', /gap-logo/);
  await expect(page.locator('.phone-device')).toHaveCount(1);
  await expect(page.locator('.search-phone')).toHaveCount(1);
  await expect(page.locator('.home-story')).toHaveCSS('background-color', 'rgb(1, 6, 17)');
  await expect(page.locator('#introduction')).toHaveCSS('text-align', 'center');
  await expect(page.locator('#discovery .story-chapter-copy')).toHaveCSS('text-align', 'center');
  await expect(page.locator('.gary-launcher')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('.gary-launcher')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  const logo = await page.locator('.easyai-wordmark').boundingBox();
  const tagline = await page.locator('.discovery-brand h1').boundingBox();
  expect(logo!.width).toBeGreaterThan(tagline!.height * 6);
  await expect(page.locator('.discovery-brand h1')).toHaveCSS('white-space', 'nowrap');
});

test('search phone resolves to logo and geographic markers keep moving', async ({ page }, testInfo) => {
  await page.clock.install();
  await page.goto('/');
  await expect(page.locator('.home-story')).toHaveAttribute('data-motion-ready', 'true');
  await page.clock.runFor(1200);
  await expect(page.locator('.discovery-search')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: testInfo.outputPath('search-phone.png') });
  await page.clock.runFor(4800);
  await expect(page.locator('.discovery-brand')).toHaveCSS('opacity', '1');
  await expect(page.locator('.discovery-search')).toHaveCSS('opacity', '0');
  const track = page.locator('.location-track-one');
  const first = await track.evaluate(el => getComputedStyle(el).transform);
  await page.clock.runFor(1000);
  expect(await track.evaluate(el => getComputedStyle(el).transform)).not.toBe(first);
  await page.screenshot({ path: testInfo.outputPath('logo-and-tagline.png') });
});

test('tablet scroll choreography does not create sideways overflow', async ({ page }) => {
  for (const width of [768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.locator('.home-story')).toHaveAttribute('data-motion-ready', 'true');
    for (const id of ['discovery', 'engagement', 'response']) {
      const top = await page.locator(`#${id}`).evaluate(el => el.getBoundingClientRect().top + scrollY);
      for (const offset of [-450, 0, 450]) {
        await page.evaluate(y => scrollTo(0, y), top + offset);
        await page.waitForTimeout(100);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
      }
    }
  }
});

test('visitors can pause and resume decorative movement', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.home-story')).toHaveAttribute('data-motion-ready', 'true');
  await page.getByRole('button', { name: 'Pause motion' }).click();
  await expect(page.locator('.home-story')).not.toHaveAttribute('data-motion-ready');
  await expect(page.locator('.discovery-brand')).toHaveCSS('opacity', '1');
  await expect(page.locator('.location-track-one')).toHaveCSS('animation-name', 'none');
  await page.getByRole('button', { name: 'Resume motion' }).click();
  await expect(page.locator('.home-story')).toHaveAttribute('data-motion-ready', 'true');
});
