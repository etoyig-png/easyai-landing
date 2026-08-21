# Easy AI Security Remediation Ledger

Baseline: `05e09da4703022ba69043b17dec08f407e43e516`
Last verified: 2026-08-21
Deployment state for every control below: **NOT DEPLOYED / NOT PRODUCTION VERIFIED**

| Control | Severity | Finding and original evidence | Remediation commit | Regression evidence | Status and remaining risk |
|---|---|---|---|---|---|
| EAI-A-01 | Critical | Gary message/handoff routes trusted a caller-supplied session UUID. | `640ee24` | `lib/gary/sessionCapability.test.ts`; full test/lint/build gate | **FIXED IN REMEDIATION BRANCH - NOT YET VERIFIED IN PRODUCTION.** Capability secret must be configured before deployment. |
| EAI-A-02 | High | Handoff rotated state and could repeat summary/provider work. | `f013b2f`, `11de824` | capability, token, and handoff-rate tests; full gate | **FIXED IN REMEDIATION BRANCH - NOT YET VERIFIED IN PRODUCTION.** In-memory burst limit is instance-local; database serialization and idempotency protect expensive work across instances. |
| EAI-A-03 | High | Handoff token was duplicated in JSON and URL; refresh replay was implicit. | `f013b2f` | `lib/gary/handoffToken.test.ts` | **PARTIALLY FIXED / REQUIRES TOY DECISION.** Duplicate JSON exposure removed and consumption is explicit. Strict single-use would change refresh/back-navigation UX. |
| EAI-A-04 | Critical | Model-controlled HTML was inserted into result email after incomplete regex checks. | `e232a1e` | `lib/safeEmailContent.test.ts` attack corpus | **FIXED IN REMEDIATION BRANCH - NOT YET VERIFIED IN PRODUCTION.** Model markup is discarded; escaped text is rendered in server-owned paragraph tags. |
| EAI-A-05 | High | Missing/unknown IP bypassed assessment and Gary rate limits. | `b9e0331` | `lib/rateLimit.test.ts` | **FIXED IN REMEDIATION BRANCH - NOT YET VERIFIED IN PRODUCTION.** Non-invasive header fallback may group clients with identical headers. |
| EAI-A-06 | High | Assessment count-then-create allowed concurrent threshold bypass. | `285f28c` | full type/build gate; transaction admission logic | **FIXED IN REMEDIATION BRANCH - NOT YET VERIFIED IN PRODUCTION.** Uses existing PostgreSQL advisory locks and serializable transactions; database integration verification is required in a non-production environment. |
| EAI-A-07 | High | Duplicate submissions could repeat records, LLM calls, emails, and events. | `285f28c` | full test/lint/build gate | **FIXED IN REMEDIATION BRANCH - NOT YET VERIFIED IN PRODUCTION.** Ten-minute email cooldown; failed submissions remain retryable. |
| EAI-A-08 | High | Request, transcript, provider and integration work lacked explicit ceilings. | `d41ad21`, `11de824`, `285f28c` | `lib/requestSafety.test.ts`; full gate | **FIXED IN REMEDIATION BRANCH - NOT YET VERIFIED IN PRODUCTION.** 32 KiB JSON, 2,000-character messages, 80-message/40,000-character transcripts, and provider/integration timeouts. |
| EAI-A-09 | High | A later persistence/integration error could relabel a successfully sent email as failed. | `285f28c` | full test/lint/build gate | **FIXED IN REMEDIATION BRANCH - NOT YET VERIFIED IN PRODUCTION.** Email delivery state is separated from best-effort persistence and integrations. |
| EAI-A-10 | Medium | No application-controlled security-header baseline. | `103037e` | `next.config.test.ts`; production build | **FIXED IN REMEDIATION BRANCH - NOT YET VERIFIED IN PRODUCTION.** CSP intentionally omits a script directive rather than permit unsafe inline/eval; production header verification remains required. |
| EAI-A-11 | High | Pull requests lacked an enforceable test/lint/build gate. | `56cdaba` | workflow invokes `npm ci`, test, lint, build | **FIXED IN REMEDIATION BRANCH - NOT YET VERIFIED IN PRODUCTION.** Branch protection is an external Toy-approved configuration step. |
| EAI-A-12 | Medium | No committed remediation evidence ledger. | `8740a2a` | this document and final full gate | **FIXED IN REMEDIATION BRANCH - NOT YET VERIFIED IN PRODUCTION.** Update after deployment and independent production verification. |

## Requires Toy Decision or External Verification

- Strict handoff-token single-use behavior versus legitimate refresh/back navigation.
- Exact complete-assessment Command Center payload and receiving architecture.
- Branch-protection settings and production Vercel configuration.
- Preview/production database separation, retention/deletion periods, and migration/deployment coupling.
- Production Supabase changes and production deployment.
