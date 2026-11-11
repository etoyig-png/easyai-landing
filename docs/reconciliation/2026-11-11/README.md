# Approved 1.1 reconciliation, November 11, 2026

Latest narrow correction: [brighter halo and mobile Gary recovery](phone-recovery.md), compiled runtime 6924ab35af203c3165d5fbd48850dbf23a7882ba.

Previous review: see [latest copy, sizing, pulse and public Gary checks](latest-reviewed-corrections.md), runtime 6b6cf00b20bbd5cbfcf1568e887b4b29903e7628. Earlier snapshots below are retained as history.

Status: PASS FOR VISUAL PREVIEW. Founder review and production/operational acceptance remain pending. Nothing was pushed, merged or deployed.

## Exact sources and preservation

- Website: etoyig-png/easyai-landing. Cloud-only review branch: review/1.1-approved-reconciliation-20261111. Existing frontend owner reported idle; no replacement owner or parallel frontend was started.
- Original base: eaed8409a6e4855ed0255d12988fd4628ec28ce9 plus the approved unpublished 1.1 tree. Checkpoint e44417dba0100121ffef47dea303652d9c70587c preserves that tree.
- The 195-file backup remains at /tmp/easyai-1.1-baseline-20261111. Archive SHA256: f4bf8999adf2c523eb27f5348c243ad574eae9297c1c4e9a3ff46dacf2fef42f.
- Mark's base bundle is 37,858,576 bytes, SHA256 f19c752550a48d6dbc1b654d91549a41527273eb06c4e1680fa9c521014d85a3. Base commit a53ce2a44d6bfa5fa475f7f63de6ca547489b7cd, tree 0b4dd593d7c507db7590967f488b8203eeb12e5a.
- The 3,403-byte delta bundle has SHA256 ef57ddb13c23695bb7b1ab545b79c1def17f2bbf7a484df4fe76b22881719ef9. Target commit 10480e7404f2bbaa5057857893512eb65fbed639, tree 42dd4bd78fe9481f52ea96524b91169b825b444e.
- Existing cloud imports were reused. No source transfer was repeated. Both bundle hashes, Git bundle verification, exact commits/trees, full strict Git integrity check and clean candidate checkout were independently checked. The initial import also verified all 51 chunk hashes, 163 base commits and 25 tracked candidate assets.
- file-comparison.json records the full 243-path union against the preserved baseline: 130 identical, 54 different, 48 candidate-only and 11 baseline-only. Hash comparison does not imply approval to import every differing file.

## Reconciled behavior

The centered, immediately visible headline is “Are customers finding your business? We help more of them find you.” The existing assessment route is linked directly below using “Start Your Free Assessment.” Next are “Get found. Get discovered. Get more prospects.”, “Here’s how.”, the three existing logo tiles, and GAP / AIM / SmartSite sections. The existing Easy AI globe/wordmark follows the main products, with another assessment action immediately afterward. Gary's non-green directional invitation and reserved mobile space follow that action, leaving the specified opening sequence uninterrupted.

Reused the existing page, typography, art, product copy, sentence helper/observer, native trace renderer, construction footage/frame, Gary launcher/video and lazy chat panel. Native logo anchors remain clickable. Entrance directions follow positional order: left / right / bottom. Gary remains floating on desktop and uses the candidate's portal mechanism in reserved mobile page space.

Preserved all baseline public assets byte-for-byte. The straight shaded metallic wordmark, crisp GAP and AIM subtitles and original colors remain. Globe drawing is 30 seconds with the stable 24-second trail fade. The actual transparent human Gary WebM, tracked sign lettering, white connected bubble, exact words/period, 2–8-second bubble window, five-second launch delay, reduced-motion fallback and native loop remain.

Candidate differences that would restore 10-second drawing/4-second fade, remove product-sentence reveals, substitute the older construction footage or change accepted Gary behavior were not imported. Backend, assessment, consent, API, security, package and migration contracts were not copied from the divergent candidate.

## Rollback

Each change is a separate unpublished cloud commit:

1. e44417dba0100121ffef47dea303652d9c70587c: exact baseline checkpoint.
2. d36ad342467c8ab0a0c0934337839b422795158e: approved homepage structure/headline/assessment actions.
3. dba83e155527d85a631fc40d38256b35590d5f41: reserved mobile Gary portal.
4. c7e7f58abd0ec894c1338a9a6f3bb0c2a3e437c9: section-relative relocated globe motion, retaining sentence reveals.
5. 1639b62d77ee1c80c4b630f8b6d784addcd33349: restore baseline tagline typography and preserve left/right/bottom entrances after logo reordering.

Reverse dependent commits in reverse order when rolling back; do not reset or overwrite unrelated work. Later report/test commits do not change runtime source.

## Verification

- Production build, lint and explicit TypeScript no-emit check pass.
- Two existing trace-motion unit tests pass.
- Eight new regression cases pass in the existing Playwright suite: two visitor-facing tests across desktop, 360×800, 390×844 and 412×915. Existing libraries and fixtures were reused.
- Twelve additional browser scenarios / 68 recorded checks pass, covering 360/390/768/1024/1440 layouts, immediate centered opening, CTA hit testing and actual assessment navigation, no horizontal overflow, clickable product logos, sentence reveals, original subtitle colors, mobile invitation/CTA clearance, visible Gary playback, joined white bubble at 3 seconds and its absence before 2/after 8, crossing the native loop boundary, actual refresh with a prior animation flag, chat open/simulated reply/close, construction playback, pause/resume, live reduced-motion preference, repainting globe and no-JavaScript fallbacks.
- Chat network responses in browser checks were intercepted fixtures. Other API requests were blocked. These tests do not prove live model, database, assessment completion or email behavior.
- Desktop opening, product logo group and mobile Gary bubble were visually inspected. Temporary captures are QA evidence, not a substitute for the interactive review.
- The complete historical browser suite was not run or claimed passing. Some older cases still reference superseded H1/image/video markup; this work added focused regressions instead of weakening unrelated assertions.

## Defects and limitations recorded

Two integration defects were corrected: entrance directions no longer matched positional order after logo reordering, and the new paragraph tagline had diverged from baseline typography. The existing reveal/timing decisions were retained.

The cloud browser initially lacked its bundled font configuration. This caused missing text and browser exits in early checks. Supplying the already-installed font configuration to the test process resolved it; no site font, dependency, security header or credential was changed. Final checks required nonzero rendered text width.

An early pause/resume check incorrectly expected an offscreen construction video to play after clicking the absolute-positioned top-of-page motion control. The click correctly scrolled the control into view. Returning the video to view, as the existing repository test does, verified resume. No application change was needed for that test setup issue.

Actual full-loop pixel continuity and alpha/sign content rely on the unchanged accepted media asset; runtime boundary crossing and transparent element styling were checked. These checks are Chromium-based, not physical iPhone/Safari certification.

## Code health and measured performance

No runtime dependency, client-component boundary, duplicate Gary system, API/database operation, migration, credential or production configuration was added. Existing hooks clean up their listeners. Chat remains lazy-loaded. Added tests reuse the existing test framework. Documentation/measurement files do not enter client bundles.

Measured build output: homepage route 5.29 kB before / 5.36 kB after; rounded First Load JavaScript 104 kB before / 104 kB after; shared First Load JavaScript 87.1 kB before / after. This is not a zero-byte-growth claim.

Font-aware, single-run unthrottled cloud measurements are retained in browser-acceptance.json. These are local lab observations, not field results or a controlled before/after speed claim. No new performance threshold was added. Existing production performance gates remain applicable. The optional sharp warning is inherited; no dependency was installed in response.

## Preview and release boundaries

Interactive preview: https://sb-40v8onjh8v2l.vercel.run/
Runtime build source: 1639b62d77ee1c80c4b630f8b6d784addcd33349.
The current named sandbox resumed the saved snapshot; no new hosting project was created. Current session expires November 11, 2026 at 1:48:27 p.m. Eastern. Saved files persist when the session stops. The plan check reported an upgrade to Pro/Enterprise is required; Vercel documents free Hobby quotas as hard stops rather than paid overages. No upgrade or paid feature was enabled. A 12-hour continuous session is not available under the free 45-minute session limit.

No push, merge, production release, real model/email/provider call, uncertain email retry or database change occurred. PR18's remote head is not this unpublished review branch. PR18→PR17→PR16→main and unrelated PRs remain untouched. GitHub/Vercel push effects and production billing checks remain release gates.

The real prospect journey is still unverified: useful Gary conversation, completed assessment, complete report received by prospect and Easy AI, and founder-visible saved conversation/results. Visual acceptance does not close that work. Toy must review this interactive preview before any production release.
