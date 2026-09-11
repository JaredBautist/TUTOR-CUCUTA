# Clean views implementation tasks

Status: Mock-removal phase completed. Full backend readiness remains deferred.

## Phase 1: Contract agreement

- [x] T01: Inspect the supplied Vite error and the current source state.
- [x] T02: Inventory demo values, empty-state assumptions, persistence boundaries,
  seed records, and existing validation tools.
- [x] T03: Draft requirements, design, interfaces, data-preservation constraints,
  and the real-user readiness dependencies.
- [x] T04: User authorized visible mock removal first, before real-system development.

## Phase 2: Restore compilation and empty-state rendering

Depends on T04.

- [x] T05: Reproduce the JSX and map-mode errors, then repair them. Verify CV-01.
- [x] T06: Add failing empty-catalog/selection checks, then make initialization,
  navigation, header, and detail rendering tolerate absence. Verify CV-02/CV-03.
- [x] T07: Define missing-value contracts and update affected adapters and views.
  Verify CV-04 and run type checking.

## Phase 3: Remove fictitious presentation and connect state

Depends on T05–T07.

- [x] T08: Replace demo identities, photos, fixed counters, fabricated verification,
  match percentages, schedules, and notification claims. Verify CV-04/CV-05/CV-08.
- [x] T09: Remove demo phone links and test missing/allowed contact states. Verify CV-06.
- [x] T10: Connect list/profile favorites and refresh booking values on open.
  Verify CV-09 with regression checks.
- [x] T11: Represent unavailable geographic data honestly and wire valid supplied
  locations to the map. Verify CV-10.

## Phase 4: Data outcomes and safe seed cleanup

Depends on T07.

- [x] T12: Distinguish loading, empty, read error, local drafts, and unavailable
  remote actions. Defer remote write implementation until identity contracts exist.
- [x] T13: Remove demo people and requests from both repository SQL initialization
  paths while preserving reference sectors. Verify CV-11 without executing SQL.
- [x] T14: Replace name-based fixture identification and verify preservation of
  user-entered records. Verify CV-12 without clearing browser or hosted data.

## Phase 5: Verification and handoff

Depends on all implementation tasks.

- [x] T15: Run behavioral regression checks, `npm run lint`, and `npm run build`.
- [x] T16: Check mobile/desktop navigation, empty catalog, missing profile, map,
  draft preservation, and unavailable actions using isolated browser storage.
- [x] T17: Review all views for remaining fictitious claims and reconcile the
  documentation with verified outcomes.
- [x] T18: Report actual readiness and the remaining authentication, RLS,
  persistence, and recommender dependencies; do not equate UI cleanup with release.
