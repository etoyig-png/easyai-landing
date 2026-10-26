# Gary and contact intake: reconciled development state

Updated 2026-10-26. This document describes code and isolated tests, not production readiness.
Historical PR #15 environment observations have not been reverified with provider access.

## Existing paths and preservation

The backend reconciliation is stacked on website design commit
`0148b750ba70a96fc75e5848786afb9c148d79da`, which contains PR #16 commit
`6bd2f8ba581cc89ae9be64f7fa389f924586176e`. Homepage, global styles and existing
mobile fixes are preserved. PR #15's contact-form removal and hello@ routing change
are intentionally excluded: the existing form remains, and email destinations still
resolve through the current main branch's info@ business-inbox configuration.
Gary is the public AIM assistant; no second assistant is introduced.

Gary supports ordinary conversation and Name → Contact → Reason → Confirm and Send.
The existing session capability authenticates every existing-session request.
Scripted turns now share the transcript/message ceiling with model-backed turns.
The server owns site/channel/recipient configuration. Pre-confirmation editing remains supported.

## Durable intake and retries

Gary confirmation uses `lib/gary/contactSubmission.ts`: durable contact limiter,
per-session transaction lock, PublicContact plus FunnelEventOutbox, notification,
notification settlement, then background webhook delivery. ReadCommitted isolation
under the transaction-scoped advisory lock lets waiting confirmations see the winner's
committed claim. PublicContact.sourceSessionId remains unique. A fresh sending lease
prevents a second sender; a sent notification replays success.

After the first send attempt, the confirmed normalized details are immutable. A changed
retry is rejected honestly without changing the contact or already-queued handoff.
An unchanged retry reuses its provider idempotency key. An uncertain send older than
the provider's 24-hour idempotency window requires operator reconciliation instead
of an automatic resend. This avoids claiming corrected content was delivered when
only the original content may have been accepted.

The retained contact form uses `lib/contactSubmission.ts` and the same PublicContact,
FunnelEventOutbox, mail sender and rate limiter. Its logical identity is a SHA-256 digest
of the validated content and the existing form-instance timestamp. Unchanged retries
claim the same record, event and provider key; edits create a distinct logical request.
No Gary session is fabricated: form events use the durable contact ID for correlation
and `channel=contact-form`. Notification failure retains both record and handoff and
returns a failure response. Outbox delivery does not assert email delivery.

The original honeypot, minimum fill time, body limits and fail-closed durable limits
remain. Spam intentionally gets a generic 200 without persistence; that response is
not evidence of accepted intake.

## Command Center contracts

Funnel delivery wraps existing stored rows in the strict receiver envelope:
`eventType`, `eventId`, `sessionId`, optional `funnelCorrelationId`, `payload`.
The existing row key is the receiver idempotency identity. Retry state/backoff and
exhausted rows remain durable. Scheduled drain configuration is prepared in vercel.json;
its production activation and secrets are not verified.

Assessment delivery now uses the receiver's `companyName`, `contactName`, `contactEmail`
and optional `contactPhone` fields, with a stable key derived from Submission.id.
CC reconciliation retains that external ID, Gary correlation and source delivery status.
Assessment-package IDs are stable per organization and assessment, so concurrent/replayed
package saves use database conflict handling and a scoped readback, not new package IDs.

Important remaining limitation: the current CC event receiver durably stores funnel events
but does not call the existing Lead intake service. Event receipt is not proof of a Lead,
Prospect, business follow-up or notification. Automatic Lead consumption/enrichment remains
unfinished; Lead → Prospect must remain founder-controlled. Company IQ runtime connectivity
is unverified; no new knowledge system was added.

## Migration and recovery packet (not authorization to execute in production)

Required website migrations are the four on main plus:
- 20260914000000_public_contact_reason_channel
- 20260914120000_public_contact_session_idempotency

Both new migrations explicitly use BEGIN/COMMIT. Synthetic PostgreSQL rehearsal preserved
contacts; a pre-change pg_dump restored into a second database. A duplicate-session negative
control rejected the unique index and left zero partial notification columns. All six
migrations also passed Prisma migrate deploy against a fresh isolated database, followed
by a repeat run with zero pending migrations. This is not a production backup verification.

Before any production change: verify the website project identity, SELECT 1, table names,
migration names and preservation counts; obtain an operator-owned verified private backup;
rehearse against an authorized isolated restoration of the actual schema. Review any duplicate
sourceSessionId counts without automatically deleting or rewriting customer data. Check CC
migration 20260806_public_funnel_events_and_lead_constraints.sql and later security migrations
against actual deployed history. No production migration was run here.

Rollback should first restore the previously verified application SHA while retaining additive
columns and contact/outbox records. Do not drop new columns/indexes or edit migration history
as a routine rollback. Pause outbound delivery through separately approved configuration,
reconcile any provider-accepted uncertain notification before retry, and preserve undelivered
or exhausted outbox rows. Restore a backup only through a separately reviewed recovery plan.

## Required external gates

Supabase management currently returns 401, Vercel project management 403. No provider connector
or database binding is configured in this task. A live homepage GET returns 200; no production
form/Gary API submission, customer email, paid provider call, migration or deployment was made.
Preview database/email/webhook isolation is unverified and must precede any live submission.
The owner must provide project-scoped Supabase/Vercel access through secure settings, not chat.
Inbox direction is unresolved; existing behavior is preserved. Provider configuration, production
backup/restore proof, authorized test recipient, canonical task updates and release remain gated.
