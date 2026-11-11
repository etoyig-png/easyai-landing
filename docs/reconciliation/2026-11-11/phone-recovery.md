# Brighter assessment halo and mobile Gary recovery
Current compiled runtime: 6924ab35af203c3165d5fbd48850dbf23a7882ba.
Interactive preview: https://sb-40v8onjh8v2l.vercel.run/
Cloud-only continuation of 6b6cf00 runtime, with c3fd738 tests/docs reused. No new source transfer or coding workspace.

## Narrow changes
- Assessment background #22c55e -> #39ef77. Hover #2cdd6b. Existing navy label retained.
- Halo spread dimensions increased exactly 30%: inset 6 -> 7.8px; blur 13 -> 16.9px; shadow blur/spread 12/2 -> 15.6/2.6px and 28/6 -> 36.4/7.8px. Continuous 3.2s opacity pulse, Pause motion and static reduced-motion fallback preserved.
- Button sizing/padding untouched. Measured mobile button 245.09375 x 48px.
- Gary previously relied only on native autoplay, with no manual play action and no visible human placeholder while playback had not started.
- Until native playing fires, show the existing approved human seated pose in a fixed square stage and an accessible Play Gary button. No new artwork, video conversion or animation replacement.
- If native video reports an error, keep that human pose, the existing chat control and a Retry Gary animation button. Manual play/retry uses a real user gesture; existing muted/inline/autoplay/loop and source retained.
- Speech bubble appears only during actual playing, using unchanged 2-8s video-time window. Existing launch delay, routine video, tracked sign and chat behavior remain.
- Mobile Gary remains in the approved reserved slot below the product story. Placement is far outside the opening viewport. It was inspected, not silently moved over approved text/CTAs.

## Actual evidence and limits
- Final public Android Chrome emulation (390px), desktop, tablet and reduced-motion scenarios passed: actual network, real video playback and refresh, no JavaScript errors or unexpected request failures.
- Public video requests returned 206 video/webm. The emulated browser reports WebM VP8/VP9 probably supported. This does not establish physical-phone/browser compatibility.
- Controlled failure test intentionally aborted WebM requests on the real public page. Existing human pose and chat remained visible. Removing the abort and pressing Retry fetched the real public video (206), played it with readyState 4/no media error, and refresh played normally. No simulated time/seek in this recovery probe. This is fault injection, not a reproduction of Toy's physical device cause.
- The existing UI bubble regression now seeks to 3s and awaits real play rather than pausing; its targeted timeline assertions are separate from natural public playback/refresh probes.
- No physical cellphone connection is available here. Toy's actual-device failure remains unresolved until his recheck. Unsupported codecs, phone autoplay/data-saving rules, viewport placement or network conditions are possibilities, not proven causes.
- Lint, TypeScript and production build passed. 12 approved reconciliation regressions and 4 controlled-error/retry regressions passed against the public preview.
- Existing 32 public assets match preserved hashes. app/page.tsx unchanged, so all PROJECTS/80%/75% wording, restored descriptions, vertical logos, opposing directions, globe and construction media are retained.
- Backend/API/assessment/consent/security/dependency contracts untouched. No paid model call, email send, push, merge, production release, upgrade or new spending.
- Same running named sandbox auto-sleeps November 11, 2026 at 19:36:02 UTC / 2:36:02 PM Eastern. Persistent source and backup remain saved.

## Rollback and next review
- 24acb19: brighter assessment green and 30% wider halo settings.
- 6924ab35af203c3165d5fbd48850dbf23a7882ba: Gary placeholder/manual play/retry recovery.
- Tests and report are saved separately; no runtime change after the compiled revision.
- On Toy's phone: refresh, scroll past products to the Gary invitation, confirm the human character, and tap Play Gary if offered. If still blank or failing, obtain the exact phone/browser and observed message before choosing another fix.
- Real assessment/report/email/conversation acceptance remains unverified.
