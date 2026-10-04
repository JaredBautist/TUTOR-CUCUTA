# Mobile-first frontend — Tasks and verification

Status: T01–T09 implemented and automatically validated locally. Production deployment
confirmed on 2026-10-04; T10 remains partial pending complete hosted journeys and
physical-device evidence. See [current release evidence](../../docs/pilot-readiness-2026-10-04.md).
Order tasks by dependencies; keep the existing visual identity throughout.

| ID | Task | Depends on | Acceptance / evidence |
| --- | --- | --- | --- |
| T01 | Capture baseline screenshots, mobile measurements, bundle/network traces and existing critical flow results. | — | MF-10, MF-19; record commit and tools. |
| T02 | Add failing behavioral tests and pure slot/context functions. | T01 | MF-02–08; boundary timezones, duration, overlaps, limits, no mutation. |
| T03 | Implement shared expandable weekly schedules in card and detail. | T01 | MF-01, MF-12–15; keyboard/touch and full slots. |
| T04 | Integrate proposed-time selector and search context into request modal. | T02, T03 | MF-02–08; no API changes, no false reservation claims. |
| T05 | Preserve results state and return scroll position within account session. | T01 | MF-17; cross-account reset and changed catalog handling. |
| T06 | Repair dialog focus, labels, errors and consistent pending/confirmed states. | T04 | MF-09, MF-13–15; double submission and uncertain response. |
| T07 | Optimize both portals for small screens, keyboards, safe areas and touch targets. | T03–06 | MF-10–15; all core screens and long content. |
| T08 | Defer hidden map loading, optimize critical imports/images and measure again. | T01, T07 | MF-16, MF-18–19; maintain privacy and map lifecycle. |
| T09 | Run acceptance regression and desktop/mobile browser suites; inspect captures. | T05–08 | MF-01–20; report actual results, not mock-hosted equivalence. |
| T10 | Validate physical-device and deployed smoke journeys using authorized test accounts; update docs/Graphify. | T09 | MF-11, MF-20; no messaging or changes to real user records. |

## Required test scenarios

- Student: restore session, search >=3 criteria, read reasons and complete schedule,
  open profile, return to same list position, save favorite, fill request from search,
  recover after error and cancel an allowed request.
- Tutor: edit profile/offer on mobile, publish, open shared-support controls, inspect
  request and accept/reject; preserve protected-contact behavior.
- Booking: multiple intervals, no slots, interval boundary, half-hour durations,
  non-Colombia device timezone, near-midnight clock, date horizon, invalid data,
  out-of-date offer, uncertain acknowledgement and repeated taps.
- Privacy: denied GPS remains optional; virtual flow works without GPS; positions
  stay approximate; no private calendars exposed and no cross-account draft reuse.
- Accessibility: keyboard only, screen-reader announcements, focus restoration,
  200% text enlargement, contrast, reduced motion and touch areas.
- Devices: automated desktop Chromium/mobile viewports plus physical Android Chrome
  and iOS Safari; emulator evidence cannot substitute for a physical keyboard check.
- Network: cold start, slow loading, offline/read failure, write failure and retry.

## Definition of done

All acceptance criteria have a passing result or an explicitly documented unresolved
limitation. Run npm test, npm run lint, npm run build and affected browser suites.
Existing database behavior is unchanged; no new schema is part of this work.
Provide before/after screenshots, measurement settings, results and any remaining
budgets not met. Never mark T10 done from local mocks or a public landing-page check.
If physical devices or hosted test accounts are unavailable, record the limitation
and keep that validation pending. Update handoff and Graphify after verified work.

## Evidence ledger (populate during implementation)

| Date / revision | Task and criteria | Environment / device | Result and artifact |
| --- | --- | --- | --- |
| 2026-09-30 / local worktree on 5370fcf | T01–T09 | Chromium 153, controlled backend, six widths | [Validation, measurements and captures](validation.md). |
| 2026-09-30 | T10 local preparation | Local closure plus read-only older public login smoke | [Release checklist and access findings](t10-release-check.md). |
| 2026-10-04 / 0de1b5b | T10 publication and access checks | Successful Vercel Production deployment; public Chromium smoke and authenticated Supabase API probes | [Release evidence](../../docs/pilot-readiness-2026-10-04.md); six widths passed, not physical-device evidence. |
| Pending | T10 external verification | Physical Android/iPhone; complete authenticated deployed journeys | Physical checks remain open; no completion claimed. |
