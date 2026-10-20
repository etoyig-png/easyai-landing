import { describe, it, expect, afterEach } from 'vitest';
import { getNotificationRecipients } from './notificationRecipients';

const ORIGINAL = process.env.ASSESSMENT_NOTIFICATION_EMAIL;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.ASSESSMENT_NOTIFICATION_EMAIL;
  else process.env.ASSESSMENT_NOTIFICATION_EMAIL = ORIGINAL;
});

describe('getNotificationRecipients', () => {
  it('defaults to all four internal Easy AI inboxes', () => {
    delete process.env.ASSESSMENT_NOTIFICATION_EMAIL;
    expect(getNotificationRecipients()).toEqual([
      'info@easyaiconsult.com',
      'etoyi.g@easyaiconsult.com',
      'sales@easyaiconsult.com',
      'etoyi@easyaiconsult.com',
    ]);
  });

  it('returns one list, not one entry per send — four recipients is a single notification', () => {
    delete process.env.ASSESSMENT_NOTIFICATION_EMAIL;
    const recipients = getNotificationRecipients();
    // The whole array is handed to a single Resend send. Four addresses must never be read as
    // four submissions, four prospects, or four Command Center records.
    expect(recipients).toHaveLength(4);
    expect(new Set(recipients).size).toBe(4);
  });

  it('honors a comma-separated override so a preview never pages the real inboxes', () => {
    process.env.ASSESSMENT_NOTIFICATION_EMAIL = ' a@example.com , b@example.com ';
    expect(getNotificationRecipients()).toEqual(['a@example.com', 'b@example.com']);
  });

  it('falls back to the defaults when the override is set but empty', () => {
    process.env.ASSESSMENT_NOTIFICATION_EMAIL = '   ,  ';
    expect(getNotificationRecipients()).toHaveLength(4);
  });
});
