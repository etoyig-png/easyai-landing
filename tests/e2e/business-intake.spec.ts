import { expect, test, type Page } from '@playwright/test';
import { buildQuestions } from '../../lib/quizQuestions';
import { assessmentSubmissionSchema } from '../../lib/validation';
import { contactSubmissionSchema } from '../../lib/contactValidation';

// Exercise the real forms while keeping every provider/storage request mocked.
// These checks do not establish real email, database or Command Center delivery.
const business = 'Isolated Browser Fixture';

async function questionsToContact(page: Page, otherIndustry: boolean) {
  await page.goto('/assessment');
  await page.getByRole('button', { name: 'Continue →', exact: true }).click();
  await expect(page.getByText('Required', { exact: true })).toHaveCount(2);
  const hydrated = Date.now();
  // These two pre-existing inputs have visual labels without htmlFor attributes.
  await page.locator('input.input').nth(0).fill('Fixture');
  await page.locator('input.input').nth(1).fill(business);
  await page.getByRole('button', { name: 'Continue →', exact: true }).click();
  const questions = buildQuestions(business);
  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index];
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(question.title);
    await expect(page.getByText(`${index + 2} of 11`, { exact: true })).toBeVisible();
    if (index === 1) {
      await page.getByRole('button', { name: '← Back', exact: true }).click();
      const selected = page.getByRole('button', { name: questions[0].options[0], exact: true });
      await expect(selected).toHaveClass(/bg-navy-50/);
      await selected.click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(question.title);
    }
    if (otherIndustry && question.key === 'industry') {
      await page.getByRole('button', { name: 'Something else', exact: true }).click();
      const next = page.getByRole('button', { name: 'Continue →', exact: true });
      await expect(next).toBeDisabled();
      await page.getByPlaceholder('e.g. Landscaping company').fill('Fixture repair shop');
      await next.click();
    } else {
      await page.getByRole('button', { name: question.options[0], exact: true }).click();
    }
  }
  await expect(page.getByText('11 of 11', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continue →', exact: true }).click();
  await expect(page.getByText('Enter a valid email', { exact: true })).toBeVisible();
  await page.locator('input.input').first().fill('Visitor');
  await page.locator('input[type=email]').fill('fixture@example.test');
  await expect.poll(() => Date.now() - hydrated).toBeGreaterThanOrEqual(3500);
}

test('assessment preserves nine answers/back, explicit no-website, consent and honest retry', async ({ page }) => {
  const requests: Record<string, unknown>[] = [];
  await page.route('**/api/assessment', async route => {
    const body = route.request().postDataJSON();
    expect(assessmentSubmissionSchema.safeParse(body).success).toBe(true);
    requests.push(body);
    await route.fulfill({ status: requests.length === 1 ? 503 : 200, json: requests.length === 1 ? { error: 'Fixture processing unavailable' } : { success: true } });
  });
  await questionsToContact(page, false);
  await page.getByLabel('Business website (optional)').fill('not-a-url');
  await page.getByRole('button', { name: 'Continue →', exact: true }).click();
  await expect(page.getByText('Enter a valid http:// or https:// URL', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continue without sharing a website', exact: true }).click();
  await page.getByRole('button', { name: 'Continue →', exact: true }).click();
  const submit = page.getByRole('button', { name: 'Confirm & Send →', exact: true });
  await expect(submit).toBeDisabled();
  await page.getByRole('checkbox').check();
  await submit.click();
  await expect(page.getByText('Fixture processing unavailable', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/assessment$/);
  await submit.click();
  await expect(page).toHaveURL(/\/assessment\/complete$/);
  expect(requests).toHaveLength(2);
  for (const body of requests) {
    expect(body.noWebsite).toBe(true);
    expect(body.websiteUrl).toBeUndefined();
    expect(body.companyUrl).toBe('');
    expect(Date.now() - Number(body.formLoadedAt)).toBeGreaterThanOrEqual(3000);
    for (const question of buildQuestions(business)) expect(body[question.key]).toBe(question.options[0]);
  }
  expect(requests[0]).toEqual(requests[1]);
});

test('assessment other-industry branch and website/email corrections survive confirmation', async ({ page }) => {
  let sent: Record<string, unknown> | undefined;
  await page.route('**/api/assessment', route => {
    sent = route.request().postDataJSON();
    return route.fulfill({ json: { success: true } });
  });
  await questionsToContact(page, true);
  await page.getByLabel('Business website (optional)').fill('https://fixture.example.test');
  await page.getByRole('button', { name: 'Continue →', exact: true }).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.locator('input[type=email]').fill('corrected@example.test');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Confirm & Send →', exact: true }).click();
  await expect(page).toHaveURL(/\/assessment\/complete$/);
  expect(assessmentSubmissionSchema.safeParse(sent).success).toBe(true);
  expect(sent).toMatchObject({ industry: 'Something else', industryOther: 'Fixture repair shop', email: 'corrected@example.test', websiteUrl: 'https://fixture.example.test', noWebsite: false });
});

test('contact form retains its message on failure and retries the same logical submission', async ({ page }) => {
  const requests: Record<string, unknown>[] = [];
  await page.route('**/api/contact', async route => {
    const body = route.request().postDataJSON();
    expect(contactSubmissionSchema.safeParse(body).success).toBe(true);
    requests.push(body);
    await route.fulfill({ status: requests.length === 1 ? 502 : 200, json: requests.length === 1 ? { error: 'Fixture notification unavailable' } : { success: true } });
  });
  await page.goto('/contact');
  await page.getByLabel('Name', { exact: true }).fill('Fixture Visitor');
  const opened = Date.now();
  await page.getByLabel('Email', { exact: true }).fill('fixture@example.test');
  await page.getByLabel('Message', { exact: true }).fill('Isolated browser message');
  await expect.poll(() => Date.now() - opened).toBeGreaterThanOrEqual(3500);
  await page.getByRole('button', { name: 'Send Message', exact: true }).click();
  await expect(page.getByText('Fixture notification unavailable', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Message', { exact: true })).toHaveValue('Isolated browser message');
  await page.getByRole('button', { name: 'Send Message', exact: true }).click();
  await expect(page.getByText('Thanks. Your message is on its way.', { exact: true })).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests[0]).toEqual(requests[1]);
  expect(requests[0].companyUrl).toBe('');
  expect(Date.now() - Number(requests[0].formLoadedAt)).toBeGreaterThanOrEqual(3000);
});
