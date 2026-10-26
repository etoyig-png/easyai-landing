# Public homepage story

Assignment 3 of the existing eight-assignment sequence. This map describes the frontend; it is not a replacement task register or operational completion claim.

## Runtime and reuse

`app/layout.tsx` retains the shared navigation, footer and Gary launcher. The server-rendered `app/page.tsx` reuses HeroVideo, ResponsiveImage, existing brand assets, approved service copy and buttons. The mobile hero order is preserved. At 360×800, the inherited upward video transform overlapped the disclaimer by 22px. Replacing it with an 8px flow margin preserves the 180px video width and measures 16.77px clearance above Gary’s resting launcher. The regression checks disclaimer/video separation, video/Gary separation, video-control hit targets, and Gary open/close behavior at 360, 390, 412, 768 and 1440px; Gary replies are intercepted fixtures, not live backend proof.

After the hero, native anchor links lead to discovery, engagement, response and assessment. A desktop sticky guide connects three always-visible chapters in normal document flow. CSS view-timeline transforms are an optional paint enhancement. Unsupported browsers show static content; reduced motion also disables smooth scrolling. No new client component, framework or dependency is added.

Service cards reuse the six existing service descriptions. Existing images keep intrinsic aspect ratios. The light chapter panel has dark text and a dark focus outline. A narrow taller-phone CSS correction moves Gary's decorative sign away from his chat button; it does not alter his animation sequence, state, conversation or personality.

## Preserved boundaries

- Free assessment links target `/assessment`; consultation keeps `/assessment?intent=consultation`.
- Contact link uses existing `/contact`. This page does not introduce a booking provider or claim a booking completes.
- Gary remains the single shared assistant. Assessment scoring/generation remains independent.
- APIs, database schema, admission/security controls, email destinations, provider configuration and Command Center handoff fields are unchanged.
- Existing Easy AI brand content remains the public website's content boundary; no tenant data or new hardcoded contact destination is introduced. White-label provisioning remains a separate existing backend responsibility.

## Design and wording decision

No Scroll-Craft reference was available in the checked local documents or connected Drive search. This reversible interpretation uses hierarchy, contrasting section surfaces, native navigation and restrained motion. The approved headline is unchanged. The guide repeats an excerpt of that headline and the existing metadata's small/midsize-business audience wording. No new pricing, statistic, testimonial, guarantee or capability claim is added.

Founder design approval is still required before release. Existing broad claims about human review and what the assessment identifies are preserved, not newly verified. A potential follow-up is to clarify those claims after the backend owner verifies the actual customer journey; substantive replacement wording requires founder review.

## Verification and failure handling

`tests/e2e/home-story.spec.ts` covers the five required viewport sizes, chapter/assessment navigation, contrast, focus, reduced motion, no-JavaScript rendering and a clearly intercepted assessment submission. The existing Gary suite retains overlap, hit-testing, navigation, routine, panel and responsive-media checks; obsolete CTA/image selectors now match current main.

Fixture success is frontend evidence only. Real Gary, contact, assessment persistence, email and downstream workflows require Claude's repaired/configured backend and an authorized isolated destination. Missing backend configuration must retain existing fail-closed behavior.

Deployment does not require a migration or environment change. Rollback is the prior commit through the existing release process. Existing monitoring remains in place; no new API, retry loop, model call or background job is created. Preview is for design review, not operational proof. Keep performance and exact-head review evidence in the PR/handoff and update existing canonical task records via the authenticated meaningful-update mechanism.

## 2026-10-23 Scroll-Craft integration (draft)

Supersedes only the earlier statement that the reference was unavailable. Source now verified at nateherkai/scroll-craft commit 75d81f74e83692add18cd7a8a8e078b8a887a579, MIT. Complete skill installed under `.agents/skills/scroll-craft/`; original engine retained unchanged. `components/ScrollCraftMotion.tsx` mounts the served engine only on `.home-story`, tears it down on route departure and motion preference changes, and keeps static content if the script fails. The author's stylesheet remains intact but is not globally imported: its resets would affect existing forms and Gary. Only selected flow-device author styles are scoped to the homepage.

Data flow: server-rendered approved content → optional local Scroll-Craft script → decorative transforms/progress. No request to an AI provider, new API, database write or customer tracking is introduced. Assessment and Gary contracts remain unchanged. Runtime asset URL is `/scrollcraft/scrollcraft.js`, with MIT license alongside it. No Kie/HeyGen generation or credentials used.

Draft visual changes: outline depth planes, unnumbered chapter links, progress trace, ruled service rows replacing equal tiles, light founder ground and decorative quotation rule. Signature interaction and full art direction remain in development; installation is not creative approval. Existing PR16 fixes are ancestors of this branch, not recreated.

Design decisions and proposed journey: `scrollcraft/builds/easy-ai/BRIEF.md`. Finite acceptance and current evidence: `docs/reconciliation/2026-10-23/website-redesign-unsynced.md`. Canonical logging restoration/reconciliation is the final closure task per Toy; this projection does not replace Supabase. No production release or local release sync occurs in this stage. Rollback removes the integration commit while retaining PR16 fixes.

## 2026-10-23 approved discovery redesign
HomePage remains a server component. Sequence: native search-to-brand opening → exact approved introduction → GAP → SmartSite → AIM → human trust → Gary/assessment close. All backgrounds stay deep blue (#030c1c). Original flyer graphics are reference-only; no methodology published. Transparent Easy AI asset (1430x290 RGBA) is reused in Header and opening. Final SmartSite and GAP brand treatment remain open.

Gary entry: server anchor /contact with data-open-gary → existing GaryLauncher delegated click listener → existing dynamically imported GaryPanel → unchanged /api/gary/message. Modified clicks/no-JS retain normal routing. Early activation cancels the pending entrance timer. Listener and timer cleaned up on unmount. No new API/database/model calls except existing chat requests after explicit user activation.

Failure paths: blocked motion script/static fallback; reduced-motion/static fallback; no-JS/contact links; unavailable Gary API/existing panel error path. Deployment and operational provider behavior remain separate gates. No production release in this task.

## Founder visual correction — 2026-10-23
Header retained on all routes. Product shortcut navigation removed. Hero HTML now includes decorative search phone/map, transparent brand image, one-line h1 tagline, black reveal and geographic orbit markers. Approved copy and links remain in initial HTML. Existing ScrollCraft progress drives devices/headings; one IntersectionObserver controls scene entry classes and disconnects on cleanup. Existing motion adapter adds local pause state; pause destroys engine/restores static branding, resume honors OS preference. No added client boundary/package. Product art is server-rendered decorative markup; GAP PNG uses next/image with fixed dimensions and responsive sizes. Tablet layouts stack below1024px; homepage overflow-x:clip contains decorative travel. Narrow body selector no longer paints Gary's fixed wrapper. Gary implementation, APIs, database, auth, provider and environment contracts unchanged. Canonical Supabase logging restoration/reconciliation remains the final closure task, currently UNSYNCED.

### Magic UI device continuation — 2026-10-26

- AIM phone frame adapted from Magic UI `apps/www/registry/magicui/iphone.tsx`, upstream `efe76fc5755eca1142dd4f74c1d6f0ace2887e3c`; MIT notice retained at `LICENSE.magicui.md`.
- `components/magicui/Iphone.tsx` is server-rendered and accepts native screen content. Media/stock-video branches omitted; unique SVG mask IDs prevent collisions. Existing laptop components retained.
- SmartSite/AIM screen messages use the existing Scrollcraft scene observer and motion-ready attribute. Pause, reduced-motion and offscreen states show static readable content with no extra animation engine.
- No API, database, Gary contract, runtime dependency, schema, or lockfile changes. No video downloads. Custom media and final new product logos remain outstanding.
- Same-environment homepage/layout JS+CSS gzip: 117118 -> 117586 bytes (+468, +0.40%); separate unchanged Scrollcraft engine excluded from both. Not field performance evidence.
- Lint, TypeScript, 417 unit tests and production build passed. Four new production-browser checks verify message sequence completion, screen fit, pause and reduced motion on desktop/360/390/412. Existing browser suite result to be recorded after completion.
- Independent reviewer: PASS WITH WARNING; no blocking issue, 390px screen content fits. Unused constants and clip path removed in response.
- This is an incremental device demo, not completed Googlebook choreography. Production release/security/performance gates and final canonical Supabase reconciliation remain open. No claim of canonical synchronization.

Verification closeout for this increment: 69/72 original browser cases passed; three mobile lifecycle cases failed because the test selected desktop navigation. Test now opens the real mobile menu without changing assertions/timeouts; all 16 lifecycle cases passed on rerun. The other 56 cases passed in the original run, plus 4 new screen-message checks. Preview dpl_HaWvRrJAkAPBZqvA3zLGZkVLmHHi is READY at 328147bf7f772f254bf85dc03fd1dc7271d72e41; HTTP 200 HTML contains magic-phone-screen and new message copy. Independent final tree review PASS at d6fe679d8079b6e365619e2ae5f346f50e6d07da. This follow-up changes test navigation and evidence only.

### Device realism and pacing correction — 2026-10-26

- Opening animation is 8 seconds. Phone is fully opaque from 5% through 70% (5.2-second hold), followed by the slower Easy AI reveal. Initial HTML and reduced-motion mode remain immediately readable.
- Logo/tagline group is centered as one block; tagline gap reduced to .35rem. Larger discovery action is independently positioned below it. Existing logo artwork is preserved with CSS perspective, not raster-redrawn.
- Globe grid rotates around its vertical axis using CSS; location markers retain existing motion. Pause/removal of motion-ready and reduced-motion disable the enhancement.
- Replaced flat phone/laptop frames with locally hosted transparent photo-style Plinth artwork; source/terms in docs/device-artwork-sources.md. Two source WebP files total 27724 bytes. Existing shared Iphone wrapper now holds the photograph and native screen; removed unused SVG frame code. No 3D engine, video or runtime dependency added.
- GAP is a real accessible /contact fallback link using the existing data-open-gary contract. Its logo enters on scene visibility, as do SmartSite title/messages. Main approved scripts and Gary character/behavior preserved.
- Independent source/render reviewer found clipped SmartSite reply, corrected by removing redundant device-only copy/prompt. Final independent screen-fit PASS at360/390/768/1440. AIM also fits all four. No full security clearance claimed.
- Lint, TypeScript, production build and 417 unit tests passed. Homepage/layout JS+CSS gzip 117586 -> 118340 bytes (+754, +0.64%); unchanged separate Scrollcraft engine excluded from both. Added image transfer is separate; lab figures are not field performance proof.
- Selected browser run initially27/28; one 360px fake-clock completion check sampled just before opacity1. Explicit8s duration assertion and additional simulated completion time added without changing production duration or test timeout. Subsequent screen-fit/visual direction run8/8 passed; final timing/globe/GAP-action run4/4 passed at desktop/360/390/412.
- Production remains untouched. This is a visual review draft. Final new logos, full choreography review, dedicated security release gates and final canonical Supabase reconciliation remain open.

### AIM artwork and bubble correction — 2026-10-26

- Reused supplied transparent AIM logo.png (Library libfile_6e7c8a4807f081919768942d036cdb9c); web derivative public/aim-logo.webp preserves the artwork and alpha. Replaced text placeholder, removed decorative call dot to preserve screen space.
- Outbound/reply bubbles now have speech tails, start from phone-side offsets and appear in sequence at1.5s/3s. Positions are below the logo, with responsive sizing. Reuses existing observer, pause and reduced-motion lifecycle.
- Independent production geometry review PASS: AIM content fits and neither bubble overlaps the logo at360/390/768/1440; laptop retains source600:400 proportions.
- Production build/lint/typecheck pass. Targeted browser run12/12 passes: reduced-motion/accessibility, screen fit/message sequence, actual AIM asset, bubble/logo nonoverlap across desktop/360/390/412. Previous417 unit tests apply to unchanged business logic; not rerun for this asset/layout-only follow-up.
- Homepage/layout JS+CSS gzip118340 ->118567 bytes (+227, +0.19%); combined from pre-correction117586 ->118567 (+0.83%). Photo device sources27724 bytes combined; AIM derivative adds about36KB. No runtime dependencies, API, database or chat-contract changes.
- No rectangular video embedded. Current visuals are alpha device images plus native screen/bubble animations. Any future generated media must prove seamless compositing and browser playback before adoption.


### Actual photographs and Googlebook reference reconciliation — 2026-10-26

- Reviewed entire139.87s supplied recording using70 samples plus0.5s transition sequences. Material detail, large cropped devices, separate foreground UI planes, blur-to-crisp text, and coordinated transitions guide this increment. Video cannot alone establish photography/render provenance or scroll-vs-time mechanics.
- PhotographicDevice is one shared server renderer for both actual camera photos. Native SVG masks cut out hardware; a full-viewBox foreignObject and an HTML child project content onto each photographed screen. Do not put the projective transform on foreignObject itself: visual QA caught browsers painting an affine-looking result there. Photo source/terms/crop details live in docs/device-artwork-sources.md. Original hardware is not generated/redrawn.
- Existing Iphone adapter delegates to the renderer; existing laptop scenes, Gary links, product scripts, routes and Scrollcraft are reused. No packages/manifests/lockfiles/API/database contracts changed. No generated phone artwork is referenced.
- Opening7.2s: single light-line/globe transition into phone by0.9s, activity/search result and screen logo during roughly4s phone hold, then Easy AI identity emerges and fills brand stage. Waits for photograph decode before starting; missing photo leaves static identity. Initial business copy and fallback links are server-rendered.
- Logo preserves the supplied image. Depth treatment adds edge shadows, perspective, masked light sweep, and a logo-only emergence. Do not scale the whole brand group: that shrinks the discovery control below48px. Tablet action offset now preserves clearance from Gary; character artwork/routine unchanged.
- Photo edges, perspective and logo clearance independently visually reviewed in Chromium at360/390/768/1440. Earlier white source-screen strips and laptop projection error were corrected. Final notch mask exposes original photographed camera hardware. Known existing768 navigation wrapping remains outside this correction.
- Lint, TypeScript, production build,417 unit tests pass. Main targeted browser run36/36 passes; extra opening/hero run initially failed because the control was scaled, fixed by logo-only scaling;5/6 then passed with768 Gary collision. Narrow tablet offset correction rerun2/2 passes (AIM artwork plus768 clearance). Together42 distinct browser checks have passing results across these runs. No tests/timeouts/budgets weakened.
- Measurement label correction: today's summed route/layout manifest totals include JS AND CSS, not JavaScript alone. Previous combined118567 ->119650 bytes gzip (+0.91%). Current split: JS106942; CSS12708. Separate unchanged Scrollcraft engine is excluded from both totals. New photo assets248400 bytes combined, separately counted; no full performance/field or Safari proof claimed. One unthrottled desktop lab sample LCP348ms/CLS0.01785 is not a controlled before/after or field result.
- This is a review preview, not a full physical-device-rotation recreation or an approved final logo redesign. True hinge/physical rotation would require suitable real footage. Production/security/cumulative performance gates and final canonical Supabase reconciliation remain open; no operational completion claimed.


### Screenshot-directed refinement, 2026-10-26

Toy's screenshot filenames and latest prompts request a centered globe-wrapped identity, slower light-to-phone entrance, scroll motion on the opening phone, minimal yellow/red/green circuit currents, product logos below introduction, complete laptop base, upward reply-bubble pointer, human conversation footage replacing the divider, and “Start Your Consultation”. Approved body scripts/contact/assessment paths remain intact.

Existing `ScrollCraftMotion`, `PhotographicDevice`, Iphone adapter, observers, CSS progress properties and original brand assets reused. No new runtime dependencies/client component/database/API calls. Opening total8.4s (previous7.2): initial reveal ends2.1s, hold to6.132s (~4.03s), outgoing phone/brand transition retains ~2.27s. Entrance alone slowed, hold not lengthened materially. Phone scroll adds at most22px lateral shift and8deg yaw. Passive listener is cleaned up; static/reduced/pause paths remain.

Original logo is cropped by visible source bounds and curved in40 SVG strips, not rotated as a single flat rectangle. Repeated windows share one55,706byte WebP request retaining original artwork/dimensions. The former flat masked PNG sweep is removed. Globe is centered behind it. New footage is local, muted, viewport loaded with native playback; no initial video request, pauses offscreen or for motion preference, poster remains on failure. Complete laptop source and measured screen mapping documented in device-artwork-sources.md. SmartSite finished-logo asset is still pending; no fabricated replacement.

Universal reference `maxresdefault.jpg` supplied later in this refinement was inspected directly: subtle raised-center arch, slight height change, narrowing outer ends. Curve updated to8% edge height reduction,30viewBox-unit edge drop and sinusoidal horizontal foreshortening; keeps original logo design. This is native browser animation rather than an exported logo video.

Controlled clean build before/after route+layout gzip: JS106932→107240(+308bytes), CSS12708→13180(+472bytes), combined119640→120420(+0.65%). Previous delivered build119650 differs by10bytes from clean baseline due build hashes. Same engine19298bytes gzip remains separately loaded; no new runtime dependency. New laptop79334bytes replaces204666bytes source on-page. New video299472bytes plusposter14412bytes is loaded only near view; wordmark derivative55706bytes. Assets are separate from JS/CSS. Deliberate opening duration7.2→8.4seconds is a requested design change, not a speed claim. No database/API request changes.

Rendering negative control: exact prechange HEAD856665f in isolated worktree reproduced9s animated screenshot stall with inherited forcedSwiftShader flags (6007ms timeout), also with onlyin-process-GPU removed (6004ms timeout). Same binary/defaultPlaywright graphics passed225ms; retaining other serverless flags while removing forcedgraphics passed317ms. Corrected `playwright.config.ts` removes those forcedgraphics overrides, preserving browserbinary, assertions, timeouts and budgets. No website-layer retirement workaround retained. Initial failures were investigated, not hidden; source fixes for video preference lifecycle and deterministic timing/scroll tests are covered separately.

Final scoped validation: lint, TypeScript through production build, production build and417unit tests pass. Corrected desktop run21/21 passes. Mobile target initially26/27 passes: exact360logo center was2.398px off because `.discovery-brand`'s own implicit grid track retained88vw intrinsic width. Explicit minmax(0,1fr) on that brand grid fixes the root cause; an explicit stage track alone did not, and was removed. No center tolerance was relaxed. Final focused geometry/accessibility/opening rerun14/14passes (desktop8/8 plusmobile6/6), covering360/390/412/768/1440 layouts. Across corrective runs48distinct browser scenarios have passing evidence; final focused run result is recorded in PR17.

Independent source/runtime review verifies gradual phone entrance, native wheel-driven phone movement, centered logo, screenshot capture with corrected graphics, lazy video requests, pause/resume, offscreen pause and live reduced-motion toggles. New GAP row alpha mask initially produced a black filter-region rectangle; compositing against SourceAlpha fixes it without changing original colors or loading another image. Row spacing and logo visible bounds were visually checked. Browser evidence is Chromium only; Safari/field INP and controlled field performance are not established. Local unthrottled samples are not production speed claims.

Verdict: PASS WITH WARNING for this review increment: SmartSite's approved standalone logo remains unavailable (existing text treatment retained), founder visual acceptance and inherited release/security/cumulative performance gates remain open. Production is not changed. Canonical task synchronization and user-computer mirror verification are not claimed. Production remains unchanged, draft PR17 stays stacked on feat/frontend-scroll-story. Inherited security/dependency/performance approval gates remain open; canonical Supabase reconciliation remains final-closure UNSYNCED.
