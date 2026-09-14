# Gary / AIM contact pipeline — as-built map, decisions, operations

Permanent architecture record for the public contact path. Gary (AIM, the Artificial
Intelligence Interaction Manager) is Easy AI's primary contact interaction layer; this document
covers what happens after a visitor confirms a contact request, where it can fail, how Easy AI
finds out, and how to recover. Update it with any material change to the files it names.

Last verified against: branch `fix/gary-primary-contact-pipeline` (PR #15), 2026-09-14.

## 1. As-built flow and status

| Stage | Where | Status | Notes |
|---|---|---|---|
| Contact intent → Name → Contact → Reason → Confirm | `lib/gary/contactFlow.ts`, `components/gary/GaryPanel.tsx`, `app/api/gary/message/route.ts` | READY | Deterministic script, no model. Server holds no flow state; the panel echoes the draft. Intent only enters the flow when `SiteConfig.actions.contactFlow` is on. |
| Rate limit | `lib/contactRateLimit.ts` → `ContactRateLimitEvent` | BROKEN IN PRODUCTION | Code is sound (hashed identity, Serializable + advisory lock, fails closed). Migration `20260909000000_contact_rate_limit` is **not applied** in production, so every send currently fails closed. |
| Claim: `PublicContact` + session link + outbox row | `lib/gary/contactSubmission.ts` (`productionContactSubmissionDeps.claim`) | READY (code) / PENDING (schema) | One Serializable transaction under `pg_advisory_xact_lock(hashtext('contact-flow:<sessionId>'))`. Requires migrations `20260914000000_public_contact_reason_channel` and `20260914120000_public_contact_session_idempotency`. |
| Email notification | `lib/resend.ts` `sendContactMessage` → `contactRecipient()` | READY | To `hello@easyaiconsult.com` (or `CONTACT_NOTIFICATION_EMAIL`). Reply-To only when the visitor gave an email. Non-production redirects to `EMAIL_TEST_RECIPIENT` or refuses. |
| Settle notification state | `contactSubmission.ts` `settle` | READY | `notificationStatus` → `sent` (+ transcript marker) or `failed` (+ error). |
| `FunnelEventOutbox` row | `lib/gary/funnelEvents.ts` `recordFunnelEvent` (inside the claim transaction) | READY | Unique `idempotencyKey`; created before any email; a concurrent insert is reported `existing`. |
| Webhook delivery | `funnelEvents.ts` `deliverFunnelEvent` / `drainFunnelEventOutbox` | BROKEN IN PRODUCTION | Envelope now matches the receiver. `GARY_FUNNEL_WEBHOOK_URL/SECRET` are **not set** in production, so every row waits (`not-configured`). 8 attempts, exponential backoff (30 s → 1 h cap), 8 s timeout per call. |
| Command Center event storage | `mr-life-command-center` `/api/easy-ai/public-funnel/events` → `easy_ai_public_funnel_events` | READY (receiver) | Bearer token, envelope-validated, unique on `event_id`. |
| Lead / Prospect creation | `mr-life-command-center` | **MISSING** | Nothing consumes `contact.captured` into a Client Record. Events are listed for founder visibility only. This is the break after event storage. |
| Human follow-up | Command Center Client Records | MANUAL | Founder reads the inbox / event list and works the record. |

## 2. Boundaries

- **Application boundary.** `easyai-landing` owns the public site, Gary, the contact pipeline, and its own Postgres (Supabase, one database shared by Production **and** Preview). `mr-life-command-center` owns the CRM and its own Supabase. They talk only server-to-server over the bearer-authenticated funnel webhook. Neither reads the other's database.
- **Public → privileged trust boundary.** Everything in a request body is untrusted: the contact draft (validated and length-capped in `contactFlow.ts`), `sessionId` (must carry a valid HMAC `sessionCapability`), `anonymousId`. Nothing in a request can select site, tenant, organisation, destination, or assistant identity: those come from `lib/siteConfig.ts`, resolved from server environment only. Client components may not import `lib/siteConfig.ts` or `lib/emailRouting.ts` (test-enforced).
- **Server-derived ownership.** `PublicContact.siteKey` and the outbox payload's `siteKey`/`channel` are written from `SiteConfig`, never from input (tested).
- **Email-provider boundary.** `lib/resend.ts` is the only Resend caller. From addresses stay on the authenticated `mail.easyaiconsult.com` senders. `resolveDelivery()` lets only `VERCEL_ENV=production` reach real recipients.
- **Webhook authentication boundary.** Sender: `Authorization: Bearer GARY_FUNNEL_WEBHOOK_SECRET` (server env only). Receiver compares against `EASY_AI_PUBLIC_FUNNEL_WEBHOOK_TOKEN`. Operations endpoint `/api/gary/funnel-outbox/drain` requires `GARY_FUNNEL_DRAIN_SECRET`.
- **Rate limit.** Per hashed client identity, 3 contact sends per hour, fails closed. It is not the idempotency mechanism.

## 3. Environments

| | Production | Preview | Development / CI |
|---|---|---|---|
| Database | Supabase prod (`DATABASE_URL`, `DIRECT_URL`) | **Same** Supabase prod database | none in CI; disposable Postgres locally (`TEST_DATABASE_URL` for the integration test) |
| `GARY_*` secrets | set | **not set** → Gary API returns 500 on every preview | set locally to placeholders |
| Email | real, to `contactRecipient()` | redirected to `EMAIL_TEST_RECIPIENT` or refused (never a real inbox) | refused unless `EMAIL_TEST_RECIPIENT` |
| Funnel webhook | **not configured** | not configured | not configured |
| Migrations | applied manually with `prisma migrate deploy` (Vercel build is `next build` only) | shares prod schema | `prisma migrate deploy` against the disposable database |

Consequence: a preview deployment cannot exercise Gary's server path, and if it could, it would write to the production database. Verify the server path with unit tests plus the gated integration test against a disposable database; verify the client on a preview with a stubbed `/api/gary/message`.

## 4. Approved patterns and where they are reused

| Need | Existing pattern | Classification | Used by the contact pipeline |
|---|---|---|---|
| Per-key mutual exclusion in Postgres | `pg_advisory_xact_lock(hashtext(key))` inside a Serializable transaction — `lib/assessmentAdmission.ts`, `lib/contactRateLimit.ts`, `lib/gary/handoffState.ts` | KEEP / REUSE | `claim` takes `contact-flow:<sessionId>` |
| One row per session, database-enforced | `AssessmentHandoff.sessionId @unique` + upsert under the session lock (`handoffState.ts`) | REUSE | `PublicContact.sourceSessionId @unique` + upsert |
| Transactional outbox with retry state | `FunnelEventOutbox` (`idempotencyKey @unique`, `attempts`, `nextAttemptAt`, `lastError`, `deliveredAt`) + `drainFunnelEventOutbox` | KEEP / REUSE | `recordFunnelEvent(tx, …)` inside the claim; `deliverFunnelEvent` after |
| Bounded outbound HTTP | `AbortController` + 8 s timeout (`lib/assessmentSync.ts`, `lib/commandCenter.ts`) | REUSE | webhook delivery |
| Honest email failure | "never report success for a message that was not delivered" (`app/api/assessment/route.ts`, PR #12) | REUSE | `saved-not-notified` vs `sent` |
| Operational failure record | outbox row with `lastError`/`attempts`; `Submission.status='failed'` | REUSE / extended | `PublicContact.notificationStatus/Error/Attempts` |
| Protected operations endpoint | `POST /api/gary/funnel-outbox/drain` with `GARY_FUNNEL_DRAIN_SECRET` | REUSE / extended | `GET` health on the same route |
| Second outbox `CrrOutboxEvent` | written by `app/api/gary/handoff/route.ts`; **no reader anywhere** | STALE / CONSOLIDATION CANDIDATE | **not written** by the pipeline (see §6) |
| Logging | `console.error` only; no log platform, no alerting | KEEP (smallest) | stage-tagged lines `[contact-pipeline] stage=… sessionId=…`; no PII |

## 5. Decision record — ADR-001: session idempotency and outbox-before-email

**Context.** PR #15's first pipeline did find-before-create on `PublicContact` (non-unique `sourceSessionId`), emailed, then persisted best-effort and fired the outbox write with `void`. Two simultaneous confirmations could create two contacts and two emails; an email outage prevented the outbox row; a serverless invocation could end before the outbox write completed.

**Decision.**
1. `PublicContact.sourceSessionId` is UNIQUE. One logical contact per Gary session; a retry updates the same row.
2. The claim is one Serializable transaction under the session advisory lock: contact upsert + `identifiedContactId` link + `contact.captured` outbox row. They commit together, **before** the email. A provider outage therefore cannot strand the handoff.
3. Notification state lives on the contact (`pending | sending | sent | failed`, attempts, error, `notifiedAt`). `sending` is a 60 s lease (`updatedAt` is the lease clock) so a request that dies mid-send is recoverable and a concurrent request gets `in-progress`, not a duplicate.
4. Outbox storage returns a verifiable result (`created | existing`, or throws) and delivery is awaited with a timeout inside the request. `void` is not used for anything the visitor's outcome depends on.
5. The pipeline's outbox key is producer-scoped: `contact.captured:<sessionId>:<channelKey>`. The assessment handoff route already emits `contact.captured:<sessionId>` (a conversation summary); sharing the key would silently drop the visitor's details whenever they visited the assessment first. The receiver dedupes by `eventId`; a Lead consumer must upsert by `sessionId`.
6. The pipeline does not write `CrrOutboxEvent` (§6).

**Consequences.** Two migrations pending (see §8). The contact record can exist with `notificationStatus='failed'`; that is a monitored state, not a bug. `contact.captured` may arrive twice per session from two producers with different `eventId`s.

**Rejected.** In-memory locks (Vercel Functions share no memory). Relying on the IP limiter for idempotency (limits a connection, not a session). Email before storage (strands the opportunity). A new queue or email-retry service (nothing in the repo needs one yet; the outbox already carries retry state).

## 6. CRR outbox decision

- **Search evidence.** `grep -rn "crrOutboxEvent\|CrrOutboxEvent" app lib components` (non-test): one writer, `app/api/gary/handoff/route.ts:93` (best-effort, after the LLM summary). Zero readers. No drain, no route, no cron, no Command Center endpoint reads it. No retention rule; rows accumulate with `status='pending'` forever.
- **Decision.** PR #15's new `writeCrrOutbox` is **removed** from the contact pipeline (test-enforced in `lib/gary/singleAssistant.test.ts`). The schema and the pre-existing handoff-route writer are left untouched; removing them is a separate decision.
- **Why.** `FunnelEventOutbox` is the one Command Center handoff that has a sender, an envelope contract, retry state, and a receiver. Writing the same contact into a second, unread table is a duplicate system with no consumer, which Module A forbids.

## 7. Monitoring and alerting — how Easy AI knows before a customer does

Durable indicators (queryable, not log-only):

| Failure | Durable indicator | Correlation |
|---|---|---|
| Contact stored but email never accepted | `PublicContact.notificationStatus='failed'` (+ `notificationError`) | `sourceSessionId`, contact `id` |
| Request died mid-send | `notificationStatus='sending'` older than 60 s | `sourceSessionId` |
| Handoff not delivered | `FunnelEventOutbox.deliveredAt IS NULL` | `idempotencyKey` = `contact.captured:<sessionId>:<channel>` |
| Retries exhausted | `deliveredAt IS NULL AND attempts >= 8` (`lastError` ends "(max attempts reached)") | same |
| Webhook not configured | `GET …/drain` → `outbox.configured=false` | — |
| Nothing durable stored | none by design — the visitor is told to retry; log line `[contact-pipeline] stage=storage` | `sessionId` in the log |

Health endpoint: `GET /api/gary/funnel-outbox/drain` with `Authorization: Bearer <GARY_FUNNEL_DRAIN_SECRET>` → `200 {ok:true}` or `503 {ok:false, problems:[…]}`. Counts only; no visitor data.

Alerting (to be configured — not built here, needs an env/uptime-checker decision): point any uptime checker at the health endpoint every 15 minutes with the bearer header; alert on non-200.

| Condition | Severity | Owner | Expected response |
|---|---|---|---|
| `contact(s) with unsent notification` | HIGH — a real person is waiting | Toy | Within the business day: read the contact in the database (or Command Center once the consumer exists), reach out by hand, then set `notificationStatus='sent'`. |
| `contact(s) stuck in sending` | HIGH | Toy | Same; the row is reclaimable, so the visitor may also have retried. |
| `handoff event(s) exhausted retries` | MEDIUM — email already went out | Toy | Fix the receiver/config, then reset `attempts=0, nextAttemptAt=now()` on the row (or POST the drain route). |
| `undelivered handoff older than 1h` | MEDIUM | Toy | Check `GARY_FUNNEL_WEBHOOK_*` and the Command Center; POST the drain route. |
| `funnel webhook not configured` | LOW until leads matter, then MEDIUM | Toy | Set the two production variables. |

Logs: every pipeline failure is one line `[contact-pipeline] stage=<rate-limit|storage|notification|settle|webhook> sessionId=<id> error=<message>`; outbox failures `[funnel-outbox] stage=<store|webhook> …`. Session id only, never name/email/phone. Vercel Hobby retains logs ~1 hour, which is why the durable indicators above exist.

Manual recovery SQL (read, then act deliberately):

```sql
-- contacts a human must follow up
select id, "sourceSessionId", "notificationStatus", "notificationAttempts", "notificationError", "updatedAt"
from "PublicContact" where "notificationStatus" in ('failed','sending') order by "updatedAt";

-- handoffs waiting or exhausted
select "idempotencyKey", attempts, "lastError", "nextAttemptAt", "createdAt"
from "FunnelEventOutbox" where "deliveredAt" is null order by "createdAt";

-- re-arm an exhausted handoff after fixing the cause
update "FunnelEventOutbox" set attempts = 0, "nextAttemptAt" = now() where "idempotencyKey" = '<key>';
```

## 8. Release and rollback plan (prepared, not executed)

**Migration order** (all pending in production; apply in this order, each is additive):
1. `20260909000000_contact_rate_limit` — creates `ContactRateLimitEvent`. Unblocks every contact send.
2. `20260914000000_public_contact_reason_channel` — adds `reason`, `channel`, `siteKey`.
3. `20260914120000_public_contact_session_idempotency` — adds notification-state columns, `UNIQUE (sourceSessionId)`, status index. **Preflight first** (SQL in the migration header). Expected zero duplicates: no code on `main` has ever written `PublicContact`.

`prisma migrate deploy` applies exactly these three, in order, each in its own transaction. Run against the production `DIRECT_URL` **before** merging PR #15.

**Deployment compatibility.** Code on `main` never writes `PublicContact`, so applying the migrations before deploy is safe. Deploying PR #15 before the migrations would make every contact send fail closed (`storage`) — honest to the visitor, but a dead contact path. Order: migrate → merge → Vercel deploys `main`.

**Environment variables by scope.**
- Production, required for delivery to the Command Center: `GARY_FUNNEL_WEBHOOK_URL`, `GARY_FUNNEL_WEBHOOK_SECRET` (= Command Center `EASY_AI_PUBLIC_FUNNEL_WEBHOOK_TOKEN`). Required for operations: `GARY_FUNNEL_DRAIN_SECRET`. Optional: `CONTACT_NOTIFICATION_EMAIL` (defaults to `hello@`), `SITE_*`, `ASSISTANT_*`. Review the hidden values of `RESULT_EMAIL_REPLY_TO` and `ASSESSMENT_NOTIFICATION_EMAIL` (set 2026-07, before PR #12).
- Preview: `EMAIL_TEST_RECIPIENT` (a controlled inbox) if previews should ever send; the `GARY_*` secrets if previews should ever run Gary. Do **not** point previews at a separate database without also separating `DATABASE_URL`.

**Rollback.** Code: revert the merge commit; `main`'s contact page returns (its form also depends on migration 1). Schema: the migrations are additive; rolling back code does not require dropping them. To drop anyway: `DROP INDEX "PublicContact_sourceSessionId_key"; DROP INDEX "PublicContact_notificationStatus_updatedAt_idx"; ALTER TABLE "PublicContact" DROP COLUMN "notificationStatus", DROP COLUMN "notificationAttempts", DROP COLUMN "notifiedAt", DROP COLUMN "notificationError";` and delete the row from `_prisma_migrations`.

**Recovery scenarios.**
- Migration 3 fails on the unique index (duplicates found): nothing is applied from that migration (single transaction). Keep the newest row per session, null `sourceSessionId` on the older ones, re-run.
- Email succeeded, webhook failed: outbox retries automatically (8 attempts / ~2 h). If exhausted, re-arm (§7). Nothing is lost.
- Duplicate legacy session rows: not expected (no writer on `main`); handled by the preflight.

**Post-deployment smoke test** (authorized, controlled):
1. `GET /api/gary/funnel-outbox/drain` with the bearer → `200 ok:true` (or a 503 naming only `funnel webhook not configured` if the variables are still unset).
2. On the production site, open Gary via Contact, complete the four steps with Toy's own details and reason `Smoke test <date>`, press "Yes, send it" → Gary reports sent.
3. Database: exactly one `PublicContact` for that session with `notificationStatus='sent'`, `siteKey='easy-ai'`, `channel='assistant-contact-flow'`; one `FunnelEventOutbox` row keyed `contact.captured:<session>:assistant-contact-flow`.
4. External: one email in `hello@easyaiconsult.com` with subject `Gary contact request: <name>`.
5. Duplicate action: press "Yes, send it" again (or replay the request) → "already reached the Easy AI team"; still one row, one email.
6. Monitoring: health endpoint still `ok:true`; if the webhook is configured, the outbox row shows `deliveredAt` and the Command Center event list shows the event.

## 9. Active risks

| Risk | Status | Mitigation / owner |
|---|---|---|
| Production migrations unapplied (3) | OPEN, blocks all contact sends | Toy runs `prisma migrate deploy` |
| Funnel webhook not configured in production | OPEN | Toy sets two variables |
| No Lead/Prospect consumer in the Command Center | OPEN | next task in `mr-life-command-center`: upsert by `sessionId`; expect two `contact.captured` producers |
| Preview shares the production database and lacks Gary secrets | OPEN | decision needed: separate preview DB or accept no-Gary previews |
| Other `void enqueueFunnelEvent(...)` calls (session started, rollup, assessment started) may not complete in a serverless request | OPEN, analytics only, not lead-critical | fold into a later pass; same `enqueueFunnelEvent` contract now returns a result |
| `CrrOutboxEvent` still written by the handoff route with no reader | OPEN | separate removal decision |
| Vercel Hobby log retention ~1 h | ACCEPTED | durable indicators + health endpoint |
| No alert wired to the health endpoint | OPEN | uptime checker decision |
