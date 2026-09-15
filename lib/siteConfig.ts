import { contactRecipient } from './emailRouting';

/**
 * The one place the assistant's contact pipeline learns whose site it is running on.
 *
 * Today this resolves to Easy AI. It exists so the pieces that will differ per brand later
 * (brand identity, assistant identity, where contact requests go, where booking lives, which
 * actions are switched on, and which organisation owns the resulting records) are read from
 * here rather than typed into routes, and so the resolution is SERVER-SIDE ONLY: nothing in a
 * request body decides which site or organisation a contact belongs to. A visitor's browser
 * cannot choose a tenant.
 *
 * Deliberately not built here: partner dashboards, tenant administration, per-request tenant
 * lookup by hostname. Those are the next platform step, and this module is the seam for them.
 *
 * Server-only by construction: it reads process.env and the email routing module, neither of
 * which may reach client JavaScript. lib/emailRouting.test.ts asserts no client component
 * imports it.
 */
export interface SiteConfig {
  /** Stable key identifying the owning site/organisation. Stored on durable records. */
  siteKey: string;
  brand: { name: string };
  assistant: {
    /** The character's name as the visitor knows it. */
    name: string;
    /** The product name of the assistant program (Artificial Intelligence Interaction Manager). */
    programName: string;
    /**
     * The upfront artificial-intelligence disclosure, spoken as the first sentence of the
     * assistant's first message in every conversation and at the start of the contact flow.
     */
    disclosure: string;
  };
  contact: {
    /** Where a confirmed contact request is delivered. */
    notificationEmail: string;
    /** Subject-line channel label, so one inbox can tell request sources apart. */
    channelLabel: string;
    /** Value stored on the durable contact record's channel column. */
    channelKey: string;
    /** Path a visitor is sent to for booking. */
    bookingPath: string;
  };
  actions: {
    /** Whether the assistant may run the four-step contact flow at all. */
    contactFlow: boolean;
    /** Whether the assistant may hand a visitor into the assessment. */
    assessmentHandoff: boolean;
  };
}

function flag(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw === undefined || raw === '') return fallback;
  return raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on';
}

function text(name: string, fallback: string): string {
  const raw = process.env[name]?.trim();
  return raw ? raw : fallback;
}

export function getSiteConfig(): SiteConfig {
  const assistantName = text('ASSISTANT_NAME', 'Gary');
  const brandName = text('SITE_BRAND_NAME', 'Easy AI');
  return {
    siteKey: text('SITE_KEY', 'easy-ai'),
    brand: { name: brandName },
    assistant: {
      name: assistantName,
      programName: text('ASSISTANT_PROGRAM_NAME', 'AIM'),
      disclosure: text('ASSISTANT_DISCLOSURE', `Hi, I'm ${assistantName}, ${brandName}'s AI assistant.`),
    },
    contact: {
      notificationEmail: contactRecipient(),
      channelLabel: text('CONTACT_CHANNEL_LABEL', `${assistantName} contact request`),
      channelKey: text('CONTACT_CHANNEL_KEY', 'assistant-contact-flow'),
      bookingPath: text('BOOKING_PATH', '/book-consultation'),
    },
    actions: {
      contactFlow: flag('ASSISTANT_CONTACT_FLOW_ENABLED', true),
      assessmentHandoff: flag('ASSISTANT_ASSESSMENT_HANDOFF_ENABLED', true),
    },
  };
}
