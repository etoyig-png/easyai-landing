import { test, expect } from '@playwright/test';

for (const width of [1440, 390]) {
  test(`sales flow, calculator, receipt and persistent CTA at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.route('**/api/**', route => route.abort());
    await page.goto('/');
    const sales = page.locator('#sales-sections');
    const bar = sales.locator('.sx-sticky');
    const receipt = sales.locator('[data-sales-receipt]');
    await expect(bar).toBeVisible();
    await expect(page.locator('h1')).toHaveCount(1);
    expect(await sales.evaluate(el => el.previousElementSibling?.classList.contains('home-story'))).toBe(true);
    await expect(page.locator('.discovery-human')).toHaveCount(0);
    await expect(sales.locator('h2')).toHaveText([
      'Does your company show up when customers search?',
      'Where your customers go missing.',
      'What is the leak costing you?',
      'Three steps to getting chosen.',
      'People close the deal.',
      'Your next customer is searching right now.',
    ]);
    await expect(sales.locator('.sx-marquee')).toHaveAttribute('aria-hidden', 'true');
    await expect(sales.locator('.sx-marquee-group')).toHaveCount(2);
    await expect(sales.locator('.sx-search-platform')).toHaveText([
      'Google', 'ChatGPT', 'Claude', 'Gemini', 'Perplexity', 'Google', 'Copilot', 'Siri',
      'Google', 'ChatGPT', 'Claude', 'Gemini', 'Perplexity', 'Google', 'Copilot', 'Siri',
    ]);
    await expect(receipt).not.toHaveClass(/is-printing|is-printed/);
    for (const cta of await sales.locator('a.sx-btn').all()) {
      await expect(cta).toHaveAttribute('href', '/assessment');
      expect((await cta.boundingBox())!.height).toBeGreaterThanOrEqual(48);
    }
    await expect(sales.locator('a[href*="consultation"]')).toHaveCount(0);
    await expect(sales.locator('.sx-calc a')).toHaveCount(0);
    await expect(sales.locator('a[data-open-gary]')).toHaveCount(2);
    for (const link of await sales.locator('a[data-open-gary]').all()) await expect(link).toHaveAttribute('href', '/contact');

    await page.locator('.gary-chat-button').waitFor({ state: 'visible', timeout: 15000 });
    const barBox = (await bar.boundingBox())!;
    const garyBox = (await page.locator('.gary-video-stage').boundingBox())!;
    expect(barBox.x + barBox.width).toBeLessThanOrEqual(garyBox.x);

    await receipt.scrollIntoViewIfNeeded();
    await expect(receipt).toHaveClass(/is-printing/);
    await expect(receipt).toHaveClass(/is-printed/, { timeout: 5000 });
    await expect(receipt).toContainText('One example day. Your total is waiting below.');
    await expect(receipt.locator('.sx-receipt-lines li')).toHaveCount(4);

    const job = sales.getByLabel(/Average job or sale/);
    await job.scrollIntoViewIfNeeded();
    await job.focus();
    await page.keyboard.press('End');
    await expect(job).toHaveValue('5000');
    await expect(sales.locator('.sx-calc-total')).toHaveText('$32,475');
    await expect(sales.locator('.sx-calc-year')).toContainText('$389,700');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    await sales.locator('.sx-close .sx-btn').scrollIntoViewIfNeeded();
    await expect(bar).not.toBeVisible();
    expect(await bar.evaluate(el => (el as HTMLElement).inert)).toBe(true);
    await page.locator('.site-scroll-frame').evaluate(el => { el.scrollTop = el.scrollHeight; });
    await expect(bar).not.toBeVisible();
    await page.locator('.discovery-lead').scrollIntoViewIfNeeded();
    await expect(bar).toBeVisible();
    const toggle = page.getByRole('button', { name: 'Pause motion', exact: true });
    await toggle.click();
    expect(await sales.locator('.sx-marquee-track').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
    await expect(receipt).toBeVisible();
  });
}

test('sales reduced-motion fallback stays readable and calculator updates without motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const sales = page.locator('#sales-sections');
  await expect(sales.locator('.sx-sticky')).toBeVisible();
  expect(await sales.locator('.sx-marquee-track').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  for (const el of await sales.locator('[data-reveal]').all()) {
    expect(await el.evaluate(node => getComputedStyle(node).opacity)).toBe('1');
  }
  expect(await sales.locator('[data-sales-receipt]').evaluate(el => getComputedStyle(el).clipPath)).toBe('none');
  const job = sales.getByLabel(/Average job or sale/);
  await job.scrollIntoViewIfNeeded();
  await job.focus();
  await page.keyboard.press('Home');
  await expect(sales.locator('.sx-calc-total')).toHaveText('$325');
});

test('sales copy and assessment destination render without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('#sales-sections h2')).toHaveCount(6);
  await expect(page.locator('.sx-receipt-lines li')).toHaveCount(4);
  await expect(page.locator('.sx-calc input[type="range"]')).toHaveCount(3);
  await expect(page.locator('.sx-trust-links a')).toHaveCount(2);
  await page.locator('.sx-close .sx-btn').click();
  await expect(page).toHaveURL(/\/assessment$/);
  await context.close();
});
