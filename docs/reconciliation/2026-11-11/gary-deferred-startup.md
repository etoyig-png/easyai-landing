# Gary code and media: full page load, then five seconds

Verdict: PASS WITH WARNING. Public engineering checks pass; Toy's physical-cellphone review remains pending.

- Preview: https://sb-40v8onjh8v2l.vercel.run/
- Exact compiled runtime: **87fa4dee055adc55f0e89058ef8ddd33d6553fd7**.
- Same existing cloud source/branch and named sandbox. No source transfer or replacement workspace.

## Correct startup behavior

The site renders normally and finishes its window load event. The existing lightweight route gate schedules a five-second delay after that load event has completed. Only then does it import GaryLauncher and GaryCharacter. Gary media elements do not exist before that import, so no pose, poster, video or renderer preload/prefetch is requested early.

The small routing/timer gate and existing reserved-area CSS remain in the initial page shell. These are necessary to schedule loading and preserve privacy/layout; the human renderer, artwork references, video behavior and chat panel code are separate deferred payloads. This is actual payload deferral, not CSS hiding.

GaryLauncher has no second five-second timer. After the deferred import, it starts the existing human animation immediately, subject to reduced motion/Pause. Persistent viewport placement, non-obstructing reserved space, native loop, speech bubble, tracked sign, chat, video Play/Retry and the existing assessment privacy exclusion remain. The chat panel remains another deferred import until opened.

An early Talk to Gary click is queued without fetching Gary. It opens after the same post-load deadline. This is the explicit consequence of the latest no-early-code instruction, replacing immediate early chat loading. Modified clicks retain their normal link behavior. Leaving for an excluded route cancels pending loading and clears the queued request.

If the renderer chunk fails after the deadline, a small Retry Gary control allows a new import attempt. No replacement artwork or paid model is involved.

## Actual public timing evidence

Four cloud Chromium contexts: phone 390x844, tablet 768x1024, desktop 1440x900 and reduced-motion phone. Each was checked on initial navigation and full refresh: eight actual public loads.

- No renderer/chat payload or Gary media request began before loadEventEnd + 5000ms.
- No matching preload/prefetch/image-srcset path appeared.
- Page load events completed in **188.0–452.9ms** in these cloud runs.
- First Gary request began **5001.0–5055.6ms after page load completion**.
- First renderer DOM appearance and every recorded pose/video request were after that deadline.
- Normal-motion video played actual public WebM; reduced motion loaded the existing human pose and no video.
- The reserved page area had the same measured height before and after Gary appeared; Gary stayed visible and clear at top/middle/end scroll positions.
- These are measured cloud-browser timings, not a physical-phone speed guarantee or a new performance threshold.

The build separated the human renderer/pose/video code into chunks/792.de834ae8f2979f77.js (7,479 raw bytes); chat remains chunks/916.6f2fffa7906164bb.js (6,358 raw bytes). Payload checks identify signatures from the built files rather than assuming all JavaScript is Gary code.

## Verification

- Build, lint and TypeScript passed.
- 24 targeted public browser regressions passed, including queued early chat, opening/assessment links, approved Gary behavior, reduced motion/Pause, native video error/retry and persistent placement.
- Four additional permanent payload-timing regressions passed across desktop and three phone sizes. They inspect served JavaScript signatures/resource timings and enforce only the user-specified five-second deadline.
- Eight separate real public network/navigation timelines passed; no video clock seeking or mocked video in these timing probes.
- Initial assessment after six seconds: no Gary code/media request or UI.
- Navigation into assessment before the deadline: pending Gary request cancelled; no Gary payload/media/UI.
- Queued early chat: renderer and chat chunks requested after the deadline; initial chat response was a fixture. Closing chat retained its approved seated/resting behavior.
- Controlled renderer-chunk failure: Retry Gary appeared only after the deadline; allowing the chunk and pressing Retry restored real native video playback with readyState 4/no media error.
- Normal timing probes made zero API calls. Other chat tests used fixtures or blocked APIs. No paid model calls, emails or real report generation.

## Preservation, performance and rollback

Only app/layout.tsx, components/gary/GaryRouteGate.tsx and components/gary/GaryLauncher.tsx changed in runtime source from 6499c7a. Homepage copy, PROJECTS/80%/75% type, brighter green/+30% pulse, product directions, reserved placement, page motion, all art/video assets, backend/API/assessment/consent/dependencies remain byte-identical. The original 195-file backup and imported sources were reused.

The privacy-exclusion prefixes and predicate are unchanged and were compared with the 6499c7a source. The loader now cancels state updates/import scheduling on excluded-route transitions. No permissions or security contracts changed.

No new dependencies/client-component boundary or duplicate loading system was introduced. The existing route gate owns the only delay; the renderer's redundant timer was removed. Build-reported homepage remains 5.48kB / 104kB first-load JavaScript, shared 87.1kB at reported precision. No general speed-up claim is made.

Reversible history: 4ba5e583a695e9de4b35bfd5eedcf45147735227 was the appearance-only response before Toy clarified code/media deferral. 87fa4dee055adc55f0e89058ef8ddd33d6553fd7 implements the clarified architecture and supersedes that timer placement. To return fully to the prior 6499c7a runtime behavior, revert both startup commits; earlier placement/art/motion rollback commits remain intact. Final tests/report are saved separately.

No push, deployment, production release, new infrastructure/spending, credentials change or uncertain email retry. Real prospect/report/email acceptance remains unverified.

Same named sandbox session auto-sleeps November 11 at **4:14:25 PM Eastern**. Persistent source and original backup remain saved.
