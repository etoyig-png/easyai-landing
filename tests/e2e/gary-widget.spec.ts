import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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
  await page.goto('/');
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
    await page.goto('/');
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
// GaryLauncher.tsx's ROUTINE_STEPS exactly — used only to size how long to sample for below, not
// to jump to an exact instant (see samplePoseSequence's own comment for why).
const LAUNCH_DELAY_MS = 5000;
const ROUTINE_TOTAL_MS =
  LAUNCH_DELAY_MS + 700 + 1600 + 1200 + 1400 + 1400 + 600 + 700 + 1500 + 1500 + 3000 + 600; // = 19200
const ROUTINE_START = {
  sign: LAUNCH_DELAY_MS + 700 + 1600 + 1200 + 1400 + 1400 + 600 + 700 // = 12600
};
// The physical sign board itself (rendered for 'sign' | 'signPoint' | 'signWave' | 'lowering')
// stays fully visible (not aria-hidden) for sign(1500) + signPoint(1500) + signWave(3000) = 6000ms
// before 'lowering' starts — comfortably past the required 5000ms minimum (asserted directly
// against the real source values in lib/gary/routineSteps.test.ts, not measured here — see the
// "sign is still solidly visible when signWave arrives" test below for why).
const ROUTINE_START_SIGN_POINT = ROUTINE_START.sign + 1500;

// A plain snapshot read via page.evaluate() rather than a Locator's auto-waiting getAttribute():
// Playwright's fake clock (page.clock.install()) also virtualizes requestAnimationFrame, which
// the auto-waiting/polling machinery behind Locator assertions relies on — once the clock stops
// advancing, that polling can stall for the assertion's full timeout waiting on a frame that
// never comes. A direct synchronous DOM read has no such dependency and is exactly what's
// needed here anyway, since every call site already advanced the clock to the precise instant
// it wants to inspect.
async function currentGaryPose(page: Page): Promise<string | null> {
  return page.evaluate(() => document.querySelector('.gary-character')?.getAttribute('data-gary-pose') ?? null);
}

async function isSignTextVisible(page: Page): Promise<boolean> {
  return page.evaluate(() => document.querySelector('.gary-sign-text')?.classList.contains('is-visible') ?? false);
}

// Samples data-gary-pose at a fixed virtual-time cadence across the routine and returns the
// deduplicated sequence of poses actually observed, in order. Deliberately doesn't try to land
// on one exact instant per pose (page.clock.fastForward() is a real CDP round trip whose
// resolution timing relative to the React commit it triggers isn't precise enough to reliably
// hit a single specific millisecond) — sampling densely enough to catch every pose at least
// once, then asserting on relative order, is far more robust than pinning exact timestamps.
async function samplePoseSequence(page: Page, totalMs: number, stepMs = 150): Promise<string[]> {
  const observed: string[] = [];
  let remaining = totalMs;
  while (remaining > 0) {
    const step = Math.min(stepMs, remaining);
    await page.clock.fastForward(step);
    await page.waitForTimeout(10);
    const pose = await currentGaryPose(page);
    if (pose && observed[observed.length - 1] !== pose) observed.push(pose);
    remaining -= step;
  }
  return observed;
}

/** Index of the first occurrence of `pose` in `sequence`, or -1. Used to assert relative order
 * without requiring every single pose to have been caught by a sample. */
function firstIndexOf(sequence: string[], pose: string): number {
  return sequence.indexOf(pose);
}

test.describe('Gary character — appearance', () => {
  test('renders as a human illustrated character, not a robot/emoji/orb', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    await page.clock.fastForward(LAUNCH_DELAY_MS + 200);
    const svg = page.locator('.gary-character');
    await expect(svg).toBeVisible();
    // Human-figure markers actually present in the illustration.
    await expect(page.locator('.gary-head-shape')).toHaveCount(1);
    await expect(page.locator('.gary-glasses-lens')).toHaveCount(2);
    await expect(page.locator('.gary-shirt')).toHaveCount(1);
    await expect(page.locator('.gary-tie')).toHaveCount(1);
    // The old generic launcher's 🤖 emoji must be gone.
    const launcherText = await page.locator('.fixed').last().innerText();
    expect(launcherText).not.toContain('🤖');
  });

  test('"Gary from Accounting" is visibly displayed in the resting launcher, as real text', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    await page.clock.fastForward(ROUTINE_TOTAL_MS + 200);
    await page.waitForTimeout(20);
    await expect(page.getByText('Gary from Accounting', { exact: true })).toBeVisible();
  });

  test('Gary appears beneath the chat button in the DOM/visual stack', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    await page.clock.fastForward(LAUNCH_DELAY_MS + 200);
    const button = page.getByRole('button', { name: 'Chat with Gary from Accounting' });
    const character = page.locator('.gary-character-wrap');
    const buttonBox = await button.boundingBox();
    const characterBox = await character.boundingBox();
    expect(buttonBox).not.toBeNull();
    expect(characterBox).not.toBeNull();
    expect(characterBox!.y).toBeGreaterThan(buttonBox!.y);
  });
});

test.describe('Gary character — locked animation routine', () => {
  test('plays jump -> wave -> point -> frustrated -> idea -> sign -> seated in that order, once per session', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    const sequence = await samplePoseSequence(page, ROUTINE_TOTAL_MS + 400);

    for (const pose of ['jump', 'wave', 'point', 'frustrated', 'idea', 'sign']) {
      expect(sequence, `sequence: ${sequence.join(' -> ')}`).toContain(pose);
    }
    // Strictly increasing indices proves the order, not just presence.
    const indices = ['jump', 'wave', 'point', 'frustrated', 'idea', 'sign'].map((p) => firstIndexOf(sequence, p));
    for (let i = 1; i < indices.length; i += 1) {
      expect(indices[i], `sequence: ${sequence.join(' -> ')}`).toBeGreaterThan(indices[i - 1]);
    }
    // Ends on seated, not stuck on lowering or any other transient pose.
    expect(sequence[sequence.length - 1]).toBe('seated');
  });

  test('the sign reads exactly "The button. Up there." while held', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    let sawSign = false;
    let remaining = ROUTINE_START.sign + 500;
    while (remaining > 0 && !sawSign) {
      const step = Math.min(150, remaining);
      await page.clock.fastForward(step);
      await page.waitForTimeout(10);
      if ((await currentGaryPose(page)) === 'sign') sawSign = true;
      remaining -= step;
    }
    expect(sawSign, 'never observed the sign pose').toBe(true);
    expect(await isSignTextVisible(page)).toBe(true);
    const signTextContent = await page.evaluate(
      () => document.querySelector('.gary-sign-text')?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
    );
    expect(signTextContent).toBe('The button. Up there.');
  });

  test('the full routine runs only once per session — a later page load goes straight to seated', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    const firstLoadSequence = await samplePoseSequence(page, ROUTINE_TOTAL_MS + 400);
    expect(firstLoadSequence).toContain('jump'); // confirms it actually played the first time

    // A second page load within the same session (sessionStorage persists across page.goto in
    // the same tab/context) must never replay jump/wave/frustrated/sign — straight to seated.
    await page.goto('/how-it-works');
    const secondLoadSequence = await samplePoseSequence(page, ROUTINE_TOTAL_MS + 400);
    expect(secondLoadSequence, `sequence: ${secondLoadSequence.join(' -> ')}`).toEqual(['seated']);
  });

  test('opening the chat mid-routine interrupts it and settles on seated', async ({ page }) => {
    await mockGaryConversation(page);
    await page.clock.install();
    await page.goto('/');
    // Advance partway into the routine (well before it would naturally reach seated on its own).
    await page.clock.fastForward(LAUNCH_DELAY_MS + 1500);
    await page.waitForTimeout(20);
    expect(await currentGaryPose(page)).not.toBe('seated');

    await page.getByRole('button', { name: 'Chat with Gary from Accounting' }).click();
    // A plain evaluate-based poll (not an auto-waiting Locator assertion) for the same reason
    // currentGaryPose() is one — see its comment. The fake clock isn't being advanced across
    // this click, so anything relying on requestAnimationFrame-driven polling can stall here.
    await expect
      .poll(() => page.evaluate(() => document.querySelector('[role="dialog"]') !== null))
      .toBe(true);
    // GaryCharacter isn't rendered at all while the panel is open (see GaryLauncher.tsx's
    // {!open && ...} guard) — currentGaryPose() would just see it doesn't exist. The interrupt
    // is really proven by what happens once the panel closes: pose lands on seated, not
    // whatever pose the routine was mid-way through.

    // The interrupted routine's remaining timers must actually be cancelled, not just visually
    // overridden — fast-forwarding well past when frustrated/sign would have fired must not
    // resurrect them once the panel is closed.
    await page.getByRole('button', { name: 'Close chat' }).click();
    await expect
      .poll(() => page.evaluate(() => document.querySelector('.gary-character') !== null))
      .toBe(true);
    await page.clock.fastForward(ROUTINE_TOTAL_MS);
    await page.waitForTimeout(20);
    expect(await currentGaryPose(page)).toBe('seated');
  });

  test('reduced motion shows a stable seated Gary with no jump/frustration/sign', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.install();
    await page.goto('/');
    const sequence = await samplePoseSequence(page, ROUTINE_TOTAL_MS + 400);
    // Reduced motion must never enter jump/wave/frustrated/idea/sign at all — seated the whole way.
    expect(sequence, `sequence: ${sequence.join(' -> ')}`).toEqual(['seated']);
    await expect(page.getByText('Gary from Accounting', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Chat with Gary from Accounting' })).toBeVisible();
  });

  test('idle glance loop is disabled while reduced motion is on', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.install();
    await page.goto('/');
    await page.clock.fastForward(LAUNCH_DELAY_MS + 100);
    await page.waitForTimeout(20);
    await expect(page.locator('.gary-character')).toHaveAttribute('data-gary-idle', 'false');
  });
});

test.describe('Gary character — mobile viewport usability', () => {
  const MOBILE_VIEWPORTS = [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 412, height: 915 }
  ];

  for (const viewport of MOBILE_VIEWPORTS) {
    test(`launcher stays within the viewport and the chat button opens the panel at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.clock.install();
      await mockGaryConversation(page);
      await page.goto('/');
      await page.clock.fastForward(LAUNCH_DELAY_MS + 200);

      const launcherRoot = page.locator('.fixed').last();
      const box = await launcherRoot.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(viewport.width + 1);

      await page.getByRole('button', { name: 'Chat with Gary from Accounting' }).click();
      await expect(page.getByRole('dialog', { name: 'Chat with Gary from Accounting' })).toBeVisible();
    });
  }

  test('the sign text stays legible (not shrunk illegibly small) at the narrowest required viewport', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.clock.install();
    await page.goto('/');
    let sawSign = false;
    let remaining = ROUTINE_START.sign + 500;
    while (remaining > 0 && !sawSign) {
      const step = Math.min(150, remaining);
      await page.clock.fastForward(step);
      await page.waitForTimeout(10);
      if ((await currentGaryPose(page)) === 'sign') sawSign = true;
      remaining -= step;
    }
    expect(sawSign, 'never observed the sign pose').toBe(true);
    expect(await isSignTextVisible(page)).toBe(true);
    const signText = page.locator('.gary-sign-text');
    const fontSize = await signText.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(10);
    const box = await signText.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(361);
  });
});

// The hero's own "See How Easy AI Works" ghost button — the CTA the launcher was measured
// overlapping on the shortest required viewport before the compact-mode fix.
const HOMEPAGE_CTA_TEXT = 'See How Easy AI Works';

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
      await page.goto('/');
      await page.clock.fastForward(LAUNCH_DELAY_MS + 200);
      await page.waitForTimeout(20);

      const cta = page.getByRole('link', { name: HOMEPAGE_CTA_TEXT });
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
      await page.goto('/');
      await page.clock.fastForward(LAUNCH_DELAY_MS + 200);
      await page.waitForTimeout(20);

      const cta = page.getByRole('link', { name: HOMEPAGE_CTA_TEXT });
      await cta.scrollIntoViewIfNeeded();
      // elementFromPoint at the CTA's own center must resolve to the CTA itself, not the
      // launcher (or anything else) sitting on top of it — the strict version of "clickable".
      const ctaBox = await cta.boundingBox();
      const resolvesToCta = await page.evaluate(
        ([x, y]) => {
          const el = document.elementFromPoint(x, y);
          const link = Array.from(document.querySelectorAll('a')).find((a) => a.textContent?.includes('See How Easy AI Works'));
          return el === link || (link ? link.contains(el) : false);
        },
        [ctaBox!.x + ctaBox!.width / 2, ctaBox!.y + ctaBox!.height / 2]
      );
      expect(resolvesToCta).toBe(true);

      // And an actual click works end-to-end — it's an in-page anchor link to #how-easy-ai-works.
      await cta.click();
      await expect(page).toHaveURL(/#how-easy-ai-works$/);
    });

    test(`decorative Gary elements do not intercept pointer events at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.clock.install();
      await page.goto('/');
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
    await page.goto('/');
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
    await page.goto('/');
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

test.describe('Gary launcher — hero video overlap', () => {
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
    test(`the hero video is not covered by the Gary launcher or nav at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.clock.install();
      await page.goto('/');
      await page.clock.fastForward(LAUNCH_DELAY_MS + 200);
      await page.waitForTimeout(20);

      const video = page.locator('video').first();
      const videoBox = await video.boundingBox();
      const launcherBox = await page.locator('.gary-launcher').boundingBox();
      const navBox = await page.locator('header').first().boundingBox();
      expect(videoBox, 'hero video not found').not.toBeNull();
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

    test(`the hero video stays large enough to be useful (not a thumbnail) and keeps a true 16:9 frame at ${viewport.width}x${viewport.height}`, async ({
      page
    }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      const video = page.locator('video').first();
      await expect(video).toBeVisible();
      const box = await video.boundingBox();
      expect(box!.width, `video was only ${box!.width}px wide`).toBeGreaterThanOrEqual(viewport.minUsefulWidth);
      // The design intentionally shows the full 16:9 source (previously a 4:3 wrapper cropped it).
      expect(Math.abs(box!.width / box!.height - 16 / 9)).toBeLessThan(0.05);
    });

    test(`no horizontal overflow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(viewport.width + 1);
    });
  }

  test('the hero video is not cropped: object-fit never crops a matching-aspect frame, and the rendered video fills its 16:9 wrapper with no letterboxing', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const video = page.locator('video').first();
    await expect(video).toBeVisible();
    await video.evaluate(
      (el: HTMLVideoElement) =>
        new Promise<void>((resolve) => {
          if (el.readyState >= 1) resolve();
          else el.addEventListener('loadedmetadata', () => resolve(), { once: true });
        })
    );

    // The source file itself is a genuine 1920x1080 (16:9) recording — confirms the "full frame
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
        // With matching aspect ratios and object-fit:contain, the rendered video box should fill
        // its wrapper almost exactly — any meaningfully smaller box here would mean letterboxing,
        // which signals an aspect-ratio mismatch (i.e. the wrapper silently drifted off 16:9).
        renderedFillsWrapper: videoBox.width >= wrapperBox.width * 0.98 && videoBox.height >= wrapperBox.height * 0.98
      };
    });

    // object-contain never crops, regardless of aspect match — this is the structural guarantee
    // that the source frame is always fully visible, unlike the old object-cover.
    expect(info.objectFit).toBe('contain');
    expect(Math.abs(info.wrapperAspect - 16 / 9)).toBeLessThan(0.05);
    expect(info.renderedFillsWrapper, `wrapper/video mismatch would show as letterboxing: ${JSON.stringify(info)}`).toBe(true);
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
      await page.goto('/');
      await page.clock.fastForward(LAUNCH_DELAY_MS + 200);
      await page.waitForTimeout(20);

      const launcherBox = await page.locator('.gary-launcher').boundingBox();
      const heroSection = page.locator('section.bg-navy-900.overflow-hidden').first();
      const greenCta = heroSection.getByRole('link', { name: 'Start Your Free Business Assessment' });
      const ghostCta = heroSection.getByRole('link', { name: HOMEPAGE_CTA_TEXT });
      await greenCta.scrollIntoViewIfNeeded();
      const greenBox = await greenCta.boundingBox();
      const ghostBox = await ghostCta.boundingBox();

      expect(boxOverlapArea(greenBox, launcherBox), `green CTA vs launcher: ${JSON.stringify({ greenBox, launcherBox })}`).toBe(0);
      expect(boxOverlapArea(ghostBox, launcherBox), `ghost CTA vs launcher: ${JSON.stringify({ ghostBox, launcherBox })}`).toBe(0);
    });

    test(`the hero does not leave a large unexplained empty gap below the video at ${viewport.width}x${viewport.height}`, async ({
      page
    }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      const gap = await page.evaluate(() => {
        const video = document.querySelector('video');
        const heroSection = document.querySelector('section.bg-navy-900.overflow-hidden');
        if (!video || !heroSection) return null;
        return heroSection.getBoundingClientRect().bottom - video.getBoundingClientRect().bottom;
      });
      expect(gap, 'hero section or video not found').not.toBeNull();
      // The only mobile-only adjustment that can leave dead space is the small upward transform
      // at the narrowest breakpoint — bounded well below anything that would read as unintentional.
      expect(gap!).toBeLessThan(60);
    });
  }
});

// Advances the fake clock in small steps (matching the routine's own established pattern — a
// single large fastForward isn't precise enough to reliably land inside a specific pose's hold
// window) until the given pose is observed, or throws if it never appears within `budgetMs`.
async function advanceToPose(page: Page, pose: string, budgetMs: number): Promise<void> {
  let remaining = budgetMs;
  while (remaining > 0) {
    const step = Math.min(150, remaining);
    await page.clock.fastForward(step);
    await page.waitForTimeout(10);
    if ((await currentGaryPose(page)) === pose) return;
    remaining -= step;
  }
  throw new Error(`never observed pose "${pose}" within ${budgetMs}ms`);
}

test.describe('Gary launcher — chat button color/ring and mobile sign/bubble composition', () => {
  test('chat button uses the exact same green as the "Start Your Free Business Assessment" CTA', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    await page.clock.fastForward(LAUNCH_DELAY_MS + 200);

    const buttonBg = await page.evaluate(() => getComputedStyle(document.querySelector('.gary-chat-button')!).backgroundColor);
    const ctaBg = await page.evaluate(() => {
      const cta = Array.from(document.querySelectorAll('a')).find((a) => a.textContent?.includes('Start Your Free Business Assessment'));
      return cta ? getComputedStyle(cta).backgroundColor : null;
    });
    expect(ctaBg, 'assessment CTA not found').not.toBeNull();
    expect(buttonBg, `button: ${buttonBg}, CTA: ${ctaBg}`).toBe(ctaBg);
    // Pin to the actual Tailwind green-600 value so a future change to either side that keeps
    // them merely equal-to-each-other (but drifts off-brand) still fails loudly.
    expect(buttonBg).toBe('rgb(22, 163, 74)');
  });

  test('chat button remains clickable', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
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
    await page.goto('/');
    await page.clock.fastForward(LAUNCH_DELAY_MS + 200);

    const before = await page.evaluate(() => {
      const cs = getComputedStyle(document.querySelector('.gary-chat-button')!, '::before');
      return { animationName: cs.animationName, hasGradient: cs.backgroundImage.includes('conic-gradient') };
    });
    expect(before.animationName).toBe('none');
    // Static, not stripped — the requirement is "becomes static", not "disappears".
    expect(before.hasGradient).toBe(true);
  });

  const COMPACT_VIEWPORTS = [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 412, height: 915 }
  ];

  for (const viewport of COMPACT_VIEWPORTS) {
    test(`chat button stays to Gary's right in compact mobile mode at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.clock.install();
      await page.goto('/');
      await page.clock.fastForward(LAUNCH_DELAY_MS + 200);

      const buttonBox = await page.locator('.gary-chat-button').boundingBox();
      const characterBox = await page.locator('.gary-character-wrap').boundingBox();
      expect(
        buttonBox!.x,
        `button: ${JSON.stringify(buttonBox)}, character: ${JSON.stringify(characterBox)}`
      ).toBeGreaterThanOrEqual(characterBox!.x + characterBox!.width);
    });

    test(`mobile speech bubble no longer sits parallel with the chat button — it's above Gary, not beside the button, at ${viewport.width}x${viewport.height}`, async ({
      page
    }) => {
      await page.setViewportSize(viewport);
      await page.clock.install();
      await page.goto('/');
      await page.clock.fastForward(LAUNCH_DELAY_MS + 200);

      const bubbleBox = await page.locator('.gary-speech-bubble').boundingBox();
      const buttonBox = await page.locator('.gary-chat-button').boundingBox();
      const characterBox = await page.locator('.gary-character-wrap').boundingBox();

      // Taken out of the button's flex row entirely (see globals.css) — no longer a sibling
      // label sharing the button's own row, which is what made it read as "the button's caption"
      // regardless of how far it was nudged within that row.
      const position = await page.locator('.gary-speech-bubble').evaluate((el) => getComputedStyle(el).position);
      expect(position).toBe('absolute');

      // Vertically above the button (not beside it at the same height) — the literal opposite
      // of "parallel with the chat button".
      expect(
        bubbleBox!.y + bubbleBox!.height,
        `bubble: ${JSON.stringify(bubbleBox)}, button: ${JSON.stringify(buttonBox)}`
      ).toBeLessThanOrEqual(buttonBox!.y + 1);

      // Spatially associated with Gary: close above his head, not floating in open space —
      // bounded gap, not "anywhere above the row".
      const gapAboveCharacter = characterBox!.y - (bubbleBox!.y + bubbleBox!.height);
      expect(gapAboveCharacter, `bubble: ${JSON.stringify(bubbleBox)}, character: ${JSON.stringify(characterBox)}`).toBeGreaterThanOrEqual(0);
      expect(gapAboveCharacter).toBeLessThan(80);

      // Substantially left of the button's own center — the core complaint being fixed.
      const bubbleCenterX = bubbleBox!.x + bubbleBox!.width / 2;
      const buttonCenterX = buttonBox!.x + buttonBox!.width / 2;
      expect(buttonCenterX - bubbleCenterX).toBeGreaterThan(60);
    });

    test(`mobile speech bubble stays inside the viewport, off Gary's face, and left of his head/face center at ${viewport.width}x${viewport.height}`, async ({
      page
    }) => {
      await page.setViewportSize(viewport);
      await page.clock.install();
      await page.goto('/');
      await page.clock.fastForward(LAUNCH_DELAY_MS + 200);

      const bubbleBox = await page.locator('.gary-speech-bubble').boundingBox();
      const faceBox = await page.locator('.gary-glasses').boundingBox();
      expect(bubbleBox!.x).toBeGreaterThanOrEqual(-1);
      expect(bubbleBox!.x + bubbleBox!.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(
        boxOverlapArea(bubbleBox, faceBox),
        `bubble: ${JSON.stringify(bubbleBox)}, face: ${JSON.stringify(faceBox)}`
      ).toBe(0);

      const bubbleCenterX = bubbleBox!.x + bubbleBox!.width / 2;
      const faceCenterX = faceBox!.x + faceBox!.width / 2;
      expect(
        bubbleCenterX,
        `bubble center ${bubbleCenterX} should be left of face center ${faceCenterX}`
      ).toBeLessThan(faceCenterX);
    });

    test(`mobile sign stays inside the viewport and off the video, both CTAs, and Gary's face at ${viewport.width}x${viewport.height}`, async ({
      page
    }) => {
      await page.setViewportSize(viewport);
      await page.clock.install();
      await page.goto('/');
      await advanceToPose(page, 'sign', ROUTINE_START.sign + 500);

      const signBox = await page.locator('.gary-sign-board').boundingBox();
      const videoBox = await page.locator('video').first().boundingBox();
      const heroSection = page.locator('section.bg-navy-900.overflow-hidden').first();
      const greenCtaBox = await heroSection.getByRole('link', { name: 'Start Your Free Business Assessment' }).boundingBox();
      const ghostCtaBox = await heroSection.getByRole('link', { name: HOMEPAGE_CTA_TEXT }).boundingBox();
      const buttonBox = await page.locator('.gary-chat-button').boundingBox();
      const faceBox = await page.locator('.gary-glasses').boundingBox();

      expect(signBox!.x).toBeGreaterThanOrEqual(-1);
      expect(signBox!.x + signBox!.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(boxOverlapArea(signBox, videoBox), `sign vs video: ${JSON.stringify({ signBox, videoBox })}`).toBe(0);
      expect(boxOverlapArea(signBox, greenCtaBox), `sign vs green CTA`).toBe(0);
      expect(boxOverlapArea(signBox, ghostCtaBox), `sign vs ghost CTA`).toBe(0);
      expect(boxOverlapArea(signBox, buttonBox), `sign vs button: ${JSON.stringify({ signBox, buttonBox })}`).toBe(0);
      expect(boxOverlapArea(signBox, faceBox), `sign vs face: ${JSON.stringify({ signBox, faceBox })}`).toBe(0);
    });

    test(`the sign still reads exactly "The button. Up there." at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.clock.install();
      await page.goto('/');
      await advanceToPose(page, 'sign', ROUTINE_START.sign + 500);

      const text = await page.locator('.gary-sign-copy').textContent();
      expect(text?.replace(/\s+/g, ' ').trim()).toBe('The button. Up there.');
    });

    test(`the initial pointing gesture (signPoint) angles up-and-right toward the chat button, not straight up, at ${viewport.width}x${viewport.height}`, async ({
      page
    }) => {
      await page.setViewportSize(viewport);
      await page.clock.install();
      await page.goto('/');
      await advanceToPose(page, 'signPoint', ROUTINE_START_SIGN_POINT + 500);
      // The arm rotates via a real CSS transition (transform 0.3s ease) — advanceToPose stops the
      // instant data-gary-pose flips to signPoint, which can be mid-transition from signPoint's
      // predecessor angle. A short real-time wait (unaffected by the fake clock, which only
      // virtualizes the page's own JS timers, not the compositor) lets it settle before reading.
      await page.waitForTimeout(400);

      const transform = await page.locator('.gary-arm-right').evaluate((el) => getComputedStyle(el).transform);
      // matrix(a, b, c, d, tx, ty) — the rotation angle is atan2(b, a). The desktop/base angle is
      // -165deg (near-straight-up); compact mode overrides it to -100deg (up-and-right). Assert
      // it's in the up-and-right band, not the near-vertical one, without hardcoding the exact
      // matrix string (which drifts with float rounding).
      const angleDeg = await page.evaluate((t) => {
        const m = t.match(/matrix\(([^)]+)\)/);
        if (!m) return null;
        const [a, b] = m[1].split(',').map(Number);
        return (Math.atan2(b, a) * 180) / Math.PI;
      }, transform);
      expect(angleDeg, `arm-right transform: ${transform}`).not.toBeNull();
      // -165deg normalizes to 195deg; -100deg stays -100deg — assert it's closer to -100 than -165.
      const distanceFromCompact = Math.abs(((angleDeg! - -100 + 540) % 360) - 180);
      const distanceFromDesktop = Math.abs(((angleDeg! - -165 + 540) % 360) - 180);
      expect(
        distanceFromCompact,
        `angle ${angleDeg}deg should be closer to the compact -100deg than the desktop -165deg`
      ).toBeLessThan(distanceFromDesktop);
    });

    test(`the sign is still solidly visible when signWave arrives, and Gary waves without the sign jumping or leaving the viewport, at ${viewport.width}x${viewport.height}`, async ({
      page
    }) => {
      await page.setViewportSize(viewport);
      await page.clock.install();
      await page.goto('/');

      // The exact >=5000ms hold duration is asserted directly against the routine's real source
      // values in lib/gary/routineSteps.test.ts (a unit test, not e2e) — a fake-clock e2e test
      // that tries to *measure* a ~6s continuous duration by chaining ~190 small
      // page.clock.fastForward() calls turns out to drift significantly (confirmed empirically:
      // measured holds came back ~25% short of the real values), so it's not a reliable way to
      // verify a duration here. advanceToPose() is drift-tolerant by contrast: it stops as soon
      // as it observes the target pose, so a few dozen short-lived steps can't accumulate the
      // same error. What's checked here at each of the three sub-poses is presence and ordering —
      // sign, then signPoint, then signWave all solidly visible in sequence — which is exactly
      // what the routine's structure (a single sign board rendered continuously across all three
      // poses, per GaryLauncher.tsx) guarantees once each pose is confirmed reached in turn.
      await advanceToPose(page, 'sign', ROUTINE_START.sign + 500);
      expect(await currentGaryPose(page)).toBe('sign');
      let solid = await page.evaluate(() => {
        const board = document.querySelector('.gary-sign-board');
        return !!board && board.getAttribute('aria-hidden') !== 'true';
      });
      expect(solid, 'sign board should be solidly visible at sign').toBe(true);

      await advanceToPose(page, 'signPoint', 1500 + 500);
      solid = await page.evaluate(() => {
        const board = document.querySelector('.gary-sign-board');
        return !!board && board.getAttribute('aria-hidden') !== 'true';
      });
      expect(solid, 'sign board should be solidly visible at signPoint').toBe(true);

      await advanceToPose(page, 'signWave', 1500 + 500);
      solid = await page.evaluate(() => {
        const board = document.querySelector('.gary-sign-board');
        return !!board && board.getAttribute('aria-hidden') !== 'true';
      });
      expect(solid, 'sign board should be solidly visible at signWave').toBe(true);

      // The right arm is genuinely animating (the wave) during signWave.
      const t1 = await page.locator('.gary-arm-right').evaluate((el) => getComputedStyle(el).transform);
      const signBoxT1 = await page.locator('.gary-sign-board').boundingBox();
      await page.clock.fastForward(500);
      await page.waitForTimeout(20);
      // Still in signWave (500ms in, well inside its 3000ms hold) — if it already moved on, the
      // arm-changed/sign-stable assertions below wouldn't mean what they claim to.
      expect(await currentGaryPose(page)).toBe('signWave');
      const t2 = await page.locator('.gary-arm-right').evaluate((el) => getComputedStyle(el).transform);
      const signBoxT2 = await page.locator('.gary-sign-board').boundingBox();

      expect(t1, 'arm should visibly animate (wave) while the sign is up').not.toBe(t2);
      // The sign itself must not move/jump during the wave — it's a physically independent
      // element, not attached to the waving arm's transform.
      expect(signBoxT2).toEqual(signBoxT1);
      expect(signBoxT2!.x).toBeGreaterThanOrEqual(-1);
      expect(signBoxT2!.x + signBoxT2!.width).toBeLessThanOrEqual(viewport.width + 1);

      const text = await page.locator('.gary-sign-copy').textContent();
      expect(text?.replace(/\s+/g, ' ').trim()).toBe('The button. Up there.');
    });
  }

  test('reduced motion never enters signWave — no forced long wave for reduced-motion users', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.install();
    await page.goto('/');
    const sequence = await samplePoseSequence(page, ROUTINE_TOTAL_MS + 400);
    expect(sequence, `sequence: ${sequence.join(' -> ')}`).toEqual(['seated']);
  });
});

test.describe('Homepage responsive images', () => {
  const REQUIRED_VIEWPORTS = [
    { width: 360, height: 800, label: '360x800' },
    { width: 390, height: 844, label: '390x844' },
    { width: 412, height: 915, label: '412x915' },
    { width: 768, height: 1024, label: '768x1024 (tablet portrait)' },
    { width: 1024, height: 768, label: '1024x768 (tablet landscape)' },
    { width: 1280, height: 720, label: '1280x720 (desktop)' },
    { width: 1440, height: 900, label: '1440x900 (wide desktop)' }
  ];

  const IMAGE_ALT_TEXTS = [
    'HVAC professional using AI-assisted scheduling, documents, email, and task management.',
    'Electrician using a smartphone while AI organizes scheduling, follow-up, and business tasks.',
    'Construction business owner reviewing an illustrative AI productivity dashboard on a job site.'
  ];

  for (const viewport of REQUIRED_VIEWPORTS) {
    test(`no horizontal overflow and every image renders above its floor size at ${viewport.label}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth, `horizontal overflow at ${viewport.label}`).toBeLessThanOrEqual(viewport.width + 1);

      for (const alt of IMAGE_ALT_TEXTS) {
        const image = page.getByAltText(alt);
        await image.scrollIntoViewIfNeeded();
        const box = await image.boundingBox();
        expect(box, `${alt} has no box at ${viewport.label}`).not.toBeNull();
        // Every image (landscape or portrait) must clear the smallest configured floor —
        // proves it never collapses to a "tiny thumbnail," the original reported bug.
        expect(box!.width, `${alt} width at ${viewport.label}`).toBeGreaterThanOrEqual(199);
        expect(box!.x + box!.width, `${alt} right edge at ${viewport.label}`).toBeLessThanOrEqual(viewport.width + 1);
      }
    });
  }

  test('the landscape and portrait images preserve their true aspect ratio (no stretching)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    const hvac = page.getByAltText(IMAGE_ALT_TEXTS[0]);
    await hvac.scrollIntoViewIfNeeded();
    const hvacBox = await hvac.boundingBox();
    // Intrinsic 2048x1143 ≈ 1.792:1.
    expect(hvacBox!.width / hvacBox!.height).toBeCloseTo(2048 / 1143, 1);

    const electrician = page.getByAltText(IMAGE_ALT_TEXTS[1]);
    await electrician.scrollIntoViewIfNeeded();
    const electricianBox = await electrician.boundingBox();
    // Intrinsic 941x1672 ≈ 0.563:1.
    expect(electricianBox!.width / electricianBox!.height).toBeCloseTo(941 / 1672, 1);
  });

  test('landscape images use a meaningfully larger width than the old fixed 25% sizing (not a tiny thumbnail) on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const hvac = page.getByAltText(IMAGE_ALT_TEXTS[0]);
    await hvac.scrollIntoViewIfNeeded();
    const box = await hvac.boundingBox();
    // The old `w-1/4` sizing rendered this around ~90px at this viewport; the fix must clear
    // that by a wide margin.
    expect(box!.width).toBeGreaterThan(150);
  });
});
