# Mobile-first frontend — Implementation and validation

Date: 2026-09-30. Baseline: `5370fcf` plus the existing local duplicate-signup
correction and uncommitted specification. Changes remain local; no hosted writes,
migration, commit, push or Vercel deployment was performed.

## Implemented behavior

- Full, sorted Colombia weekly schedules in result cards and tutor detail.
- Pure proposal selection: 30-minute steps anchored to each interval, durations
  60/90/120/150/180 minutes, strict future starts, inclusive 180-day horizon, no
  bridging intervals or crossing midnight. The server remains authoritative.
- Editable subject/modality/topic/note context. Over-2000-character messages stay
  intact and block submission. Changed date/duration clears incompatible times.
- Native modal focus containment, trigger restoration, Escape while idle, pending
  announcement and dismissal restriction. Refreshing an offer preserves form input.
- Failed/uncertain submissions preserve their id/signature across modal reopening.
  Changed payloads require checking My Requests and explicitly starting a new attempt.
- Account-scoped results filters, sorting, disclosure state, map/list tab and scroll
  restoration. Logout/account change resets the container; no browser storage added.
- 44px button/disclosure hit areas, 16px mobile inputs, safe-area padding, dynamic
  viewport modal scrolling, associated profile labels and reduced-motion override.
- Deferred mobile Results map component and MapLibre CSS; a map already opened stays
  mounted across tabs. Existing visibility/device privacy behavior is preserved.
- Deferred request/dashboard/detail views; image size reservation, lazy decoding and
  accessible fallback for failed profile photos. Existing light palette retained.

## Automated evidence

| Criteria | Evidence | Scope / limits |
| --- | --- | --- |
| MF-01 | Shared native disclosure in cards/detail, all valid slots sorted | Browser-native keyboard behavior; no screen-reader hardware audit |
| MF-02–03 | 8 `mobile-booking.test.ts` cases; alternate Pacific/Auckland timezone run | Includes exact horizon, midnight, adjacent intervals, duplicates and invalid dates |
| MF-04 | Browser invalidates 11:00 when duration grows beyond its interval | Requires reselection before sending |
| MF-05 | Browser failure/retry retains inputs; refresh action calls catalog and handles withdrawal | Publication race still resolved by existing server; no hosted race injection |
| MF-06–07 | Browser topic/note propagation and oversized note block; pure limit/default tests | No new note storage shape |
| MF-08 | Browser double-submit, changed-payload block and same-id retry | Isolated backend; not proof of hosted delivery |
| MF-09 | Auth save failure/conflict, marketplace document/favorite/request failure/retry | Existing acknowledgement-based writes retained |
| MF-10, MF-12 | Width matrix 320, 360, 390, 430, 768, 1280; measured button/summary targets | Login, search, tutor detail, student profile and both roles' requests; result/teacher profile overflow checked |
| MF-11 | Scrollable dynamic-height dialog, safe areas and 16px form fields implemented | Physical Android/iPhone keyboards remain pending |
| MF-13–14 | Browser dialog entry, Shift+Tab containment, Escape, trigger restoration and pending restrictions | Native PDF viewer retained; full assistive-technology audit pending |
| MF-15 | 200% root text-size reflow in matrix; map reduced-motion suite | Muted text contrast strengthened on light surfaces; not a full WCAG certification |
| MF-16 | Lab hidden-result map requests remain zero; map suite exercises visibility and denied permission | This was already zero for the SDK in the baseline |
| MF-17 | Browser search text and exact scroll restoration after profile; account-keyed lifetime | Search/notes intentionally not persisted across logout/reload |
| MF-18 | Shared ProfileImage for cards/detail/header/navigation/profile editors | Failed-image fallback implemented; arbitrary uploaded image compression out of scope |
| MF-19 | Three cold runs, raw timing/resource JSON, 60 filter/tab/time interaction samples per version | Lab measurements only; no field INP claims |
| MF-20 | Existing controlled auth/marketplace/clean-view/map suites | Deployment and physical-device validation remain pending |

Checks: `npm test` (103 passed), `npm run lint`, `npm run build`,
`npm run test:accounts:browser`, `npm run test:marketplace:browser`,
`npm run test:browser`, `npm run test:maps:browser`.
The production build retains the warning for chunks over 500kB; it was not silenced.

## Lab protocol

Chromium 153.0.8010.52, Node 22.23.3; production Vite assets served with gzip and
no-store, 390×844 CSS pixels, disabled browser cache, 1.6Mbps down, 750Kbps up,
150ms latency, 4× CPU slowdown, three runs per build. Backend operations use isolated
JS fixtures. The captured baseline's public API origin is rewritten only inside the
lab server to `catalog.invalid`; no production data is read or changed.

Reproduce the final build: `npm run build`, then:

```sh
node tests/mobile-performance.mjs dist /tmp/mobile-performance.json
```

Baseline assets were captured before implementation in the temporary directory
`/tmp/tutorcucuta-mobile-baseline-dist`. They are not a portable release archive.
The JSON resource paths identify measured assets. Raw outputs include resource timing,
compressed bytes and interaction samples; they are not Chrome DevTools trace files.
Screenshots and reports contain only isolated fixture records.

Results readiness measures the first transition from the authenticated search screen
into Results, including a fixed 700ms observation window; it is not backend latency or
cold direct-route LCP. Map readiness is sampled after 3.5s, not measured tile-completion
time. UI reaction is event-to-two-animation-frames, not field INP. Network timings may
vary with external font and tile servers. Compare medians rather than isolated runs.

| Metric | Before | After |
| --- | --- | --- |
| Login LCP | 1400 ms | 1292 ms |
| Login CLS | 0  | 0  |
| Login compressed JS | 158728 bytes | 146471 bytes |
| Results transition observation | 1068 ms | 1112 ms |
| Hidden-map requests | 0  | 0  |
| Map SDK/worker/styles compressed bytes | 434966 bytes | 445542 bytes |
| Tab reaction p75 | 125.0 ms | 109.9 ms |
| Filter reaction p75 | 33.9 ms | 34.1 ms |
| Time selection reaction p75 | 35.5 ms | 33.6 ms |

Login JS/LCP, CLS, hidden-map request and measured interaction targets passed in this lab.
Map styles moved from initial CSS to deferred assets, accounting for the additional
map-group bytes. Results observation includes a fixed wait and is reported separately from interaction timing. No target for map tile completion was claimed.

[Before timings/resources](evidence/performance-before.json) · [After timings/resources](evidence/performance-after.json)

## Visual evidence

- [Baseline login](evidence/performance-before-login.png) and [updated login](evidence/performance-after-login.png).
- [Baseline results](evidence/performance-before-results.png) and [updated results](evidence/after-results-390.png).
- [Baseline teacher editor](evidence/before-teacher-390.png) and [updated teacher editor](evidence/after-teacher-390.png).
- [Booking dialog](evidence/after-booking-390.png) and [student profile](evidence/after-student-profile-390.png).

Inspected updated result cards, booking form and teacher offer screenshot. Preserved
light surfaces, teal actions and the original card hierarchy. Long booking forms scroll;
showing all fields simultaneously is not a mobile acceptance requirement.

## Release checks still pending

T10 is open: physical Android Chrome and iOS Safari keyboard/safe-area behavior,
assistive-technology walkthrough and a smoke test of these changes after an authorized
deployment. Existing hosted checks do not validate unpublished frontend changes.
No production account credentials or contact data are stored in these artifacts.
