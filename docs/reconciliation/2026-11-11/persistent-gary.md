# Persistent visible Gary, November 11, 2026

Status: implemented for visual review. Physical-cellphone confirmation and production approval remain pending.

## Exact source and reversible changes

- Interactive preview: https://sb-40v8onjh8v2l.vercel.run/
- Compiled runtime: **6499c7a6bfef2d84c997dd225546c9313c03bf1c**.
- Same cloud branch: review/1.1-approved-reconciliation-20261111, same named sandbox redesign-review-oct27. Existing source/imports reused. No laptop transfer, replacement coding workspace or parallel frontend owner.
- Continue the approved 6924ab35af203c3165d5fbd48850dbf23a7882ba runtime and saved ecee8da7044c65da30d78c3d2f30fb926dc479ef review head.
- 96b1c7138bb585252a424525318dd155f297fc61: persistent human presence, reserved viewport area and existing scroll-engine container support.
- 7d9c5f58cf7992a08a2e47e31cb1bcf67340ef1b: fix existing tablet product-column breakpoint mismatch.
- 6499c7a6bfef2d84c997dd225546c9313c03bf1c: deliver element scroll events to every existing engine scroll listener.
- Tests/report are saved separately after the compiled runtime. No source push/merge/release.

## What changed

Toy's explicit current correction is persistent visibility while scrolling, including cellphone. It does not request a frozen character.

The mobile portal into the below-products slot was removed. Gary now renders his existing human pose immediately in a fixed, compact viewport area. The existing five-second delay still starts the approved video routine. The video itself, its native continuous loop, expressions, sign words/tracking, transparency and chat behavior remain.

The page keeps its width and scrolls in the remaining viewport above Gary. The area ranges from 132px on short viewports to 210px on tall viewports, plus safe-area space. This prevents copy, product demonstrations, assessment buttons and page controls from passing beneath Gary. His display size adapts to that area; no artwork was regenerated.

The existing server layout gains one labelled, keyboard-focusable scroll region. The existing ScrollCraft engine receives that region as its scroll source; this is a small extension to the same engine, not a replacement motion system. Intersection observers use the actual visible page region. The old window-scrolling default remains supported.

The existing Pause motion control now also pauses/resumes Gary. It preserves his current video frame while paused; reduced motion keeps the approved static human pose. Play/Retry and the existing human placeholder remain available for blocked/failed playback. Chat can be opened from the persistent control.

The existing assessment and booking privacy exclusions in GaryRouteGate remain unchanged. Gary is continuously present while browsing/scanning the homepage; existing modal chat and privacy-sensitive routes retain their approved behavior.

## Defects found and corrected

- Original reported placement defect: mobile Gary was about 6997px below the opening viewport. His current measured phone position is within the first viewport and stable through page scroll positions.
- First compact-layout test at 320px found a speech bubble about 3.27px above the reserved area. Scoped bubble sizing/padding corrected it. Recovery controls are placed beside Gary, inside his area.
- At 768px, a product visual/large logo measured zero width. Preserved 6924 CSS proves an existing mismatch: the page becomes one column at 1023px, but product children did so only at 767px. Aligning those breakpoints restores the accepted logos/copy without changing entrance directions.
- The final motion guard caught a second window scroll listener that had not received element scroll events. Central event registration now captures all engine scroll handlers when a scroll container is supplied, including proper teardown.
- An earlier long browser run exceeded its configured test-command time limit. Its completed geometry profiles were initially retained; final checks were rerun on the final runtime with sufficient command time. This was not treated as a website performance measurement.

## Verification and evidence

- Production build, lint and TypeScript: pass.
- Two existing trace-motion unit tests: pass. The underlying trace timing implementation is unchanged.
- Twenty targeted approved-1.1 public-preview browser regressions: pass. These cover opening/clickable assessment links, preserved Gary bubble timing, green pulse/Pause/reduced-motion behavior, video error/retry, persistent visibility, live video movement and control clearance across desktop and 360/390/412px phone sizes.
- Six real public browser scenarios: 390x844, 320x568, 768x1024 tablet, 1440x900 desktop, 844x390 landscape and 390x844 reduced motion. Initial view and five scroll positions retain Gary wholly on screen outside the content region. Assessment controls remain hit-testable. Product logos reveal in their approved directions. Chat opens. Normal video advances; Pause/Resume work; reduced motion shows the existing human pose.
- Public media loads are actual network requests, not mocked video. Separate native checks cover refresh, construction-video playback, natural Gary looping, keyboard scroll, real anchor navigation and assessment route exclusion.
- Chat replies used fixtures or API calls were blocked. No real model/email/report calls were made, and visual verification is not proof of the complete prospect journey.
- Physical cellphone hardware was not accessed. Emulator checks are engineering evidence, not Toy's approval or proof his particular browser/autoplay issue is resolved.

## Preservation and code health

app/page.tsx is unchanged from 6924, preserving all copy, PROJECTS, 80%/75% headline ratios, product grouping, descriptions and CTA order. All 16 baseline RevealSentences text blocks match the original approved source. Product entrance directions, brighter #39ef77 green, +30% halo settings and pulse timing are preserved.

The 195-file original backup remains intact with SHA256 f4bf8999adf2c523eb27f5348c243ad574eae9297c1c4e9a3ff46dacf2fef42f. All approved image/video files match preserved hashes. Of 32 baseline public files, only the existing scrollcraft.js runtime changed for the necessary scroll-source support; 31 are byte-identical.

No runtime dependency, client-component boundary, duplicate chat/animation system or new API was introduced. The existing lazy chat bundle remains lazy. Unneeded mobile portal imports/listener/state and the now-redundant visibility state were removed. No database, API, assessment, consent, security, credentials or shared-backend contracts changed.

Build-reported homepage route increased from 5.36kB to 5.48kB; rounded first-load JavaScript remains 104kB, shared 87.1kB. The change report includes exact scroll-engine source/gzip deltas. The existing pose asset is 277,914 bytes and begins loading immediately to provide presence; the approved 487,848-byte video is unchanged. No performance-win or field-LCP claim, and no new arbitrary performance threshold.

## Review and remaining scope

Toy should refresh the public preview on his actual cellphone: Gary should appear in the first view and stay visible as the page scrolls. The normal video begins after its existing five-second delay. Play Gary remains available if autoplay is blocked. If anything is still missing, capture the phone/browser and visible state before choosing another change.

Same running Hobby session automatically sleeps November 11 at **3:28:29 PM Eastern**. Persistent source and the original backup remain saved. Nothing was stopped early for handoff.

No new spending, paid model calls, real email sends, production deployment or source push. The real assessment/report/email/conversation acceptance remains unverified and separate from this visual review.

Measured final scroll-engine delta: {"beforeBytes":62176,"afterBytes":62644,"beforeGzip":19322,"afterGzip":19466}.
