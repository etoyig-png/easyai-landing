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
