# Visual review candidate, 16 November 2026

Exact visual baseline: 4d839fbf0fd961c1555c55cd9e9d6434d01c14c3.
Branch: fix/visual-review-20261116. Source-only review; no push or production deployment.

## Approved visual/copy changes

- Receipt remains in the opening section, right-aligned on desktop with the short explanation alongside; mobile stacks.
- Scrolling search banner immediately follows the search visibility question/assurances/button segment.
- Persistent search CTA uses centered stacked text with the existing bright green Start Your Journey Now button below.
- GAP card green CTA is centered. Original GAP, SmartSite, AIM and trust-photo assets were retained.
- Only the calculator heading backdrop is transparent; calculator and wording are preserved.
- Step 1 reads Get Your Company’s GAP Score.
- What We Do expands existing custom-agent and workflow entries rather than duplicating them, adds marketing and BRIQ entries, and retains the existing service range.
- New server-rendered /faq page is linked from What We Do. Seven native disclosure answers cover core services, assessment entry/next steps, marketing, custom agents, BRIQ, integrations and keeping useful current tools. No client FAQ library or outcome guarantee.
- Gary greeting-tip CSS moves its endpoint left toward the cheek. No Gary state/controller/chat/API/provider/database code changed.
- Replacement silver-laptop composite and its 50%-larger GAP logo are supplied separately for Toy’s visual review. The image preview is not installed into this source; the original approved laptop presentation is preserved pending review.

## Verification

- TypeScript, lint and final production build PASS.
- Independent exact source review PASS; git diff --check PASS.
- Five-file visual source diff including new FAQ: f940ac13e83b46d4ef43f82462af616f99d6263bf67fa520b498af65014f29fb.
- Real connected Chrome desktop at CSS1745px: receipt columns, centered vertical persistent CTA, banner immediately after search section, transparent calculator heading and brand before closing CTA verified.
- Actual CSS360x800, 390x844 and 412x915 phone checks: no horizontal overflow; receipt/product identities stack.
- CSS390: card CTA horizontal center difference less than0.001px; all three card logos loaded with natural width220; trust photograph loaded.
- Original asset URLs and sampled image-optimizer URLs return200 while active. Their absence from supplied screenshots was not reproduced while active; expiry alone is not asserted as every root cause.
- Native Gary video duration20.125s, loop enabled, readyState4 and no media errors in repeated samples across several loop intervals on the baseline and visual build. Motion pause/resume verified. The supplied Animation unavailable state was not reproduced.
- True background/resume NOT verified: opening another browser tab did not change document.visibilityState from visible in this connected browser. No speculative playback fix was made.
- FAQ link navigates correctly and native BRIQ disclosure opens on desktop and CSS360 without overflow.
- No assessment submitted, no provider request or real email initiated by this work. No backend/database/settings/security/dependency changes.
- Existing committed Gary handoff fix remains byte-identical: lib/gary/handoffState.ts blob618d25f84df3c999c17d07926a06d1a1a0c1b941.
- Pending backend patch remains untouched in the original /vercel/sandbox checkout, excluded from this visual worktree.

## Code health and performance

Reuse: existing receipt, calculator, motion, logo assets, source templates and native HTML details/summary. No runtime dependencies or new client components.
Homepage First Load JS stays118kB. New FAQ route is181B with106kB shared First Load JS.
All static JavaScript gzip growth0.080%; CSS gzip growth1.358% versus rebuilt exact baseline. No measured5% regression. See visual-metrics.json.
No field LCP/INP/CLS or speed-improvement claim. Database/API work per visitor is unchanged.

## Review route and release state

Existing approved named preview: https://sb-40v8onjh8v2l.vercel.run/ .
One45-minute resume was expressly approved by Toy. The session expires2026-11-16T17:37:44.511Z (12:37:44 PM Eastern); no extra restart or extension authorized here.
Remote Git publication remains blocked by the previously verified missing authenticated Git transport. No push, merge, deployment or credential change performed.
Formal Codex security preflight reference unavailable; no formal security-scan completion claim.
Verdict: PASS for visual/source review, with stated background/resume limitation and Toy’s review pending before release.
