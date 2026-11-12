# Easy AI 1.1 release preflight — 2026-11-12

Status: PREPARED IN CLOUD, NOT PUSHED / MERGED / DEPLOYED.

## Exact source and rollback
- Application release candidate: a943992c2244bae75fca21c99a30cbbc8317214e.
- Merge parents: approved saved 2e9781370e2586810ac4f35ff013ef22db4bab43 and Mark 10480e7404f2bbaa5057857893512eb65fbed639.
- Approved runtime 87fa4dee055adc55f0e89058ef8ddd33d6553fd7 and remote PR18 dc38c5dfdd1f234dafb741d267071d40871293c7 are both ancestors.
- Local rollback branch: backup/1.1-approved-before-release-20261112 at 2e9781370e2586810ac4f35ff013ef22db4bab43.
- Existing branch: review/1.1-approved-reconciliation-20261111.
- Original 195-file source/assets backup retained. SHA256 f4bf8999adf2c523eb27f5348c243ad574eae9297c1c4e9a3ff46dacf2fef42f.
- Reverified imported base.bundle SHA256 f19c752550a48d6dbc1b654d91549a41527273eb06c4e1680fa9c521014d85a3 and delta.bundle ef57ddb13c23695bb7b1ab545b79c1def17f2bbf7a484df4fe76b22881719ef9.
- Mark target tree verified: 42dd4bd78fe9481f52ea96524b91169b825b444e.
- Backend API, assessment, Prisma, provider, sync and mail source retained byte-identical to Mark's 10480e7. Seven existing migrations were NOT run.
- Approved source/artwork retained. Minimal launcher adaptations provide the accepted human header identity required by recovered GaryPanel and carry the existing contact intent through the post-load five-second queue. No replacement artwork or model calls.
- Three stale structural/integrity tests were updated to assert the approved deferred single assistant/event path and both exact upstream/served motion hashes. The accepted motion adapter itself was not changed.

## Verified cloud checks
- npm ci, lint, full Next 15.5.28 production build/type checks: PASS.
- Unit tests: 632 passed, 23 skipped, exit 0. Database-dependent tests skipped; test process excluded live database/provider/webhook credentials.
- Public HTTPS preview: 28 targeted browser tests passed, exit 0. APIs were fixtures/blocked; actual public video bytes loaded.
- Eight actual HTTPS initial/refresh navigations (390px phone, 768px tablet, 1440px desktop, reduced-motion phone): PASS. No Gary renderer/media/preload before page load + five seconds, no JS errors, actual video playback and viewport persistence checked.
- Measured loadEventEnd: 257.2–584.2 ms on this cloud browser/network; first Gary request 5019.1–5073.8 ms AFTER loadEventEnd. These are measurements, not device performance guarantees.
- Contact-page early chat intent on 390px and 1440px: PASS; one launcher, approved human header, contact-start payload, focus restored. Mocked API; no real conversation/email.
- Mobile real-device review remains unverified. This is Chromium automation against the public site, not Toy's physical Android approval or Safari certification.
- Full legacy browser suite was not run; old sprite/pose and data-gary-ready helpers require separate reconciliation. No claim of complete end-to-end operation.
- npm audit --omit=dev: 0 critical/high/moderate, 4 low affected packages in Resend/react-email/html-to-text/deepmerge dependency chain. No unsolicited major dependency upgrade.
- This is not independent security release signoff or proof of production credentials.
- Performance: homepage 4.99 kB / first-load JS 116 kB / shared 103 kB. Mark10480 on the SAME Next15 dependencies: 4.63 /116 /103 kB. Old approved visual Next14 build: 5.48 /104 /87.1 kB. First-load JS therefore +12 kB versus old Next14 baseline; no zero-growth or arbitrary threshold claim.
- Raw logs/scripts: /tmp/easyai-release-20261112 in this same saved cloud sandbox. Compact measured evidence is checked in alongside this report.

## Release blockers and automatic effects
1. Connected easy-ai-inc Vercel team reports Hobby. Current official fair-use policy requires Pro/Enterprise for a commercial site, including advertising services. No authorized upgrade/general hosting spend. The earlier Gary $5 authorization is not reusable here.
   https://vercel.com/docs/limits/fair-use-guidelines
2. GitHub account billing category/period/remaining allowance could not be read: connector does not expose account billing, and connected-browser context is unavailable. Public repository standard ubuntu-latest Actions compute is free; this does not prove the account budget, cache/storage usage or private Command Center allowance.
   https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions
3. Vercel billing-cost query returned costs_not_found, not proof of zero cost or remaining quota. Hobby has no hosting billing cycle; sandbox free quota is separate and pauses at quota. No upgrades or new charges authorized.
4. Website workflow runs npm ci/test/lint/build on PR updates and pushes to main. Vercel Git integration builds previews and production from main. No push was issued to avoid triggering unverified hosting.
5. Existing daily production cron GET /api/gary/funnel-outbox/drain at 11:00 UTC drains up to five due events. Current environment metadata lacks CRON_SECRET/GARY_FUNNEL_DRAIN_SECRET, so authorization fails closed. Do not activate/replay historical uncertain entries as a side effect of this release.
6. Main has no branch protection/rulesets; this does not waive project security confirmation or justify bypassing gates.

## Current remote and intended non-destructive release path
- PR18 remains draft dc38c5dfdd1f234dafb741d267071d40871293c7 -> codex/website-redesign-scrollcraft (PR17).
- PR17 eaed8409a6e4855ed0255d12988fd4628ec28ce9 -> feat/frontend-scroll-story (PR16).
- PR16 6bd2f8ba581cc89ae9be64f7fa389f924586176e -> main.
- Main/production: 0ede74a6643c1648f145efbd452b603c497ede44; deployment dpl_96s1XNXp259vZaKGFFt6SDkd2evL READY; https://www.easyaiconsult.com returned 200.
- After blockers and required confirmations clear: refresh all remote heads; normal fast-forward push integrated head to existing PR18; review exact head, ready/merge 18 ->17 ->16 ->main with checks at each step and branches preserved. No force push and no overlapping PR13–15 merges.
- No new remote CI/deployment outcome exists for this candidate. Local/cloud build passing is not GitHub CI.
- Interactive candidate: https://sb-40v8onjh8v2l.vercel.run/ . Served application revision a943992c2244bae75fca21c99a30cbbc8317214e. Named sandbox redesign-review-oct27; keep same saved cloud source and original backups.

## Backend handoff — existing owner/Astra Light
No Command Center source edits, paid tests, mail sends, historical403 retries, credential changes, or migrations were performed.

| Website setting | Existing Command Center contract | Current metadata |
| --- | --- | --- |
| GARY_FUNNEL_WEBHOOK_URL | /api/easy-ai/public-funnel/events | Website setting absent |
| GARY_FUNNEL_WEBHOOK_SECRET | EASY_AI_PUBLIC_FUNNEL_WEBHOOK_TOKEN | Both setting names absent |
| COMMAND_CENTER_ASSESSMENT_SYNC_URL | /api/easy-ai/assessments | Website setting absent |
| COMMAND_CENTER_ASSESSMENT_SYNC_TOKEN | EASY_AI_SYNC_TOKEN | Website absent; CC token name exists |
| /api/gary/message signed founder-history read | EASY_AI_GARY_HISTORY_URL | CC setting absent |

These are six missing setting names across the two projects, not instructions to print or invent secrets. Legacy COMMAND_CENTER_WEBHOOK_URL/SECRET do not replace these exact contracts.
- Existing CC PR58 head 20f585de504f1701138edc599157f14118ebd41e is 69 commits ahead and 2 behind actual main 950e2f21efd1949d6c004b0ed33a86cafca42e31. Existing owner must reconcile those main changes and release the accepted history/consent integration. Do not mistake compare merge-base for current main.
- Verify existing effective Neon DB identity and completed schema state read-only; do not rerun the seven migrations.
- Verify provider/model/key match. Production provider/model values are opaque. Anthropic key name exists; OpenAI key name does not. Default factory is OpenAI unless explicitly selected otherwise; do not infer the production model.
- Verify Resend sender authorization, approved recipients and required preview isolation without bypassing guards. Current metadata has RESEND_API_KEY, ASSESSMENT_NOTIFICATION_EMAIL, RESULT_EMAIL_REPLY_TO; names alone prove neither sender nor recipients.
- Full report is present in both mail code paths: assessment API passes resultHtml to sendInternalNotification; owner mail wraps full report plus plain text and uses report idempotency key. This is source proof only, not successful delivery.
- Next concrete integration action: existing backend owner binds the six named cross-project settings and verifies current DB/provider/mail/consent identities, then prepares one fresh, uniquely tracked journey. Prospect input etoyi.g@gmail.com and owner info@easyaiconsult.com must each receive the complete matching report, with conversation/results visible for review. No production-wide test-recipient redirect and no retry of earlier uncertain sends.
