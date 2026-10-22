import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const [width, height] of [[360, 800], [390, 844], [412, 915], [768, 1024], [1440, 1000]]) {
  test(`homepage story and navigation at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Get Found. Get Chosen. Turn Attention Into Customers.');
    await expect(page.locator('.story-chapter')).toHaveCount(3);
    await expect(page.locator('.story-service-grid h3')).toHaveCount(6);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const id of ['discovery', 'engagement', 'response']) {
      await page.locator(`.story-nav a[href="#${id}"]`).click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator(`#${id} h2`)).toBeInViewport();
      expect(await page.locator(`#${id} h2`).evaluate(el => getComputedStyle(el).opacity)).toBe('1');
    }
    await page.locator('.story-nav a[href="#free-assessment"]').click();
    await expect(page.locator('#free-assessment h2')).toBeInViewport();
    const assessment = page.locator('#free-assessment').getByRole('link', { name: 'Start Your Free Assessment' });
    await expect(assessment).toHaveAttribute('href', '/assessment');
    await assessment.click();
    await expect(page).toHaveURL(/\/assessment$/);
    await expect(page.locator('.gary-launcher')).toHaveCount(0);
  });
}

test('new story has readable contrast and semantic landmarks', async ({ page }) => {
  await page.goto('/');
  const result = await new AxeBuilder({ page }).include('.story-nav').include('.story-path').include('.story-service-grid').analyze();
  expect(result.violations).toEqual([]);
});

test('keyboard focus and reduced-motion navigation remain usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const link = page.locator('.story-nav a').first();
  await link.focus();
  await expect(link).toBeFocused();
  expect(await link.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#discovery$/);
  const guideLink = page.locator('.story-guide a');
  await guideLink.focus();
  await expect(guideLink).toBeFocused();
  expect(await guideLink.evaluate(el => getComputedStyle(el).outlineColor)).toBe('rgb(31, 95, 95)');
  expect(await page.locator('html').evaluate(el => getComputedStyle(el).scrollBehavior)).toBe('auto');
  expect(await page.locator('.story-chapter-copy').first().evaluate(el => getComputedStyle(el).animationName)).toBe('none');
});

test('content and assessment links remain available without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('.story-chapter h2')).toHaveCount(3);
  await page.locator('.story-nav a').first().click();
  await expect(page).toHaveURL(/#discovery$/);
  await expect(page.locator('#discovery h2')).toBeInViewport();
  await expect(page.locator('#free-assessment a')).toHaveAttribute('href', '/assessment');
  await context.close();
});

test('assessment frontend validates, preserves answers and submits the existing contract (mocked)', async ({ page }) => {
  let submitted: Record<string, unknown> | undefined;
  await page.route('**/api/assessment', async route => {
    submitted = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });
  await page.goto('/assessment?intent=consultation');
  const card = page.locator('main .card');
  await card.getByRole('button', { name: 'Continue →' }).click();
  await expect(card.getByRole('heading')).toContainText('personalize');
  await card.locator('input').nth(0).fill('Frontend');
  await card.locator('input').nth(1).fill('Isolated Test Business');
  await card.getByRole('button', { name: 'Continue →' }).click();
  const answerKeys = ['workSituation', 'searchVisibility', 'aiChallenge', 'desiredOutcome', 'timeDrain', 'privacyConcern', 'industry', 'leadResponse', 'websiteConversion'];
  const expectedAnswers: Record<string, string> = {};
  for (const key of answerKeys) {
    const option = card.locator('button.w-full').first();
    expectedAnswers[key] = (await option.innerText()).trim();
    await option.click();
  }
  await card.getByRole('button', { name: '← Back' }).click();
  await expect(card.locator('button.w-full').first()).toHaveClass(/font-medium/);
  await card.locator('button.w-full').first().click();
  await expect(card.getByRole('heading')).toContainText('Almost there');
  await card.locator('input').nth(0).fill('Fixture');
  await card.locator('input[type="email"]').fill('frontend@example.invalid');
  await card.locator('#websiteUrl').fill('not a website');
  await card.getByRole('button', { name: 'Continue →' }).click();
  await expect(card.getByRole('heading')).toContainText('Almost there');
  await card.getByRole('button', { name: 'Continue without sharing a website' }).click();
  await expect(card.locator('#websiteUrl')).toHaveCount(0);
  await card.getByRole('button', { name: 'Continue →' }).click();
  const send = card.getByRole('button', { name: 'Confirm & Send →' });
  await expect(send).toBeDisabled();
  await card.getByRole('checkbox').check();
  await send.click();
  await expect(page).toHaveURL(/\/assessment\/complete/);
  expect(submitted).toMatchObject({ firstName: 'Frontend', businessName: 'Isolated Test Business', email: 'frontend@example.invalid', noWebsite: true });
  expect(submitted).not.toHaveProperty('websiteUrl');
  expect(submitted).toMatchObject(expectedAnswers);
  expect(submitted?.consent).toBe(true);
  expect(submitted?.formLoadedAt).toEqual(expect.any(Number));
  expect(submitted?.companyUrl).toBe('');
});
