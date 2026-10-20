import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getClientIp, isGaryRateLimited } from '@/lib/rateLimit';
import { deliverGaryContactRequest } from '@/lib/gary/contactRequest';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Submits a Gary contact request AFTER the visitor has confirmed it in the chat.
 *
 * Deliberately narrow: only the fields Gary is allowed to collect are accepted, and anything
 * else in the body is dropped by the schema. No medical, financial, legal, credential, payment
 * or government-identifier field exists here, so none can be persisted or forwarded even if a
 * visitor typed one into the chat.
 */
const contactSchema = z
  .object({
    sessionId: z.string().min(1).max(200),
    name: z.string().trim().min(1, 'Name is required').max(120),
    businessName: z.string().trim().max(200).optional(),
    reason: z.string().trim().min(1, 'Reason is required').max(1000),
    preferredContact: z.enum(['email', 'phone']),
    email: z.string().trim().email().max(320).optional(),
    phone: z.string().trim().max(40).optional(),
  })
  .refine((d) => (d.preferredContact === 'email' ? !!d.email : !!d.phone), {
    message: 'A contact detail matching the preferred method is required',
    path: ['preferredContact'],
  });

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid contact request' }, { status: 400 });
  }

  // Same limiter the chat itself uses — a contact request is one more message from that IP.
  const ipAddress = getClientIp(req.headers);
  if (await isGaryRateLimited(ipAddress)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  const result = await deliverGaryContactRequest(parsed.data);

  if (result.alreadySubmitted) {
    // Not an error for the visitor: their message is already in. Reported distinctly so the UI
    // can say so instead of implying a second message was sent.
    return NextResponse.json({ delivered: true, alreadySubmitted: true }, { status: 200 });
  }

  if (!result.delivered) {
    // Honest failure: the notification did not go out, so we never claim it did.
    return NextResponse.json(
      { delivered: false, error: 'We could not send that just now. Please try again in a moment.' },
      { status: 502 }
    );
  }

  return NextResponse.json({
    delivered: true,
    alreadySubmitted: false,
    prospectSynced: result.prospectSynced,
  });
}
