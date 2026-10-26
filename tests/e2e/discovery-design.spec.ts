import { gotoGaryReady } from './garyReady';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('initial HTML includes approved content and real fallback links', async ({ request, browser }) => {
  const html = await (await request.get('/')).text();
  for (const text of ['Customers are searching Google', 'Someone found your business', 'A potential customer has a question.']) expect(html).toContain(text);
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('.discovery-brand')).toHaveCSS('opacity', '1');
  await page.locator('#discovery .story-chapter-copy a[data-open-gary]').click();
  await expect(page).toHaveURL(/\/contact$/);
  await context.close();
});

test('product scenes fit and product links open existing Gary panel', async ({ page }) => {
  await page.route('**/api/gary/message', route => route.fulfill({ json: { sessionId: 'design-test', reply: { text: 'How can I help?' } } }));
  await page.goto('/');
  await page.waitForTimeout(8500);
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
  await gotoGaryReady(page);
  await page.locator('#discovery .story-chapter-copy a[data-open-gary]').click();
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
  await page.waitForTimeout(9000);
  await page.screenshot({ path: testInfo.outputPath('opening-transition.png') });
  await expect(page.locator('.discovery-brand')).toHaveCSS('opacity', '1');
  await expect(page.locator('.discovery-search')).toHaveCSS('opacity', '0');
  await page.screenshot({ path: testInfo.outputPath('opening-brand.png') });
  const metrics = await page.evaluate(() => (window as unknown as { designMetrics: { lcp: number; cls: number } }).designMetrics);
  console.log(JSON.stringify({ project: testInfo.project.name, metrics }));
  expect(metrics.cls).toBeLessThanOrEqual(0.1);
});

test('latest visual direction keeps header, centers copy and uses real device art', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('header')).toBeVisible();
  await expect(page.locator('.story-nav')).toHaveCount(0);
  await expect(page.locator('#discovery .gap-device-action img')).toHaveAttribute('src', /gap-logo/);
  await expect(page.locator('.phone-device')).toHaveCount(1);
  await expect(page.locator('.search-phone')).toHaveCount(1);
  await expect(page.locator('.home-story')).toHaveCSS('background-color', 'rgb(1, 6, 17)');
  await expect(page.locator('#introduction')).toHaveCSS('text-align', 'center');
  await expect(page.locator('#discovery .story-chapter-copy')).toHaveCSS('text-align', 'center');
  await expect(page.locator('.gary-launcher')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('.gary-launcher')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(page.locator('.discovery-brand')).toHaveCSS('opacity', '1');
  const logo = await page.locator('.easyai-wordmark').boundingBox();
  const tagline = await page.locator('.discovery-brand h1').boundingBox();
  expect(logo!.width).toBeGreaterThan(tagline!.height * 6);
  await expect(page.locator('.discovery-brand h1')).toHaveCSS('white-space', 'nowrap');
});

test('search phone resolves to logo and geographic markers keep moving', async ({ page }, testInfo) => {
  await page.clock.install();
  await gotoGaryReady(page);
  await expect(page.locator('.home-story')).toHaveAttribute('data-motion-ready', 'true');
  await page.clock.runFor(2300);
  await expect(page.locator('.discovery-search')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: testInfo.outputPath('search-phone.png') });
  await page.clock.runFor(7800);
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

test('device conversations animate in sequence and remain readable with motion off', async ({ page }) => {
  await page.clock.install();
  await gotoGaryReady(page);
  await expect(page.locator('.home-story')).toHaveAttribute('data-motion-ready', 'true');
  const laptopScreen = page.locator('#engagement .smartsite-screen');
  expect(await laptopScreen.evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBeTruthy();
  const phone = page.locator('#response .magic-phone-screen');
  await phone.scrollIntoViewIfNeeded();
  await expect(page.locator('#response')).toHaveClass(/scene-visible/);
  await page.clock.runFor(4000);
  for (const message of await phone.locator('.demo-step').all()) {
    await expect(message).toHaveCSS('opacity', '1');
    expect(await message.evaluate(el => {
      const box = el.getBoundingClientRect();
      const screen = el.closest('.magic-phone-screen')!.getBoundingClientRect();
      return box.bottom <= screen.bottom && box.left >= screen.left && box.right <= screen.right;
    })).toBeTruthy();
  }
  await page.getByRole('button', { name: 'Pause motion' }).click();
  await expect(phone.locator('.demo-step').first()).toHaveCSS('animation-name', 'none');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(phone.locator('.demo-step').last()).toHaveCSS('opacity', '1');
});


test('opening holds photographed phone for four seconds and GAP screen reveals a working action', async ({ page }) => {
  await page.clock.install();
  await gotoGaryReady(page);
  await expect(page.locator('.home-story')).toHaveAttribute('data-motion-ready', 'true');
  await expect(page.locator('.discovery-search')).toHaveCSS('animation-duration', '8.4s');
  await page.clock.runFor(4500);
  await expect(page.locator('.discovery-search')).toHaveCSS('opacity', '1');
  await expect(page.locator('.discovery-brand')).toHaveCSS('opacity', '0');
  await page.clock.runFor(5500);
  // Fake timers do not complete the native CSS animation; observe its real end.
  await expect(page.locator('.home-story')).toHaveAttribute('data-opening-complete', 'true');
  await expect(page.locator('.discovery-brand')).toHaveCSS('opacity', '1');
  await expect(page.locator('.discovery-search')).toHaveCSS('opacity', '0');
  const globe = page.locator('.location-grid');
  const first = await globe.evaluate(el => getComputedStyle(el).transform);
  await page.clock.runFor(1000);
  expect(await globe.evaluate(el => getComputedStyle(el).transform)).not.toBe(first);
  await page.locator('#discovery .laptop-device').scrollIntoViewIfNeeded();
  await page.clock.runFor(2000);
  const action = page.getByRole('link', { name: 'Talk with Gary about your GAP Score', exact: true });
  await expect(action).toHaveCSS('opacity', '1');
  await page.route('**/api/gary/message', route => route.fulfill({ json: { sessionId: 'gap-device-test', reply: { text: 'How can I help?' } } }));
  await action.click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('AIM uses saved artwork and speech bubbles keep the logo clear', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const logo = page.locator('.aim-device-logo');
  await logo.scrollIntoViewIfNeeded();
  await expect(logo).toHaveAttribute('src', /aim-logo/);
  const logoBox = await logo.boundingBox();
  for (const bubble of await page.locator('.aim-art .floating-message').all()) {
    const box = await bubble.boundingBox();
    expect(box!.y >= logoBox!.y + logoBox!.height || box!.x + box!.width <= logoBox!.x || box!.x >= logoBox!.x + logoBox!.width).toBeTruthy();
  }
  expect(await page.locator('#engagement .smartsite-screen').evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBeTruthy();
  await page.locator('.aim-art').screenshot({ path: testInfo.outputPath('aim-artwork-and-bubbles.png') });
});


test('missing device photograph leaves the business identity readable', async ({ page }) => {
  await page.route('**/devices/phone-photograph-crop.webp', route => route.fulfill({ status: 404, body: '' }));
  await page.goto('/');
  await expect(page.locator('.discovery-brand')).toHaveCSS('opacity', '1');
  await expect(page.locator('.home-story')).not.toHaveAttribute('data-motion-ready');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});


test('screenshot corrections center the curved logo and direct conversation toward the phone', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const logo = await page.locator('.logo-depth').boundingBox();
  expect(Math.abs(logo!.x + logo!.width / 2 - page.viewportSize()!.width / 2)).toBeLessThan(2);
  await expect(page.locator('.easyai-wordmark')).toHaveAttribute('role', 'img');
  await expect(page.locator('.product-identities')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start Your Consultation ↗', exact: true })).toHaveAttribute('href', '/assessment?intent=consultation');
  const pointer = await page.locator('.aim-art .message-answer').evaluate(el => {
    const style = getComputedStyle(el, '::after'); return { top: style.top, bottom: style.bottom };
  });
  expect(pointer.top).toBe('-8px');
  expect(parseFloat(pointer.bottom)).toBeGreaterThan(0);
  await expect(page.locator('#engagement image[data-device-photograph]')).toHaveAttribute('href', '/devices/laptop-photograph.webp');
});

test('conversation footage loads near view and pauses with the motion control', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.home-story')).toHaveAttribute('data-motion-ready', 'true');
  const video = page.locator('[data-conversation-video]');
  await expect(video.locator('source')).not.toHaveAttribute('src');
  await video.scrollIntoViewIfNeeded();
  await expect(video.locator('source')).toHaveAttribute('src', '/business-conversation.mp4');
  await expect.poll(() => video.evaluate(el => !(el as HTMLVideoElement).paused)).toBeTruthy();
  await page.getByRole('button', { name: 'Pause motion' }).click();
  await expect.poll(() => video.evaluate(el => (el as HTMLVideoElement).paused)).toBeTruthy();
  await page.getByRole('button', { name: 'Resume motion' }).click();
  await video.scrollIntoViewIfNeeded();
  await expect.poll(() => video.evaluate(el => !(el as HTMLVideoElement).paused)).toBeTruthy();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => video.evaluate(el => (el as HTMLVideoElement).paused)).toBeTruthy();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(() => video.evaluate(el => !(el as HTMLVideoElement).paused)).toBeTruthy();
});

test('phone entrance is gradual and reacts to scrolling before brand handoff', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.home-story')).toHaveAttribute('data-motion-ready', 'true');
  await page.locator('.discovery-search').evaluate(el => { for (const animation of el.getAnimations()) { animation.pause(); animation.currentTime = 1000; } });
  const opacity = await page.locator('.discovery-search').evaluate(el => Number(getComputedStyle(el).opacity));
  expect(opacity).toBeGreaterThan(0);
  expect(opacity).toBeLessThan(1);
  await page.locator('.discovery-search').evaluate(el => { for (const animation of el.getAnimations()) animation.currentTime = 2600; });
  await expect(page.locator('.discovery-search')).toHaveCSS('opacity', '1');
  const phone = page.locator('.discovery-search .photograph-phone');
  const before = await phone.evaluate(el => getComputedStyle(el).transform);
  await page.evaluate(() => scrollTo({ top: 100, behavior: 'instant' }));
  await expect.poll(() => phone.evaluate(el => getComputedStyle(el).transform)).not.toBe(before);
});


test('late intro script never replaces an already visible finished identity', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/scrollcraft/scrollcraft.js', async route => { await gate; await route.continue(); });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.discovery-brand')).toHaveCSS('opacity', '0');
  // The bounded fallback becomes final; a late script must not restart the phone.
  await expect(page.locator('.home-story')).toHaveAttribute('data-opening-complete', 'true');
  await expect(page.locator('.discovery-brand')).toHaveCSS('opacity', '1');
  release();
  await expect(page.locator('.home-story')).toHaveAttribute('data-motion-ready', 'true');
  await expect(page.locator('.discovery-search')).toHaveCSS('display', 'none');
  await expect(page.locator('.discovery-brand')).toHaveCSS('animation-name', 'none');
});

test('completed opening stays complete when decorative motion resumes', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.home-story')).toHaveAttribute('data-motion-ready', 'true');
  await page.getByRole('button', { name: 'Pause motion' }).click();
  await expect(page.locator('.home-story')).toHaveAttribute('data-opening-complete', 'true');
  await page.getByRole('button', { name: 'Resume motion' }).click();
  await expect(page.locator('.discovery-brand')).toHaveCSS('opacity', '1');
  await expect(page.locator('.discovery-brand')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.discovery-search')).toHaveCSS('display', 'none');
});

test('supplied product identities and fictional workup stay inside the restored laptop', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.product-identities img[alt="SmartSite"]')).toHaveAttribute('src', /smartsite-logo/);
  await expect(page.locator('.product-identity')).toHaveCount(3);
  await expect(page.locator('#discovery .gap-device-action')).toContainText('BrightPath Home Services');
  await expect(page.locator('.home-story')).not.toContainText('Sample Data');
  await expect(page.locator('#discovery .growth-chart')).toHaveCount(1);
  await expect(page.locator('#discovery .report-bar')).toHaveCount(3);
  const report = page.locator('#discovery .gap-device-action');
  await report.scrollIntoViewIfNeeded();
  expect(await report.evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBeTruthy();
  const screen = await page.locator('#discovery .photograph-screen').boundingBox();
  for (const chart of await page.locator('#discovery .report-charts > div').all()) {
    const box = await chart.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(screen!.x);
    expect(box!.y + box!.height).toBeLessThanOrEqual(screen!.y + screen!.height);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});
