# Gary and contact intake: reconciled development state

Updated 2026-10-29. This document describes code and isolated tests, not production readiness.
Historical PR #15 environment observations have not been reverified with provider access.

## Existing paths and preservation

The current candidate preserves website PR #17 design commit
`eaed8409a6e4855ed0255d12988fd4628ec28ce9` and PR #16 commit
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
The sync row (`assessment.sync:<Submission.id>`) is created in the admission transaction with
the submission itself, held back for 15 minutes and without a result or status. Completion
writes the final Submission status and the full sync body in one transaction, makes the row due
and attempts delivery as-is to COMMAND_CENTER_ASSESSMENT_SYNC_URL, never to the funnel webhook.
If completion persistence fails, a status/result-only retry preserves the final HTML in
Submission. The drain recovers that complete body; it never sends a pending placeholder.
An intent with no generated result remains visible and retryable without consuming attempts,
including after the 15-minute hold. Its age is reported as an operational failure needing
reconciliation; the drain never regenerates a paid result or claims delivery.
Acknowledgements compare the exact transmitted payload, so a stale response cannot settle a
newer body. Completion reopens an old delivered provisional intent. Final bodies use the
receiver's final-v1 receipt stage and complete the same existing Assessment/package; ambiguous
external IDs conflict before any package write. Completed results cannot be overwritten.
The receiver and website must be released as a verified compatible pair, never independently
pointed at shared production providers from Preview.

The paired CC PR #58 candidate at `32ed74a728bb8b4226599e9d2afaea3c861c5653`
now invokes `processPublicFunnelContact` and the existing `ingestFunnelContact` service.
It validates logical contact/session identity, retains each event's immutable intake key,
and records a scoped processing receipt. Bounded recovery runs through the existing archive
cron; an older failed attempt cannot overwrite a completed receipt. Ambiguous matches stay
pending review, and Lead → Prospect remains founder-controlled. The consumer does not send
email, call a model or write assessment packages. These are published implementation and
local-test facts, not verified deployed behavior. Event receipt alone still does not prove
a processed Lead, notification or human follow-up. Company IQ runtime connectivity remains
unverified; no new knowledge system was added.

## Contact abuse retention

The existing authenticated funnel drain also calls `cleanupExpiredContactAttempts`.
It removes strictly older-than-seven-day events in bounded `SKIP LOCKED` batches while
retaining the one-hour admission window. Local PostgreSQL checks cover concurrent workers,
active denial, the exact cutoff and its millisecond neighbors, empty drains and a 1,504-row
backlog with invalid/oversized/fractional batch inputs. The cutoff assertion rejects a
deliberate inclusive-cutoff mutation. These checks do not prove that the deployed scheduler
runs or that its failure alert reaches an owner.

## Migration and recovery packet (not authorization to execute in production)

Required website migrations are the four on main plus:
- 20260914000000_public_contact_reason_channel
- 20260914120000_public_contact_session_idempotency
- 20261028000000_server_only_tables

The two contact migrations explicitly use BEGIN/COMMIT. Synthetic PostgreSQL rehearsal preserved
contacts; a pre-change pg_dump restored into a second database. A duplicate-session negative
control rejected the unique index and left zero partial notification columns. All six
migrations also passed Prisma migrate deploy against a fresh isolated database, followed
by a repeat run with zero pending migrations. The later seventh migration enables RLS and
revokes PUBLIC/anon/authenticated table grants while retaining owner/BYPASSRLS server access;
it was separately rehearsed on local PostgreSQL. Actual runtime-role/grant compatibility
still needs a representative isolated restoration. Neither rehearsal is production backup
verification or evidence that production migrations have been applied.

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
The required inbox direction remains info@; existing routing is preserved. Provider configuration, production
backup/restore proof, authorized test recipient, canonical task updates and release remain gated.
