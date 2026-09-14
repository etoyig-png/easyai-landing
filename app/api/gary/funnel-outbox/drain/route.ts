import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { drainFunnelEventOutbox, funnelOutboxHealth } from '@/lib/gary/funnelEvents';
import { SENDING_LEASE_MS } from '@/lib/gary/contactSubmission';

export const runtime = 'nodejs';

// Protected operations endpoint for the Command Center handoff.
//   POST  retries due, undelivered outbox rows (a future Vercel Cron target; the opportunistic
//         drain in lib/gary/funnelEvents.ts covers normal traffic).
//   GET   durable health of the contact pipeline: what is waiting, what is exhausted, and
//         which contacts never had their notification sent. Returns 503 when something needs a
//         human, so any uptime checker can alert on it without a log platform.
// Both require the bearer secret; neither exposes visitor details.
function authorized(request: NextRequest): boolean {
  const secret = process.env.GARY_FUNNEL_DRAIN_SECRET;
  return Boolean(secret && request.headers.get('authorization') === `Bearer ${secret}`);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  }
  const result = await drainFunnelEventOutbox({ limit: 25 });
  return NextResponse.json(result);
}

/** Older than this and still undelivered means retries are not keeping up. */
const STALE_UNDELIVERED_SECONDS = 60 * 60;

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  }
  const now = new Date();
  const [outbox, notificationFailed, sendingStale] = await Promise.all([
    funnelOutboxHealth(now),
    prisma.publicContact.count({ where: { notificationStatus: 'failed' } }),
    // A 'sending' lease older than its window means a request died mid-send and no retry came.
    prisma.publicContact.count({ where: { notificationStatus: 'sending', updatedAt: { lt: new Date(now.getTime() - SENDING_LEASE_MS) } } }),
  ]);
  const problems: string[] = [];
  if (!outbox.configured) problems.push('funnel webhook not configured');
  if (outbox.exhausted > 0) problems.push(`${outbox.exhausted} handoff event(s) exhausted retries`);
  if (outbox.oldestUndeliveredAgeSeconds > STALE_UNDELIVERED_SECONDS) problems.push('undelivered handoff older than 1h');
  if (notificationFailed > 0) problems.push(`${notificationFailed} contact(s) with unsent notification`);
  if (sendingStale > 0) problems.push(`${sendingStale} contact(s) stuck in sending`);

  return NextResponse.json(
    { ok: problems.length === 0, checkedAt: now.toISOString(), outbox, contacts: { notificationFailed, sendingStale }, problems },
    { status: problems.length === 0 ? 200 : 503 }
  );
}
