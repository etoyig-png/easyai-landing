import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getSiteConfig } from './siteConfig';

const KEYS = [
  'SITE_KEY',
  'SITE_BRAND_NAME',
  'ASSISTANT_NAME',
  'ASSISTANT_PROGRAM_NAME',
  'ASSISTANT_DISCLOSURE',
  'CONTACT_NOTIFICATION_EMAIL',
  'CONTACT_CHANNEL_LABEL',
  'CONTACT_CHANNEL_KEY',
  'BOOKING_PATH',
  'ASSISTANT_CONTACT_FLOW_ENABLED',
  'ASSISTANT_ASSESSMENT_HANDOFF_ENABLED',
];

const saved: Record<string, string | undefined> = {};
beforeEach(() => {
  for (const key of KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});
afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe('site configuration for the assistant contact pipeline', () => {
  it('resolves to Easy AI, Gary / AIM, and the primary contact address by default', () => {
    expect(getSiteConfig()).toEqual({
      siteKey: 'easy-ai',
      brand: { name: 'Easy AI' },
      assistant: { name: 'Gary', programName: 'AIM', disclosure: "Hi, I'm Gary, Easy AI's AI assistant." },
      contact: {
        notificationEmail: 'hello@easyaiconsult.com',
        channelLabel: 'Gary contact request',
        channelKey: 'assistant-contact-flow',
        bookingPath: '/book-consultation',
      },
      actions: { contactFlow: true, assessmentHandoff: true },
    });
  });

  it('reads every value from server environment, never from a request', () => {
    process.env.SITE_KEY = 'partner-1';
    process.env.SITE_BRAND_NAME = 'Partner Co';
    process.env.ASSISTANT_NAME = 'Max';
    process.env.CONTACT_NOTIFICATION_EMAIL = 'leads@partner.example';
    process.env.BOOKING_PATH = '/book';
    process.env.ASSISTANT_CONTACT_FLOW_ENABLED = 'false';
    const config = getSiteConfig();
    expect(config.siteKey).toBe('partner-1');
    expect(config.brand.name).toBe('Partner Co');
    expect(config.assistant.name).toBe('Max');
    expect(config.contact.channelLabel).toBe('Max contact request');
    expect(config.assistant.disclosure).toBe("Hi, I'm Max, Partner Co's AI assistant.");
    process.env.ASSISTANT_DISCLOSURE = 'Hello, Max here, an AI assistant for Partner Co.';
    expect(getSiteConfig().assistant.disclosure).toBe('Hello, Max here, an AI assistant for Partner Co.');
    expect(config.contact.notificationEmail).toBe('leads@partner.example');
    expect(config.contact.bookingPath).toBe('/book');
    expect(config.actions.contactFlow).toBe(false);
  });

  it('treats blank overrides as unset', () => {
    process.env.SITE_BRAND_NAME = '   ';
    process.env.ASSISTANT_CONTACT_FLOW_ENABLED = '';
    expect(getSiteConfig().brand.name).toBe('Easy AI');
    expect(getSiteConfig().actions.contactFlow).toBe(true);
  });
});
