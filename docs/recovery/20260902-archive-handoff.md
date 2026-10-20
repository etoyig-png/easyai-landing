# Easy AI — Assessment & Action Plan Email Handoff

**Source commit:** `80e2c38a014ddfc51d4e692353947950993ba013`
**Source branch:** `feat/customer-growth-repositioning` (local only — never pushed to GitHub)
**Repository:** `etoyig-png/easyai-landing`
**Packaged:** 2026-09-02

---

## READ THIS FIRST

This work was built on a base that **predates the security hardening now on `main`**
(`212542ba78a576c3f991f8e4f69424a9d42c5447`, merged as PR #5).

**Do not merge this branch.** Do not copy these files over `main` wholesale. Several of them
were rewritten on `main` to add security controls that are **not present here**. Port the
*behavior* described below onto current `main`, keeping `main`'s version of each overlapping
file as the base.

The three files where this matters most are called out under **Security Protections** below.

---

## What This Package Contains

Only the assessment and Action Plan email workstream. No website UI, no Gary chat widget, no
layout, no images, no `.env`, no `node_modules`, no build output.

### Assessment questions and UI

| File | What it is | What changed |
|---|---|---|
| `lib/quizQuestions.ts` | The question set, answer choices, and business-name personalization | Added the `leadResponse` question. Replaced one `timeDrain` option. Removed seven rejected questions. |
| `app/assessment/page.tsx` | The multi-screen assessment form | Now 11 screens. Added the conditional favorite-team field and the website / no-website field. Screen count is derived from the question list, not hardcoded. |
| `app/assessment/complete/page.tsx` | Post-submission page | Gates the scheduling button behind a consultation video. |

### Submission route and validation

| File | What it is | What changed |
|---|---|---|
| `app/api/assessment/route.ts` | POST handler that saves the submission | Persists the four new fields. **See the security warning — `main`'s version is very different.** |
| `lib/validation.ts` | Zod schema for the submission | Added `leadResponse`, `favoriteTeam`, `websiteUrl`, `noWebsite` plus two cross-field rules. |

### Action Plan email

| File | What it is | What changed |
|---|---|---|
| `lib/anthropic.ts` | System prompt, user prompt, generation, deterministic fallback | Removed a `$40-60/month` price claim that contradicted a later rule in the same prompt. Fixed the fallback (it had the same price claim and **no closing question at all**). Added: exactly three free actions, 6th-grade reading level, an explicit list of things never inspected, and a rule that the Feel/Felt/Found arc must never be labeled in output. |
| `lib/resend.ts` | Email delivery | Internal notification now addresses four inboxes in **one** send. Added a plain-text alternative (none existed). CTA changed to "Watch Your Next-Step Video" pointing at `/assessment/complete`. |
| `lib/resultValidator.ts` | Deterministic output guard | Added `MONEY_CLAIM_PATTERNS` and `FALSE_AUDIT_PATTERNS`. These were prompt-only rules before; now a violation forces the correction retry. |
| `lib/htmlEscape.ts` | Escaping helper | Unchanged. Included because the above import it. |
| `lib/notificationRecipients.ts` | Internal inbox list | New. Server-only. Holds the four operational addresses with a comma-separated env override. |

### Gary assessment synchronization

| File | What it is | What changed |
|---|---|---|
| `lib/gary/assessmentSync.ts` | Sends the complete assessment to the Command Center | Swapped the seven rejected question labels for the single `leadResponse` label. |

### Database

| File | What it is |
|---|---|
| `prisma/schema.prisma` | Adds four fields to `Submission` and one to `PublicChatSession` |
| `prisma/migrations/20260829000000_assessment_lead_response/migration.sql` | The four assessment columns |
| `prisma/migrations/20260828000000_gary_contact_request/migration.sql` | `contactRequestedAt` duplicate guard |

---

## Required Database Fields

**Neither migration has been applied to any database.** If this code deploys without them,
**every assessment submission will fail** because the columns will not exist.

```sql
-- 20260829000000_assessment_lead_response
ALTER TABLE "Submission" ADD COLUMN "leadResponse" TEXT;
ALTER TABLE "Submission" ADD COLUMN "favoriteTeam" TEXT;
ALTER TABLE "Submission" ADD COLUMN "websiteUrl"   TEXT;
ALTER TABLE "Submission" ADD COLUMN "noWebsite"    BOOLEAN NOT NULL DEFAULT false;

-- 20260828000000_gary_contact_request
ALTER TABLE "PublicChatSession" ADD COLUMN "contactRequestedAt" TIMESTAMP(3);
```

All additive and nullable (or defaulted). Nothing is dropped or renamed. Existing rows stay
valid. `noWebsite` defaults to `false`, so historical rows read as "no explicit no-website
declaration".

---

## The Assessment: 11 Screens, 9 Questions

1. Intro — first name + business name
2. `workSituation` *(unchanged)*
3. `usingAiTools` *(unchanged)*
4. `aiChallenge` *(unchanged)*
5. `desiredOutcome` *(unchanged)*
6. `timeDrain` — **one option replaced**
7. `privacyConcern` *(unchanged)*
8. `industry` *(unchanged)*
9. `leadResponse` — **NEW**
10. `sportsFan` — **new conditional follow-up field**
11. Contact — last name, email, **new website field**

Then the existing confirm/edit step and a transient "building" state.

### New question (Screen 9)

> **What usually happens after a potential customer contacts your business?**

1. They receive a fast response and are tracked through the next step.
2. We respond manually, but follow-up is not always consistent.
3. Responses are sometimes delayed because our team is busy.
4. Some calls, messages, or website inquiries are probably missed.
5. I don't have a clear way to track what happens.

This is a **separate diagnostic signal**. It feeds the email and the consultation prep. It must
**never** be folded into the legacy profile value.

### Changed time-drain option (Screen 6)

- **Before:** `Marketing, new customers & missed leads`
- **After:** `Finding more customers and generating a steady flow of qualified leads.`

The other four options are untouched.

### Favorite team (Screen 10)

Shown and required **only** when Football or Basketball is selected. Hidden and not required for
"Not really a sports fan". Stored for consultation rapport only — it is **never** passed to the
email generator, and a test asserts no sports language appears in the output.

### Website field (Screen 11)

A valid `http://` or `https://` address, **or** the checkbox "I do not currently have a website."
Both blank is invalid. `javascript:`, `data:` and `file:` URLs are rejected.

---

## Rejected Questions — These Must NOT Return

Seven questions were added, then rejected by the owner, then fully reverted. **Do not
reintroduce them under any name:**

- `customerDiscovery`
- `searchVisibility`
- `websiteAction`
- `responseSpeed`
- `missedCalls`
- `followUpConsistency`
- `sensitiveInfo`

Their migration (`20260827000000_customer_growth_questions`) was deleted and was **never applied
to any database**. `lib/assessmentContract.test.ts` fails if any of these keys reappears.

---

## Tests That Protect This Behavior

| Test | Protects |
|---|---|
| `lib/assessmentContract.test.ts` | The exact 9 questions, their order, every answer choice, the personalization rules, and that the seven rejected keys are absent. Also asserts 11 screens. |
| `lib/assessmentValidation.test.ts` | Website required one way or the other; non-http schemes rejected; favorite team conditional; honeypot and minimum-fill-time still enforced; consent required; HTML-like business names stored as data. |
| `lib/actionPlanGolden.test.ts` | **Golden fixture (Riverside Plumbing).** 19 behavioral rules: personalization, synthesis, no false audit claim, ~3 opportunities, exactly 3 free actions, no proprietary names or methods, no money claims, the exact WHY question once and last, CTA text and destination, no sports leak, no arc labels. Behavior, not wording — it is a contract, not a template. |
| `lib/resultValidatorGuards.test.ts` | Money and false-audit guards actually fire on violations **and** do not fire on legitimate copy — including the owner's own revenue band (`$100K-$1M`) from their answers. |
| `lib/resultEmailText.test.ts` | Plain-text alternative renders readable prose, decodes entities, points at `/assessment/complete`, stands alone. |
| `lib/gary/legacyProfile.test.ts` | **The new answer never changes the legacy profile value.** All five `leadResponse` choices leave `profileResult` identical and `categoryScores` empty. |
| `lib/quizQuestions.test.ts` | Question keys, options, `allowOther` flags, business-name interpolation. |
| `lib/validation.test.ts` | Existing schema behavior. |
| `lib/resultValidator.test.ts`, `lib/anthropic.test.ts`, `lib/resend.test.ts`, `lib/gary/assessmentSync.test.ts`, `lib/notificationRecipients.test.ts`, `lib/industryResearch.test.ts`, `lib/htmlEscape.test.ts` | Pre-existing coverage of the surrounding behavior. |

Last full run at this commit: **lint clean, typecheck clean, 167/167 unit tests, production build
succeeded.** E2E was 484 passed / 16 failed, where all 16 are pre-existing failures proven to
reproduce on the untouched base.

---

## Security Protections From Current `main` That You Must Preserve

`main` (`212542b`) contains a security layer this branch has **never seen**. These modules do not
exist here at all:

- `lib/assessmentAdmission.ts` — admission control, rate limiting, duplicate suppression
- `lib/requestSafety.ts` — request size limits, provider timeouts
- `lib/safeEmailContent.ts` — untrusted-content rendering for the email
- `lib/gary/handoffState.ts`, `lib/gary/handoffRateLimit.ts`, `lib/gary/sessionCapability.ts`
- `next.config.test.ts`, `.github/workflows/security-gate.yml`, `SECURITY_LEDGER.md`

### The three files where a careless copy destroys security

**1. `app/api/assessment/route.ts` — HIGHEST RISK.**
`main`'s version calls, and this version does **not**:

```ts
body = await readLimitedJson(req)              // request size limit
admission = await admitAssessment(data, ip)    // admission control
admission.kind === 'limited'                   // rate-limit branch
admission.kind === 'duplicate'                 // duplicate suppression
withTimeout(generateAssessmentResult(...), PROVIDER_TIMEOUT_MS)
```

Start from `main`'s file. Add only the four new field assignments in the `prisma.submission.create`
call. **Never** overwrite it with the copy in this ZIP.

**2. `lib/anthropic.ts`.**
`main` imports `renderUntrustedAssessmentContent` from `./safeEmailContent`. This copy does not.
Start from `main`'s file and re-apply the prompt and fallback edits described above.

**3. `lib/gary/assessmentSync.ts`.**
Both sides modified it. Take `main`'s version and swap only the question-label map.

### Also preserve

- Rate limiting in `lib/rateLimit.ts`
- The report-only CSP in `next.config.mjs`
- The honeypot and minimum-fill-time checks
- The Command Center's minimal status-only data boundary — do **not** start sending full
  assessment answers or the generated narrative there without a separate decision
- No PHI is collected anywhere; keep it that way

---

## Non-Negotiable Behavior Rules

**Proprietary names must never appear in customer-facing output** — visible copy, metadata,
titles, alt text, URLs, structured data, client-side JavaScript, public API responses, generated
summaries, Gary replies, emails, or error messages:

`GAP` · `Digital GAP` · `GAP Scorecard` · `AIM` · `AIM Voice` · `SmartSite` · `CRR` ·
`Command Center` · `Concierge`

The lowercase words *gap*, *gaps* and *aim* are fine and expected — the approved copy itself says
"identify likely gaps". `GAP` and `AIM` are therefore matched **case-sensitively** in the
validators. Do not change that to case-insensitive; it will reject legitimate output.

**The Action Plan email must:**
- End the narrative with this exact sentence, once, with nothing after it but the CTA and footer:
  *"One final question worth thinking about: What made you build [Business Name], and what do you
  want the business to make possible for you?"*
- Contain exactly three free actions
- Never quote a price, savings figure, revenue figure, or ROI
- Never claim it inspected rankings, metadata, schema, AI visibility, keywords, technical
  performance, competitors, local rankings, review optimization, or search configuration
- Never explain the paid methodology (schema, structured data, metadata architecture,
  AI-search optimization, keyword strategy, content architecture, competitor analysis,
  proprietary scoring or prompt methods)
- Never reference sports, teams, or game metaphors
- Send the reader to `/assessment/complete`, never directly to a calendar

---

## Known Gaps

1. **Both migrations are unapplied.** Nothing works without them.
2. `CONSULTATION_VIDEO_URL` and `CONSULTATION_SCHEDULER_URL` are **unset**. No video and no
   booking link exist. The completion page states scheduling is not open rather than faking it.
   Do not invent URLs.
3. Email delivery, Command Center writes, and live Claude generation were verified **by code path
   and unit tests only** — never with real credentials. Treat them as unproven.
4. 16 pre-existing E2E failures (Gary sign/bubble geometry at 412×915 and 430×932) are unrelated
   to this work and reproduce on the untouched base.
