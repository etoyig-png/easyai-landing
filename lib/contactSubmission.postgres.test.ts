import { afterAll, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.DIRECT_URL = process.env.TEST_DATABASE_URL;
  }
});
const send = vi.hoisted(() => vi.fn().mockResolvedValue({ accepted: 'sent' }));
vi.mock('./resend', () => ({ sendContactMessage: send }));
vi.mock('@vercel/functions', () => ({ waitUntil: (task: Promise<unknown>) => { void task; } }));
import { prisma } from './prisma';
import { saveContactSubmission, notifyContactSubmission } from './contactSubmission';

describe.skipIf(!process.env.TEST_DATABASE_URL)('contact form against disposable PostgreSQL with mocked notification', () => {
  const data = { name: 'Database Fixture', email: 'form-fixture@example.test', message: 'Isolated fixture', formLoadedAt: Date.now() - 5000 };
  const ids: string[] = [];
  afterAll(async () => {
    await prisma.funnelEventOutbox.deleteMany({ where: { idempotencyKey: { in: ids.map((id) => `contact.captured:${id}:contact-form`) } } });
    await prisma.publicContact.deleteMany({ where: { id: { in: ids } } });
  });

  it('claims six concurrent identical requests once, then replays success without a second record or notification', async () => {
    const outcomes = await Promise.all(Array.from({ length: 6 }, () => saveContactSubmission(data)));
    const claimed = outcomes.filter((outcome) => outcome.state === 'claimed');
    expect(claimed).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.state === 'in-progress')).toHaveLength(5);
    const stored = claimed[0]; ids.push(stored.contactId);
    await notifyContactSubmission(data, stored);
    expect((await saveContactSubmission(data)).state).toBe('sent');
    expect(send).toHaveBeenCalledTimes(1);
    expect(await prisma.publicContact.count({ where: { id: stored.contactId } })).toBe(1);
    expect(await prisma.funnelEventOutbox.count({ where: { idempotencyKey: stored.eventKey } })).toBe(1);
    expect((await prisma.publicContact.findUniqueOrThrow({ where: { id: stored.contactId } })).notificationStatus).toBe('sent');
  });

  it('retains the contact and exact handoff payload on notification failure', async () => {
    const failed = { ...data, message: 'Failed notification fixture' };
    const stored = await saveContactSubmission(failed); ids.push(stored.contactId);
    send.mockRejectedValueOnce(new Error('fixture provider failure'));
    await expect(notifyContactSubmission(failed, stored)).rejects.toThrow('fixture provider failure');
    expect((await prisma.publicContact.findUniqueOrThrow({ where: { id: stored.contactId } })).notificationStatus).toBe('failed');
    const event = await prisma.funnelEventOutbox.findUniqueOrThrow({ where: { idempotencyKey: stored.eventKey } });
    expect(event.payload).toMatchObject({ summary: failed.message, channel: 'contact-form', contactId: stored.contactId });
    expect(event.deliveredAt).toBeNull();
  });
});
