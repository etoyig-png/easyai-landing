# Easy AI Security Remediation Ledger

Baseline: `05e09da4703022ba69043b17dec08f407e43e516`
Last verified: 2026-08-21
Deployment state for every control below: **NOT DEPLOYED / NOT PRODUCTION VERIFIED**

| Control | Severity | Finding and original evidence | Remediation commit | Regression evidence | Status and remaining risk |
|---|---|---|---|---|---|
| EAI-A-01 | Critical | Gary message/handoff routes trusted a caller-supplied session UUID. | `640ee24` | `lib/gary/sessionCapability.test.ts`; full test/lint/build gate | **FIXED IN REMEDIATION BRANCH - NOT YET VERIFIED IN PRODUCTION.** `GARY_SESSION_CAPABILITY_SECRET` is now documented in `.env.example`. Its fallback to `GARY_HANDOFF_TOKEN_SECRET` is retained as **transitional compatibility** so environments provisioned before the variable existed do not fail closed and take Gary offline; signatures are domain-separated by a `gary-session:` prefix. Set the variable explicitly in every environment. Production configuration remains UNVERIFIED. |
| EAI-A-02 | High | Handoff rotated state and could repeat summary/provider work. | `f013b2f`, `11de824` | capability, token, and handoff-rate tests; `lib/gary/handoffState.test.ts`; full gate | **FIXED IN REMEDIATION BRANCH - NOT YET VERIFIED IN PRODUCTION.** In-memory burst limit is instance-local; database serialization and idempotency protect expensive work across instances. Reuse relied on regenerating a byte-identical token from stored state; that determinism is now **explicitly verified against the stored hash** and rotates on any drift, so the endpoint can no longer hand a visitor a token `/handoff/consume` would reject. |
| EAI-A-03 | High | Handoff token was duplicated in JSON and URL; refresh replay was implicit. | `f013b2f` | `lib/gary/handoffToken.test.ts`; `lib/gary/handoffState.test.ts` | **PARTIALLY FIXED / REQUIRES TOY DECISION.** Duplicate JSON exposure removed and consumption is explicit. Strict single-use would change refresh/back-navigation UX. |
| EAI-A-04 | Critical | Model-controlled HTML was inserted into result email after incomplete regex checks. | `e232a1e` | `lib/safeEmailContent.test.ts` attack corpus | **FIXED IN REMEDIATION BRANCH - NOT YET VERIFIED IN PRODUCTION.** Model markup is discarded; escaped text is rendered in server-owned paragraph tags. |
| EAI-A-05 | High | Missing/unknown IP bypassed assessment and Gary rate limits; the replacement then trusted the caller-controlled **first** entry of `x-forwarded-for`, which independent review found still spoofable. | `b9e0331`, this pass | `lib/rateLimit.test.ts` (13 cases incl. precedence, spoofed multi-value, IPv4/IPv6, malformed, anonymous fallback) | **FIXED IN REMEDIATION BRANCH - NOT YET VERIFIED IN PRODUCTION.** Preference is now `x-vercel-forwarded-for` (platform-set, not caller-forgeable) -> `x-forwarded-for` **last** entry only -> `x-real-ip` -> bounded anonymous identity. A present-but-malformed Vercel header falls to the anonymous identity rather than to a forgeable header. Address validation moved from a character-class regex to `net.isIP`, closing a port-suffix identity-multiplication gap. Non-invasive header fallback may still group clients with identical headers. IP is not the only control: session capability, admission serialization and the duplicate cooldown all remain required. |
| EAI-A-06 | High | Assessment count-then-create allowed concurrent threshold bypass. | `285f28c` | full type/build gate; transaction admission logic | **FIXED IN REMEDIATION BRANCH - NOT YET VERIFIED IN PRODUCTION.** Uses existing PostgreSQL advisory locks and serializable transactions; database integration verification is required in a non-production environment. |
| EAI-A-07 | High | Duplicate submissions could repeat records, LLM calls, emails, and events. | `285f28c` | full test/lint/build gate | **FIXED IN REMEDIATION BRANCH - NOT YET VERIFIED IN PRODUCTION.** Ten-minute email cooldown; failed submissions remain retryable. |
| EAI-A-08 | High | Request, transcript, provider and integration work lacked explicit ceilings. | `d41ad21`, `11de824`, `285f28c` | `lib/requestSafety.test.ts`; full gate | **FIXED IN REMEDIATION BRANCH - NOT YET VERIFIED IN PRODUCTION.** 32 KiB JSON, 2,000-character messages, 80-message/40,000-character transcripts, and provider/integration timeouts. |
| EAI-A-09 | High | A later persistence/integration error could relabel a successfully sent email as failed. | `285f28c` | full test/lint/build gate | **FIXED IN REMEDIATION BRANCH - NOT YET VERIFIED IN PRODUCTION.** Email delivery state is separated from best-effort persistence and integrations. |
| EAI-A-10 | Medium | No application-controlled security-header baseline. Independent review then confirmed the proposed **enforced** CSP would break the application. | `103037e`, this pass | `next.config.test.ts` (7 cases); production build | **HEADER BASELINE FIXED / CSP = REPORT-ONLY - REQUIRES PRODUCTION OBSERVATION BEFORE ENFORCEMENT.** Omitting `script-src` does not exempt scripts: they fall back to `default-src 'self'`, which blocks the inline `self.__next_f.push(...)` bootstrap scripts Next.js App Router streams (verified: the live site serves 5 such inline scripts) and the inline `style` attributes the app renders. Hydration, Gary and the assessment form would stop working. The restrictive policy is therefore shipped as `Content-Security-Policy-Report-Only`, unchanged and with no `unsafe-inline`/`unsafe-eval` added, and `X-Frame-Options: DENY` now carries clickjacking protection while `frame-ancestors` is only reported. HSTS, nosniff, Referrer-Policy and Permissions-Policy remain **enforced**. **Strict CSP production enforcement is NOT complete** and must not be marked complete: it requires observing report-only violations in production and then a nonce architecture, which forces dynamic rendering and has caching/performance implications - a separately measured phase. |
| EAI-A-11 | High | Pull requests lacked an enforceable test/lint/build gate. | `56cdaba` | workflow invokes `npm ci`, test, lint, build | **FIXED IN REMEDIATION BRANCH - NOT YET VERIFIED IN PRODUCTION.** Branch protection is an external Toy-approved configuration step. |
| EAI-A-12 | Medium | No committed remediation evidence ledger. | `8740a2a` | this document and final full gate | **FIXED IN REMEDIATION BRANCH - NOT YET VERIFIED IN PRODUCTION.** Update after deployment and independent production verification. |

## Correction Pass (post independent review, verdict FIX REQUIRED)

Scope was limited to the four approved findings. Addressed: CSP enforcement breakage (EAI-A-10),
client-IP trust source (EAI-A-05), capability-secret documentation (EAI-A-01), handoff-reuse
regression coverage (EAI-A-02/A-03). No dependencies added; no production or Vercel/Supabase
configuration changed.

Explicitly deferred, tracked but NOT addressed in this pass: streaming request-body enforcement,
AbortController redesign for every provider call, serializable-transaction retry framework,
distributed handoff rate limiting, strict single-use handoff tokens, the duplicate-submission
email-existence oracle, cosmetic named-entity email rendering, and broader dead-code cleanup
(`isRateLimited` is now unreferenced by application code).

## Requires Toy Decision or External Verification

- Promotion of the report-only CSP to an enforced policy, after production violation reports are reviewed.
- Strict handoff-token single-use behavior versus legitimate refresh/back navigation.
- Exact complete-assessment Command Center payload and receiving architecture.
- Branch-protection settings and production Vercel configuration.
- Preview/production database separation, retention/deletion periods, and migration/deployment coupling.
- Production Supabase changes and production deployment.
