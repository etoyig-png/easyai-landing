import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The contact route with every outbound dependency mocked. No live Resend call, no database.
 * These prove the route's contract: it never reports success for a message it did not send,
 * and a visitor cannot influence where mail goes.
 */
const sendContactMessage = vi.fn();
const isRateLimited = vi.fn();

vi.mock('@/lib/resend', () => ({ sendContactMessage: (...args: unknown[]) => sendContactMessage(...args) }));
vi.mock('@/lib/rateLimit', async () => {
  const actual = await vi.importActual<typeof import('@/lib/rateLimit')>('@/lib/rateLimit');
  return { ...actual, isRateLimited: (...args: unknown[]) => isRateLimited(...args) };
});

import { POST } from './route';

const validBody = {
  name: 'Dana Reyes',
  email: 'visitor@example.com',
  phone: '555-0100',
  businessName: 'Riverside Plumbing',
  message: 'Please call me about the assessment.',
  companyUrl: '',
  // Older than the minimum fill time, so looksLikeSpam does not trip.
  formLoadedAt: Date.now() - 60_000,
};

function request(body: unknown): NextRequest {
  return new NextRequest('https://www.easyaiconsult.com/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-vercel-forwarded-for': '203.0.113.9' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  sendContactMessage.mockReset().mockResolvedValue(undefined);
  isRateLimited.mockReset().mockResolvedValue(false);
});

describe('POST /api/contact', () => {
  it('sends a valid message and reports success', async () => {
    const res = await POST(request(validBody));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true });
    expect(sendContactMessage).toHaveBeenCalledTimes(1);
    const sent = sendContactMessage.mock.calls[0][0];
    expect(sent.email).toBe('visitor@example.com');
    expect(sent.message).toBe('Please call me about the assessment.');
  });

  it('rejects an invalid submission before sending anything', async () => {
    const res = await POST(request({ ...validBody, email: 'not-an-email' }));
    expect(res.status).toBe(400);
    expect(sendContactMessage).not.toHaveBeenCalled();
  });

  it('requires a message', async () => {
    const res = await POST(request({ ...validBody, message: '' }));
    expect(res.status).toBe(400);
    expect(sendContactMessage).not.toHaveBeenCalled();
  });

  it('reports failure, never success, when delivery fails', async () => {
    sendContactMessage.mockRejectedValue(new Error('Resend contact message failed: domain not verified'));
    const res = await POST(request(validBody));
    expect(res.status).toBe(502);
    const payload = await res.json();
    expect(payload.success).toBeUndefined();
    expect(payload.error).toMatch(/could not send/i);
  });

  it('swallows an obvious bot without sending or revealing detection', async () => {
    const res = await POST(request({ ...validBody, companyUrl: 'http://spam.example' }));
    expect(res.status).toBe(200);
    expect(sendContactMessage).not.toHaveBeenCalled();
  });

  it('treats an instant submission as a bot', async () => {
    const res = await POST(request({ ...validBody, formLoadedAt: Date.now() }));
    expect(res.status).toBe(200);
    expect(sendContactMessage).not.toHaveBeenCalled();
  });

  it('applies the existing rate limit', async () => {
    isRateLimited.mockResolvedValue(true);
    const res = await POST(request(validBody));
    expect(res.status).toBe(429);
    expect(sendContactMessage).not.toHaveBeenCalled();
  });

  it('fails closed when the rate-limit check itself errors', async () => {
    isRateLimited.mockRejectedValue(new Error('db down'));
    const res = await POST(request(validBody));
    expect(res.status).toBe(503);
    expect(sendContactMessage).not.toHaveBeenCalled();
  });

  it('gives the visitor no way to choose the recipient', async () => {
    await POST(request({ ...validBody, to: 'attacker@evil.test', replyTo: 'attacker@evil.test', from: 'attacker@evil.test' }));
    const sent = sendContactMessage.mock.calls[0][0];
    expect(sent.to).toBeUndefined();
    expect(sent.from).toBeUndefined();
    expect(sent.replyTo).toBeUndefined();
  });
});
