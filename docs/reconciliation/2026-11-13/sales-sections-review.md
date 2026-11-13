# Approved sales sections review — 13 November 2026

Status: implemented in the existing cloud checkout; no merge or production release. PR publication remains pending exact-history transport.

## Approved scope and source
- Base preserved: ef5d760e72d14805c1ce3afd16a3a28804e58798. Toy explicitly selected this approved1.1 top instead of stale GitHub PR18dc38.
- Reference fetched read-only: ccr-1ffdd65e-mk6g3s at c47a1bf129db0e97f8e0109f2ab24ad67fd7f550, app/sandbox/{page.tsx,sandbox.css,LeakCalculator.tsx,SandboxMotion.tsx}.
- Reference recording new website design.mp4, libfile_66a8c761cd0c819190fd337b16025996, visually reviewed at nine sampled timestamps across78.23seconds. This was a sampled frame review, not an audio transcription. Claude artifact URL was unavailable to the web reader.
- Toy clarified: borrow only selected pieces, leave the sample alone; do not revive the construction video; sticky CTA visible from the beginning, hides when the large closing assessment button appears and stays hidden below it.
- Local rollback: backup/1.1-before-sales-20261113 points to exact ef5d760. Original release bundle and195-file backup retained.
- Existing reference branch and its app/sandbox source unchanged. That route did not exist in the selected ef5d760 baseline; no duplicate sample route was introduced.

## Implementation
- Preserve the original homepage markup from .home-story through all three product scenes, globe/logo, post-logo assessment invitation and Gary slot. Only the two specified obsolete human-video/closing sections are replaced.
- New sibling .sx wrapper: platform-labelled looping search band; search CTA and example receipt; three leaks/cards; visitor-number calculator; three steps; approved photo/trust links; closing assessment; persistent assessment bar.
- Primary buttons target /assessment. Calculator button and closing consultation button removed. The explicitly retained Gary /contact data-open-gary links and About/AI+Trust informational links remain.
- Receipt is its own server-rendered component. An unclipped outer wrapper triggers the print/line animation on entry. No duplicate Gary/art imports.
- Reuse reference appearance/copy/styles; all CSS selectors scoped to .sx, with namespaced keyframes. Unused sample hero/cartoon styles omitted.
- One heading1 retained; new headings2/3. Minimum48px CTA targets, visible focus, unique landmark labels, reduced-motion/Pause motion support and server-rendered no-JS copy/links.
- No runtime dependency added; existing images reused. No Gary component, global CSS, assessment, API, database, provider, security or consent source edited.

## Actual checks and limits
- Final TypeScript, lint and production build pass.
- Existing unit tests632pass/23skip. Database-dependent tests skipped, no migrations or real provider/mail use.
- Focused public-HTTPS browser run20/20 passed: existing homepage navigation at360/390/412/768/1440, accessibility, keyboard, no-JS, mocked assessment contract, approved1.1 preservation/deferred Gary checks, new sales flow/calculator/receipt/sticky clearance at1440/390, reduced motion and no-JS sales fallback.
- A subsequent narrow sticky-bottom correction passed2/2 at1440/390 on the final source, including jumping from the footer back to the top. The full legacy browser suite was NOT certified. Old unrelated sprite helpers remain out of this scoped change.
- Before/after protected top text and headline computed font match at1440/390. Code prefix equality independently asserted against ef5d760.
- Initial browser pass:10passed/3failed, retained in initial-browser.log. Defects: duplicate region label; clipped receipt observed itself and never intersected. Both fixed; no assertion disabled. Later source review fixed sticky reappearance below closing CTA and added a footer-scroll regression. That regression first passed desktop and failed phone when jumping back to the top; a passive scroll update fixes the missed observer event. Final2/2pass.
- No physical Android/Safari approval or actual prospect journey/email delivery claim.

## Performance and evidence
Measurements are recorded in metrics.json. Approved Next15baseline homepage4.99kB / first load116kB / shared103kB. Sales calculator/motion add route JavaScript; total first load118kB. Route growth exceeds5% and is explicitly surfaced for draft review, not hidden behind passing tests. New sales CSS16,191raw /4,360gzip bytes. No package additions. These feature costs are not a speed improvement claim or production acceptance.
- Cloud artifacts: /tmp/easyai-sales-reference/.
- Before/after screenshots at1440 and390 include actual viewports plus expanded-scroll overviews. Only the latter temporarily unroll the internal scroll frame for capture. Runtime sticky/Gary clearance uses the unmodified viewport.
- Screenshot manifest stores dimensions/filenames/hashes. Images are not added to runtime or the Git repository.
- Raw logs include types/lint/unit/build, initial failures/corrections/final browser runs and the last sticky-bottom regression.

## Remaining publication and product notes
GitHub base fix/backend-reconciliation-20261026 is still dc38c5dfdd1f234dafb741d267071d40871293c7. Existing authenticated laptop bare transport is the approved path for original ef5d760 history; the Vercel shell itself has no Git push authentication. Do not recreate commits, publish a replacement tree without original parents, force-push, merge, or deploy. After the original bundle hash/import passes, import the separate feature delta, verify exact head/tree, and push only the feature branch to open a review PR into the requested base. That base must first contain approved ef5d760 so the PR shows only the sales change.
Before/after images still need attaching to that actual PR. No PR exists yet; a prepared description is not a published PR.
The source copy promises human-reviewed recommendations. The actual review step remains a backend-owner operational confirmation, not something implemented or proven by this frontend change. The approved words were retained; no assessment/backend flow was changed.
