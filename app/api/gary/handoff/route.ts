import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createHandoffToken, hashToken } from '@/lib/gary/handoffToken';
import { createGaryLlmAdapter } from '@/lib/gary/llm/providerFactory';
import { buildGaryConversationSummary } from '@/lib/gary/conversationSummary';
import { enqueueFunnelEvent } from '@/lib/gary/funnelEvents';
import type { ChatMessage } from '@/lib/gary/llm/types';
import { verifySessionCapability } from '@/lib/gary/sessionCapability';
import { readLimitedJson } from '@/lib/requestSafety';
import { isHandoffRateLimited } from '@/lib/gary/handoffRateLimit';

export const runtime = 'nodejs';
export const maxDuration = 60;

const requestSchema = z.object({ sessionId: z.string().min(1), sessionCapability: z.string().min(1).max(2048) });

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await readLimitedJson(req);
  } catch (error) {
    if (error instanceof Error && error.message === 'REQUEST_TOO_LARGE') return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Session authorization is required' }, { status: 403 });
  }
  if (!verifySessionCapability(parsed.data.sessionCapability, parsed.data.sessionId)) {
    return NextResponse.json({ error: 'Invalid session authorization' }, { status: 403 });
  }
  if (isHandoffRateLimited(parsed.data.sessionId)) {
    return NextResponse.json({ error: 'Too many handoff requests. Please try again shortly.' }, { status: 429 });
  }

  const session = await prisma.publicChatSession.findUnique({
    where: { id: parsed.data.sessionId },
    include: { messages: { orderBy: { createdAt: 'asc' } }, contact: true },
  });
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const contact = session.contact;
  const allowedFields: string[] = ['firstName', 'businessName', 'email', 'phone'].filter((field) => {
    if (field === 'firstName') return Boolean(contact?.firstName);
    if (field === 'businessName') return Boolean(contact?.businessName);
    if (field === 'email') return Boolean(contact?.emailNormalized);
    if (field === 'phone') return Boolean(contact?.phoneNormalized);
    return false;
  });

  const handoffState = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${session.id}))`;
    const currentSession = await tx.publicChatSession.findUniqueOrThrow({ where: { id: session.id } });
    const existing = await tx.assessmentHandoff.findUnique({ where: { sessionId: session.id } });
    const reusable = Boolean(existing && existing.expiresAt.getTime() >= Date.now());
    const expiresAt = reusable ? existing!.expiresAt : new Date(Date.now() + 30 * 60 * 1000);
    const effectiveFields = reusable ? (existing!.allowedPrefillFields as string[]) : allowedFields;
    const token = createHandoffToken(session.id, effectiveFields, expiresAt.getTime());
    if (!reusable) await tx.assessmentHandoff.upsert({
      where: { sessionId: session.id },
      create: { sessionId: session.id, signedTokenHash: hashToken(token), allowedPrefillFields: effectiveFields as never, expiresAt },
      update: { signedTokenHash: hashToken(token), allowedPrefillFields: effectiveFields as never, expiresAt, consumedAt: null },
    });
    const firstHandoff = currentSession.status !== 'handed_off_to_assessment';
    if (firstHandoff) await tx.publicChatSession.update({ where: { id: session.id }, data: { status: 'handed_off_to_assessment', handedOffAt: new Date() } });
    return { token, firstHandoff };
  }, { isolationLevel: 'Serializable' });
  const token = handoffState.token;

  const funnelCorrelationId = session.id;

  if (handoffState.firstHandoff) void enqueueFunnelEvent({
    eventType: 'assessment.started',
    idempotencyKey: `assessment.started:${session.id}`,
    payload: { sessionId: session.id, funnelCorrelationId, occurredAt: new Date().toISOString() },
  });

  // Best-effort, non-blocking: building the conversation summary calls the LLM again, which
  // shouldn't hold up the redirect the visitor is waiting on.
  if (handoffState.firstHandoff) void (async () => {
    try {
      const history: ChatMessage[] = session.messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role === 'visitor' ? 'user' : 'assistant', content: m.content }));
      const summary = await buildGaryConversationSummary(createGaryLlmAdapter(), history);
      await enqueueFunnelEvent({
        eventType: 'contact.captured',
        idempotencyKey: `contact.captured:${session.id}`,
        payload: {
          sessionId: session.id,
          funnelCorrelationId,
          firstName: contact?.firstName ?? null,
          businessName: contact?.businessName ?? null,
          emailNormalized: contact?.emailNormalized ?? null,
          phoneNormalized: contact?.phoneNormalized ?? null,
          preferredContactTime: contact?.preferredContactTime ?? null,
          summary,
          transcriptReference: session.id,
          occurredAt: new Date().toISOString(),
        },
      });
      if (contact) {
        await prisma.crrOutboxEvent.create({
          data: {
            contactSnapshot: {
              firstName: contact.firstName,
              businessName: contact.businessName,
              emailNormalized: contact.emailNormalized,
              phoneNormalized: contact.phoneNormalized,
              sourceSessionId: session.id,
            } as never,
          },
        });
      }
    } catch (err) {
      console.error('Failed to build/send Gary conversation summary', err);
    }
  })();

  const redirectUrl = `/assessment?token=${encodeURIComponent(token)}&funnelCorrelationId=${encodeURIComponent(funnelCorrelationId)}`;
  return NextResponse.json({ redirectUrl });
}
