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


### Remembered visitor context (October 29 candidate)

Visitor-supplied names/business details remain unverified data. Gary's reply pipeline now
places at most eight500-character remembered notes in a JSON-encoded USER message marked
UNTRUSTED VISITOR NOTES, never in the system prompt. The same bounded message is reused in
the one permitted correction attempt. Fixed system instructions deny embedded commands and
authority claims. Conversation history and contact/assessment permissions are unchanged.
The reproduction proves the old system-role interpolation and the correction proves role
separation with a fake adapter; it does not prove universal prompt-injection resistance or
real model quality. This adds no Company IQ source, connector or invented business knowledge.


Verification for this prompt-boundary candidate: first reproduction1failed/5passed; corrected
focused29passed; full local unit/PostgreSQL597passed in51files; lint/types/build passed.
Relevant desktop/mobile browser runs48passed(contact/status) plus12passed(normal conversation/
assessment offer), using existing mocked endpoints. Semgrep changed files0findings/0errors;
combined source-diff secret scan0leaks. Remembered-context request character growth is4.13%
for the two-note fixture and3.64%with no notes; model/database call counts are unchanged.
These character counts are not a tokenizer/latency or real-model-quality measurement.
The original eight website layout failures and Next15performance acceptance remain open;
no redesign or layout was changed to obtain these passes. Final independent/operational
acceptance is pending.

### Isolated application journey verification (2026-10-29)

`lib/isolatedJourney.postgres.test.ts` exercises actual assessment/Gary route handlers,
Prisma transactions and notification rendering. It captures only the Resend SDK boundary
into an in-memory test inbox; model generation is deterministic and all unexpected fetches
fail closed. This is not provider acceptance, SMTP delivery, Company IQ or CC receipt proof.

Use a newly created, empty local PostgreSQL database whose name starts `easyai_journey_`.
Apply this repository's migrations there with `DATABASE_URL` and `DIRECT_URL` set to that
local URL. Set `ISOLATED_JOURNEY_DATABASE_URL` to the same URL and run:

```sh
./node_modules/.bin/vitest run lib/isolatedJourney.postgres.test.ts
```

For the browser case, serve this exact candidate build on `127.0.0.1:3200`, also set
`ISOLATED_JOURNEY_BROWSER=1` and select the installed test browser using
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Browser API requests bridge to the real handlers
in the test process; external browser requests are blocked. The application server and
HTTP hosting boundary are therefore not verified by this bridge. The complete run proves
all eleven assessment steps, saved result, protected status, test notification content,
Gary's four-step contact, duplicate suppression and notification failure/retry persistence.
Use a fresh database for each run; retained synthetic records permit separate inspection.
The existing ordinary browser and PostgreSQL suites remain required independently.

At application head `6fb0a504a904a4df35b510dfeae7fe0dd860fe46`, the final local run passed
4/4 cases with Chromium149 (not the Playwright151 matching build). Initial failures were
fixture collisions with real IP limits and a browser submission under the three-second
spam threshold. Separate synthetic visitors and waiting through the actual fill-time
requirement corrected them without weakening either guard or any assertion.

The subsequent measured application fix reserves the assessment's existing `min-h-screen`
section while its search-parameter Suspense boundary hydrates. The loaded form/design is
unchanged. Before: footer movement caused CLS0.31640625 in five local samples; after: CLS0
in all five. Browser journey regression asserts CLS≤0.1 and passes at desktop and390×844.
Local LCP samples: before120–200ms, after76–248ms; interaction-event samples16–48ms across
both sets. These small unthrottled samples are not field INP, launch acceptance or evidence
of a statistically meaningful latency delta. Real page-load/interaction verification remains
a final-launch gate under Toy's provisional acceptance of the previously measured shared-JS,
middleware and email-durability costs. Security and durability remain intact.


### Cross-repository wire evidence

The existing `lib/isolatedJourney.postgres.test.ts` fixture additionally exercises a
correlated Gary contact and completed assessment, capturing the actual serialized
outbox HTTP bodies. Set `ISOLATED_JOURNEY_WIRE_EXPORT` to a local output path alongside
the existing isolated database configuration to export synthetic contract evidence.
Only fixed loopback destinations are accepted by the capture stub; notifications and
model responses stay mocked. The export contains no authorization headers.

Command Center's existing native PostgreSQL/browser fixture consumes this capture in
`tests/public-site/sales-follow-up.spec.ts`: saved assessment package, durable Gary Lead,
explicit founder selection of that Lead for Sales and one follow-up task. Replays retain
identity and do not demote the Prospect. This is producer capture plus receiver replay,
not continuous hosted delivery or real email proof. The final producer check passed
four cases; its optional browser case was not rerun because website UI/runtime did not
change. Prior browser evidence remains separately credited. Types and lint passed.


### Read-only assessment status recovery — 30 October 2026

The completion page now offers “Check status again” after a failed status read,
a failed delivery status, or exhaustion of its existing bounded pending poll. It
revalidates the saved browser receipt/capability and only calls the existing status
GET endpoint. It cannot resubmit, regenerate a result, resend email or invoke a model.
Missing/expired receipts do not offer a recheck; provider acceptance still does not
claim actual inbox receipt. Existing content, routing and layout remain intact apart
from the small recovery control.

Initial browser invocation used an invalid project name and did not run the app;
the corrected desktop reproduction failed because the recovery control was absent.
After implementation: five focused status-route tests, lint, types and build pass;
all20completion-status browser cases pass across desktop and360/390/412px widths,
including503→recheck→completed with twoGETs and zeroAPIwrites. No complete-suite rerun.
Local203-rule scan:twointernationalization recommendations, zero parsererrors.
Page-specificJS1.33→1.43kB(+100bytes,~7.5%); totalfirstload107→108kB(~0.93%)atprinted
precision. This is measured bundle cost, not field-performance acceptance. Actual
prelaunch load/interaction measurements remain open.

Owner authorized up to$23additional Actions spend for the assignment. Billing/API
visibility and enforcement remain unverified; no chargeable run or publication was
triggered merely by recording that authorization. Existing report holds exact local
and remote heads, recovery evidence and the remaining publication gate.


Publication budget update,30October2026: owner authorized$23total additionalActions
spend. Official github/docs source on allowedraw.githubusercontent.com verifies
standardLinux$0.006/min and storage rates. Existingwebsite20min/CC35minjoblimits,
standardrunnerselection, onejobperrepo, seven-dayCCartifactretention and no manual
reruns support one publication batch with a conservative$5taskreserve. This resolves
the earlier run-specificcost-control blocker for that batch; actual accountusage,
plan and billingcap remainunverified. No accountsettings or workflows changed.
Remainingbudget is reserved, not a claim of actual billedcost. Existingprivate report
contains source snapshots, calculations, exacthead and recovery receipts.

## Gary visitor continuation — 30 October 2026

Latest owner scope assigns visitor frontend, responsive behavior, conversation acceptance and
frontend performance to Codex; backend/email/database/security/shared APIs belong to Claude.
This supersedes the historical whole-backlog ownership note. PR18 stays DRAFT.

Preservation: resumed the existing `/workspace/easyai-landing` environment at61595d6. It was
clean, with no stash or unpublished branch commit; two unreachable source blobs were retained.
Before editing, saved all refs/reflogs and the complete Git recovery directory under
`/workspace/work/gary-preservation/`. Explicitly refreshed the narrowly configured fetch ref
and fast-forwarded to actual PR18 head18cac7eb97bb2388d8ad6eb1f138c019a72dfa54. Approved
redesign eaed840 and the moving Gary character remain ancestors/preserved; no old snapshot
was substituted. Original Module A/anti-bloat source documents remain unavailable here;
the existing preservation record's actor/tenant scope, original retention and no-overwrite
rules were applied. No replacement task, assistant, infrastructure or dependency was created.

Frontend implementation:29739c9,985f010,d22862c,2b096cc; final runtime is
2b096cca91a9f888369673fcf33fe128d306b4b4. Test-only a9862d4 adds ordinary refresh/tab isolation.
Tab recovery retains transcript, input, contact draft/options and the pending message/contact payload;
network dispatch persists pending state first. Recovery is bounded and expires24hours after its latest save, checked on read; it is neither backend history nor delivery authority. Explicit retries do not run
on timers.65second timeout, unmount cancellation and stale-response guards retain unknown
outcomes honestly. Start Over clears personal input/recovery, and quota-denied writes retain
the current in-memory identity. Contact intent after ordinary chat remains usable. Consent
appears beside Confirm & Send; ordinary conversation is still available. Long bubbles wrap,
short desktop panels fit the viewport, and desktop film width reserves existing Gary clearance.
The character, routine, speech bubble and sign artwork/layout were not replaced. Browser
inspection at360/390/412/1440 found normal sign/intro letter spacing and readable complete text.

Independent reviewer `/root/gary_review` found stale response/session writes, ignored contact
intent, quota fallback and retained input defects; all were corrected. The reviewer passed
exact2b096cc source and a9862d4 test delta, independently running6/6 recovery unit cases.
No Claude correction candidate has yet been supplied for this assignment's dependencies.

Verification evidence is retained under `/workspace/work/gary-*`:
- Lint, standalone TypeScript and production build pass. Exact-runtime development browser
  contact/recovery suite15/15; production desktop/360/390/412 contact/widget suite104/104;
  ordinary refresh/separate-tab extension4/4. APIs in these browser tests are fixtures.
  Broader earlier-runtime suite768/768passed; it predates synchronous pending writes, quota
  fallback correction, Start Over input clearing and StrictMode initialization. Final affected
  flows are covered by the108production checks and15development checks above; no claim
  that the full768was rerun on the final runtime.
- Disposable Docker PostgreSQL16, bound to loopback, real migrations/routes/storage with
  captured email/webhook providers:607pass/1optional cross-repository fixture skip. No paid
  models or external email. A reused-database rerun failed4journey assertions because the
  fixture expects empty storage; preserved separately, then rerun on a new dedicated DB.
- Negative browser controls on unchanged18cac7e failed3/3new acceptance scenarios;
  the first stopped at missing consent, the other two at recovery/history assertions.
  First broader candidate run:91pass/3fail/1interrupted/445notrun. Two failures were actual
 1024/1440video/Gary collisions, now corrected without relaxing geometry; the third reused
  one browser session for two independent contact scenarios, now separately parameterized.
  The interrupted pose check is not counted as a product failure or a pass.
- Scoped independent security source review passed; npm audit reports10affected packages
 (3high/3moderate/4low,0critical), with lock/dependencies unchanged. The [Security Diff Scan skill](skill://Plugin_1e648473be9c8191a91ac3947151af55/security-diff-scan/SKILL.md)
  could not load its required config-preflight resource, so no formal security-scan
  PASS is claimed. The skill requires: “Run the security_diff_scan preflight ... before
  reviewing files or creating a goal.” No scan goal or invented scan report was created.

Same-toolchain baseline18cac7e→final runtime: homepage/layout JS gzip134705→135300bytes
(+0.44%); CSS13844→13920(+0.55%); deferred Gary panel3071→3969(+898bytes,+29.24%).
Combined homepage/layout plus panel JS137776→139269(+1.08%). The deferred-panel percentage
exceeds5% and remains explicitly surfaced for release acceptance. No asset/package/API/DB
query/model-call addition. Contact flow uses zero model calls; ordinary conversation retains
one primary and at most one correction; first assessment handoff may add one summary call.
Existing cumulative design/performance release gates are not erased by this comparison.

Backend dependency requests are on this PR's existing conversation, not a paid dispatch:
- Company IQ is absent from message→replyPipeline→adapter context at18cac7e; no real quality
  acceptance can establish approved knowledge that never reaches the model.
- Ordinary turns have no request-ID/replay contract. Lost responses may repeat transcript
  writes/model calls; loss of the first session response also loses its identity. Preserve
  server controls and introduce the smallest idempotent existing-route correction.
- Confirm while a notification is held returns `done:true`/“sending”; later notification
  failure leaves no recoverable confirmation. A real disposable-PostgreSQL reproduction
  failed1/1desired assertion (expected done:false, actual true; durable status=failed).
  Source/log retained as `/workspace/work/gary-pending-repro.test.ts` and matching `.log`.
  This is an unresolved backend acceptance failure, not included in the607passing tests.
- Contact sends reason plus transcriptReference; CC PR58 exact04cbd80 scopes/processes that
  into a founder-visible client, but full authorized history retrieval is not demonstrated.
  Provider acceptance also does not prove the message “reached the team.” Claude must align
  pending/status/history and outcome wording, then publish exact commits for independent review.

Read-only connected Vercel inspection succeeded with decrypt=false. DATABASE_URL/DIRECT_URL,
Resend/Anthropic credentials and CC webhook entries target both preview and production.
Gary model/provider and signing entries target production only; no isolated Preview DB ref
or isolated recipient setting is listed. This proves target metadata, not secret values,
actual DB identity, schema/history or provider readiness. Preview database/provider safeguards
remain unchanged; no real Preview submission, external email, paid model, production config,
migration, merge or production deployment was performed.

Remaining release gates: Claude's minimal backend corrections and exact independent review;
a verified isolated provider/database/recipient configuration and applicable paid-model/send
authorization; real conversational usefulness/accuracy/tone/memory/one-question acceptance;
correct founder-visible history and cross-visitor denial; one shared visitor→email→reply
journey with Claude; final integrated security/performance acceptance and founder release.
Mocks, captured notifications, source inspection, builds and CI cannot close these gates.

Quiet local performance check,12interleaved390px samples per baseline/final runtime with
captured API replies: click→first reply median796.9→797.9ms(+0.13%),p95807.9→802.9ms;
navigation duration median94.7→97.0ms(+2.43%). Every opening made exactly1message request.
Synthetic40KBsessionStorage write benchmark averaged0.077→0.087ms; it times storage only,
not application JSON serialization. These are unthrottled local automation observations,
not field LCP/CLS/INP, real model/API latency or proof of a universal<=5%runtime bound.
The broad browser run's expected unauthorized local-DB logs came from layout tests that
open the panel without a reply fixture; those logs are not real successful Gary journeys.
The pending-contact concurrency failure remains separate from every passing inventory.

## Controlled founder launch continuation — 30 October 2026

Toy's latest instruction replaces Claude with an existing separate Codex Cloud backend/email
assignment on CC PR58. Do not wait for Claude or create a replacement Cloud task. Frontend
source remains exactly61f135e/runtime2b096cc; no unchanged lint/type/unit/browser/build suite
was rerun in this continuation. Current remote CC candidate remains04cbd80. Its latest
CI41065340114/job124094993563 had zero steps: GitHub's annotation says payments/spending
limit prevented startup. This is neither a test failure nor proof the Cloud assignment began.
No new Cloud start/session acknowledgment is visible in the PR discussion. This session has
no Codex task-session tool, Command Center MCP or runtime bearer binding. The only team agent
visible here is the existing independent frontend reviewer; it is not the backend assignment.

Dependency delivery is verified on the existing [CC PR58 packet](https://github.com/etoyig-png/mr-life-command-center/pull/58#issuecomment-6528805273),
with its [portable real-PostgreSQL failing reproduction](https://github.com/etoyig-png/mr-life-command-center/pull/58#issuecomment-6528973801).
Acknowledgment is pending. The packet carries CompanyIQ, request replay, founder history,
pending-contact recovery and email→incoming reply→approved follow-up requirements. The single
routing action is to have the already-created backend Cloud assignment read that packet and
acknowledge its task/session ID and boundary ownership. Toy need not rewrite the requests.
Frontend owns components, browser recovery and frontend tests; backend owner must exclusively
coordinate website API/server types, DB/auth/security and email changes before shared edits.
No overlapping backend edit or paid workflow dispatch was made.

Supported static-analysis alternative completed: Semgrep OSS1.183.0, community rules pinned
at16b9e6d45f10649f6a531ec4838ed9924372c3bc, local configs/OSS mode/metrics off.426rules ran
on9tracked frontend files with zero reported parse errors. Independent per-result triage
classified11internationalization recommendations and18false positives in valid interpolated
JSON diagnostic messages as not actionable for security/correctness. All29were INFO; the
scanner's generic “blocking” label is not vulnerability validation. CSS received only generic
rules; this is scoped OSS coverage, not a formal Codex scan, full backend audit or security-clean
release claim. No app dependency changed. Raw output/log: `/workspace/work/gary-semgrep.*`.

Performance follow-up reused the existing baseline18cac7e and final2b096cc production builds,
with no rebuild.390px,150msRTT,200000B/s download,75000B/s upload,4×CPU; fresh contexts,
interleaved pairs and captured API only. The first10pair automation-wait measure was noisy
(~±500ms), so retained it but changed diagnosis: timestamp the reply's visible DOM insertion
inside a MutationObserver before Playwright's wait returns.20new pairs, conventional medians:
click→replyDOM392.70→397.25ms(+1.16%), nearest-rankp95426.9→428.4ms; navigation
1281.90→1285.90ms(+0.31%). All40openings made one fixture API request. Pair differences
range−44.8..+40.1ms, so this cannot prove a universal5%bound. The zero encoded-resource timing
values were unusable and excluded. Actual gzip artifacts remain the byte comparison.

Actual long-transcript recovery measured event capture→React/effect→JSON serialization→
sessionStorage completion on the final runtime, with79synthetic messages/39500text characters,
~43.5KBsnapshot,4×CPU,20keystrokes at390px and20at1440px. No API calls during typing.
390pxmedian4.65ms,p9510.1ms,max14.3ms;1440pxmedian3.8ms,p957.4ms,max7.4ms.
This measures recovery completion, not paint/INP, field performance or a percentage comparison
to a baseline that lacks recovery. The standalone panel+29.24% remains surfaced; initial
JS+0.44% and activated aggregate+1.08% are relevant total-load context, not permission to erase
that increase or waive the existing rule. Performance/release acceptance remains open.
Raw samples/scripts remain `/workspace/work/gary-mobile-event-*` and `gary-long-recovery-*`.

### One controlled founder launch candidate and order (not release authorization)

Current provisional source pair: website61f135e and CC04cbd80. The pair is NOT release-ready:
backend corrections, acknowledgment and exact independent review must replace/freeze the
backend candidate first. Freeze both full SHAs and one writer per shared boundary before
integration; retain approved frontend/record identities. Use only Toy's controlled journey,
not public traffic, customer onboarding or unrelated platform completion as a prerequisite.

1. Backend owner verifies actual project/tenant identities, applied migration history, backups
   and restore rehearsal. Website candidate has7migrations through20261028000000_server_only_tables;
   compare actual history, never blindly execute the list. CC04cbd80's additive intake/mailbox/
   classification/funnel SQL is owner-reviewed separately; unrelated website-builder/quick-capture
   migrations are not automatic launch prerequisites. Preserve original records and pending outboxes.
2. Reuse existing controlled storage/provider configuration. Shared variable target scope is a
   risk to investigate, not proof of equal values or isolation. Preview's current provider guards
   stay closed; do not relabel its environment or remove guards to make a rehearsal run. Backend
   owner must prepare an exact permitted test path, existing Toy-controlled recipient/label,
   nonsecret model ID/call bound/cost ceiling and applicable authorization evidence. No secrets
   in Git/chat. Preserve configured sender; existing code expects mail.easyaiconsult.com. Customer-facing
   result/follow-up Reply-To uses info@easyaiconsult.com; internal Gary/contact notification
   Reply-To is the visitor email when supplied. Verify both directions and actual provider/domain
   readiness; these role-specific expectations are not interchangeable.
3. After exact reviews/checks and applicable migration/config/merge/deploy authorization,
   release a compatible backend that accepts the old and new website contracts before the
   website candidate. Keep delivery disabled or in its existing authorized allowlist mode until
   verification. Do not enable unrestricted live mail or public onboarding for this proof.
4. Verify exact deployed SHAs, then exercise actual desktop/mobile Gary: business questions,
   approved knowledge provenance, follow-ups/memory, disclosure, honest unknowns, assessment
   decline with ordinary chat, four contact steps with editing/consent, refresh/reopen/timeout/
   delayed response/retry. Verify one logical request/contact and stable correlation IDs.
5. Through real founder Command Center navigation, open the correct person/contact and full
   conversation. Prove the intended outgoing email was received; reply from the authorized test
   mailbox and match person/thread/Message-ID references. Review history and obtain explicit
   founder approval for the exact follow-up before its one send; verify receipt and saved history.
   A webhook201, provider acceptance, simulated reply or READY preview cannot substitute.
6. Run independent-browser/session denial and failure-recovery checks without exposing another
   visitor's data or duplicating messages. Monitor existing notification/outbox status, exhausted
   retries, inbound signature rejection, unmatched thread/person, delivery failures and owned
   alerts. Capture synthetic IDs/status/time only; redact personal content and capability tokens.

Rollback proposal: stop authorized delivery/activation first, restore the prior compatible app
pair through the existing release path, retain contact/history/receipt/outbox data and reconcile
unknown sends before any retry. No automatic destructive migration rollback, credential rotation
or DB replacement. Backend owner supplies exact rollback SQL only if necessary and approved.
The existing authenticated laptop receiver is not exposed here. Local synchronization stays
pending until an authorized release and verified receiver/clean designated checkout are available;
never reset divergent/unpublished work or claim cloud/local SHA equality without verification.
