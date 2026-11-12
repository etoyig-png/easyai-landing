import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  create: vi.fn(), find: vi.fn(), lock: vi.fn(), update: vi.fn(), transaction: vi.fn(),
  record: vi.fn(), deliver: vi.fn(), send: vi.fn(), waitUntil: vi.fn(),
}));
vi.mock('./prisma', () => ({ prisma: {
  $transaction: mocks.transaction,
  publicContact: { update: mocks.update },
} }));
vi.mock('./gary/funnelEvents', () => ({ recordFunnelEvent: mocks.record, deliverFunnelEvent: mocks.deliver }));
vi.mock('./resend', () => ({ sendContactMessage: mocks.send }));
vi.mock('@vercel/functions', () => ({ waitUntil: mocks.waitUntil }));
import { saveContactSubmission, notifyContactSubmission } from './contactSubmission';

const data = { name: 'Fixture Visitor', email: 'Visitor@Example.com', message: 'Fixture request', formLoadedAt: 1 };
const tx = { $queryRaw: mocks.lock, publicContact: { upsert: mocks.create, findUnique: mocks.find } };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.transaction.mockImplementation((fn) => fn(tx));
  mocks.create.mockResolvedValue({ id: 'form-contact-1' });
  mocks.update.mockResolvedValue({});
  mocks.record.mockResolvedValue({ stored: 'created' });
  mocks.deliver.mockResolvedValue('not-configured');
  mocks.send.mockResolvedValue({ accepted: 'sent' });
});

describe('contact form durability and notification', () => {
  it('stores a contact and its outbox event in the same transaction before notifying', async () => {
    const stored = await saveContactSubmission(data);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ channel: 'contact-form', reason: data.message, emailNormalized: 'visitor@example.com' }),
    }));
    expect(mocks.record).toHaveBeenCalledWith(tx, expect.objectContaining({
      eventType: 'contact.captured', idempotencyKey: expect.stringMatching(/^contact.captured:contact-form-[a-f0-9]{64}:contact-form$/),
      payload: expect.objectContaining({ sessionId: 'form-contact-1', channel: 'contact-form' }),
    }));
    expect(mocks.send).not.toHaveBeenCalled();
    await notifyContactSubmission(data, stored);
    expect(mocks.send).toHaveBeenCalledWith(data, { idempotencyKey: 'contact-notification:form-contact-1' });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ notificationStatus: 'sent' }) }));
  });

  it('propagates an outbox write failure so the database transaction rolls back', async () => {
    mocks.record.mockRejectedValue(new Error('outbox unavailable'));
    await expect(saveContactSubmission(data)).rejects.toThrow('outbox unavailable');
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('retains the saved record and handoff when notification fails, and does not claim sent', async () => {
    const stored = await saveContactSubmission(data);
    mocks.send.mockRejectedValue(new Error('provider unavailable'));
    await expect(notifyContactSubmission(data, stored)).rejects.toThrow('provider unavailable');
    expect(mocks.deliver).toHaveBeenCalledWith(stored.eventKey);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ notificationStatus: 'failed' }) }));
    expect(mocks.update).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ notificationStatus: 'sent' }) }));
  });
});

 it('replays a sent logical submission without creating a record or outbox row', async () => {
   mocks.find.mockResolvedValue({ notificationStatus: 'sent' });
   const stored = await saveContactSubmission(data);
   expect(stored.state).toBe('sent');
   expect(mocks.create).not.toHaveBeenCalled();
   expect(mocks.record).not.toHaveBeenCalled();
 });
 it('does not reclaim a fresh sending lease or an uncertain send older than 24h', async () => {
   for (const age of [0, 25 * 60 * 60 * 1000]) {
     mocks.find.mockResolvedValue({ notificationStatus: 'sending', createdAt: new Date(Date.now() - age), updatedAt: new Date(Date.now() - age) });
     expect((await saveContactSubmission(data)).state).toBe('in-progress');
   }
   expect(mocks.create).not.toHaveBeenCalled();
 });
