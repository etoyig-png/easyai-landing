import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getClientIp, isGaryRateLimited } from '@/lib/rateLimit';
import { verifySessionCapability } from '@/lib/gary/sessionCapability';
import { rebuildConversation } from '@/lib/gary/conversationHistory';
import { readLimitedJson } from '@/lib/requestSafety';

export const runtime = 'nodejs';

const requestSchema = z.object({
  sessionId: z.string().min(1).max(200),
  sessionCapability: z.string().min(1).max(2048),
});

/**
 * Returns a visitor's own conversation so Gary can show it again after a refresh or reopen.
 * Read-only: no model call, no new message, and the signed session capability is required, so
 * nobody can read another visitor's chat by guessing a session id.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await readLimitedJson(req);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const { sessionId, sessionCapability } = parsed.data;

  if (await isGaryRateLimited(getClientIp(req.headers))) {
    return NextResponse.json({ error: 'Too many messages. Please try again later.' }, { status: 429 });
  }
  if (!verifySessionCapability(sessionCapability, sessionId)) {
    return NextResponse.json({ error: 'Invalid session authorization' }, { status: 403 });
  }

  const session = await prisma.publicChatSession.findUnique({
    where: { id: sessionId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!session) return NextResponse.json({ error: 'Invalid session authorization' }, { status: 403 });

  return NextResponse.json({ sessionId, ...rebuildConversation(session.messages, session.visitorTurnCount) });
}
