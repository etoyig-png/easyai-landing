import { test, expect } from '@playwright/test';
import { ASSESSMENT_RECEIPT_KEY } from '../../lib/assessmentReceipt';
const plan = 'Standalone result for Status Fixture.\n\nKeep the complete first recommendation.\n\nKeep the complete final recommendation.';
function savedStatus(status: string) {
  return { status, submissionId: 'fixture', businessName: 'Status Fixture',
    result: status === 'completed' ? { availability: 'available', text: plan }
      : { availability: status === 'pending' ? 'pending' : 'unavailable', text: null } };
}
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
      await route.fulfill({ json: savedStatus(status) });
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
  await page.route('**/api/assessment/status?*', async (route) => { requests++; await route.fulfill({ json: savedStatus('completed') }); });
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
    await route.fulfill(reads === 1 ? { status: 503, json: { error: 'temporary' } } : { json: savedStatus('completed') });
  });
  await page.goto('/assessment/complete');
  await expect(page.getByRole('heading', { name: 'Your assessment submission', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Check status again', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your Action Plan was accepted for email delivery', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Check status again', exact: true })).toHaveCount(0);
  expect(reads).toBe(2);
  expect(writes).toEqual([]);
});


test('visitor reads the full saved standalone plan and keeps access after refresh without sending', async ({ page }) => {
  await page.addInitScript(({ key }) => sessionStorage.setItem(key, JSON.stringify({ id: 'fixture', capability: 'synthetic-capability', storedAt: Date.now() })), { key: ASSESSMENT_RECEIPT_KEY });
  const writes: string[] = []; let reads = 0;
  page.on('request', r => { if (r.url().includes('/api/') && r.method() !== 'GET') writes.push(r.url()); });
  await page.route('**/api/assessment/status?*', async route => {
    expect(route.request().headers().authorization).toBe('Bearer synthetic-capability'); reads++;
    await route.fulfill({ json: savedStatus('completed') });
  });
  await page.goto('/assessment/complete');
  const results = page.getByRole('region', { name: 'Your assessment results', exact: true });
  await expect(results).toBeVisible();
  await expect(results).toHaveAttribute('data-assessment-id', 'fixture');
  await expect(results.getByRole('heading')).toHaveText('Your Action Plan for Status Fixture');
  expect(await results.locator('p').textContent()).toBe(plan);
  expect(await results.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.reload(); await expect(results).toBeVisible();
  expect(await results.locator('p').textContent()).toBe(plan);
  expect(reads).toBe(2); expect(writes).toEqual([]);
  await expect(page).toHaveURL(/\/assessment\/complete$/);
});

test('saved results remain accessible when email delivery failed', async ({ page }) => {
  await page.addInitScript(({ key }) => sessionStorage.setItem(key, JSON.stringify({ id: 'fixture', capability: 'synthetic-capability', storedAt: Date.now() })), { key: ASSESSMENT_RECEIPT_KEY });
  await page.route('**/api/assessment/status?*', route => route.fulfill({ json: { ...savedStatus('completed'), status: 'failed' } }));
  await page.goto('/assessment/complete');
  await expect(page.getByRole('heading', { name: 'We could not send your Action Plan', exact: true })).toBeVisible();
  const results = page.getByRole('region', { name: 'Your assessment results' });
  await expect(results).toBeVisible(); expect(await results.locator('p').textContent()).toBe(plan);
  await expect(page.getByText('accepted your plan', { exact: false })).toHaveCount(0);
});

test('wrong submission result is not displayed and an explicit read retry can recover the owned result', async ({ page }) => {
  await page.addInitScript(({ key }) => sessionStorage.setItem(key, JSON.stringify({ id: 'fixture', capability: 'synthetic-capability', storedAt: Date.now() })), { key: ASSESSMENT_RECEIPT_KEY });
  let reads = 0;
  await page.route('**/api/assessment/status?*', route => route.fulfill({ json: ++reads === 1
    ? { ...savedStatus('completed'), submissionId: 'foreign', businessName: 'Foreign business', result: { availability: 'available', text: 'Foreign private plan' } }
    : savedStatus('completed') }));
  await page.goto('/assessment/complete');
  await expect(page.getByRole('button', { name: 'Check status again' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Your assessment results' })).toHaveCount(0);
  await expect(page.getByText('Foreign private plan', { exact: false })).toHaveCount(0);
  await page.getByRole('button', { name: 'Check status again' }).click();
  await expect(page.getByRole('region', { name: 'Your assessment results' })).toBeVisible();
  expect(reads).toBe(2);
});

test('server result text renders literally without treating markup as executable content', async ({ page }) => {
  await page.addInitScript(({ key }) => sessionStorage.setItem(key, JSON.stringify({ id: 'fixture', capability: 'synthetic-capability', storedAt: Date.now() })), { key: ASSESSMENT_RECEIPT_KEY });
  const literal = '<img src=x onerror="window.unwantedResultScript=true"> <script>unwanted()</script> & full results';
  await page.route('**/api/assessment/status?*', route => route.fulfill({ json: { ...savedStatus('completed'), result: { availability: 'available', text: literal } } }));
  await page.goto('/assessment/complete');
  const results = page.getByRole('region', { name: 'Your assessment results' });
  await expect(results).toBeVisible(); expect(await results.locator('p').textContent()).toBe(literal);
  await expect(results.locator('img,script')).toHaveCount(0);
  expect(await page.evaluate(() => 'unwantedResultScript' in window)).toBe(false);
});

for (const failure of ['denied', 'identity'] as const) {
  test(`a later ${failure} read clears an earlier saved plan instead of leaving stale results`, async ({ page }) => {
    await page.clock.install();
    await page.addInitScript(({ key }) => sessionStorage.setItem(key, JSON.stringify({ id: 'fixture', capability: 'synthetic-capability', storedAt: Date.now() })), { key: ASSESSMENT_RECEIPT_KEY });
    let reads = 0; const writes: string[] = [];
    page.on('request', r => { if (r.url().includes('/api/') && r.method() !== 'GET') writes.push(r.method()); });
    await page.route('**/api/assessment/status?*', route => {
      reads++;
      if (reads === 1) return route.fulfill({ json: { ...savedStatus('completed'), status: 'pending' } });
      return route.fulfill(failure === 'denied' ? { status: 401, json: { error: 'Unauthorized' } }
        : { json: { ...savedStatus('completed'), submissionId: 'foreign' } });
    });
    await page.goto('/assessment/complete');
    const results = page.getByRole('region', { name: 'Your assessment results' });
    await expect(results).toBeVisible();
    await page.clock.fastForward(5001);
    await expect(page.getByRole('heading', { name: 'Your assessment submission', exact: true })).toBeVisible();
    await expect(results).toHaveCount(0);
    await expect(page.getByText('Keep the complete final recommendation.', { exact: false })).toHaveCount(0);
    expect(reads).toBe(2); expect(writes).toEqual([]);
  });
}

test('long valid business identity and full result text wrap within the result card', async ({ page }) => {
  await page.addInitScript(({ key }) => sessionStorage.setItem(key, JSON.stringify({ id: 'fixture', capability: 'synthetic-capability', storedAt: Date.now() })), { key: ASSESSMENT_RECEIPT_KEY });
  await page.route('**/api/assessment/status?*', route => route.fulfill({ json: { ...savedStatus('completed'), businessName: 'B'.repeat(200), result: { availability: 'available', text: 'x'.repeat(2000) } } }));
  await page.goto('/assessment/complete');
  const results = page.getByRole('region', { name: 'Your assessment results' });
  await expect(results).toBeVisible();
  expect(await results.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
});

test('a legacy delivery-only response remains read-only and does not invent visitor results', async ({ page }) => {
  await page.addInitScript(({ key }) => sessionStorage.setItem(key, JSON.stringify({ id: 'fixture', capability: 'synthetic-capability', storedAt: Date.now() })), { key: ASSESSMENT_RECEIPT_KEY });
  let reads = 0; const writes: string[] = [];
  page.on('request', r => { if (r.url().includes('/api/') && r.method() !== 'GET') writes.push(r.method()); });
  await page.route('**/api/assessment/status?*', route => { reads++; return route.fulfill({ json: { status: 'completed' } }); });
  await page.goto('/assessment/complete');
  await expect(page.getByRole('heading', { name: 'Your Action Plan was accepted for email delivery', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Your assessment results' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Check status again', exact: true })).toBeVisible();
  expect(reads).toBe(1); expect(writes).toEqual([]);
});
