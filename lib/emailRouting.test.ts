import fs from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const repoRoot = path.resolve(__dirname, '..');

/**
 * Routing is asserted through the real send functions with the Resend SDK mocked, so these
 * prove what would actually be handed to the provider. No live Resend or Anthropic call is
 * made anywhere in this file.
 */
const send = vi.fn();
vi.mock('resend', () => ({
  Resend: class {
    emails = { send };
  },
}));

const submission = {
  id: 'sub_1',
  workSituation: 'Small business, 1-10 employees ($100K-$1M/yr)',
  searchVisibility: 'We show up sometimes, but competitors seem more visible',
  aiChallenge: "I'm excited about AI but overwhelmed by where to start",
  desiredOutcome: 'Make more money — increase revenue or cut costs',
  timeDrain: 'Answering calls & following up with leads quickly',
  privacyConcern: "Somewhat worried — I think about it, but it's not stopping me",
  industry: 'Construction & Trades (contractors, subs, home services)',
  leadResponse: 'We respond manually, but follow-up is not always consistent.',
  websiteConversion: 'Visitors can contact us, but the next step could be clearer',
  firstName: 'Dana',
  lastName: 'Reyes',
  businessName: 'Riverside Plumbing',
  email: 'customer@example.com',
  websiteUrl: 'https://example.com',
  noWebsite: false,
  consent: true as const,
  formLoadedAt: 1,
};

const originalEnv = { ...process.env };

beforeEach(() => {
  send.mockReset();
  send.mockResolvedValue({ data: { id: 'msg_1' }, error: null });
  // Explicit on purpose: an absent VERCEL_ENV now blocks, so a test that forgets to set it
  // cannot accidentally assert production behaviour.
  process.env.VERCEL_ENV = 'production';
  delete process.env.EMAIL_TEST_RECIPIENT;
  delete process.env.ASSESSMENT_NOTIFICATION_EMAIL;
  delete process.env.RESULT_EMAIL_REPLY_TO;
  delete process.env.RESULT_EMAIL_FROM;
  delete process.env.NOTIFICATION_EMAIL_FROM;
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('customer result email', () => {
  it('goes to the address the customer submitted', async () => {
    const { sendResultEmail } = await import('./resend');
    await sendResultEmail({ to: 'customer@example.com', firstName: 'Dana', businessName: 'Riverside Plumbing', resultHtml: '<p>Body.</p>' });
    expect(send.mock.calls[0][0].to).toBe('customer@example.com');
  });

  it('replies to the one Easy AI business inbox', async () => {
    const { sendResultEmail } = await import('./resend');
    await sendResultEmail({ to: 'customer@example.com', firstName: 'Dana', businessName: 'Riverside Plumbing', resultHtml: '<p>Body.</p>' });
    expect(send.mock.calls[0][0].replyTo).toBe('info@easyaiconsult.com');
  });

  it('never puts the customer in the From field', async () => {
    const { sendResultEmail } = await import('./resend');
    await sendResultEmail({ to: 'attacker@evil.test', firstName: 'Dana', businessName: 'Riverside Plumbing', resultHtml: '<p>Body.</p>' });
    const call = send.mock.calls[0][0];
    expect(call.from).not.toContain('attacker@evil.test');
    expect(call.from).toMatch(/@mail\.easyaiconsult\.com>$/);
  });

  it('reports failure when the provider rejects the send', async () => {
    send.mockResolvedValue({ data: null, error: { message: 'domain not verified' } });
    const { sendResultEmail } = await import('./resend');
    await expect(
      sendResultEmail({ to: 'customer@example.com', firstName: 'Dana', businessName: 'Riverside Plumbing', resultHtml: '<p>Body.</p>' })
    ).rejects.toThrow(/domain not verified/);
  });
});

describe('internal assessment notification', () => {
  it('goes only to the one business inbox', async () => {
    const { sendInternalNotification } = await import('./resend');
    await sendInternalNotification(submission);
    const to = send.mock.calls[0][0].to;
    expect(to).toBe('info@easyaiconsult.com');
    expect(Array.isArray(to)).toBe(false);
  });

  it('replies to the customer so the lead can be answered directly', async () => {
    const { sendInternalNotification } = await import('./resend');
    await sendInternalNotification(submission);
    expect(send.mock.calls[0][0].replyTo).toBe('customer@example.com');
  });

  it('uses an authenticated Easy AI sender, never the customer', async () => {
    const { sendInternalNotification } = await import('./resend');
    await sendInternalNotification(submission);
    const call = send.mock.calls[0][0];
    expect(call.from).not.toContain('customer@example.com');
    expect(call.from).toMatch(/@mail\.easyaiconsult\.com>$/);
  });
});

describe('contact message', () => {
  const contact = {
    name: 'Dana Reyes',
    email: 'visitor@example.com',
    phone: '555-0100',
    businessName: 'Riverside Plumbing',
    message: 'Please call me about the assessment.',
    companyUrl: '',
    formLoadedAt: 1,
  };

  it('goes to the business inbox with the visitor as Reply-To', async () => {
    const { sendContactMessage } = await import('./resend');
    await sendContactMessage(contact);
    const call = send.mock.calls[0][0];
    expect(call.to).toBe('info@easyaiconsult.com');
    expect(call.replyTo).toBe('visitor@example.com');
  });

  it('never puts visitor input in the From field', async () => {
    const { sendContactMessage } = await import('./resend');
    await sendContactMessage({ ...contact, name: 'evil@evil.test', email: 'evil@evil.test' });
    expect(send.mock.calls[0][0].from).not.toContain('evil@evil.test');
  });

  it('escapes visitor content instead of rendering it as markup', async () => {
    const { sendContactMessage } = await import('./resend');
    await sendContactMessage({ ...contact, message: '<script>alert(1)</script>' });
    const html = send.mock.calls[0][0].html;
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('carries the phone and business name when supplied', async () => {
    const { sendContactMessage } = await import('./resend');
    await sendContactMessage(contact);
    const html = send.mock.calls[0][0].html;
    expect(html).toContain('555-0100');
    expect(html).toContain('Riverside Plumbing');
  });
});

describe('non-production email safety', () => {
  // Preview, development, local runs and continuous integration are all non-production. Only
  // a real production deployment may reach the intended recipient.
  it.each(['preview', 'development', 'staging', undefined])(
    'refuses to send when VERCEL_ENV is %s and no test recipient is configured',
    async (environment) => {
      if (environment === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = environment;
      const { sendResultEmail } = await import('./resend');
      await expect(
        sendResultEmail({ to: 'customer@example.com', firstName: 'Dana', businessName: 'Riverside Plumbing', resultHtml: '<p>Body.</p>' })
      ).rejects.toThrow(/Email blocked outside production/);
      // Refused, not silently swallowed: nothing was handed to the provider.
      expect(send).not.toHaveBeenCalled();
    }
  );

  it.each(['preview', 'development', undefined])('redirects to the test recipient when VERCEL_ENV is %s', async (environment) => {
    if (environment === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = environment;
    process.env.EMAIL_TEST_RECIPIENT = 'qa@example.com';
    const { sendResultEmail } = await import('./resend');
    await sendResultEmail({ to: 'customer@example.com', firstName: 'Dana', businessName: 'Riverside Plumbing', resultHtml: '<p>Body.</p>' });
    expect(send.mock.calls[0][0].to).toBe('qa@example.com');
  });

  it('cannot reach a customer from a local run, even with a real key present', async () => {
    delete process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'production'; // a local production build is NOT a deployment
    const { sendResultEmail } = await import('./resend');
    await expect(
      sendResultEmail({ to: 'customer@example.com', firstName: 'Dana', businessName: 'Riverside Plumbing', resultHtml: '<p>Body.</p>' })
    ).rejects.toThrow(/Email blocked outside production/);
    expect(send).not.toHaveBeenCalled();
  });

  it('never reaches the business inbox from a non-production environment unless it is the configured test recipient', async () => {
    for (const environment of ['preview', 'development']) {
      send.mockClear();
      process.env.VERCEL_ENV = environment;
      process.env.EMAIL_TEST_RECIPIENT = 'qa@example.com';
      const { sendInternalNotification } = await import('./resend');
      await sendInternalNotification(submission);
      expect(send.mock.calls[0][0].to, environment).not.toBe('info@easyaiconsult.com');
      expect(send.mock.calls[0][0].to, environment).toBe('qa@example.com');
    }
  });

  it('never lets a preview notification reach the production business inbox', async () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.EMAIL_TEST_RECIPIENT = 'qa@example.com';
    const { sendInternalNotification } = await import('./resend');
    await sendInternalNotification(submission);
    expect(send.mock.calls[0][0].to).toBe('qa@example.com');
  });

  it('sends normally in production', async () => {
    process.env.VERCEL_ENV = 'production';
    const { sendResultEmail } = await import('./resend');
    await sendResultEmail({ to: 'customer@example.com', firstName: 'Dana', businessName: 'Riverside Plumbing', resultHtml: '<p>Body.</p>' });
    expect(send.mock.calls[0][0].to).toBe('customer@example.com');
  });
});

describe('address hygiene across the active repository', () => {
  const activeFiles: string[] = [];
  function collect(dir: string) {
    for (const entry of fs.readdirSync(path.join(repoRoot, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) collect(rel);
      // Test files are excluded: this suite necessarily names the retired addresses it
      // scans for, and fixtures are not production configuration.
      else if (/\.(ts|tsx|mjs|js)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) activeFiles.push(rel);
    }
  }
  for (const dir of ['app', 'lib', 'components']) collect(dir);

  it('contains no retired Easy AI destination', () => {
    for (const rel of activeFiles) {
      const source = fs.readFileSync(path.join(repoRoot, rel), 'utf8');
      for (const retired of ['sales@easyaiconsult.com', 'team@easyaiconsult.com', 'hello@easyaiconsult.com', 'etoyi@easyaiconsult.com', 'etoyi.g@easyaiconsult.com']) {
        expect(source, `${rel} contains ${retired}`).not.toContain(retired);
      }
    }
  });

  it('no longer posts a form anywhere but our own route', () => {
    const contactPage = fs.readFileSync(path.join(repoRoot, 'app/contact/page.tsx'), 'utf8');
    expect(contactPage).not.toContain('REPLACE_WITH_YOUR_FORM_ID');
    expect(contactPage).not.toMatch(/formspree/i);
    const form = fs.readFileSync(path.join(repoRoot, 'components/ContactForm.tsx'), 'utf8');
    expect(form).toContain("fetch('/api/contact'");
  });

  it('keeps the business address in one module rather than scattered literals', () => {
    const owners = activeFiles.filter((rel) => fs.readFileSync(path.join(repoRoot, rel), 'utf8').includes('info@easyaiconsult.com'));
    expect(owners).toEqual(['lib/emailRouting.ts']);
  });

  it('never exposes email configuration to client JavaScript', () => {
    for (const rel of activeFiles) {
      const source = fs.readFileSync(path.join(repoRoot, rel), 'utf8');
      expect(source, rel).not.toMatch(/NEXT_PUBLIC_[A-Z_]*(?:EMAIL|MAIL|RESEND|NOTIFICATION)/);
      // The server-only routing module must never be pulled into a client component.
      if (source.startsWith("'use client'")) {
        expect(source, `${rel} is a client component importing emailRouting`).not.toMatch(/from '@?\/?\.*lib\/emailRouting'/);
      }
    }
  });
});
