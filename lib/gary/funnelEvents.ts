import { prisma } from '../prisma';

// Sibling to, not a replacement for, lib/commandCenter.ts — that module's existing
// assessment_completed/assessment_failed webhook stays exactly as it is. This handles only
// Gary-chat-originated funnel events, delivered to a separate, independently-configured
// endpoint so the two channels can never cross-wire.
const FUNNEL_WEBHOOK_URL = process.env.GARY_FUNNEL_WEBHOOK_URL;
const FUNNEL_WEBHOOK_SECRET = process.env.GARY_FUNNEL_WEBHOOK_SECRET;

const MAX_ATTEMPTS = 8;
const BASE_BACKOFF_MS = 30_000; // 30s, doubling per attempt, capped

export interface FunnelEventInput {
  eventType: string;
  payload: Record<string, unknown>;
  /** Caller-supplied idempotency key — should be stable across retries of the same logical event. */
  idempotencyKey: string;
}

/** Durably records the event, then makes one best-effort delivery attempt. Never throws — enqueueing must never break the caller's request. */
export async function enqueueFunnelEvent(input: FunnelEventInput): Promise<void> {
  try {
    const existing = await prisma.funnelEventOutbox.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) return; // already enqueued — idempotent no-op
    await prisma.funnelEventOutbox.create({
      data: {
        eventType: input.eventType,
        payload: input.payload as never,
        idempotencyKey: input.idempotencyKey,
      },
    });
  } catch (err) {
    console.error('Failed to enqueue funnel event', input.eventType, err);
    return;
  }
  await drainFunnelEventOutbox({ limit: 5 });
}

function backoffDelayMs(attempts: number): number {
  return Math.min(BASE_BACKOFF_MS * 2 ** attempts, 60 * 60 * 1000); // cap at 1 hour
}

/**
 * Attempts delivery of due, undelivered rows. Real retry state (attempts/nextAttemptAt/lastError)
 * with exponential backoff — exercised two ways: opportunistically, best-effort, right after
 * enqueue and at the start of the next chat message request (this function, called inline); and
 * via app/api/gary/funnel-outbox/drain/route.ts for a future scheduled trigger. What this does
 * NOT include: an actual cron/queue schedule calling that route automatically — that's a
 * deployment decision, not built in this pass. Don't describe delivery as fully automated
 * end-to-end without that piece.
 */
export async function drainFunnelEventOutbox(options: { limit?: number } = {}): Promise<{ delivered: number; failed: number }> {
  if (!FUNNEL_WEBHOOK_URL || !FUNNEL_WEBHOOK_SECRET) return { delivered: 0, failed: 0 };

  const due = await prisma.funnelEventOutbox.findMany({
    where: { deliveredAt: null, nextAttemptAt: { lte: new Date() } },
    orderBy: { nextAttemptAt: 'asc' },
    take: options.limit ?? 10,
  });

  let delivered = 0;
  let failed = 0;

  for (const row of due) {
    try {
      const response = await fetch(FUNNEL_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${FUNNEL_WEBHOOK_SECRET}` },
        body: JSON.stringify({ eventId: row.idempotencyKey, eventType: row.eventType, eventVersion: row.eventVersion, ...(row.payload as object) }),
      });
      if (!response.ok) throw new Error(`Command Center responded ${response.status}`);
      await prisma.funnelEventOutbox.update({ where: { id: row.id }, data: { deliveredAt: new Date() } });
      delivered += 1;
    } catch (err) {
      failed += 1;
      const attempts = row.attempts + 1;
      const lastError = err instanceof Error ? err.message : 'Unknown delivery error';
      if (attempts >= MAX_ATTEMPTS) {
        // Stop retrying but never delete — a permanently-failed row stays visible with its
        // full error history for manual investigation, rather than being silently dropped.
        await prisma.funnelEventOutbox.update({ where: { id: row.id }, data: { attempts, lastError: `${lastError} (max attempts reached)` } });
        continue;
      }
      await prisma.funnelEventOutbox.update({
        where: { id: row.id },
        data: { attempts, lastError, nextAttemptAt: new Date(Date.now() + backoffDelayMs(attempts)) },
      });
    }
  }

  return { delivered, failed };
}
