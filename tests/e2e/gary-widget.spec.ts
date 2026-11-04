import { gotoGaryReady } from './garyReady';
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// All API traffic must be explicitly mocked; never let an existing local binding reach a service.
test.beforeEach(async ({ context }) => {
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.origin === 'http://127.0.0.1:3200' && !url.pathname.startsWith('/api/') ? route.continue() : route.abort();
  });
});

const OPENING_QUESTION = 'What would you like help with today?';
const OPENING_OPTIONS = [
  'Saving time or reducing repetitive work',
  'Getting more leads or improving follow-up',
  'Understanding how AI could help my business',
  'Improving my current software or workflows'
];

// Gary's replies always go through POST /api/gary/message — including the very first, fixed
// opening question (the server decides that whenever a request arrives with no sessionId, i.e.
// a brand-new session — including after "Start Over", which clears the stored session id
// client-side). Mocked here for deterministic, LLM/DB-free E2E: one stateful handler per test
// that returns the opening question whenever the request has no sessionId, and a test-supplied
// follow-up reply otherwise — mirroring the real server's own per-session behavior rather than a
// simple call counter (which breaks across a Start Over, a second "new session" within the same
// test). Unit tests already cover the reply pipeline/validator/system prompt directly — these
// E2E tests verify the widget shell and the handoff flow around a reply.
async function mockGaryConversation(
  page: Page,
  followUp: { text: string; options?: string[] } = { text: OPENING_QUESTION, options: OPENING_OPTIONS },
  offerAssessment = false
) {
  await page.route('**/api/gary/message', async (route) => {
    const body = route.request().postDataJSON() as { sessionId?: string | null };
    const isOpeningTurn = !body.sessionId;
    const reply = isOpeningTurn ? { text: OPENING_QUESTION, options: OPENING_OPTIONS } : followUp;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        sessionId: 'e2e-session-1',
        reply,
        offerAssessment: !isOpeningTurn && offerAssessment
      })
    });
  });
}

async function openGary(page: Page, followUp?: { text: string; options?: string[] }, offerAssessment?: boolean) {
  await mockGaryConversation(page, followUp, offerAssessment);
  await page.clock.install();
  await gotoGaryReady(page);
  await page.clock.fastForward(6000);
  const launcher = page.getByRole('button', { name: 'Chat with Gary from Accounting' });
  await expect(launcher).toBeVisible();
  await launcher.click();
  const dialog = page.getByRole('dialog', { name: 'Chat with Gary from Accounting' });
  await expect(dialog.getByText(OPENING_QUESTION)).toBeVisible();
  return dialog;
}

test.describe('Gary widget', () => {
  test('does not appear immediately on load, then appears after the launch delay', async ({ page }) => {
    await page.clock.install();
    await gotoGaryReady(page);
    await expect(page.getByRole('button', { name: 'Chat with Gary from Accounting' })).toBeHidden();
    await page.clock.fastForward(6000);
    await expect(page.getByRole('button', { name: 'Chat with Gary from Accounting' })).toBeVisible();
  });

  test('never appears on the assessment page', async ({ page }) => {
    await page.clock.install();
    await page.goto('/assessment');
    await page.clock.fastForward(6000);
    await expect(page.getByRole('button', { name: 'Chat with Gary from Accounting' })).toBeHidden();
  });

  test('opens to the fixed opening question with four shortcut options', async ({ page }) => {
    const dialog = await openGary(page);
    for (const option of OPENING_OPTIONS) {
      await expect(dialog.getByRole('button', { name: option })).toBeVisible();
    }
    await expect(dialog.getByRole('button', { name: 'Something different' })).toBeVisible();
  });

  test('header and dialog never say "Wigglesworth" unprompted', async ({ page }) => {
    const dialog = await openGary(page);
    const dialogText = await dialog.innerText();
    expect(dialogText).not.toContain('Wigglesworth');
  });

  test("selecting an option sends it and renders Gary's reply", async ({ page }) => {
    const dialog = await openGary(page, { text: 'Got it — tell me a bit more about the scheduling side.' });
    await dialog.getByRole('button', { name: 'Saving time or reducing repetitive work' }).click();
    await expect(dialog.getByText('Saving time or reducing repetitive work')).toBeVisible();
    await expect(dialog.getByText('Got it — tell me a bit more about the scheduling side.')).toBeVisible();
  });

  test('free text entry works alongside the option shortcuts', async ({ page }) => {
    const dialog = await openGary(page, { text: 'Understood, thanks for sharing that.' });
    await dialog.getByPlaceholder('Type a message...').fill('We keep missing follow-ups with new leads.');
    await dialog.getByRole('button', { name: 'Send' }).click();
    await expect(dialog.getByText('We keep missing follow-ups with new leads.')).toBeVisible();
    await expect(dialog.getByText('Understood, thanks for sharing that.')).toBeVisible();
  });

  test('shows the assessment offer only when the reply signals it, with both actions available', async ({ page }) => {
    const dialog = await openGary(
      page,
      { text: "Since money's slipping through the cracks there, the free assessment could help." },
      true
    );
    await dialog.getByPlaceholder('Type a message...').fill('I keep losing track of invoices.');
    await dialog.getByRole('button', { name: 'Send' }).click();
    await expect(dialog.getByRole('button', { name: 'Start My Free Assessment' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Keep Chatting' })).toBeVisible();
  });

  test('accepting the assessment offer hands off to /assessment and Gary stops rendering there', async ({ page }) => {
    const dialog = await openGary(page, { text: 'Here is the assessment link.' }, true);
    await dialog.getByPlaceholder('Type a message...').fill("Sure, let's do the assessment.");
    await dialog.getByRole('button', { name: 'Send' }).click();
    await expect(dialog.getByRole('button', { name: 'Start My Free Assessment' })).toBeVisible();

    await page.route('**/api/gary/handoff', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ redirectUrl: '/assessment?token=e2e-fake-token&funnelCorrelationId=e2e-correlation' })
      });
    });
    await dialog.getByRole('button', { name: 'Start My Free Assessment' }).click();
    await page.waitForURL('**/assessment**');
    await expect(page.getByRole('button', { name: 'Chat with Gary from Accounting' })).toHaveCount(0);
  });

  test('a late assessment handoff cannot navigate after Gary is closed and reopened', async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    let handoffs = 0;
    await page.route('**/api/gary/handoff', async route => {
      handoffs++;
      await held;
      await route.fulfill({ json: { redirectUrl: '/assessment?token=synthetic-late-handoff' } });
    });
    const dialog = await openGary(page, { text: 'The assessment may help.' }, true);
    await dialog.getByPlaceholder('Type a message...').fill('Help me assess my business.');
    await dialog.getByRole('button', { name: 'Send', exact: true }).click();
    await dialog.getByRole('button', { name: 'Start My Free Assessment', exact: true }).click();
    await expect.poll(() => handoffs).toBe(1);
    await dialog.getByRole('button', { name: 'Close chat', exact: true }).click();
    await expect(dialog).toBeHidden();
    await page.getByRole('button', { name: 'Chat with Gary from Accounting', exact: true }).click();
    await expect(dialog).toBeVisible();
    const response = page.waitForResponse('**/api/gary/handoff');
    release();
    await (await response).finished();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL('http://127.0.0.1:3200/');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('The assessment may help.', { exact: true })).toBeVisible();
    expect(handoffs).toBe(1);
  });

  test('a stalled assessment handoff releases chat without losing the draft or retrying automatically', async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    const requests: string[] = [];
    await page.route('**/api/gary/handoff', async route => {
      requests.push(route.request().postData()!);
      if (requests.length > 1) return route.fulfill({ status: 503, json: { error: 'synthetic unavailable' } });
      await held;
      await route.fulfill({ json: { redirectUrl: '/about?source=timed-out-handoff' } }).catch(() => {});
    });
    try {
      const dialog = await openGary(page, { text: 'The assessment may help.' }, true);
      await dialog.getByRole('textbox').fill('Help me assess my business.');
      await dialog.getByRole('button', { name: 'Send', exact: true }).click();
      const draft = "I'd rather discuss a practical next step.";
      await dialog.getByRole('textbox').fill(draft);
      await page.evaluate(() => sessionStorage.setItem('gary-session-capability', 'synthetic-handoff-cap'));
      await dialog.getByRole('button', { name: 'Start My Free Assessment', exact: true }).click();
      await expect.poll(() => requests.length).toBe(1);
      await expect(dialog.getByRole('button', { name: 'Keep Chatting', exact: true })).toBeDisabled();
      await page.clock.fastForward(65001);
      await expect(dialog.getByRole('alert')).toContainText("Couldn't open the assessment");
      await expect(dialog.getByRole('textbox')).toBeEnabled();
      await expect(dialog.getByRole('textbox')).toHaveValue(draft);
      await expect(dialog.getByRole('button', { name: 'Start My Free Assessment', exact: true })).toBeEnabled();
      await page.clock.fastForward(65001);
      expect(requests).toHaveLength(1);
      release();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL('http://127.0.0.1:3200/');
      const retried = page.waitForResponse('**/api/gary/handoff');
      await dialog.getByRole('button', { name: 'Start My Free Assessment', exact: true }).click();
      await retried;
      await expect(dialog.getByRole('textbox')).toBeEnabled();
      await expect(dialog.getByRole('alert')).toContainText('Try again or keep chatting.');
      expect(requests).toHaveLength(2);
      expect(requests[1]).toBe(requests[0]);
      expect(JSON.parse(requests[0])).toEqual({ sessionId: 'e2e-session-1', sessionCapability: 'synthetic-handoff-cap' });
      await dialog.getByRole('button', { name: 'Keep Chatting', exact: true }).click();
      await expect(dialog.getByRole('button', { name: 'Start My Free Assessment', exact: true })).toHaveCount(0);
      const response = page.waitForResponse('**/api/gary/message');
      await dialog.getByRole('button', { name: 'Send', exact: true }).click();
      await response;
      await expect(dialog.getByText(draft, { exact: true })).toBeVisible();
      await expect(dialog.getByRole('textbox')).toBeEnabled();
      expect(requests).toHaveLength(2);
    } finally { release(); }
  });

  test('Escape closes the panel', async ({ page }) => {
    const dialog = await openGary(page);
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('Start Over asks for confirmation once messages exist, then resets on confirm', async ({ page }) => {
    const dialog = await openGary(page, { text: 'Sure thing.' });
    await dialog.getByPlaceholder('Type a message...').fill('A quick question.');
    await dialog.getByRole('button', { name: 'Send' }).click();
    await expect(dialog.getByText('Sure thing.')).toBeVisible();

    const startOver = dialog.getByRole('button', { name: 'Start Over' });
    await startOver.click();
    await expect(dialog.getByRole('button', { name: 'Confirm?' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Confirm?' }).click();
    await expect(dialog.getByText('A quick question.')).toHaveCount(0);
    await expect(dialog.getByText(OPENING_QUESTION)).toBeVisible();
  });

  test('has no serious or critical accessibility violations while open', async ({ page }) => {
    const dialog = await openGary(page);
    await expect(dialog).toBeVisible();
    const results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
    const seriousOrWorse = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(seriousOrWorse, JSON.stringify(seriousOrWorse, null, 2)).toEqual([]);
  });
});

// Cumulative elapsed time (ms) from mount at which each locked-routine step starts, matching
// Real media time replaces the retired SVG timer/pose signals. Seeking only accelerates
// deterministic frame inspection; these helpers assert decoded pixels, not synthetic pose attributes.
const LAUNCH_DELAY_MS = 5000;
const APPROVED_WEBM_SHA256 = '7d688e315ce79cf3538d3bd196b38d9e65ff322474e0233a71ed9a5ce113f2e9';

async function startApprovedGary(page: Page) {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await gotoGaryReady(page);
  await page.clock.fastForward(LAUNCH_DELAY_MS + 200);
  await expect.poll(() => page.locator('.gary-character-wrap video').evaluate(el => (el as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(2);
  await page.clock.fastForward(1000);
  await expect(page.locator('.gary-character-wrap')).not.toHaveClass(/gary-entering/); // Native media time 10s is after the entrance.
}

async function approvedFrame(page: Page, seconds: number) {
  return page.locator('.gary-character-wrap video').evaluate(async (el, time) => {
    const video = el as HTMLVideoElement;
    video.pause();
    if (Math.abs(video.currentTime - time) > 0.001) {
      // seeked updates the media clock before the compositor necessarily exposes that frame.
      const presented = new Promise<void>(resolve => {
        const inspect: VideoFrameRequestCallback = (_now, metadata) => {
          if (Math.abs(metadata.mediaTime - time) <= 1 / 24) resolve();
          else video.requestVideoFrameCallback(inspect);
        };
        video.requestVideoFrameCallback(inspect);
      });
      const sought = new Promise<void>(resolve => video.addEventListener('seeked', () => resolve(), { once: true }));
      video.currentTime = time;
      await Promise.all([sought, presented]);
    }
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 360;
    const context = canvas.getContext('2d')!; context.drawImage(video, 0, 0, 360, 360);
    const pixels = context.getImageData(0, 0, 360, 360).data;
    let white = 0, left = 360, right = 0, top = 360, bottom = 0;
    for (let y = 195; y < 335; y++) for (let x = 75; x < 320; x++) {
      const n = (y * 360 + x) * 4;
      if (pixels[n] > 230 && pixels[n + 1] > 230 && pixels[n + 2] > 230 && pixels[n + 3] > 240) {
        white++; left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
    const inkRows = [];
    for (let y = 210; y < 248; y++) {
      let black = 0;
      for (let x = 110; x < 255; x++) {
        const n = (y * 360 + x) * 4;
        if (pixels[n] < 100 && pixels[n + 1] < 100 && pixels[n + 2] < 100 && pixels[n + 3] > 240) black++;
      }
      if (black > 3) inkRows.push(y);
    }
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', pixels))).map(x => x.toString(16).padStart(2, '0')).join('');
    return { time: video.currentTime, hash, white, sign: white > 8000,
      board: { x: left, y: top, width: right - left + 1, height: bottom - top + 1 },
      firstLineInkHeight: inkRows.length ? inkRows.at(-1)! - inkRows[0] + 1 : 0 };
  }, seconds);
}

async function finishApprovedGary(page: Page) {
  const video = page.locator('.gary-character-wrap video');
  await video.evaluate(el => { const v = el as HTMLVideoElement; v.currentTime = v.duration - 0.02; void v.play(); });
  await expect(video).toHaveCount(0);
  await expect(page.locator('.gary-character-wrap svg')).toBeVisible();
}

async function assertApprovedClip(page: Page) {
  const response = await page.request.get('/gary/gary-approved.webm');
  expect(response.status()).toBe(200);
  const { createHash } = await import('node:crypto');
  expect(createHash('sha256').update(await response.body()).digest('hex')).toBe(APPROVED_WEBM_SHA256);
}

async function screenBoard(page: Page, native: { x: number; y: number; width: number; height: number }) {
  const box = (await page.locator('.gary-character-wrap').boundingBox())!;
  return { x: box.x + native.x * box.width / 360, y: box.y + native.y * box.height / 360,
    width: native.width * box.width / 360, height: native.height * box.height / 360 };
}

test.describe('Gary character — appearance', () => {
  test('renders the exact approved illustrated Gary rather than a substitute', async ({ page }) => {
    await startApprovedGary(page); await assertApprovedClip(page);
    const frame = await approvedFrame(page, 0.5);
    expect(frame.sign).toBe(false);
    expect(await page.locator('.gary-launcher').innerText()).not.toContain('🤖');
    await expect(page.locator('.gary-character image')).toHaveAttribute('href', '/gary/gary-poses.webp');
  });
  test('"Hi! I\'m Gary from Accounting" is visibly displayed in the resting launcher, as real text', async ({ page }) => {
    await startApprovedGary(page); await finishApprovedGary(page);
    await expect(page.getByText("Hi! I'm Gary from Accounting", { exact: true })).toBeVisible();
  });
  test('Gary appears beneath the chat button in the DOM/visual stack', async ({ page }) => {
    await startApprovedGary(page);
    const button = (await page.locator('.gary-chat-button').boundingBox())!;
    const character = (await page.locator('.gary-character-wrap').boundingBox())!;
    expect(character.y).toBeGreaterThanOrEqual(button.y + button.height);
  });
});

test.describe('Gary character — approved media routine', () => {
  test('plays distinct approved wave, point and sign frames in order and finishes seated', async ({ page }) => {
    await startApprovedGary(page);
    const frames = [];
    for (const time of [0.5, 5, 10, 13, 16, 18]) frames.push(await approvedFrame(page, time));
    expect(frames.map(f => f.time)).toEqual([0.5, 5, 10, 13, 16, 18]);
    expect(new Set(frames.map(f => f.hash)).size).toBe(6);
    expect(frames.map(f => f.sign)).toEqual([false, false, true, true, true, false]);
    await finishApprovedGary(page);
    await expect(page.locator('.gary-character')).toHaveAttribute('data-gary-pose', 'seated');
  });
  test('the sign retains exactly the approved "The button. Up there." pixels while held', async ({ page }) => {
    await startApprovedGary(page); await assertApprovedClip(page);
    expect((await approvedFrame(page, 10)).sign).toBe(true);
    await page.locator('.gary-character-wrap').screenshot({ path: test.info().outputPath('approved-sign.png') });
  });
  test('the full routine runs only once per session — a later page load goes straight to seated', async ({ page }) => {
    await startApprovedGary(page); expect((await approvedFrame(page, 5)).sign).toBe(false);
    await gotoGaryReady(page, '/how-it-works'); await page.clock.fastForward(26000);
    await expect(page.locator('.gary-character-wrap video')).toHaveCount(0);
    await expect(page.locator('.gary-character-wrap svg')).toBeVisible();
  });
  test('opening the chat mid-routine cancels video and leaves visible seated Gary after close', async ({ page }) => {
    await mockGaryConversation(page); await startApprovedGary(page); await approvedFrame(page, 10);
    const button = page.getByRole('button', { name: 'Chat with Gary from Accounting', exact: true });
    for (let cycle = 0; cycle < 3; cycle++) {
      await button.click(); await expect(page.getByTestId('gary-chat-character')).toBeVisible();
      await expect(page.locator('.gary-launcher video')).toHaveCount(0);
      await page.keyboard.press('Escape'); await expect(button).toBeFocused();
      await page.clock.fastForward(26000);
      await expect(page.locator('.gary-character-wrap svg')).toBeVisible();
      await expect(page.locator('.gary-character-wrap video')).toHaveCount(0);
    }
  });
  test('reduced motion shows a stable seated Gary without requesting moving media', async ({ page }) => {
    const videos: string[] = []; page.on('request', r => { if (r.url().includes('gary-approved.webm')) videos.push(r.url()); });
    await page.emulateMedia({ reducedMotion: 'reduce' }); await page.clock.install(); await gotoGaryReady(page);
    await page.clock.fastForward(26000);
    await expect(page.locator('.gary-character-wrap video')).toHaveCount(0);
    await expect(page.locator('.gary-character-wrap svg')).toBeVisible();
    await expect(page.getByText("Hi! I'm Gary from Accounting", { exact: true })).toBeVisible();
    expect(videos).toEqual([]);
  });
  test('idle movement remains disabled while reduced motion is on', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' }); await page.clock.install(); await gotoGaryReady(page);
    await page.clock.fastForward(5200);
    const still = page.locator('.gary-character-wrap svg'); const before = await still.screenshot();
    await page.clock.fastForward(26000); expect(await still.screenshot()).toEqual(before);
    await expect(still).toHaveAttribute('data-gary-idle', 'false');
  });
});

test.describe('Gary character — mobile viewport usability', () => {
  for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 412, height: 915 }]) {
    test(`launcher stays within the viewport and the chat button opens the panel at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport); await mockGaryConversation(page); await startApprovedGary(page);
      const box = (await page.locator('.gary-launcher').boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width + 1);
      await page.getByRole('button', { name: 'Chat with Gary from Accounting', exact: true }).click();
      await expect(page.getByTestId('gary-chat-character')).toBeVisible();
    });
  }
  test('native sign lettering retains at least ten rendered pixels at the narrowest required viewport', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 }); await startApprovedGary(page);
    const frame = await approvedFrame(page, 10), box = (await page.locator('.gary-character-wrap').boundingBox())!;
    expect(frame.sign).toBe(true);
    expect(frame.firstLineInkHeight * box.width / 360).toBeGreaterThanOrEqual(10);
    const sign = await screenBoard(page, frame.board);
    expect(sign.x).toBeGreaterThanOrEqual(0); expect(sign.x + sign.width).toBeLessThanOrEqual(361);
  });
});

// The approved consultation link now lives in the closing section. Keep testing its
// actual accessible name and assessment intent rather than the retired hero copy.
const HOMEPAGE_CTA_TEXT = 'Start Your Consultation ↗';

test.describe('Gary launcher — mobile CTA overlap and pointer-events', () => {
  const REQUIRED_MOBILE_VIEWPORTS = [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 412, height: 915 }
  ];

  for (const viewport of REQUIRED_MOBILE_VIEWPORTS) {
    test(`the homepage CTA is not covered by the Gary launcher at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.clock.install();
      await gotoGaryReady(page);
      await page.clock.fastForward(LAUNCH_DELAY_MS + 200);
      await page.waitForTimeout(20);

      const cta = page.locator('#free-assessment').getByRole('link', { name: HOMEPAGE_CTA_TEXT, exact: true });
      await cta.scrollIntoViewIfNeeded();
      const ctaBox = await cta.boundingBox();
      const launcherBox = await page.locator('.gary-launcher').boundingBox();
      expect(ctaBox, 'CTA not found').not.toBeNull();
      expect(launcherBox, 'launcher not found').not.toBeNull();

      const xOverlap = Math.max(
        0,
        Math.min(ctaBox!.x + ctaBox!.width, launcherBox!.x + launcherBox!.width) - Math.max(ctaBox!.x, launcherBox!.x)
      );
      const yOverlap = Math.max(
        0,
        Math.min(ctaBox!.y + ctaBox!.height, launcherBox!.y + launcherBox!.height) - Math.max(ctaBox!.y, launcherBox!.y)
      );
      // Zero tolerance — a partially-covered CTA is not a pass, per the requirement.
      expect(xOverlap * yOverlap, `CTA box: ${JSON.stringify(ctaBox)}, launcher box: ${JSON.stringify(launcherBox)}`).toBe(0);
    });

    test(`the homepage CTA is fully clickable (not just visually clear) at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.clock.install();
      await gotoGaryReady(page);
      await page.clock.fastForward(LAUNCH_DELAY_MS + 200);
      await page.waitForTimeout(20);

      const cta = page.locator('#free-assessment').getByRole('link', { name: HOMEPAGE_CTA_TEXT, exact: true });
      await cta.scrollIntoViewIfNeeded();
      // elementFromPoint at the CTA's own center must resolve to the CTA itself, not the
      // launcher (or anything else) sitting on top of it — the strict version of "clickable".
      const ctaBox = await cta.boundingBox();
      const resolvesToCta = await cta.evaluate(
        (link, [x, y]) => {
          const el = document.elementFromPoint(x, y);
          return el === link || (el ? link.contains(el) : false);
        },
        [ctaBox!.x + ctaBox!.width / 2, ctaBox!.y + ctaBox!.height / 2]
      );
      expect(resolvesToCta).toBe(true);

      // The current consultation CTA must navigate with its consultation intent intact.
      await cta.click();
      await expect(page).toHaveURL(/\/assessment\?intent=consultation$/);
    });

    test(`decorative Gary elements do not intercept pointer events at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.clock.install();
      await gotoGaryReady(page);
      await page.clock.fastForward(LAUNCH_DELAY_MS + 200);
      await page.waitForTimeout(20);

      const result = await page.evaluate(() => {
        const charWrap = document.querySelector('.gary-character-wrap');
        const label = document.querySelector('.gary-launcher span');
        const cluster = document.querySelector('.gary-decorative-cluster');
        const points: Array<{ name: string; el: Element | null }> = [
          { name: 'character', el: charWrap },
          { name: 'label', el: label },
          { name: 'cluster', el: cluster }
        ];
        return points.map(({ name, el }) => {
          if (!el) return { name, found: false, blocksClicks: null };
          const rect = el.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = rect.top + rect.height / 2;
          const hit = document.elementFromPoint(x, y);
          // Passes if the click either falls through entirely past this element (hit !== el and
          // el doesn't contain hit) or the element is simply zero-sized/off-screen.
          const blocksClicks = hit === el || el.contains(hit);
          return { name, found: true, blocksClicks, computedPointerEvents: getComputedStyle(el).pointerEvents };
        });
      });

      for (const point of result) {
        if (!point.found) continue;
        expect(point.blocksClicks, `${point.name}: ${JSON.stringify(point)}`).toBe(false);
      }
    });
  }

  test('the chat button remains clickable and opens the panel even with the idle pointer-events guard active', async ({ page }) => {
    await mockGaryConversation(page);
    await page.setViewportSize({ width: 360, height: 800 });
    await page.clock.install();
    await gotoGaryReady(page);
    await page.clock.fastForward(LAUNCH_DELAY_MS + 200);
    await page.waitForTimeout(20);

    const button = page.getByRole('button', { name: 'Chat with Gary from Accounting' });
    const buttonBox = await button.boundingBox();
    const resolvesToButton = await page.evaluate(
      ([x, y]) => {
        const el = document.elementFromPoint(x, y);
        const btn = document.querySelector('button[aria-label="Chat with Gary from Accounting"]');
        return el === btn || (btn ? btn.contains(el) : false);
      },
      [buttonBox!.x + buttonBox!.width / 2, buttonBox!.y + buttonBox!.height / 2]
    );
    expect(resolvesToButton).toBe(true);

    await button.click();
    await expect(page.getByRole('dialog', { name: 'Chat with Gary from Accounting' })).toBeVisible();
  });

  test('GaryPanel controls remain fully interactive once open (idle pointer-events guard does not leak in)', async ({ page }) => {
    await mockGaryConversation(page);
    await page.setViewportSize({ width: 360, height: 800 });
    await page.clock.install();
    await gotoGaryReady(page);
    await page.clock.fastForward(LAUNCH_DELAY_MS + 200);
    await page.getByRole('button', { name: 'Chat with Gary from Accounting' }).click();
    const dialog = page.getByRole('dialog', { name: 'Chat with Gary from Accounting' });
    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder('Type a message...').fill('a real message');
    await dialog.getByRole('button', { name: 'Send' }).click();
    await expect(dialog.getByText('a real message')).toBeVisible();
  });
});

function boxOverlapArea(a: { x: number; y: number; width: number; height: number } | null, b: typeof a): number {
  if (!a || !b) return -1;
  const xOverlap = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const yOverlap = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return xOverlap * yOverlap;
}

test.describe('Gary launcher — current conversation video layout', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGaryReady(page);
    await expect(page.locator('[data-conversation-video]')).toHaveCount(1);
  });

  // Required test matrix: narrowest phone through desktop. minUsefulWidth encodes "large enough
  // to be useful, not merely technically visible" — 180px at 360 and 200px at 390 are the
  // explicit floors; wider breakpoints get a floor comfortably below their actual rendered size
  // so the test still catches a regression toward "thumbnail" without being flaky on rounding.
  const REQUIRED_WIDTHS = [
    { width: 360, height: 800, minUsefulWidth: 180 },
    { width: 390, height: 844, minUsefulWidth: 200 },
    { width: 430, height: 932, minUsefulWidth: 200 },
    { width: 768, height: 1024, minUsefulWidth: 220 },
    { width: 1024, height: 768, minUsefulWidth: 300 },
    { width: 1440, height: 900, minUsefulWidth: 400 },
    { width: 1536, height: 864, minUsefulWidth: 400 },
    { width: 1600, height: 900, minUsefulWidth: 400 }
  ];

  for (const viewport of REQUIRED_WIDTHS) {
    test(`the conversation video is not covered by the Gary launcher or nav at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.clock.install();
      await gotoGaryReady(page);
      await page.clock.fastForward(LAUNCH_DELAY_MS + 200);
      await page.waitForTimeout(20);

      const video = page.locator('[data-conversation-video]');
      await video.scrollIntoViewIfNeeded();
      await expect(video).toBeInViewport();
      const videoBox = await video.boundingBox();
      const launcherBox = await page.locator('.gary-launcher').boundingBox();
      const navBox = await page.locator('header').first().boundingBox();
      expect(videoBox, 'conversation video not found').not.toBeNull();
      expect(launcherBox, 'launcher not found').not.toBeNull();

      expect(
        boxOverlapArea(videoBox, launcherBox),
        `video box: ${JSON.stringify(videoBox)}, launcher box: ${JSON.stringify(launcherBox)}`
      ).toBe(0);
      expect(
        boxOverlapArea(videoBox, navBox),
        `video box: ${JSON.stringify(videoBox)}, nav box: ${JSON.stringify(navBox)}`
      ).toBe(0);
    });

    test(`the conversation video stays large enough to be useful (not a thumbnail) and keeps a true 16:9 frame at ${viewport.width}x${viewport.height}`, async ({
      page
    }) => {
      await page.setViewportSize(viewport);
      await gotoGaryReady(page);
      const video = page.locator('[data-conversation-video]');
      await video.scrollIntoViewIfNeeded();
      await expect(video).toBeInViewport();
      await expect(video).toBeVisible();
      const box = await video.boundingBox();
      expect(box!.width, `video was only ${box!.width}px wide`).toBeGreaterThanOrEqual(viewport.minUsefulWidth);
      // The design intentionally shows the full 16:9 source (previously a 4:3 wrapper cropped it).
      expect(Math.abs(box!.width / box!.height - 16 / 9)).toBeLessThan(0.05);
    });

    test(`no horizontal overflow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await gotoGaryReady(page);
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(viewport.width + 1);
    });
  }

  test('the conversation video preserves its full 16:9 geometry inside the approved feathered frame', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoGaryReady(page);
    const video = page.locator('[data-conversation-video]');
    await video.scrollIntoViewIfNeeded();
    await expect(video).toBeInViewport();
    await expect(video).toBeVisible();
    await video.evaluate(
      (el: HTMLVideoElement) =>
        new Promise<void>((resolve) => {
          if (el.readyState >= 1) resolve();
          else el.addEventListener('loadedmetadata', () => resolve(), { once: true });
        })
    );

    // The current source file itself is a genuine 960x540 (16:9) recording — confirms the "full frame
    // visible" requirement isn't just about the wrapper's shape matching the source by luck.
    const sourceDims = await video.evaluate((el: HTMLVideoElement) => ({
      videoWidth: el.videoWidth,
      videoHeight: el.videoHeight
    }));
    expect(Math.abs(sourceDims.videoWidth / sourceDims.videoHeight - 16 / 9)).toBeLessThan(0.02);

    const info = await video.evaluate((el: HTMLVideoElement) => {
      const wrapper = el.parentElement!;
      const wrapperBox = wrapper.getBoundingClientRect();
      const videoBox = el.getBoundingClientRect();
      return {
        objectFit: getComputedStyle(el).objectFit,
        wrapperAspect: wrapperBox.width / wrapperBox.height,
        maskImage: getComputedStyle(wrapper).maskImage,
        sourceAspect: (el as HTMLVideoElement).videoWidth / (el as HTMLVideoElement).videoHeight,
        // With matching source/frame aspect ratios, the rendered video box should fill
        // its wrapper almost exactly — any meaningfully smaller box here would mean letterboxing,
        // which signals an aspect-ratio mismatch (i.e. the wrapper silently drifted off 16:9).
        renderedFillsWrapper: videoBox.width >= wrapperBox.width * 0.98 && videoBox.height >= wrapperBox.height * 0.98
      };
    });

    // Cover does not geometrically crop a matching-aspect source. The approved radial
    // mask feathers the edges deliberately; that is a separate presentation contract.
    expect(info.objectFit).toBe('cover');
    expect(info.maskImage).toContain('radial-gradient');
    expect(Math.abs(info.wrapperAspect - 16 / 9)).toBeLessThan(0.05);
    expect(Math.abs(info.wrapperAspect - info.sourceAspect)).toBeLessThan(0.02);
    expect(info.renderedFillsWrapper, `wrapper/video mismatch: ${JSON.stringify(info)}`).toBe(true);
  });

  // The two viewports the previous 58px-wide-thumbnail fix specifically failed on — checked
  // against both CTA buttons (not just one) and both the launcher's full box and the video.
  const FOCUS_WIDTHS = [
    { width: 360, height: 800 },
    { width: 390, height: 844 }
  ];

  for (const viewport of FOCUS_WIDTHS) {
    test(`Gary does not overlap either CTA button at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.clock.install();
      await gotoGaryReady(page);
      await page.clock.fastForward(LAUNCH_DELAY_MS + 200);
      await page.waitForTimeout(20);

      const closingSection = page.locator('#free-assessment');
      const greenCta = closingSection.getByRole('link', { name: 'Start Your Free Assessment ↗', exact: true });
      const ghostCta = closingSection.getByRole('link', { name: HOMEPAGE_CTA_TEXT, exact: true });
      await ghostCta.scrollIntoViewIfNeeded();
      await expect(greenCta).toBeInViewport();
      await expect(ghostCta).toBeInViewport();
      const launcherBox = await page.locator('.gary-launcher').boundingBox();
      const greenBox = await greenCta.boundingBox();
      const ghostBox = await ghostCta.boundingBox();

      expect(boxOverlapArea(greenBox, launcherBox), `green CTA vs launcher: ${JSON.stringify({ greenBox, launcherBox })}`).toBe(0);
      expect(boxOverlapArea(ghostBox, launcherBox), `ghost CTA vs launcher: ${JSON.stringify({ ghostBox, launcherBox })}`).toBe(0);
    });

    test(`the conversation frame leaves no unexplained video gap at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await gotoGaryReady(page);
      const video = page.locator('[data-conversation-video]');
      await video.scrollIntoViewIfNeeded();
      await expect(video).toBeInViewport();
      const gaps = await video.evaluate(el => {
        const wrapper = el.parentElement!;
        const copy = wrapper.nextElementSibling!;
        return {
          frameGap: Math.abs(wrapper.getBoundingClientRect().bottom - el.getBoundingClientRect().bottom),
          copyGap: copy.getBoundingClientRect().top - wrapper.getBoundingClientRect().bottom,
        };
      });
      expect(gaps.frameGap, 'video must fill its actual frame').toBeLessThan(1);
      expect(gaps.copyGap, 'people copy must follow the frame').toBeGreaterThanOrEqual(0);
      expect(gaps.copyGap, 'unexplained space before people copy').toBeLessThan(60);
    });
  }
});

test.describe('Gary launcher — chat button color/ring and universal sign/bubble composition', () => {
  test('chat button and primary CTA retain their approved colors and readable CTA contrast', async ({ page }) => {
    await page.clock.install();
    await gotoGaryReady(page);
    await page.clock.fastForward(LAUNCH_DELAY_MS + 200);

    const cta = page.locator('#free-assessment').getByRole('link', { name: 'Start speaking with Gary', exact: true });
    await cta.scrollIntoViewIfNeeded();
    const buttonBg = await page.evaluate(() => getComputedStyle(document.querySelector('.gary-chat-button')!).backgroundColor);
    const ctaBg = await cta.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(ctaBg, 'primary Gary CTA not found').not.toBeNull();
    expect(buttonBg).toBe('rgb(22, 163, 74)');
    expect(ctaBg).toBe('rgb(20, 120, 60)');
    const foreground = await cta.evaluate(el => getComputedStyle(el).color);
    expect(foreground).toBe('rgb(255, 255, 255)');
    const channels = [20, 120, 60].map(value => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    expect(1.05 / (luminance + 0.05), 'normal-size CTA text contrast').toBeGreaterThanOrEqual(4.5);
  });

  test('chat button remains clickable', async ({ page }) => {
    await page.clock.install();
    await gotoGaryReady(page);
    await page.clock.fastForward(LAUNCH_DELAY_MS + 200);

    const button = page.getByRole('button', { name: 'Chat with Gary from Accounting' });
    const box = await button.boundingBox();
    const resolvesToButton = await page.evaluate(
      ([x, y]) => {
        const el = document.elementFromPoint(x, y);
        const btn = document.querySelector('.gary-chat-button');
        return el === btn || (btn ? btn.contains(el) : false);
      },
      [box!.x + box!.width / 2, box!.y + box!.height / 2]
    );
    expect(resolvesToButton).toBe(true);

    await button.click();
    await expect(page.getByRole('dialog', { name: 'Chat with Gary from Accounting' })).toBeVisible();
  });

  test('prefers-reduced-motion stops the silver ring rotating, without removing it', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.install();
    await gotoGaryReady(page);
    await page.clock.fastForward(LAUNCH_DELAY_MS + 200);

    const before = await page.evaluate(() => {
      const cs = getComputedStyle(document.querySelector('.gary-chat-button')!, '::before');
      return { animationName: cs.animationName, hasGradient: cs.backgroundImage.includes('conic-gradient') };
    });
    expect(before.animationName).toBe('none');
    // Static, not stripped — the requirement is "becomes static", not "disappears".
    expect(before.hasGradient).toBe(true);
  });

  const COMPACT_VIEWPORTS = [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 412, height: 915 }, { width: 430, height: 932 }];
  for (const viewport of COMPACT_VIEWPORTS) {
    test(`chat button stays above and aligned with approved Gary at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport); await startApprovedGary(page);
      const button = (await page.locator('.gary-chat-button').boundingBox())!, character = (await page.locator('.gary-character-wrap').boundingBox())!;
      expect(button.y + button.height).toBeLessThanOrEqual(character.y + 1);
      expect(Math.abs(button.x + button.width / 2 - character.x - character.width / 2)).toBeLessThanOrEqual(20);
    });
    test(`mobile retains the resting bubble-button row and Gary-below composition at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport); await startApprovedGary(page); await finishApprovedGary(page);
      const bubble = page.locator('.gary-speech-bubble'), b = (await bubble.boundingBox())!, button = (await page.locator('.gary-chat-button').boundingBox())!, character = (await page.locator('.gary-character-wrap').boundingBox())!;
      expect(await bubble.evaluate(el => getComputedStyle(el).position)).toBe('relative');
      expect(boxOverlapArea(b, button)).toBe(0); expect(Math.abs(b.y + b.height / 2 - button.y - button.height / 2)).toBeLessThanOrEqual(2);
      expect(b.x + b.width).toBeLessThanOrEqual(button.x); expect(button.y + button.height).toBeLessThanOrEqual(character.y + 1);
    });
    test(`mobile resting bubble stays inside the viewport and off Gary at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport); await startApprovedGary(page); await finishApprovedGary(page);
      const bubble = (await page.locator('.gary-speech-bubble').boundingBox())!, character = (await page.locator('.gary-character-wrap').boundingBox())!;
      expect(bubble.x).toBeGreaterThanOrEqual(-1); expect(bubble.x + bubble.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(boxOverlapArea(bubble, character)).toBe(0); expect(bubble.x + bubble.width / 2).toBeLessThan(character.x + character.width / 2);
    });
    test(`baked sign stays inside the viewport and off video, CTAs, button and face at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport); await startApprovedGary(page);
      const section = page.locator('#free-assessment'); const ghost = section.getByRole('link', { name: HOMEPAGE_CTA_TEXT, exact: true });
      await ghost.scrollIntoViewIfNeeded();
      const frame = await approvedFrame(page, 10), sign = await screenBoard(page, frame.board);
      expect(frame.sign).toBe(true); expect(sign.x).toBeGreaterThanOrEqual(-1); expect(sign.x + sign.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(sign.width).toBeLessThanOrEqual(125); expect(sign.height).toBeLessThanOrEqual(70);
      for (const el of [page.locator('[data-conversation-video]'), section.getByRole('link', { name: 'Start Your Free Assessment ↗', exact: true }), ghost, page.locator('.gary-chat-button')]) {
        expect(boxOverlapArea(sign, await el.boundingBox())).toBe(0);
      }
      const character = (await page.locator('.gary-character-wrap').boundingBox())!;
      expect(frame.firstLineInkHeight * character.width / 360).toBeGreaterThanOrEqual(9);
      const face = await screenBoard(page, { x: 105, y: 0, width: 195, height: 185 });
      expect(boxOverlapArea(sign, face)).toBe(0);
    });
    test(`the sign retains its approved exact lettering at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport); await startApprovedGary(page); await assertApprovedClip(page);
      const frame = await approvedFrame(page, 10); expect(frame.sign).toBe(true); expect(frame.firstLineInkHeight).toBeGreaterThanOrEqual(22);
      await page.locator('.gary-character-wrap').screenshot({ path: test.info().outputPath('approved-lettering.png') });
    });
    test(`approved pointing frames target the separate button above Gary at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport); await startApprovedGary(page); await assertApprovedClip(page);
      const point = await approvedFrame(page, 5), sign = await approvedFrame(page, 10);
      expect(point.hash).not.toBe(sign.hash); expect(point.sign).toBe(false); expect(sign.sign).toBe(true);
      const button = (await page.locator('.gary-chat-button').boundingBox())!, character = (await page.locator('.gary-character-wrap').boundingBox())!;
      expect(button.y + button.height).toBeLessThanOrEqual(character.y);
      // Native approved pointing hand is around x=160; verify the button is above its screen position.
      expect(Math.abs(button.x + button.width / 2 - (character.x + 160 * character.width / 360))).toBeLessThanOrEqual(20);
    });
    test(`approved sign persists for six seconds while frames advance without layout jumps at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport); await startApprovedGary(page);
      const positions: Array<{ x: number; y: number; width: number; height: number } | null> = [], hashes: string[] = [];
      for (let time = 10; time <= 16; time += 0.5) {
        const frame = await approvedFrame(page, time); expect(frame.sign, `sign at media time ${time}`).toBe(true);
        positions.push(await page.locator('.gary-character-wrap video').boundingBox()); hashes.push(frame.hash);
        const sign = await screenBoard(page, frame.board); expect(sign.x).toBeGreaterThanOrEqual(-1); expect(sign.x + sign.width).toBeLessThanOrEqual(viewport.width + 1);
      }
      expect(new Set(hashes).size).toBe(13); expect(positions.every(p => JSON.stringify(p) === JSON.stringify(positions[0]))).toBe(true);
    });
    test(`intro bubble is visible in the seated resting state at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport); await page.emulateMedia({ reducedMotion: 'reduce' }); await page.clock.install(); await gotoGaryReady(page); await page.clock.fastForward(5200);
      await expect(page.getByTestId('gary-speech-bubble')).toBeVisible(); await expect(page.locator('.gary-character-wrap svg')).toBeVisible();
    });
    test(`intro bubble stays absent through the whole approved video at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport); await startApprovedGary(page);
      for (const time of [0.5, 5, 10, 13, 16, 18, 20]) { await approvedFrame(page, time); await expect(page.getByTestId('gary-speech-bubble')).toHaveCount(0); }
    });
    test(`intro bubble returns only after actual video completion at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport); await startApprovedGary(page); expect((await approvedFrame(page, 16)).sign).toBe(true);
      await expect(page.getByTestId('gary-speech-bubble')).toHaveCount(0); await finishApprovedGary(page);
      await expect(page.getByTestId('gary-speech-bubble')).toBeVisible(); await expect(page.locator('.gary-sign-board')).toHaveCount(0);
    });
  }
  test('reduced motion has no sign animation or delayed replay', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' }); await page.clock.install(); await gotoGaryReady(page); await page.clock.fastForward(5200);
    await expect(page.locator('.gary-character-wrap video')).toHaveCount(0);
    const before = await page.locator('.gary-character-wrap svg').screenshot(); await page.clock.fastForward(26000);
    expect(await page.locator('.gary-character-wrap svg').screenshot()).toEqual(before);
  });
});

test.describe('Gary launcher — media message exclusivity and responsive geometry', () => {
  for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 412, height: 915 }, { width: 430, height: 932 }, { width: 600, height: 900 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
    test(`bubble and baked sign remain exclusive through media states at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport); await startApprovedGary(page);
      const section = page.locator('#free-assessment'), green = section.getByRole('link', { name: 'Start Your Free Assessment ↗', exact: true }), ghost = section.getByRole('link', { name: HOMEPAGE_CTA_TEXT, exact: true });
      await ghost.scrollIntoViewIfNeeded(); await expect(green).toBeInViewport(); await expect(ghost).toBeInViewport();
      const root = (await page.locator('.gary-launcher').boundingBox())!;
      expect(root.x).toBeGreaterThanOrEqual(-1); expect(root.x + root.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(boxOverlapArea(root, await green.boundingBox())).toBe(0); expect(boxOverlapArea(root, await ghost.boundingBox())).toBe(0);
      for (const time of [0.5, 10, 13, 16, 18]) {
        const frame = await approvedFrame(page, time); await expect(page.getByTestId('gary-speech-bubble')).toHaveCount(0);
        if (frame.sign) {
          const sign = await screenBoard(page, frame.board);
          for (const target of [page.locator('.gary-chat-button'), page.locator('header').first()]) expect(boxOverlapArea(sign, await target.boundingBox())).toBe(0);
          expect(boxOverlapArea(sign, await screenBoard(page, { x: 105, y: 0, width: 195, height: 185 }))).toBe(0);
        }
      }
      await finishApprovedGary(page); await expect(page.getByTestId('gary-speech-bubble')).toBeVisible();
      const bubble = await page.locator('.gary-speech-bubble').boundingBox(), character = await page.locator('.gary-character-wrap').boundingBox(), button = await page.locator('.gary-chat-button').boundingBox();
      expect(boxOverlapArea(bubble, character)).toBe(0); expect(boxOverlapArea(bubble, button)).toBe(0); await expect(page.locator('.gary-chat-button')).toBeVisible();
    });
  }
});

test.describe('Homepage responsive images', () => {
  const subjects = [
    { selector: '#discovery .photograph-canvas', ratio: 1950 / 1350 },
    { selector: '#engagement .photograph-canvas', ratio: 1950 / 1350 },
    { selector: '#response .photograph-canvas', ratio: 400 / 680 },
  ];
  const viewports = [[360,800], [390,844], [412,915], [768,1024], [1024,768], [1280,720], [1440,900]];
  for (const [width, height] of viewports) {
    test(`no horizontal overflow and every current photograph renders above its floor size at ${width}x${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await gotoGaryReady(page);
      for (const subject of subjects) {
        const canvas = page.locator(subject.selector);
        await expect(canvas).toHaveCount(1);
        await canvas.scrollIntoViewIfNeeded();
        await expect(canvas).toBeInViewport();
        const box = await canvas.boundingBox();
        expect(box, `${subject.selector} has no box`).not.toBeNull();
        expect(box!.width).toBeGreaterThanOrEqual(199);
        expect(box!.x).toBeGreaterThanOrEqual(-1);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
      }
    });
  }
  test('current landscape and portrait photographs preserve their true canvas and source aspect ratios', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await gotoGaryReady(page);
    for (const subject of subjects) {
      const canvas = page.locator(subject.selector);
      await canvas.scrollIntoViewIfNeeded();
      const box = await canvas.boundingBox();
      expect(box!.width / box!.height).toBeCloseTo(subject.ratio, 1);
      const distortion = await canvas.locator('image[data-device-photograph]').evaluate(async element => {
        const photo = element as SVGImageElement;
        const resource = new Image();
        resource.src = photo.href.baseVal;
        await resource.decode();
        return Math.abs(photo.width.baseVal.value / photo.height.baseVal.value - resource.naturalWidth / resource.naturalHeight);
      });
      expect(distortion).toBeLessThan(0.001);
    }
  });
  test('current landscape photograph remains meaningfully larger than old fixed 25% sizing on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await gotoGaryReady(page);
    const canvas = page.locator(subjects[0].selector);
    await canvas.scrollIntoViewIfNeeded();
    await expect(canvas).toBeInViewport();
    expect((await canvas.boundingBox())!.width).toBeGreaterThan(150);
  });
});

test('ordinary chat survives refresh without sharing recovery with another visitor tab', async ({ page, context }) => {
  let requests = 0;
  page.on('request', request => { if (request.url().endsWith('/api/gary/message')) requests++; });
  const reply = 'Start with the handoff where the enquiry gets lost.';
  const dialog = await openGary(page, { text: reply });
  await dialog.getByRole('textbox').fill('My bakery keeps missing enquiries.');
  await dialog.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(dialog.getByText(reply)).toBeVisible();
  await page.reload();
  await expect.poll(() => page.evaluate(() => document.documentElement.getAttribute('data-gary-ready'))).toBe('true');
  await page.clock.fastForward(6000);
  await page.getByRole('button', { name: 'Chat with Gary from Accounting', exact: true }).click();
  await expect(page.getByRole('dialog').getByText(reply)).toBeVisible();
  await expect(page.getByRole('dialog').getByText('My bakery keeps missing enquiries.')).toBeVisible();
  expect(requests).toBe(2);
  const other = await context.newPage();
  try {
    let identity: Record<string, unknown> | undefined;
    await other.route('**/api/gary/message', async route => {
      identity = route.request().postDataJSON();
      await route.fulfill({ json: { sessionId: 'other-session', sessionCapability: 'other-cap', reply: { text: 'A separate visitor opening' } } });
    });
    await gotoGaryReady(other, '/contact');
    await other.getByRole('button', { name: 'Talk to Gary', exact: true }).click();
    await expect(other.getByText('A separate visitor opening')).toBeVisible();
    expect(identity).toBeDefined();
    expect(identity).not.toHaveProperty('sessionId');
    expect(identity).not.toHaveProperty('sessionCapability');
    expect(identity!.contactFlow).toEqual({ action: 'start' });
    await expect(other.getByText('My bakery keeps missing enquiries.')).toHaveCount(0);
  } finally { await other.close(); }
});
