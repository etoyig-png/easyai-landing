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

test('early Gary request waits for deferred loading and cancels the entrance routine', async ({ page }) => {
  await page.route('**/api/gary/message', route => route.fulfill({ json: { sessionId: 'early-test', reply: { text: 'How can I help?' } } }));
  await page.goto('/');
  await page.locator('#discovery .story-chapter-copy a[data-open-gary]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: 'Close chat', exact: true }).click();
  await expect(page.locator('[data-gary-pose]')).toHaveAttribute('data-gary-pose', 'seated');
  await page.waitForTimeout(1000);
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

test('search phone resolves to a fixed identity while continent traces keep moving', async ({ page }, testInfo) => {
  await page.clock.install();
  await page.goto('/');
  await expect(page.locator('.home-story')).toHaveAttribute('data-motion-ready', 'true');
  await page.clock.runFor(2300);
  await expect(page.locator('.discovery-search')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: testInfo.outputPath('search-phone.png') });
  await page.clock.runFor(7800);
  await expect(page.locator('.discovery-brand')).toHaveCSS('opacity', '1');
  await expect(page.locator('.discovery-search')).toHaveCSS('opacity', '0');
  const globe = page.locator('.globe-traces');
  await expect(globe).toHaveAttribute('data-rendered', 'true');
  const first = await globe.evaluate(el => (el as HTMLCanvasElement).toDataURL());
  const fixedLogo = await page.locator('.easyai-wordmark').evaluate(el => getComputedStyle(el).transform);
  await page.clock.runFor(1000);
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
      const top = await page.locator(`#${id}`).evaluate(el => el.getBoundingClientRect().top + (document.querySelector('.site-scroll-frame')?.scrollTop ?? scrollY));
      for (const offset of [-450, 0, 450]) {
        await page.evaluate(y => document.querySelector('.site-scroll-frame')!.scrollTo(0, y), top + offset);
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
  await page.clock.install();
  await page.goto('/');
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
  await page.goto('/');
  await expect(page.locator('.home-story')).toHaveAttribute('data-motion-ready', 'true');
  await expect(page.locator('.discovery-search')).toHaveCSS('animation-duration', '8.4s');
  await page.clock.runFor(4500);
  await expect(page.locator('.discovery-search')).toHaveCSS('opacity', '1');
  await expect(page.locator('.discovery-brand')).toHaveCSS('opacity', '0');
  await page.clock.runFor(5500);
  await expect(page.locator('.discovery-brand')).toHaveCSS('opacity', '1');
  await expect(page.locator('.discovery-search')).toHaveCSS('opacity', '0');
  const globe = page.locator('.globe-traces');
  await expect(globe).toHaveAttribute('data-rendered', 'true');
  const first = await globe.evaluate(el => (el as HTMLCanvasElement).toDataURL());
  const fixedLogo = await page.locator('.easyai-wordmark').evaluate(el => getComputedStyle(el).transform);
  await page.clock.runFor(1000);
  expect(await globe.evaluate(el => (el as HTMLCanvasElement).toDataURL())).not.toBe(first);
  expect(await page.locator('.easyai-wordmark').evaluate(el => getComputedStyle(el).transform)).toBe(fixedLogo);
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
  await page.evaluate(() => document.querySelector('.site-scroll-frame')!.scrollTo({ top: 100, behavior: 'instant' }));
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


test.describe('approved 1.1 reconciliation', () => {
  test('visitor sees the approved opening and can start the assessment', async ({ page }) => {
    await page.route('**/api/**', route => route.abort());
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const headline = page.getByRole('heading', { level: 1 });
    await expect(headline).toHaveText('Are customers finding your business? We help more of them find you.');
    await expect(headline).toHaveCSS('opacity', '1');
    const openingAction = page.locator('.discovery-lead a');
    await expect(openingAction).toHaveText('Start Your Free Assessment');
    await expect(openingAction).toHaveAttribute('href', '/assessment');
    await expect(page.locator('.discovery-lead p')).toHaveText('GET FOUND. GET DISCOVERED. GET MORE PROJECTS.');
    const sizes = await page.evaluate(() => ['#opening-headline', '.discovery-promise', '.discovery-how'].map(selector => parseFloat(getComputedStyle(document.querySelector(selector)!).fontSize)));
    expect(sizes[1] / sizes[0]).toBeCloseTo(.8, 2);
    expect(sizes[2] / sizes[0]).toBeCloseTo(.75, 2);
    await expect(page.locator('.discovery-description')).toContainText('Easy AI helps your business appear when customers search Google or ask Artificial Intelligence who to call.');
    expect(await page.locator('.product-identities a').evaluateAll(links => links.map(link => link.getAttribute('href')))).toEqual(['#discovery', '#response', '#engagement']);
    expect(await page.locator('.product-scene').evaluateAll(sections => sections.map(section => section.id))).toEqual(['discovery', 'response', 'engagement']);
    expect(await page.locator('.discovery-opening').evaluate(el => Boolean(document.querySelector('#engagement')!.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING))).toBeTruthy();
    await expect(page.locator('.discovery-assessment > a').first()).toHaveText('Start Your Free Assessment');
    expect(await headline.evaluate(el => { const range = document.createRange(); range.selectNodeContents(el); return range.getBoundingClientRect().width; })).toBeGreaterThan(100);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await openingAction.click();
    await expect(page).toHaveURL(/\/assessment$/);
  });

  test('existing human Gary keeps his bubble timing and mobile invitation clearance', async ({ page }) => {
    await page.route('**/api/**', route => new URL(route.request().url()).pathname === '/api/gary/message'
      ? route.fulfill({ json: { sessionId: 'reconciliation-fixture', reply: { text: 'Preview interface fixture.' } } })
      : route.abort());
    await page.goto('/');
    await page.locator('.gary-invitation').scrollIntoViewIfNeeded();
    const video = page.locator('.gary-concierge-video');
    await expect(video).toBeAttached({ timeout: 8000 });
    await expect(video).toHaveAttribute('src', '/gary-concierge.webm?v=tracked2');
    await expect(video).toHaveAttribute('loop', '');
    await expect.poll(() => video.evaluate(el => (el as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(2);
    await expect(page.locator('.gary-launcher')).toHaveCSS('position', 'fixed');
    expect(await page.evaluate(() => {
      const g = document.querySelector('.gary-launcher')!.getBoundingClientRect();
      const frame = document.querySelector('.site-scroll-frame')!.getBoundingClientRect();
      return g.top >= frame.bottom && g.bottom <= innerHeight;
    })).toBeTruthy();
    await video.scrollIntoViewIfNeeded();
    await video.evaluate(async el => { const v = el as HTMLVideoElement; v.currentTime = 3; await v.play(); });
    await expect(page.locator('.gary-video-bubble')).toHaveText("Hey I'm Gary From Accounting, Im here to help.");
    await expect(page.locator('.gary-video-bubble')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await video.evaluate(el => { const v = el as HTMLVideoElement; v.currentTime = 8.1; v.dispatchEvent(new Event('timeupdate')); });
    await expect(page.locator('.gary-video-bubble')).toHaveCount(0);
    await page.locator('.gary-invitation').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog')).toContainText('Preview interface fixture.');
    await page.getByRole('button', { name: 'Close chat', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});

test('approved 1.1 reconciliation assessment glow pulses continuously and respects reduced motion', async ({ page }) => {
  await page.route('**/api/**', route => route.abort());
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const button = page.locator('.discovery-lead .btn-green');
  await expect(button).toHaveCSS('background-color', 'rgb(57, 239, 119)');
  const read = () => button.evaluate(el => {
    const s = getComputedStyle(el, '::before');
    return { name: s.animationName, iterations: s.animationIterationCount, opacity: s.opacity, blur: s.filter };
  });
  expect((await read()).name).toBe('assessment-halo-pulse');
  expect((await read()).iterations).toBe('infinite');
  const opacity = (await read()).opacity;
  await expect.poll(async () => (await read()).opacity).not.toBe(opacity);
  await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
  await expect.poll(() => button.evaluate(el => getComputedStyle(el, '::before').animationPlayState)).toBe('paused');
  await page.getByRole('button', { name: 'Resume motion', exact: true }).click();
  await expect.poll(() => button.evaluate(el => getComputedStyle(el, '::before').animationPlayState)).toBe('running');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(async () => (await read()).name).toBe('none');
  expect((await read()).blur).toBe('blur(16.9px)');
  await expect(button).toHaveCSS('background-color', 'rgb(57, 239, 119)');
});

test('approved 1.1 recovery keeps human Gary and chat available after video failure', async ({ page }) => {
  await page.route('**/api/**', route => route.abort());
  await page.route('**/gary-concierge.webm*', route => route.abort());
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.locator('.gary-concierge-video').waitFor();
  await expect(page.locator('.gary-launcher')).toBeVisible();
  const retry = page.getByRole('button', { name: 'Retry Gary animation', exact: true });
  await expect(retry).toBeVisible();
  await expect(page.locator('.gary-video-placeholder [data-gary-pose="seated"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Chat with Gary from Accounting', exact: true })).toBeVisible();
  await page.unroute('**/gary-concierge.webm*');
  await retry.click();
  await expect(page.locator('.gary-concierge-video')).toHaveAttribute('data-started', 'true');
  await expect.poll(() => page.locator('.gary-concierge-video').evaluate(video => (video as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
  await expect(retry).toHaveCount(0);
});

test('approved 1.1 persistent Gary appears after five seconds then stays clear while the page scrolls', async ({ page }) => {
  await page.route('**/api/**', route => route.abort());
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const frame = page.locator('.site-scroll-frame');
  const gary = page.locator('.gary-launcher');
  await expect(gary).toHaveCount(0);
  await expect(gary).toBeVisible({ timeout: 8000 });
  await expect(gary).toHaveCSS('position', 'fixed');
  const top = (await gary.boundingBox())!.y;
  for (const fraction of [0, .5, 1]) {
    await frame.evaluate((element, fraction) => { element.scrollTop = (element.scrollHeight - element.clientHeight) * fraction; }, fraction);
    expect(await gary.evaluate(element => element.getBoundingClientRect().top)).toBeCloseTo(top, 0);
    expect(await page.evaluate(() => {
      const frame = document.querySelector('.site-scroll-frame')!.getBoundingClientRect();
      const gary = document.querySelector('.gary-launcher')!.getBoundingClientRect();
      return gary.top >= frame.bottom && gary.bottom <= innerHeight;
    })).toBeTruthy();
  }
  for (const action of await page.locator('.home-story a.btn-green').all()) {
    await action.scrollIntoViewIfNeeded();
    expect(await action.evaluate(element => {
      const rect = element.getBoundingClientRect();
      return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
    })).toBeTruthy();
  }
  const video = page.locator('.gary-concierge-video');
  await expect(video).toHaveAttribute('data-started', 'true', { timeout: 10000 });
  const time = await video.evaluate(video => (video as HTMLVideoElement).currentTime);
  await expect.poll(() => video.evaluate((video, time) => Math.abs((video as HTMLVideoElement).currentTime - time), time)).toBeGreaterThan(.1);
  await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
  await expect.poll(() => video.evaluate(video => (video as HTMLVideoElement).paused)).toBe(true);
  await page.getByRole('button', { name: 'Resume motion', exact: true }).click();
  await expect.poll(() => video.evaluate(video => (video as HTMLVideoElement).paused)).toBe(false);
});

test('Gary payload waits until full page load plus five seconds', async ({ page }) => {
  await page.route('**/api/**', route => route.abort());
  const payloadUrls = new Set<string>();
  const inspections: Promise<void>[] = [];
  page.on('response', response => {
    if (!new URL(response.url()).pathname.endsWith('.js')) return;
    inspections.push(response.text().then(source => {
      if (['gary-concierge.webm', 'gary-poses.webp', '/api/gary/message'].some(marker => source.includes(marker))) payloadUrls.add(response.url());
    }).catch(() => {}));
  });
  await page.goto('/', { waitUntil: 'load' });
  await expect(page.locator('.gary-launcher')).toHaveCount(0);
  await expect(page.locator('.gary-launcher')).toBeVisible({ timeout: 10000 });
  await expect.poll(() => page.locator('.gary-concierge-video').evaluate(video => (video as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
  await Promise.all(inspections);
  expect(payloadUrls.size).toBeGreaterThan(0);
  const measured = await page.evaluate(urls => {
    const load = (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming).loadEventEnd;
    const resources = performance.getEntriesByType('resource').filter(resource =>
      urls.includes(resource.name) || /gary-(poses|concierge)/.test(resource.name));
    return { load, resources: resources.map(resource => ({ url: resource.name, start: resource.startTime })) };
  }, Array.from(payloadUrls));
  expect(measured.resources.length).toBeGreaterThan(0);
  for (const resource of measured.resources) expect(resource.start).toBeGreaterThanOrEqual(measured.load + 5000);
});
