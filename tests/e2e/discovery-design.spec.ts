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
