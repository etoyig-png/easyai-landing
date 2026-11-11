import { gotoGaryReady } from './garyReady';
import { expect, test, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// No fixture may fall through to a live API or external service.
test.beforeEach(async ({ context }) => {
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.origin === 'http://127.0.0.1:3200' && !url.pathname.startsWith('/api/') ? route.continue() : route.abort();
  });
});

// Playwright's JS clock does not own the CSS compositor timeline. Seek the
// real CSS animations for phase assertions; duration is still pinned below.
async function setNativeAnimationTime(locator: Locator, milliseconds: number) {
  await locator.evaluateAll(async (elements, time) => {
    const animations = elements.flatMap(element => element.getAnimations());
    if (animations.length === 0) throw new Error('Expected an active native CSS animation');
    for (const animation of animations) animation.pause();
    await Promise.all(animations.map(animation => animation.ready));
    for (const animation of animations) animation.currentTime = time;
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  }, milliseconds);
}

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
  await page.locator('.discovery-opening').scrollIntoViewIfNeeded();
  await expect(page.locator('.discovery-opening')).toHaveClass(/scene-visible/);
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
  const tagline = await page.locator('.discovery-brand .brand-tagline').boundingBox();
  expect(logo!.width).toBeGreaterThan(tagline!.height * 6);
  await expect(page.locator('.discovery-brand .brand-tagline')).toHaveCSS('white-space', 'nowrap');
});

test('search phone resolves to a fixed identity while continent traces keep moving', async ({ page }, testInfo) => {
  await gotoGaryReady(page);

  await expect(page.locator('.home-story')).toHaveAttribute('data-motion-ready', 'true');
  await page.locator('.discovery-opening').scrollIntoViewIfNeeded();
  await expect(page.locator('.discovery-opening')).toHaveClass(/scene-visible/);
  const opening = page.locator('.discovery-search, .discovery-brand');
  await setNativeAnimationTime(opening, 2300);
  await expect(page.locator('.discovery-search')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: testInfo.outputPath('search-phone.png') });
  await setNativeAnimationTime(opening, 2300 + 7800);
  await expect(page.locator('.discovery-brand')).toHaveCSS('opacity', '1');
  await expect(page.locator('.discovery-search')).toHaveCSS('opacity', '0');
  const globe = page.locator('.globe-traces');
  await expect(globe).toHaveAttribute('data-rendered', 'true');
  const first = await globe.evaluate(el => (el as HTMLCanvasElement).toDataURL());
  const fixedLogo = await page.locator('.easyai-wordmark').evaluate(el => getComputedStyle(el).transform);
  await page.waitForTimeout(1000);
  expect(await globe.evaluate(el => (el as HTMLCanvasElement).toDataURL())).not.toBe(first);
  expect(await page.locator('.easyai-wordmark').evaluate(el => getComputedStyle(el).transform)).toBe(fixedLogo);

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
  await expect(page.locator('.globe-traces')).toHaveCSS('opacity', '0');
  await page.getByRole('button', { name: 'Resume motion' }).click();
  await expect(page.locator('.home-story')).toHaveAttribute('data-motion-ready', 'true');
});

test('device conversations animate in sequence and remain readable with motion off', async ({ page }) => {
  await gotoGaryReady(page);
  await expect(page.locator('.home-story')).toHaveAttribute('data-motion-ready', 'true');
  const laptopScreen = page.locator('#engagement .smartsite-screen');
  expect(await laptopScreen.evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBeTruthy();
  const phone = page.locator('#response .magic-phone-screen');
  await phone.scrollIntoViewIfNeeded();
  await expect(page.locator('#response')).toHaveClass(/scene-visible/);
  await page.waitForTimeout(4000);
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
  await gotoGaryReady(page);
  await expect(page.locator('.home-story')).toHaveAttribute('data-motion-ready', 'true');
  await page.locator('.discovery-opening').scrollIntoViewIfNeeded();
  await expect(page.locator('.discovery-opening')).toHaveClass(/scene-visible/);
  await expect(page.locator('.discovery-search')).toHaveCSS('animation-duration', '8.4s');
  const opening = page.locator('.discovery-search, .discovery-brand');
  await setNativeAnimationTime(opening, 4500);
  await expect(page.locator('.discovery-search')).toHaveCSS('opacity', '1');
  await expect(page.locator('.discovery-brand')).toHaveCSS('opacity', '0');
  await setNativeAnimationTime(opening, 4500 + 5500);
  // Use the native timeline for native CSS; keep the exact duration and phase assertions.
  await expect(page.locator('.home-story')).toHaveAttribute('data-opening-complete', 'true');
  await expect(page.locator('.discovery-brand')).toHaveCSS('opacity', '1');
  await expect(page.locator('.discovery-search')).toHaveCSS('opacity', '0');
  const globe = page.locator('.globe-traces');
  await expect(globe).toHaveAttribute('data-rendered', 'true');
  const first = await globe.evaluate(el => (el as HTMLCanvasElement).toDataURL());
  const fixedLogo = await page.locator('.easyai-wordmark').evaluate(el => getComputedStyle(el).transform);
  await page.waitForTimeout(1000);
  expect(await globe.evaluate(el => (el as HTMLCanvasElement).toDataURL())).not.toBe(first);
  expect(await page.locator('.easyai-wordmark').evaluate(el => getComputedStyle(el).transform)).toBe(fixedLogo);

  await page.locator('#discovery .laptop-device').scrollIntoViewIfNeeded();
  await page.waitForTimeout(2000);
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


test('approved 1.1 straight logo stays centered and conversation points toward the phone', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const logo = await page.locator('.logo-depth').boundingBox();
  expect(Math.abs(logo!.x + logo!.width / 2 - page.viewportSize()!.width / 2)).toBeLessThan(2);
  await expect(page.locator('.easyai-wordmark')).toHaveAttribute('role', 'img');
  await expect(page.locator('.easyai-wordmark')).toHaveCSS('transform', 'none');
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
  await page.locator('.discovery-opening').scrollIntoViewIfNeeded();
  await expect(page.locator('.discovery-opening')).toHaveClass(/scene-visible/);
  await page.locator('.discovery-search').evaluate(async el => {
    const animations = el.getAnimations();
    for (const animation of animations) { animation.pause(); animation.currentTime = 1000; }
    // pause() is pending until the native animation frame commits. Observe that
    // commit before seeking/capturing a descendant's separate CSS transition.
    await Promise.all(animations.map(animation => animation.ready));
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  });
  const opacity = await page.locator('.discovery-search').evaluate(el => Number(getComputedStyle(el).opacity));
  expect(opacity).toBeGreaterThan(0);
  expect(opacity).toBeLessThan(1);
  await page.locator('.discovery-search').evaluate(async el => {
    for (const animation of el.getAnimations()) animation.currentTime = 2600;
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  });
  await expect(page.locator('.discovery-search')).toHaveCSS('opacity', '1');
  const phone = page.locator('.discovery-search .photograph-phone');
  const before = await phone.evaluate(el => getComputedStyle(el).transform);
  await page.evaluate(() => scrollBy({ top: 100, behavior: 'instant' }));
  await expect.poll(() => phone.evaluate(el => getComputedStyle(el).transform)).not.toBe(before);
  await expect.poll(() => phone.evaluate(el => Math.abs(new DOMMatrixReadOnly(getComputedStyle(el).transform).m41))).toBeGreaterThan(1);
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
  await page.locator('.discovery-opening').scrollIntoViewIfNeeded();
  await expect(page.locator('.discovery-opening')).toHaveClass(/scene-visible/);
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
  const plateColors: string[] = [];
  for (const plate of await page.locator('.product-identity').all()) {
    await expect(plate.locator('.identity-context path, .identity-context circle, .identity-context rect, .identity-context ellipse')).toHaveCount(1);
    const color = await plate.evaluate(el => getComputedStyle(el, '::before').backgroundImage);
    expect(color).toContain('radial-gradient'); plateColors.push(color);
  }
  expect(new Set(plateColors).size).toBe(3);
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


test('continent and product traces paint, pause and leave static artwork readable', async ({ page }) => {
  await page.goto('/');
  const globe = page.locator('.globe-traces');
  await expect(globe).toHaveAttribute('data-rendered', 'true');
  await page.locator('.product-identities').scrollIntoViewIfNeeded();
  for (const canvas of await page.locator('.identity-traces').all()) await expect(canvas).toHaveAttribute('data-rendered', 'true');
  await page.getByRole('button', { name: 'Pause motion' }).click();
  await expect(globe).toHaveCSS('opacity', '0');
  await expect(page.locator('.globe-map-static')).toHaveCSS('opacity', '0.65');
  await expect(page.locator('.discovery-reveal')).toHaveCSS('opacity', '0');
  const logo = await page.locator('.easyai-wordmark').boundingBox();
  expect(logo!.width).toBeGreaterThan(200);
  await page.getByRole('button', { name: 'Resume motion' }).click();
  await expect(globe).toHaveAttribute('data-rendered', 'true');
  await page.emulateMedia({ reducedMotion:'reduce' });
  await expect(globe).toHaveCSS('opacity', '0');
  await expect(page.locator('.discovery-brand')).toHaveCSS('opacity', '1');
});


test('unavailable coastline asset preserves the static globe and business identity', async ({ page }) => {
  await page.route('**/data/continent-traces.json', route => route.fulfill({ status:404, body:'' }));
  await page.goto('/');
  await expect(page.locator('.home-story')).toHaveAttribute('data-motion-ready', 'true');
  await expect(page.locator('.globe-map-static')).toHaveCSS('opacity', '0.65');
  await expect(page.locator('.globe-traces')).not.toHaveAttribute('data-rendered');
  await page.getByRole('button', { name:'Pause motion' }).click();
  await expect(page.locator('.discovery-brand')).toHaveCSS('opacity', '1');
  await expect(page.locator('.discovery-reveal')).toHaveCSS('opacity', '0');
});

for (const motion of ['no-preference', 'reduce'] as const) {
  test(`requested homepage flow and Gary invitation with ${motion} motion`, async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: motion });
    let openings = 0;
    await page.route('**/api/gary/message', route => {
      openings++;
      return route.fulfill({ json: { sessionId: 'homepage-flow-fixture', sessionCapability: 'synthetic-only', reply: { text: 'Synthetic Gary introduction.' } } });
    });
    await page.goto('/');
    const lead = page.locator('.discovery-lead');
    await expect(lead.getByRole('heading', { level: 1 })).toHaveText('Are customers finding your business? We help put you in their path.');
    await expect(lead.getByRole('heading', { level: 1 })).toBeInViewport();
    const pause = page.getByRole('button', { name: 'Pause motion', exact: true });
    if (motion === 'no-preference') {
      await expect(pause).toBeVisible();
      const control = await pause.boundingBox(), heading = await lead.getByRole('heading', { level: 1 }).boundingBox();
      expect(control!.y + control!.height).toBeLessThanOrEqual(heading!.y);
    }
    const firstAssessment = lead.getByRole('link', { name: 'Free Assessment', exact: true });
    await expect(firstAssessment).toBeInViewport();
    await expect(firstAssessment).toHaveAttribute('href', '/assessment');
    await expect(firstAssessment).toHaveCSS('background-color', 'rgb(20, 120, 60)');
    await expect(firstAssessment).toHaveCSS('border-radius', '9999px');
    await expect(firstAssessment).not.toHaveCSS('box-shadow', 'none');
    const headerAssessment = page.locator('header a.btn-green').first();
    if (await headerAssessment.isVisible()) {
      await headerAssessment.focus();
      await expect(headerAssessment).toHaveCSS('outline-style', 'solid');
      await expect(headerAssessment).toHaveCSS('outline-width', '3px');
    }
    const order = await page.locator('.home-story > section, .home-story > #how-easy-ai-works').evaluateAll(elements => elements.map(el => el.id === 'how-easy-ai-works' ? el.id : el.classList[0]));
    expect(order).toEqual(['discovery-lead', 'discovery-intro', 'how-easy-ai-works', 'discovery-opening', 'discovery-assessment', 'discovery-human', 'discovery-close']);
    await expect(page.locator('#introduction h2')).toHaveText('Here’s how');
    expect(await page.locator('.product-identities > .product-identity').evaluateAll(elements => elements.map(el => el.classList[1]))).toEqual(['identity-gap', 'identity-aim', 'identity-web']);
    expect(await page.locator('#how-easy-ai-works > section').evaluateAll(elements => elements.map(el => el.id))).toEqual(['discovery', 'response', 'engagement']);
    for (const id of ['discovery', 'response', 'engagement']) await expect(page.locator(`#${id} .product-art`)).toHaveCount(1);
    for (const link of await page.locator('.home-story a.btn-green').all()) await expect(link).toHaveAttribute('href', '/assessment');
    await expect(page.locator('.discovery-assessment a')).toHaveText('Free Assessment');
    const invitation = lead.locator('a[data-open-gary]');
    await expect(invitation).toHaveAttribute('href', '/contact');
    await expect(lead).toContainText('See AIM, our AI Interaction Manager, in action with Gary.');
    await expect(invitation.locator('svg')).toBeVisible();
    if (motion === 'reduce') await expect(invitation.locator('span')).toHaveCSS('animation-name', 'none');
    else await expect(invitation.locator('span')).toHaveCSS('animation-iteration-count', '3');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath('homepage-opening.png') });
    for (let cycle = 0; cycle < 2; cycle++) {
      await invitation.focus();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText('Synthetic Gary introduction.', { exact: true })).toBeVisible();
      await expect(dialog.getByTestId('gary-chat-character')).toBeVisible();
      if (cycle === 0) await page.screenshot({ path: info.outputPath('gary-open.png') });
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Chat with Gary from Accounting', exact: true })).toBeFocused();
    }
    expect(openings).toBe(1);
    if (motion === 'reduce') await page.locator('.product-identities').screenshot({ path: info.outputPath('products-in-order.png') });
    await firstAssessment.click();
    await expect(page).toHaveURL(/\/assessment$/);
  });
}
