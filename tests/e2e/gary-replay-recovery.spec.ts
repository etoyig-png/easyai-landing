import { test, expect } from '@playwright/test';
import { gotoGaryReady } from './garyReady';

const DIALOG = 'Chat with Gary from Accounting';
const opening = { sessionId: 'fixture-session', sessionCapability: 'fixture-cap', reply: { text: 'Fixture opening.' } };

test('lost first opening preserves its UUID and exact envelope through navigation and explicit retries', async ({ page }) => {
  const requests: string[] = [];
  await page.route('**/api/gary/message', async route => {
    requests.push(route.request().postData()!);
    await route.fulfill({ status: requests.length < 3 ? (requests.length === 1 ? 409 : 503) : 200,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '3' },
      body: JSON.stringify(requests.length < 3 ? { outcome: requests.length === 1 ? 'pending' : 'unavailable' } : opening) });
  });
  await gotoGaryReady(page);
  await page.getByRole('button', { name: DIALOG, exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('alert')).toContainText('original request is still pending');
  const first = JSON.parse(requests[0]);
  expect(first.requestId).toMatch(/^[0-9a-f-]{36}$/);
  expect(first).not.toHaveProperty('sessionId');
  expect(first).not.toHaveProperty('sessionCapability');
  expect(first).not.toHaveProperty('message');
  await gotoGaryReady(page, '/about');
  // Simulate unrelated identity updates: retry must use the original envelope anyway.
  await page.evaluate(() => {
    sessionStorage.setItem('gary-session-capability', 'unrelated-cap');
    localStorage.setItem('gary-anonymous-id', 'unrelated-anonymous');
  });
  await page.getByRole('button', { name: DIALOG, exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Retry request' })).toBeVisible();
  expect(requests).toHaveLength(1);
  await dialog.getByRole('button', { name: 'Retry request' }).click();
  await expect(dialog.getByRole('alert')).toContainText('could not access');
  await dialog.getByRole('button', { name: 'Retry request' }).click();
  await expect(dialog.getByText('Fixture opening.')).toHaveCount(1);
  expect(requests).toHaveLength(3);
  expect(new Set(requests).size).toBe(1);
});

test('ordinary retry has a new per-turn UUID and one logical message across refresh', async ({ page }) => {
  const requests: string[] = [];
  await page.route('**/api/gary/message', async route => {
    const body = route.request().postData()!; requests.push(body);
    await route.fulfill({ status: requests.length === 2 ? 503 : 200, contentType: 'application/json',
      body: JSON.stringify(requests.length === 2 ? { outcome: 'pending' } : requests.length === 1 ? opening : { ...opening, reply: { text: 'Recovered answer.' } }) });
  });
  await gotoGaryReady(page);
  await page.getByRole('button', { name: DIALOG, exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Fixture opening.')).toBeVisible();
  await dialog.getByRole('textbox').fill('Help my bakery');
  await dialog.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('original request is still pending');
  expect(JSON.parse(requests[0]).requestId).not.toBe(JSON.parse(requests[1]).requestId);
  expect(JSON.parse(requests[1])).toMatchObject({ sessionId: 'fixture-session', sessionCapability: 'fixture-cap', message: 'Help my bakery' });
  await page.reload();
  await expect.poll(() => page.evaluate(() => document.documentElement.getAttribute('data-gary-ready'))).toBe('true');
  await page.getByRole('button', { name: DIALOG, exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Retry request' })).toBeVisible();
  expect(requests).toHaveLength(2);
  await dialog.getByRole('button', { name: 'Retry request' }).click();
  await expect(dialog.getByText('Recovered answer.')).toHaveCount(1);
  await expect(dialog.getByText('Help my bakery', { exact: true })).toHaveCount(1);
  expect(requests).toHaveLength(3);
  expect(requests[2]).toBe(requests[1]);
});

for (const [status, outcome] of [[409, 'conflict'], [409, 'indeterminate'], [410, 'expired'], [403, 'denied'], [409, 'conversation-limit']] as const) {
  test(`${status} ${outcome} preserves a blocked reference across refresh without redrive`, async ({ page }) => {
    let calls = 0;
    await page.route('**/api/gary/message', async route => {
      calls++;
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(outcome === 'conversation-limit' ? { error: 'This conversation has reached its limit. Please start a new chat.' } : { outcome }) });
    });
    await gotoGaryReady(page);
    await page.getByRole('button', { name: DIALOG, exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('alert')).toContainText('cannot be retried safely');
    await expect(dialog.getByRole('button', { name: 'Retry request' })).toHaveCount(0);
    await page.reload();
    await expect.poll(() => page.evaluate(() => document.documentElement.getAttribute('data-gary-ready'))).toBe('true');
    await page.getByRole('button', { name: DIALOG, exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('cannot be retried safely');
    await expect(dialog.getByRole('button', { name: 'Retry request' })).toHaveCount(0);
    expect(calls).toBe(1);
    expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('gary-conversation-v1')!).snapshot.pending.requestEnvelope.requestId)).toMatch(/^[0-9a-f-]{36}$/);
  });
}

test('legacy dispatched snapshot stays explicitly unprotected and never gains a UUID on retry', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('gary-conversation-v1', JSON.stringify({ savedAt: Date.now(), sessionId: null,
    snapshot: { messages: [], options: [], input: '', offerAssessment: false, choosingChange: false,
      contactPlaceholder: null, contactDraft: null, pending: { message: 'Legacy question' }, hasContactFlow: false } })));
  const requests: Record<string, unknown>[] = [];
  await page.route('**/api/gary/message', async route => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(opening) });
  });
  await gotoGaryReady(page);
  await page.getByRole('button', { name: DIALOG, exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('alert')).toContainText('no replay protection');
  expect(requests).toHaveLength(0);
  await dialog.getByRole('button', { name: 'Retry request' }).click();
  await expect(dialog.getByText('Fixture opening.')).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0]).not.toHaveProperty('requestId');
});

for (const status of [200, 409, 503]) {
  test(`invalid JSON ${status} preserves unknown outcome and the intended request`, async ({ page }) => {
    const requests: string[] = [];
    await page.route('**/api/gary/message', async route => {
      requests.push(route.request().postData()!);
      await route.fulfill({ status: requests.length === 1 ? status : 200, contentType: 'application/json',
        body: requests.length === 1 ? '{invalid' : JSON.stringify(opening) });
    });
    await gotoGaryReady(page);
    await page.getByRole('button', { name: DIALOG, exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('alert')).toContainText(status === 409 ? 'cannot be retried safely' : 'outcome is unknown');
    expect(await page.evaluate(() => sessionStorage.getItem('gary-session-id'))).toBeNull();
    expect(requests).toHaveLength(1);
    if (status === 409) {
      await expect(dialog.getByRole('button', { name: 'Retry request' })).toHaveCount(0);
    } else {
      await expect(dialog.getByRole('alert')).toContainText('delivery is not confirmed');
      await dialog.getByRole('button', { name: 'Retry request' }).click();
      await expect(dialog.getByText('Fixture opening.')).toBeVisible();
      expect(requests).toHaveLength(2);
      expect(requests[1]).toBe(requests[0]);
    }
  });
}

test('unmounted error-body completion cannot overwrite replacement request recovery', async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.fetch.bind(window);
    let first = true;
    window.fetch = async (input, init) => {
      const response = await original(input, init);
      if (!String(input).endsWith('/api/gary/message') || !first) return response;
      first = false;
      const read = response.json.bind(response);
      response.json = async () => {
        const body = await read();
        await new Promise<void>(resolve => Object.assign(window, { releaseErrorBody: resolve, errorBodyWaiting: true }));
        return body;
      };
      return response;
    };
  });
  let calls = 0;
  await page.route('**/api/gary/message', async route => {
    calls++;
    await route.fulfill({ status: calls === 1 ? 409 : 200, contentType: 'application/json',
      body: JSON.stringify(calls === 1 ? { outcome: 'conflict' } : { ...opening, sessionId: 'replacement-session' }) });
  });
  await gotoGaryReady(page);
  await page.getByRole('button', { name: DIALOG, exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { errorBodyWaiting: boolean }).errorBodyWaiting)).toBe(true);
  await page.getByRole('button', { name: 'Close chat' }).click();
  await page.getByRole('button', { name: DIALOG, exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start Over', exact: true }).click();
  await expect(page.getByRole('dialog').getByText('Fixture opening.')).toBeVisible();
  const saved = await page.evaluate(() => sessionStorage.getItem('gary-conversation-v1'));
  await page.evaluate(() => (window as unknown as { releaseErrorBody: () => void }).releaseErrorBody());
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  expect(await page.evaluate(() => sessionStorage.getItem('gary-session-id'))).toBe('replacement-session');
  expect(await page.evaluate(() => sessionStorage.getItem('gary-conversation-v1'))).toBe(saved);
  await expect(page.getByRole('dialog').getByRole('alert')).toHaveCount(0);
  expect(calls).toBe(2);
});

test('a protected envelope saved before the optimization is replayed byte-for-byte on upgrade', async ({ page }) => {
  // Preserve 7c242dd's property order, rather than constructing an envelope with the new code.
  const original = { sessionId: 'old-session', sessionCapability: 'old-capability', anonymousId: 'old-anonymous',
    currentPage: '/', referrer: 'https://example.test/original', message: 'Original question',
    optionSelected: 'Original question', requestId: '66666666-6666-4666-8666-666666666666' };
  await page.addInitScript(({ original }) => {
    sessionStorage.setItem('gary-session-id', 'old-session');
    sessionStorage.setItem('gary-session-capability', 'unrelated-new-capability');
    localStorage.setItem('gary-anonymous-id', 'unrelated-new-anonymous');
    sessionStorage.setItem('gary-conversation-v1', JSON.stringify({ savedAt: Date.now(), sessionId: 'old-session',
      snapshot: { messages: [{ id: 'old-visitor', role: 'visitor', text: 'Original question' }], options: [], input: '',
        offerAssessment: false, choosingChange: false, contactPlaceholder: null, contactDraft: null, hasContactFlow: false,
        pending: { message: original.message, optionSelected: original.optionSelected, requestEnvelope: original } } }));
  }, { original });
  const requests: string[] = [];
  await page.route('**/api/gary/message', async route => {
    requests.push(route.request().postData()!);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...opening,
      sessionId: 'old-session', reply: { text: 'Upgraded replay recovered.' } }) });
  });
  await gotoGaryReady(page, '/about');
  await page.getByRole('button', { name: DIALOG, exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Retry request' })).toBeVisible();
  expect(requests).toHaveLength(0);
  await dialog.getByRole('button', { name: 'Retry request' }).click();
  await expect(dialog.getByText('Upgraded replay recovered.')).toBeVisible();
  expect(requests).toEqual([JSON.stringify(original)]);
  await expect(dialog.getByText('Original question', { exact: true })).toHaveCount(1);
});
