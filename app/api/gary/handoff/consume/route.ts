import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashToken, verifyHandoffToken } from '@/lib/gary/handoffToken';

export const runtime = 'nodejs';

const requestSchema = z.object({ token: z.string().min(1) });

/** Server-side token verification — the HMAC secret never reaches the client, so the assessment page calls this to resolve a `?token=` into safe prefill values. Consuming is idempotent within the TTL: re-reading an already-consumed-but-unexpired token still returns the same fields (a page refresh shouldn't lock the visitor out), it just doesn't re-mark consumedAt. */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'token is required' }, { status: 400 });
  }

  const verification = verifyHandoffToken(parsed.data.token);
  if (!verification.valid) {
    return NextResponse.json({ error: `Invalid token: ${verification.reason}` }, { status: 400 });
  }

  const handoff = await prisma.assessmentHandoff.findUnique({ where: { sessionId: verification.payload.sessionId } });
  if (!handoff || handoff.signedTokenHash !== hashToken(parsed.data.token)) {
    return NextResponse.json({ error: 'Token does not match a known handoff' }, { status: 400 });
  }
  if (handoff.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: 'Token expired' }, { status: 400 });
  }

  if (!handoff.consumedAt) {
    await prisma.assessmentHandoff.update({ where: { id: handoff.id }, data: { consumedAt: new Date() } });
  }

  const session = await prisma.publicChatSession.findUnique({ where: { id: verification.payload.sessionId }, include: { contact: true } });
  const allowedFields = new Set(verification.payload.allowedFields);
  const contact = session?.contact;

  const prefill: Record<string, string> = {};
  if (allowedFields.has('firstName') && contact?.firstName) prefill.firstName = contact.firstName;
  if (allowedFields.has('businessName') && contact?.businessName) prefill.businessName = contact.businessName;
  if (allowedFields.has('email') && contact?.emailNormalized) prefill.email = contact.emailNormalized;

  return NextResponse.json({ sessionId: verification.payload.sessionId, prefill });
}
