# Google Maps and live-location tasks

Status: Implementation authorized. Published approximate teaching locations selected;
the local own-device display does not publish GPS.

## Preparation

- [x] Trace the radius defect, all seven map mounts, location DTOs and current SQL.
- [x] Define acceptance criteria and a design preserving existing interfaces.
- [x] Check official Google Maps, browser Geolocation and Supabase documentation.
- [x] Agree the contract and select published teaching locations or shared device GPS.
- [ ] Configure the project-owned Maps key/map ID for real Google validation.

## Map and own-position implementation

- [x] GM-T01 — Write failing radius/center regressions; define validated geographic contracts. Covers GM-02/03/06/12/16.
- [x] GM-T02 — Add official SDK loader/adapter with explicit configuration/error handling and cleanup. Depends T01; covers GM-01/05/14/15.
- [x] GM-T03 — Connect existing sliders to a geographic animated circle; preserve viewport and reduced motion. Depends T02; covers GM-02/03/04/13.
- [x] GM-T04 — Implement consented own-device positioning, accuracy/error states and watcher lifecycle. Depends T01; covers GM-07/08/09.
- [x] GM-T05 — Connect search/results/profile/teacher map modes and explicit tab visibility without changing surrounding UI; capture applied search origin/radius separately from device updates. Depends T03/T04; covers GM-01/05/06/08/09/15/17/18.

## Real tutor feed

- [x] GM-T06 — Agree ownership, publication precision, audience, revocation and persistence contract. Adopted trusted-admin public projection; effective hosted policies still require review before deployment. Covers GM-10/11/12.
- [x] GM-T07 — Implement the authorized location DTO/repository and snapshot/subscription reconciliation. Depends T06; browser writes remain disabled pending authenticated ownership. Covers GM-10/11/12.
- [x] GM-T08 — Connect marker additions/movement/removal with Results selection and truthful feed status. Depends T05/T07; covers GM-10/11/13/16.

## Verification and handoff

- [x] GM-T09 — Verify unit/integration behavior, existing regression suite, TypeScript and production build.
- [x] GM-T10 — Verify controlled desktop/mobile UI, keyboard, reduced motion, permissions and teardown. Actual Google touch gestures remain in T11.
- [ ] GM-T11 — Verify actual Google rendering and permitted device updates; distinguish controlled tests from real authorized cross-client data.
- [x] GM-T12 — Record evidence and remaining dependencies; update session context and the Graphify index.

Local SDK/feed implementation and PostgreSQL checks are complete. T11 and the
Google configuration item are external activation checks, not claimed successes.
No hosted database, Google Cloud or billing changes were made. See verification.md
and docs/google-maps-setup.md for evidence and the remaining activation steps.
