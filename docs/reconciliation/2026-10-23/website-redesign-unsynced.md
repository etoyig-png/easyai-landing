# Website redesign: initial Scroll-Craft integration, UNSYNCED

Date: 2026-10-23. Implementer: Codex in cloud workspace. Existing canonical checkpoint: easy-ai-task-1792612107438-ot5acf. Evidence projection only; no new tracker.

## Scope and provenance

Toy authorized starting the Website redesign, reusing actual Scroll-Craft infrastructure and preserving existing application functions. Logging restoration/reconciliation is the final closure task. Branch codex/website-redesign-scrollcraft starts at PR16 head 6bd2f8ba581cc89ae9be64f7fa389f924586176e. PR16 and production are untouched. Upstream Scroll-Craft pinned to 75d81f74e83692add18cd7a8a8e078b8a887a579; MIT license retained. No provider calls, paid generation, new runtime packages, schema changes or environment changes.

## Implemented

Complete upstream skill, engine, references, templates and tools installed. Original runtime copied byte-for-byte to public/scrollcraft; integrity test enforces equality and license preservation. Small homepage-only React mount/teardown adapter. Normal-flow content remains server-rendered. Engine CSS retained but not globally loaded because its global reset would affect unrelated forms. Existing business copy, video, illustrations, routes and Gary retained. Service tiles become ruled rows, founder section becomes light, chapter guide gains a decorative trace. Hero adds independent outline/frame movement. These are first-pass changes, not a claim of finished premium art direction.

## Newly executed checks

- Lint PASS; standalone TypeScript PASS; production build PASS.
- 417 unit tests across 33 files PASS (416 inherited plus engine/license integrity).
- 17 selected Playwright tests PASS in one clean run: five viewport geometry checks; five navigation checks; scoped axe; keyboard/reduced motion; no JS; intercepted assessment journey; engine teardown/remount; live reduced-motion switch; failed-engine fallback.
- Earlier browser attempts were invalidated by overlapping development servers sharing .next. Those attempts are not counted as passing evidence. Clean sequential run supersedes them.
- Upstream doctor: Node, full ffmpeg/WebP, existing playwright-core PASS. Chromium supplied through existing repository test runtime; no new package installed. No Kie key used or needed.
- Desktop production-source harness captured 26 frames, reported no dead scroll. Contact sheet inspected. This is not a full accessibility/motion certification: no cue-based contrast entries exist in this normal-flow build.
- External Google Fonts request failed in the cloud runtime; screenshots use fallback fonts. Hero MP4 played in inspected desktop opening, but harness recorded aborted media requests. Complete playback under mobile/network failures remains unproven.
- Upstream reduced-motion harness timed out waiting for html.sc-ready, because this adapter intentionally does not mount an animation engine for reduced-motion visitors. Existing browser tests verify readable reduced/no-JS content; no upstream reduced-motion harness PASS claimed.
- Visual assessment: structured/readable, but still text-heavy with a weak signature interaction. Full reference-level design and founder visual acceptance remain open.

## Performance / anti-bloat

Same-environment baseline homepage First Load JS: 100 kB. Current: 103 kB, approximately +3% at build-report precision. Additionally, afterInteractive loads a separate 62,176-byte upstream engine, gzip 19,298 bytes. This external script is NOT included in Next's first-load figure. Combined JS cost exceeds a 5% growth comparison and remains a release gate until reduced or explicitly accepted with measurement. No LCP/INP improvement claimed. No extra database/API/model calls. Skill/reference source is development infrastructure, not all shipped to browsers. Existing dependency install warns about inherited Next14.2.5 security status; this integration does not remediate or independently establish the full advisory list.

## Finite acceptance register (initial integration plus remaining release gates)

| Check | State |
|---|---|
| Preserve PR16 ancestry and application scope | PASS |
| Pin upstream, retain license, verify engine equality | PASS |
| Runtime lifecycle/failure/reduced-motion checks | PASS |
| Existing responsive/CTA/Gary/assessment fixture checks | PASS |
| Lint/type/unit/build | PASS |
| Record source/trust/runtime map and evidence | PASS |
| Complete human-centered visual design and signature interaction | OPEN |
| Full motion/mobile/font/media verification | OPEN |
| Performance budget and inherited security release gates | OPEN |
| Independent exact-commit review and corrections | OPEN |
| Approved exact preview/release and real backend journeys | OPEN |
| Restore canonical sync, reconcile notes, verify persistence (LAST) | BLOCKED |

6/12 checks passed. This is an explicit checklist count, not overall business progress or operational completion. Implemented != reviewed != merged != deployed != operational.

## Next action

Complete independent review, retain the work in a focused draft PR stacked on PR16, then strengthen the actual visual composition/signature experience and resolve measured performance cost before requesting founder release approval. No production merge/deployment or live customer submissions. No local release synchronization applies yet. Canonical activity has not been updated. Preserve historical notes when authenticated bridge access becomes available.

## Independent review correction

Independent Codex reviewer found a P2: the upstream engine snapshots reduced-motion when evaluated, so an initially reduced-motion visitor could mount a permanently still instance after enabling motion. The adapter now defers its first script request until motion is allowed. Added regression verifies zero engine requests under initial reduced motion, then an actual parallax transform after enabling motion. All four affected lifecycle/failure/preference browser tests pass after the fix. The earlier 17-test run predates this narrow correction; it is retained with that attribution. Reviewer also confirmed the extra external engine cost and reduced-motion harness limitation as unresolved release gates. No full independent release PASS is claimed.

## Discovery redesign continuation (2026-10-23)
Toy explicitly resumed building. Approved GAP, SmartSite, AIM scripts preserved; opening phrase corrected to "Who should you call?". Blue background stays dark throughout. No original flyer rendered. Native CSS opening uses unmodified ScrollCraft infrastructure. Server-rendered product information is available before hydration and without JavaScript. Transparent Easy AI logo recovered from Library; original 540x80 version was fully transparent, usable (2) version is 1430x290 RGBA with actual visible pixels. Header and hero use responsive image sizes. SmartSite logo pending other chat; GAP supplied image opaque, temporary text treatment used pending a transparent asset.

Reused existing GaryLauncher/GaryPanel and /contact fallback. Explicit product links open Gary; early-open timer race found by independent reviewer and fixed by cancelling launch timer. No new runtime dependencies, no backend/database/auth changes. Existing chat API only runs following user interaction.

Production build: homepage First Load JS 96.7 kB (prior draft 103 kB, original pre-ScrollCraft 100 kB). Separate unmodified engine remains 19,298 bytes gzip and is not included in that Next table. Total engine-inclusive growth versus pre-ScrollCraft baseline still exceeds 5%; release gate remains. No measured field Core Web Vitals or real-device claim. No hero video fetched.

Security workflow could not load referenced config-preflight resource; no completed dedicated scan claimed. Focused independent review reviewed source and reproduced timer bug. Inherited Next 14.2.5 security gate remains outside frontend scope. Early development browser run was contaminated by a second review server sharing .next; discarded its initial-HTML result and reran using a single production server. Reduced-motion test found smooth scroll regression and code restored scroll-behavior:auto. Axe found CTA contrast regression and code darkened background; no test budget increased.

Logging remains UNSYNCED: canonical restoration/reconciliation is the last closure task, as directed. This is a repository evidence projection, not a second task database. Production unmerged, operational provider checks and local receiver synchronization unverified.

## Published-draft correction continuation — 2026-10-23

The founder correctly identified that the supplied preview was older than the unpublished device edits. Workspace maintenance removed that checkout before upload. Recovered exact GitHub head b8af329b9d22b1bd5277b6f8cb2ae158b6306560 and reimplemented the device revision with the founder's latest corrections. Historical checks above are not credited to the recovered implementation.

Latest direction supersedes header removal: retain full existing header; remove product shortcut nav/line/Start here. Hero emphasizes the original transparent brand image, smaller single-line tagline, centered copy, darker #010611 canvas, black reveal, native search-phone/map transition and synchronized geographic markers. Actual GAP PNG is recovered unchanged (Git blob d2d7eb753cedec1787f1a67bd8c8a3e3ec977fe2) and appears inside a laptop. SmartSite laptop and AIM phone use native decorative markup, floating prompts and typing. Added accessible Pause/Resume motion; OS reduced-motion fallback preserved. No Gary character/routine files changed. Corrected page selector causing Gary's solid wrapper background. No new runtime dependencies, backend/schema/API/provider/environment changes. Existing adapter and Gary panel reused; no duplicate systems.

New verification: lint, standalone TypeScript, 417 unit tests/33 files and production build PASS. Discovery suite:36 browser checks PASS across desktop/360/390/412, including actual changing marker transforms, phone-to-brand transition, pause/resume, no-JS content and fallback link, mocked Gary, scoped axe and tablet overflow at768/1024. Additional content/assessment fixture and ScrollCraft lifecycle checks:13 PASS. Five hero-clearance checks initially found scale animation reducing a48px target to42.24px; corrected root cause by using translation rather than scaling the brand wrapper. Relevant post-correction checks are recorded below. No timeouts/budgets weakened. Updated obsolete product-shortcut test selectors to surviving scroll/navigation paths, keeping fallback/lifecycle coverage.

Fresh baseline worktree at exact b8af329, with same installed dependencies/runtime and isolated .next: homepage First Load JS102kB; current102kB at build precision. Deduplicated route/layout manifest JS gzip:106398→106648bytes (+250bytes,+0.235%). Page-only Next route report2.81→3.02kB; total route payload increase is below1%. The historical96.7kB result was not reproduced and is not used for this comparison. Separate unmodified ScrollCraft script remains19298bytes gzip, excluded from Next's table; cumulative original-integration budget gate remains open. Supplied2MB source PNG is served through next/image; original retained. No extra data/API/model calls. Lab LCP observations76–208ms and CLS0 are unthrottled local measurements, not field metrics or a promise of real-device performance. Branding transition finishes around2.38seconds after motion starts.

Focused independent review corrected pause/continuous-animation accessibility and verified cleanup; no full dedicated security scan claimed (earlier referenced preflight resource unavailable). Existing dependency-security gate is unchanged. Production remains unmerged and untouched; preview is for visual review, not operational completion. System map and ScrollCraft brief updated. Canonical sync remains UNSYNCED; restore/reconcile it LAST as directed. No local receiver/copy verified.

Final CSS correction:8/8 targeted browser checks PASS (opening/moving markers/pause plus hero/Gary geometry at360/390/412/768/1440). Hero action retains48px height in each layout. Independent exact-commit review requested before publishing branch preview.
