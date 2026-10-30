import { test, expect } from '@playwright/test';
import { ASSESSMENT_RECEIPT_KEY } from '../../lib/assessmentReceipt';
for (const [status, heading] of [
  ['pending', 'Your assessment is being processed'],
  ['completed', 'Your Action Plan was accepted for email delivery'],
  ['failed', 'We could not send your Action Plan'],
] as const) {
  test(`assessment completion shows ${status} without assuming mailbox delivery`, async ({ page }) => {
    await page.addInitScript(({ key }) => sessionStorage.setItem(key, JSON.stringify({ id: 'fixture', capability: 'synthetic-capability', storedAt: Date.now() })), { key: ASSESSMENT_RECEIPT_KEY });
    let requests = 0;
    await page.route('**/api/assessment/status?*', async (route) => {
      expect(route.request().headers().authorization).toBe('Bearer synthetic-capability');
      requests++;
      await route.fulfill({ json: { status } });
    });
    await page.goto('/assessment/complete');
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    expect(requests).toBe(1);
    if (status === 'failed') await expect(page.getByRole('link', { name: 'info@easyaiconsult.com', exact: true })).toBeVisible();
    if (status === 'completed') await expect(page.getByText('this does not confirm arrival.', { exact: false })).toBeVisible();
  });
}
test('no receipt cannot expose someone else’s status or promise email success', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/assessment/status?*', async (route) => { requests++; await route.fulfill({ json: { status: 'completed' } }); });
  await page.goto('/assessment/complete');
  await expect(page.getByRole('heading', { name: 'Your assessment submission', exact: true })).toBeVisible();
  await expect(page.getByText('Delivery cannot be confirmed in this browser.', { exact: false })).toBeVisible();
  expect(requests).toBe(0);
  await expect(page.getByRole('button', { name: 'Check status again', exact: true })).toHaveCount(0);
});


test('a transient status failure can be checked again without resubmitting or sending', async ({ page }) => {
  await page.addInitScript(({ key }) => sessionStorage.setItem(key, JSON.stringify({ id: 'fixture', capability: 'synthetic-capability', storedAt: Date.now() })), { key: ASSESSMENT_RECEIPT_KEY });
  let reads = 0;
  const writes: string[] = [];
  page.on('request', request => { if (request.url().includes('/api/') && request.method() !== 'GET') writes.push(request.method()); });
  await page.route('**/api/assessment/status?*', async route => {
    expect(route.request().headers().authorization).toBe('Bearer synthetic-capability');
    reads++;
    await route.fulfill(reads === 1 ? { status: 503, json: { error: 'temporary' } } : { json: { status: 'completed' } });
  });
  await page.goto('/assessment/complete');
  await expect(page.getByRole('heading', { name: 'Your assessment submission', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Check status again', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your Action Plan was accepted for email delivery', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Check status again', exact: true })).toHaveCount(0);
  expect(reads).toBe(2);
  expect(writes).toEqual([]);
});
