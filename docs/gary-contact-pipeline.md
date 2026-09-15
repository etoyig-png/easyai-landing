# Gary / AIM contact pipeline — as-built map, decisions, operations

Permanent architecture record for the public contact path. Gary (AIM, the Artificial
Intelligence Interaction Manager) is Easy AI's primary contact interaction layer; this document
covers what happens after a visitor confirms a contact request, where it can fail, how Easy AI
finds out, and how to recover. Update it with any material change to the files it names.

Last verified against: branch `fix/gary-primary-contact-pipeline` (PR #15), 2026-09-15.

**Release status, stated separately.** *PR code:* corrected and gated (see PR #15). *Production:* NOT READY — three migrations unapplied; `GARY_FUNNEL_WEBHOOK_URL`, `GARY_FUNNEL_WEBHOOK_SECRET`, `GARY_FUNNEL_DRAIN_SECRET`, `CRON_SECRET` unset; no uptime checker or dependable human alert connected; Preview shares the production database. *Gary-to-Command-Center business flow:* NOT OPERATIONAL — the Command Center does not turn `contact.captured` into one Lead/Prospect per `sessionId` (§10).

## 1. As-built flow and status

| Stage | Where | Status | Notes |
|---|---|---|---|
| AI disclosure | `SiteConfig.assistant.disclosure` → `garyOpeningMessage` (new conversation) and `withOpeningDisclosure` (contact button opens the flow) | READY | "Hi, I'm Gary, Easy AI's AI assistant." is the first sentence Gary says at both entry points, before any personal information is requested. Configurable per site (`ASSISTANT_DISCLOSURE`). Not a step. |
| Contact intent → Name → Contact → Reason → Confirm | `lib/gary/contactFlow.ts`, `components/gary/GaryPanel.tsx`, `app/api/gary/message/route.ts` | READY | Deterministic script, no model. Server holds no flow state; the panel echoes the draft. Intent only enters the flow when `SiteConfig.actions.contactFlow` is on. Browser-covered by `tests/e2e/gary-contact-flow.spec.ts` (desktop + 360×800, 390×844, 412×915). |
| Rate limit | `lib/contactRateLimit.ts` → `ContactRateLimitEvent` | BROKEN IN PRODUCTION | Code is sound (hashed identity, Serializable + advisory lock, fails closed). Migration `20260909000000_contact_rate_limit` is **not applied** in production, so every send currently fails closed. |
| Claim: `PublicContact` + session link + outbox row | `lib/gary/contactSubmission.ts` (`productionContactSubmissionDeps.claim`) | READY (code) / PENDING (schema) | One Serializable transaction under `pg_advisory_xact_lock(hashtext('contact-flow:<sessionId>'))`. Requires migrations `20260914000000_public_contact_reason_channel` and `20260914120000_public_contact_session_idempotency`. |
| Email notification | `lib/resend.ts` `sendContactMessage` → `contactRecipient()` | READY | To `hello@easyaiconsult.com` (or `CONTACT_NOTIFICATION_EMAIL`). Reply-To only when the visitor gave an email. Non-production redirects to `EMAIL_TEST_RECIPIENT` or refuses. Provider idempotency key `contact-notification:<siteKey>:<sessionId>` (ADR-002). |
| Settle notification state | `contactSubmission.ts` `settle` | READY | `notificationStatus` → `sent` (+ transcript marker) or `failed` (+ error). |
| `FunnelEventOutbox` row | `lib/gary/funnelEvents.ts` `recordFunnelEvent` (inside the claim transaction) | READY | Unique `idempotencyKey`; created before any email; a concurrent insert is reported `existing`. |
| Webhook delivery | `funnelEvents.ts` `deliverFunnelEvent` (after the response via `waitUntil`, ADR-003) / `drainFunnelEventOutbox` | BROKEN IN PRODUCTION | Envelope matches the receiver. `GARY_FUNNEL_WEBHOOK_URL/SECRET` are **not set** in production, so every row waits (`not-configured`). 8 attempts, exponential backoff (30 s → 1 h cap), 8 s timeout per call. |
| Scheduled retry of undelivered rows | `vercel.json` cron → `GET /api/gary/funnel-outbox/drain` | PREPARED, NOT ACTIVE | Declared in the repository; takes effect only when PR #15 deploys **and** `CRON_SECRET` is set in production. Hobby plan: once per day. Until then retries are traffic-triggered only (§7). |
| Command Center event storage | `mr-life-command-center` `/api/easy-ai/public-funnel/events` → `easy_ai_public_funnel_events` | READY (receiver) | Bearer token, envelope-validated, unique on `event_id`. |
| Lead / Prospect creation | `mr-life-command-center` | **MISSING** | Nothing consumes `contact.captured` into a Client Record. Events are listed for founder visibility only. This is the break after event storage; the website→Command Center lead flow is **not operational** until it exists (§10). |
| Human follow-up | Command Center Client Records | MANUAL | Founder reads the inbox / event list and works the record. |

## 2. Boundaries

- **Application boundary.** `easyai-landing` owns the public site, Gary, the contact pipeline, and its own Postgres (Supabase, one database shared by Production **and** Preview). `mr-life-command-center` owns the CRM and its own Supabase. They talk only server-to-server over the bearer-authenticated funnel webhook. Neither reads the other's database.
- **Public → privileged trust boundary.** Everything in a request body is untrusted: the contact draft (validated and length-capped in `contactFlow.ts`), `sessionId` (must carry a valid HMAC `sessionCapability`), `anonymousId`. Nothing in a request can select site, tenant, organisation, destination, or assistant identity: those come from `lib/siteConfig.ts`, resolved from server environment only. Client components may not import `lib/siteConfig.ts` or `lib/emailRouting.ts` (test-enforced).
- **Server-derived ownership.** `PublicContact.siteKey` and the outbox payload's `siteKey`/`channel` are written from `SiteConfig`, never from input (tested).
- **Email-provider boundary.** `lib/resend.ts` is the only Resend caller. From addresses stay on the authenticated `mail.easyaiconsult.com` senders. `resolveDelivery()` lets only `VERCEL_ENV=production` reach real recipients.
- **Webhook authentication boundary.** Sender: `Authorization: Bearer GARY_FUNNEL_WEBHOOK_SECRET` (server env only). Receiver compares against `EASY_AI_PUBLIC_FUNNEL_WEBHOOK_TOKEN`. Operations endpoint `/api/gary/funnel-outbox/drain` accepts either bearer `GARY_FUNNEL_DRAIN_SECRET` (operator / uptime checker) or `CRON_SECRET` (added by Vercel to the scheduled GET); it refuses every request when neither is configured.
- **Rate limit.** Per hashed client identity, 3 contact sends per hour, fails closed. It is not the idempotency mechanism.

## 3. Environments

| | Production | Preview | Development / CI |
|---|---|---|---|
| Database | Supabase prod (`DATABASE_URL`, `DIRECT_URL`) | **Same** Supabase prod database | none in CI; disposable Postgres locally (`TEST_DATABASE_URL` for the integration test) |
| `GARY_*` secrets | set | **not set** → Gary API returns 500 on every preview | set locally to placeholders |
| Email | real, to `contactRecipient()` | redirected to `EMAIL_TEST_RECIPIENT` or refused (never a real inbox) | refused unless `EMAIL_TEST_RECIPIENT` |
| Funnel webhook | **not configured** | not configured | not configured |
| Scheduled drain (`CRON_SECRET` + `vercel.json`) | **not configured** | n/a (cron runs on production only) | n/a |
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
4. Outbox storage returns a verifiable result (`created | existing`, or throws) inside the claim transaction. The delivery *attempt* is not part of the request: it is scheduled through `waitUntil` after the response (ADR-003) with an 8 s timeout, and its result lands on the outbox row. Nothing the visitor is told depends on delivery, and `void` is not used for anything durable.
5. The pipeline's outbox key is producer-scoped: `contact.captured:<sessionId>:<channelKey>`. The assessment handoff route already emits `contact.captured:<sessionId>` (a conversation summary); sharing the key would silently drop the visitor's details whenever they visited the assessment first. The receiver dedupes by `eventId`; a Lead consumer must upsert by `sessionId`.
6. The pipeline does not write `CrrOutboxEvent` (§6).

**Consequences.** Two migrations pending (see §8). The contact record can exist with `notificationStatus='failed'`; that is a monitored state, not a bug. `contact.captured` may arrive twice per session from two producers with different `eventId`s.

**Rejected.** In-memory locks (Vercel Functions share no memory). Relying on the IP limiter for idempotency (limits a connection, not a session). Email before storage (strands the opportunity). A new queue or email-retry service (nothing in the repo needs one yet; the outbox already carries retry state).

### ADR-002: provider-side idempotency for the notification email

**Context.** Resend can accept the email and our settlement can still fail (function killed, database blip). After the 60 s lease expires the visitor's retry would legitimately re-send. Database state alone cannot close that window because the provider, not the database, knows whether the email went out.

**Decision.** `sendContactMessage` sends Resend's `Idempotency-Key` header (SDK 4.8.0, second argument of `emails.send`). The key is generated on the server only: `contact-notification:<siteKey>:<sessionId>` — one per logical contact request, identical on every retry, never read from the browser. Resend returns the original result for a repeat with the same key and payload; the same key with a **different** payload (the visitor edited before retrying) returns `invalid_idempotent_request` (409), which is proof the original was accepted and is reported as `already-accepted`, not thrown, so the contact settles to `sent`. `concurrent_idempotent_requests` (409) and every other error still throw and stay retryable.

**Limits.** Resend keeps keys for 24 hours after an *accepted* request; after that only the database state (`notificationStatus='sent'` → `already-processed`) prevents a second send, and that state is what a settlement crash may have missed. So the residual window is: settlement failed **and** the lease expired **and** the retry came more than 24 hours later. A request Resend never accepted stores no key, so a genuine provider failure is retryable with the same key. Assessment and result emails are unchanged (they have their own single-write paths).

### ADR-003: deliver the handoff after the response, not on the visitor's clock

**Context.** Awaiting the webhook inside the confirmation request was measured on 2026-09-14 (local receiver stub, mocked database): success **+28 ms**, slow receiver **+3,012 ms**, timeout **+8,010 ms**, not configured **+0 ms**. Against a confirmation path that otherwise takes roughly 0.5–1 s (limiter transaction, claim transaction, Resend call, settle), a realistic Command Center round trip of 150–400 ms is a >5 % regression, and a slow or unreachable receiver holds Gary's reply for seconds — a direct hit to time-to-task.

**Decision.** The delivery attempt runs through `waitUntil` from `@vercel/functions`, the pattern `app/api/assessment/route.ts` already uses to finish work after responding. The outbox row is still committed inside the claim transaction, so durability does not depend on this; the visitor's outcome reports `delivery: 'scheduled'`, and the attempt's result lands on the outbox row. Baseline restored to +0 ms on the confirmation path. Locally and in tests `waitUntil` is a no-op that still runs the promise.

**Not done.** No new queue; no change to what the visitor is told; nothing about durability moved out of the request.

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

Health endpoint: `GET /api/gary/funnel-outbox/drain` with `Authorization: Bearer <GARY_FUNNEL_DRAIN_SECRET>` (or the Vercel Cron bearer `CRON_SECRET`) → drains up to 5 due rows, then `200 {ok:true}` or `503 {ok:false, problems:[…]}`. Counts only; no visitor data.

**Retry reality (state this accurately).** Undelivered handoffs are retried by exactly three things: (1) any `enqueueFunnelEvent` that creates a *new* row (a new Gary session, an assessment handoff) also drains up to 5 older due rows — traffic-triggered, no guarantee on a quiet site; (2) the Vercel Cron declared in `vercel.json` calling `GET …/drain` — **not active until PR #15 deploys and `CRON_SECRET` is set in production**, and on the Hobby plan it runs **once per day** (hourly needs Pro); (3) a human calling `POST …/drain`. There is no always-on worker. The outbox's 30 s→1 h backoff describes *eligibility*, not when an attempt actually happens.

**Alerting reality.** Nothing calls the health endpoint on a schedule for the purpose of alerting a person. Until an uptime checker is pointed at it with the bearer header (every 15 minutes; alert on non-200), the endpoint is visibility on demand, not alerting. The daily cron will *run* the check but nobody is notified of a 503 unless Vercel's cron-failure notifications are enabled for the project (they email the project owner on failed cron invocations; a 503 counts as failed).

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

| Variable | Scope | Purpose | Without it |
|---|---|---|---|
| `GARY_FUNNEL_WEBHOOK_URL` | Production | Command Center `/api/easy-ai/public-funnel/events` | every handoff waits as `not-configured`; health reports it |
| `GARY_FUNNEL_WEBHOOK_SECRET` | Production | bearer, = Command Center `EASY_AI_PUBLIC_FUNNEL_WEBHOOK_TOKEN` | same |
| `GARY_FUNNEL_DRAIN_SECRET` | Production | bearer for operator / uptime-checker calls to `/api/gary/funnel-outbox/drain` | no manual drain or health check |
| `CRON_SECRET` | Production | Vercel adds it as the bearer on the scheduled `GET …/drain` | the cron runs and is rejected 401: no scheduled retry |
| `CONTACT_NOTIFICATION_EMAIL` | optional | overrides `hello@easyaiconsult.com` | default applies |
| `SITE_*`, `ASSISTANT_*` | optional | white-label identity | Easy AI defaults |
| `RESULT_EMAIL_REPLY_TO`, `ASSESSMENT_NOTIFICATION_EMAIL` | Production (hidden, set 2026-07) | review: they override the code defaults | — |

**Drain / retry contract.** Who calls: Vercel Cron (`vercel.json`, `0 11 * * *` UTC — Hobby allows one run per day and may shift it within the hour; change to hourly only on Pro), plus traffic-triggered drains, plus manual `POST`. Auth: bearer `CRON_SECRET` or `GARY_FUNNEL_DRAIN_SECRET`. Timeout: 8 s per webhook call, at most 5 calls per GET (route `maxDuration` 60 s), 25 per POST. Exhaustion: after 8 failed attempts the row stays undelivered with `lastError "… (max attempts reached)"`, leaves the due set, and is counted as `exhausted` by the health check; re-arm with the SQL in §7. Alert recipient: Toy, via whichever checker is pointed at the health endpoint (none yet) or Vercel's cron-failure email. Manual recovery: §7.
- Preview: `EMAIL_TEST_RECIPIENT` (a controlled inbox) if previews should ever send; the `GARY_*` secrets if previews should ever run Gary. Do **not** point previews at a separate database without also separating `DATABASE_URL`.

**Rollback.** Code: revert the merge commit; `main`'s contact page returns (its form also depends on migration 1). Schema: the migrations are additive; rolling back code does not require dropping them. To drop anyway: `DROP INDEX "PublicContact_sourceSessionId_key"; DROP INDEX "PublicContact_notificationStatus_updatedAt_idx"; ALTER TABLE "PublicContact" DROP COLUMN "notificationStatus", DROP COLUMN "notificationAttempts", DROP COLUMN "notifiedAt", DROP COLUMN "notificationError";` and delete the row from `_prisma_migrations`.

**Recovery scenarios.**
- Migration 3 fails on the unique index (duplicates found): nothing is applied from that migration (single transaction). Keep the newest row per session, null `sourceSessionId` on the older ones, re-run.
- Email succeeded, webhook failed: the row stays in the outbox with retry state (up to 8 attempts, backoff 30 s → 1 h). **When** an attempt actually runs depends on new traffic (any new outbox row drains up to 5 older due rows), the daily Vercel Cron once `CRON_SECRET` is set, or a manual `POST …/drain`; there is no guaranteed completion time and no two-hour window. If exhausted, re-arm (§7). Nothing is lost.
- Duplicate legacy session rows: not expected (no writer on `main`); handled by the preflight.

**Post-deployment smoke test** (authorized, controlled):
1. `GET /api/gary/funnel-outbox/drain` with the bearer → `200 ok:true` (or a 503 naming only `funnel webhook not configured` if the variables are still unset).
2. On the production site, open Gary via Contact, complete the four steps with Toy's own details and reason `Smoke test <date>`, press "Yes, send it" → Gary reports sent.
3. Database: exactly one `PublicContact` for that session with `notificationStatus='sent'`, `siteKey='easy-ai'`, `channel='assistant-contact-flow'`; one `FunnelEventOutbox` row keyed `contact.captured:<session>:assistant-contact-flow`.
4. External: one email in `hello@easyaiconsult.com` with subject `Gary contact request: <name>`.
5. Duplicate action: press "Yes, send it" again (or replay the request) → "already reached the Easy AI team"; still one row, one email. Resend's dashboard shows one email with `Idempotency-Key` `contact-notification:easy-ai:<session>`.
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
| No alert wired to the health endpoint | OPEN — visibility on demand only | uptime checker decision (Toy) |
| Scheduled retry not active | OPEN, release-relevant | needs PR #15 deployed + `CRON_SECRET`; Hobby = daily |
| Resend key expiry (24 h) leaves a residual duplicate window after a settlement crash | ACCEPTED, narrow | ADR-002 |
| Disposable-database concurrency test runs only locally (`TEST_DATABASE_URL`), not in CI | ACCEPTED | run before each release; result recorded in PR #15 |
| Gary input was white-on-white; "Yes, send it" was 3.3:1 | FIXED 2026-09-15 | explicit field colours; green-800 button (6.4:1); e2e computes contrast and runs axe |
| No upfront AI disclosure | FIXED 2026-09-15 | disclosure at both entry points, unit + e2e tested |

## 10. Two `contact.captured` producers — unresolved Command Center contract

Two different producers emit `contact.captured` for the same Gary session, each with its own `eventId`:

| Producer | Key | Payload | When |
|---|---|---|---|
| Assessment handoff (`app/api/gary/handoff/route.ts`, pre-existing, unchanged) | `contact.captured:<sessionId>` | whatever contact was known + an LLM conversation `summary`; contact fields may be null | first handoff into the assessment |
| Gary confirmed contact flow (`lib/gary/contactSubmission.ts`) | `contact.captured:<sessionId>:assistant-contact-flow` | name, normalised email/phone, `summary` = the visitor's reason, `siteKey`, `channel`, `contactId` | "Yes, send it" |

Both are accepted by the receiver (unique on `event_id`), so the Command Center can hold two `contact.captured` rows per session. **Contract requirement for the future consumer (not built; belongs in `mr-life-command-center`):** update **one** Lead/Prospect per `sessionId` / `funnelCorrelationId` — create on first sight, enrich on later events, never create a second person or lead for the same session; treat `channel = assistant-contact-flow` as the authoritative contact details when present. Until that consumer exists, the website→Command Center lead flow is **not operational**: events land in `easy_ai_public_funnel_events` for founder visibility only.
