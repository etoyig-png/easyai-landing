import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { drainFunnelEventOutbox, funnelOutboxHealth } from '@/lib/gary/funnelEvents';
import { SENDING_LEASE_MS } from '@/lib/gary/contactSubmission';

export const runtime = 'nodejs';
// Up to GET_DRAIN_LIMIT webhook calls at 8 s each must fit inside one invocation.
export const maxDuration = 60;

// Protected operations endpoint for the Command Center handoff.
//   POST  retries up to 25 due, undelivered outbox rows (manual or scripted).
//   GET   the scheduled retry AND the health check: drains a few due rows first, then reports
//         durable state (what is waiting, what is exhausted, which contacts never had their
//         notification sent). Returns 503 when something needs a human. Vercel Cron only issues
//         GET, which is why the retry lives here; vercel.json schedules it (see
//         docs/gary-contact-pipeline.md for the plan-dependent frequency).
// Callers: Vercel Cron (bearer = CRON_SECRET, added by Vercel automatically) or an operator /
// uptime checker (bearer = GARY_FUNNEL_DRAIN_SECRET). Neither response exposes visitor details.
const GET_DRAIN_LIMIT = 5;

function authorized(request: NextRequest): boolean {
  const header = request.headers.get('authorization');
  const accepted = [process.env.GARY_FUNNEL_DRAIN_SECRET, process.env.CRON_SECRET].filter((s): s is string => Boolean(s));
  return accepted.some((secret) => header === `Bearer ${secret}`);
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
  // Retry first, so the numbers below describe what is still stuck after this attempt.
  const drained = await drainFunnelEventOutbox({ limit: GET_DRAIN_LIMIT });
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
    { ok: problems.length === 0, checkedAt: now.toISOString(), drained, outbox, contacts: { notificationFailed, sendingStale }, problems },
    { status: problems.length === 0 ? 200 : 503 }
  );
}
