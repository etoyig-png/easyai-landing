import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma';

// Sibling to, not a replacement for, lib/commandCenter.ts — that module's existing
// assessment_completed/assessment_failed webhook stays exactly as it is. This handles only
// Gary-chat-originated funnel events, delivered to a separate, independently-configured
// endpoint so the two channels can never cross-wire.
const FUNNEL_WEBHOOK_URL = process.env.GARY_FUNNEL_WEBHOOK_URL;
const FUNNEL_WEBHOOK_SECRET = process.env.GARY_FUNNEL_WEBHOOK_SECRET;

export const FUNNEL_MAX_ATTEMPTS = 8;
const BASE_BACKOFF_MS = 30_000; // 30s, doubling per attempt, capped
/** Bound on one webhook call so an unresponsive receiver cannot stall a visitor's request. */
const DELIVERY_TIMEOUT_MS = 8_000;

export interface FunnelEventInput {
  eventType: string;
  payload: Record<string, unknown>;
  /** Caller-supplied idempotency key — should be stable across retries of the same logical event. */
  idempotencyKey: string;
}

/**
 * The verifiable result of durable storage. A caller that needs the handoff to exist (the
 * contact pipeline) checks this; a caller recording analytics best-effort can ignore it.
 */
export type FunnelEventStorage = { stored: 'created' | 'existing' } | { stored: 'failed'; error: string };

/** The subset of the client the outbox writer needs, so it runs inside a caller's transaction. */
export type FunnelEventWriter = Pick<Prisma.TransactionClient, 'funnelEventOutbox'>;

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002';
}

/**
 * Durably records one event, inside whatever client or transaction the caller passes, and
 * reports whether the row was created or already existed. THROWS on a storage failure so a
 * caller inside a transaction rolls back with it; nothing about delivery happens here.
 *
 * Idempotency is enforced by the database (idempotencyKey is unique), not by the read that
 * precedes the insert: a concurrent insert of the same key surfaces as P2002 and is reported
 * as 'existing', never as a second row.
 */
export async function recordFunnelEvent(db: FunnelEventWriter, input: FunnelEventInput): Promise<{ stored: 'created' | 'existing' }> {
  const existing = await db.funnelEventOutbox.findUnique({ where: { idempotencyKey: input.idempotencyKey }, select: { id: true } });
  if (existing) return { stored: 'existing' };
  try {
    await db.funnelEventOutbox.create({
      data: { eventType: input.eventType, payload: input.payload as never, idempotencyKey: input.idempotencyKey },
    });
    return { stored: 'created' };
  } catch (err) {
    if (isUniqueViolation(err)) return { stored: 'existing' };
    throw err;
  }
}

/**
 * Records the event and then makes one best-effort delivery pass. Never throws, so it is safe
 * for callers recording analytics events in the middle of a request; the storage result is
 * returned so a caller that cares can tell "stored" from "failed to store" instead of both
 * looking like a resolved promise.
 */
export async function enqueueFunnelEvent(input: FunnelEventInput): Promise<FunnelEventStorage> {
  let storage: FunnelEventStorage;
  try {
    storage = await recordFunnelEvent(prisma, input);
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown storage error';
    console.error(`[funnel-outbox] stage=store eventType=${input.eventType} key=${input.idempotencyKey} error=${error}`);
    return { stored: 'failed', error };
  }
  // An already-recorded event was drained when it was first recorded; nothing new to push.
  if (storage.stored === 'created') await drainFunnelEventOutbox({ limit: 5 });
  return storage;
}

function backoffDelayMs(attempts: number): number {
  return Math.min(BASE_BACKOFF_MS * 2 ** attempts, 60 * 60 * 1000); // cap at 1 hour
}

/**
 * Shapes a stored outbox row into the exact envelope the Command Center's
 * /api/easy-ai/public-funnel/events route accepts: {eventType, eventId, sessionId,
 * funnelCorrelationId, payload}. That receiver rejects ANY other top-level key with a 400, so
 * everything else the event carries — including eventVersion — belongs inside `payload`, which
 * the receiver deliberately leaves schema-flexible per event type.
 *
 * Done here at drain time rather than at enqueue time so rows already sitting in the outbox in
 * the old flat shape are reshaped on their next delivery attempt instead of being stranded.
 * `eventId` stays the row's idempotencyKey, which is what makes the receiver's unique-on-event_id
 * upsert idempotent — that mapping is unchanged.
 */
function buildEventEnvelope(row: { idempotencyKey: string; eventType: string; eventVersion: number; payload: unknown }) {
  const stored = (row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)
    ? row.payload
    : {}) as Record<string, unknown>;
  const { sessionId, funnelCorrelationId, ...rest } = stored;

  return {
    eventType: row.eventType,
    eventId: row.idempotencyKey,
    sessionId,
    ...(funnelCorrelationId === undefined ? {} : { funnelCorrelationId }),
    payload: { ...rest, eventVersion: row.eventVersion },
  };
}

export type FunnelDeliveryResult = 'delivered' | 'retry-scheduled' | 'exhausted' | 'not-configured';

type OutboxRow = { id: string; idempotencyKey: string; eventType: string; eventVersion: number; payload: unknown; attempts: number };

/**
 * One delivery attempt for one row, with the retry bookkeeping that makes the outbox durable:
 * a failure schedules the next attempt with exponential backoff; the last allowed failure
 * leaves the row undelivered with its full error history (never deleted) so it stays visible
 * for the health check and for manual recovery.
 */
async function deliverRow(row: OutboxRow): Promise<FunnelDeliveryResult> {
  if (!FUNNEL_WEBHOOK_URL || !FUNNEL_WEBHOOK_SECRET) return 'not-configured';
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(FUNNEL_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${FUNNEL_WEBHOOK_SECRET}` },
        body: JSON.stringify(buildEventEnvelope(row)),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) throw new Error(`Command Center responded ${response.status}`);
    await prisma.funnelEventOutbox.update({ where: { id: row.id }, data: { deliveredAt: new Date() } });
    return 'delivered';
  } catch (err) {
    const attempts = row.attempts + 1;
    const lastError = err instanceof Error ? err.message : 'Unknown delivery error';
    if (attempts >= FUNNEL_MAX_ATTEMPTS) {
      // Stop retrying but never delete — a permanently-failed row stays visible with its
      // full error history for manual investigation, rather than being silently dropped.
      // Rows at the ceiling are excluded from the due query, so they no longer sit at the
      // head of every drain.
      await prisma.funnelEventOutbox.update({ where: { id: row.id }, data: { attempts, lastError: `${lastError} (max attempts reached)` } });
      console.error(`[funnel-outbox] stage=webhook status=exhausted eventType=${row.eventType} key=${row.idempotencyKey} error=${lastError}`);
      return 'exhausted';
    }
    await prisma.funnelEventOutbox.update({
      where: { id: row.id },
      data: { attempts, lastError, nextAttemptAt: new Date(Date.now() + backoffDelayMs(attempts)) },
    });
    return 'retry-scheduled';
  }
}

/**
 * Delivers one specific event now, if it is due and undelivered. Used by the contact pipeline
 * after the outbox row is committed so the visitor's request carries the first attempt, and
 * the caller learns whether the handoff is delivered, queued for retry, or exhausted.
 */
export async function deliverFunnelEvent(idempotencyKey: string): Promise<FunnelDeliveryResult | 'delivered-earlier' | 'not-due'> {
  if (!FUNNEL_WEBHOOK_URL || !FUNNEL_WEBHOOK_SECRET) return 'not-configured';
  const row = await prisma.funnelEventOutbox.findUnique({ where: { idempotencyKey } });
  if (!row) return 'not-due';
  if (row.deliveredAt) return 'delivered-earlier';
  if (row.attempts >= FUNNEL_MAX_ATTEMPTS) return 'exhausted';
  if (row.nextAttemptAt > new Date()) return 'retry-scheduled';
  return deliverRow(row);
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
    where: { deliveredAt: null, nextAttemptAt: { lte: new Date() }, attempts: { lt: FUNNEL_MAX_ATTEMPTS } },
    orderBy: { nextAttemptAt: 'asc' },
    take: options.limit ?? 10,
  });

  let delivered = 0;
  let failed = 0;
  for (const row of due) {
    const result = await deliverRow(row);
    if (result === 'delivered') delivered += 1;
    else failed += 1;
  }
  return { delivered, failed };
}

/**
 * Durable health indicators for the handoff, readable without a log platform: what is still
 * waiting, what will never be retried automatically, and how old the oldest wait is.
 */
export async function funnelOutboxHealth(now = new Date()) {
  const [undelivered, exhausted, oldest] = await Promise.all([
    prisma.funnelEventOutbox.count({ where: { deliveredAt: null, attempts: { lt: FUNNEL_MAX_ATTEMPTS } } }),
    prisma.funnelEventOutbox.count({ where: { deliveredAt: null, attempts: { gte: FUNNEL_MAX_ATTEMPTS } } }),
    prisma.funnelEventOutbox.findFirst({ where: { deliveredAt: null }, orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
  ]);
  return {
    configured: Boolean(FUNNEL_WEBHOOK_URL && FUNNEL_WEBHOOK_SECRET),
    undelivered,
    exhausted,
    oldestUndeliveredAgeSeconds: oldest ? Math.floor((now.getTime() - oldest.createdAt.getTime()) / 1000) : 0,
  };
}
