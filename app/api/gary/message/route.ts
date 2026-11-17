import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getClientIp, isGaryRateLimited } from '@/lib/rateLimit';
import { createGaryLlmAdapter } from '@/lib/gary/llm/providerFactory';
import { generateGaryReply } from '@/lib/gary/replyPipeline';
import { classifyVisitorMessageSafety } from '@/lib/gary/safetyClassifier';
import { GARY_OPENING_OPTIONS, GARY_OPENING_QUESTION } from '@/lib/gary/openingQuestion';
import { enqueueFunnelEvent } from '@/lib/gary/funnelEvents';
import type { GaryConversationState } from '@/lib/gary/systemPrompt';
import type { ChatMessage } from '@/lib/gary/llm/types';
import { createSessionCapability, verifySessionCapability } from '@/lib/gary/sessionCapability';
import { GARY_MAX_MESSAGES, GARY_MAX_TRANSCRIPT_CHARS, readLimitedJson } from '@/lib/requestSafety';

export const runtime = 'nodejs';
export const maxDuration = 60;

const requestSchema = z.object({
  sessionId: z.string().nullish(),
  sessionCapability: z.string().max(2048).nullish(),
  anonymousId: z.string().min(1),
  message: z.string().max(2000).optional(),
  optionSelected: z.string().max(200).optional(),
  currentPage: z.string().max(500).optional(),
  referrer: z.string().max(500).optional(),
  utm: z.record(z.string()).optional(),
});

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
    return NextResponse.json({ error: 'Invalid request', issues: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const ipAddress = getClientIp(req.headers);
  if (await isGaryRateLimited(ipAddress)) {
    return NextResponse.json({ error: 'Too many messages. Please try again later.' }, { status: 429 });
  }

  if (data.sessionId && !verifySessionCapability(data.sessionCapability ?? '', data.sessionId)) {
    return NextResponse.json({ error: 'Invalid session authorization' }, { status: 403 });
  }
  // Load or create the session.
  let session = data.sessionId
    ? await prisma.publicChatSession.findUnique({ where: { id: data.sessionId }, include: { messages: { orderBy: { createdAt: 'asc' } } } })
    : null;

  const isNewSession = !data.sessionId;
  if (data.sessionId && !session) return NextResponse.json({ error: 'Invalid session authorization' }, { status: 403 });
  if (!session) {
    session = await prisma.publicChatSession.create({
      data: {
        anonymousId: data.anonymousId,
        ipAddress,
        currentPage: data.currentPage,
        referrer: data.referrer,
        utm: data.utm as never,
      },
      include: { messages: true },
    });
    void enqueueFunnelEvent({
      eventType: 'chat.session.started',
      idempotencyKey: `chat.session.started:${session.id}`,
      payload: { sessionId: session.id, anonymousId: session.anonymousId, occurredAt: session.startedAt.toISOString(), page: data.currentPage },
    });
  }

  // The very first call for a brand-new session (no message yet) returns the fixed opening
  // question deterministically — no LLM call, matching the master spec's exact wording.
  if (isNewSession && !data.message) {
    await prisma.publicChatMessage.create({
      data: { sessionId: session.id, role: 'gary', content: GARY_OPENING_QUESTION, optionPayload: GARY_OPENING_OPTIONS as never },
    });
    return NextResponse.json({
      sessionId: session.id,
      sessionCapability: createSessionCapability(session.id),
      reply: { text: GARY_OPENING_QUESTION, options: GARY_OPENING_OPTIONS },
      offerAssessment: false,
    });
  }

  const visitorMessage = data.message?.trim();
  if (!visitorMessage) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }
  if (session.messages.length >= GARY_MAX_MESSAGES || session.messages.reduce((total, item) => total + item.content.length, 0) + visitorMessage.length > GARY_MAX_TRANSCRIPT_CHARS) {
    return NextResponse.json({ error: 'This conversation has reached its limit. Please start a new chat.' }, { status: 409 });
  }

  const safetyClass = classifyVisitorMessageSafety(visitorMessage);
  await prisma.publicChatMessage.create({
    data: { sessionId: session.id, role: 'visitor', content: visitorMessage, safetyClass, optionPayload: data.optionSelected ? { optionSelected: data.optionSelected } : undefined },
  });

  const priorMessages = await prisma.publicChatMessage.findMany({ where: { sessionId: session.id }, orderBy: { createdAt: 'asc' } });
  const history: ChatMessage[] = priorMessages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role === 'visitor' ? 'user' : 'assistant', content: m.content }));

  const contact = session.identifiedContactId ? await prisma.publicContact.findUnique({ where: { id: session.identifiedContactId } }) : null;
  const state: GaryConversationState = {
    firstName: contact?.firstName,
    businessName: contact?.businessName,
    knownAnswers: [
      contact?.firstName ? `First name: ${contact.firstName}` : null,
      contact?.businessName ? `Business name: ${contact.businessName}` : null,
    ].filter((v): v is string => Boolean(v)),
    visitorTurnCount: session.visitorTurnCount,
    assessmentOfferCount: session.assessmentOfferCount,
    lastVisitorSafetyClass: safetyClass,
  };

  const adapter = createGaryLlmAdapter();
  const reply = await generateGaryReply(adapter, state, history);

  await prisma.publicChatMessage.create({
    data: { sessionId: session.id, role: 'gary', content: reply.text, model: reply.model },
  });

  await prisma.publicChatSession.update({
    where: { id: session.id },
    data: {
      visitorTurnCount: { increment: 1 },
      assessmentOfferCount: reply.offerAssessment ? { increment: 1 } : undefined,
    },
  });

  return NextResponse.json({
    sessionId: session.id,
    sessionCapability: data.sessionCapability ?? createSessionCapability(session.id),
    reply: { text: reply.text },
    offerAssessment: reply.offerAssessment,
  });
}
