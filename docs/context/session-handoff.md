# TutorCúcuta session handoff

Updated: 2026-09-12. This snapshot supersedes earlier prototype/local-only claims.

## Current authorized work

The user authorized connecting the urgent reviewed gaps to Supabase and saving
verified context in Markdown/Graphify. Preserve React/Vite, the light UI and maps.
Contract and design: [cloud marketplace](../cloud-marketplace.md).

## Implemented in the workspace

- Google/email Auth, session restoration and private account/profile/avatar saves
  remain in `src/features/accounts/`; one immutable role per account.
- `src/features/marketplace/` adds a typed Repository adapter and participant request
  hook. App uses acknowledged remote operations, without browser request/document
  fallback or automatic import of legacy localStorage records.
- A tutor saves a private profile, then explicitly publishes an offer with levels,
  modalities, weekly Colombia-time availability, international phone and teaching
  zone. Publication snapshots declared profile facts; later private edits require
  republishing. Withdrawal hides the offer and documents; participant requests remain.
- Student requests have actual future date/time, server-derived identity/price,
  declared guardian authorization for minors, an idempotent submission UUID and
  participant-only reads. Tutor accepts/rejects; student cancels. Contacts are
  omitted until acceptance and removed again on cancellation. Server locks serialize
  acceptance to prevent overlapping accepted sessions for a tutor.
- Shared document panel uploads PDF/JPEG/PNG (5 MiB, ten metadata records per tutor)
  to private Storage, saves metadata, supports authenticated-student viewing and
  owner withdrawal. Signed document URLs last 60 seconds. Exact disclaimer:
  “Documento aportado por el tutor. Autenticidad no verificada”. No certification.
- New catalogs read `tutor_offers`; maps read/subscribe to `tutor_offer_locations`.
  These are distinct from historical `tutors` / `tutor_map_locations`. Browser writes
  go through versioned RPCs and RLS, never service-role credentials.
- Map points are explicit teaching-zone selections, rounded to two decimal places
  before transmission and on the server. Automatic one-shot GPS observations never
  authorize publication. MapLibre/OpenFreeMap, slider, animations and original
  placements remain. Native geolocation uses getCurrentPosition, not watchPosition.
- Recommender checks subject/level/modality/budget/weekly overlap, known in-person
  locations and both radii. Only price/overlap/proximity affect scores; virtual
  ignores distance. Experience/documents provide no bonus. Missing experience stays
  missing. Ranking weights are initial product rules, not validated quality measures.
- Results copy and sorting now agree with the computed recommendations. Existing
  browser fixtures were updated for the new catalog and single-shot location model.

## Validation completed

- `npm test`: 67 tests passed (including new eligibility/guardian/file regressions).
- `npm run lint` and `npm run build`: passed. Existing large-chunk warning remains.
- `npm run test:marketplace:db`: passed against disposable PostgreSQL 15, migration
  applied twice. Verified roles/RLS, publication, private contact, rounded zones,
  authoritative prices/identity, guardian requirement, idempotency, transitions,
  accepted-session conflicts, document access and withdrawal. No hosted writes.
- Browser suites for accounts, clean views and maps passed. Map tests use real
  MapLibre/OpenFreeMap with controlled data and native permission emulation.
- `npm run test:marketplace:browser` passed: publish, upload failure/retry, private PDF
  viewer, minor block, request failure/retry, student/tutor switching, accepted
  contact, cancellation and mobile overflow. Its backend is controlled, not Supabase.
- Desktop and mobile marketplace screenshots inspected under `/tmp/` (test identities).

## Hosted state and next action

Google and email are enabled; prior account migration is active. Public settings
and anonymous permission probes were verified on 2026-09-12. Real Google consent
and hosted cross-device delivery are not established by the controlled UI tests.

The user applied `supabase/migrations/20260912000000_cloud_marketplace.sql` in
SQL Editor and reported “Success. No rows returned”. The follow-up
`npm run verify:marketplace` confirmed all five new tables exist and anonymous
reads are rejected with 401/42501. This replaces the earlier PGRST205/missing-table
state. No administrative credentials were requested or exposed; the user executed SQL.
The combined initializer includes the same migration for fresh setups only.

Next: validate real authenticated publication, Storage upload/view/withdrawal and
requests across student/tutor accounts. Anonymous checks do not prove authenticated
RLS or real delivery; those are covered locally with PostgreSQL and controlled UI,
not yet across real hosted users. Do not commit/push these edits without instruction.

## Known limits and follow-up

- Requests refresh on focus/every 20 seconds and after writes; catalog on focus/every
  minute plus published-location invalidation. No continuous device tracking.
- Supporting documents are declarations, not verified evidence. Guardian consent is
  a declared requirement, not an identity verification workflow.
- Document links already issued can remain valid for up to 60 seconds after removal.
  Uploads whose metadata acknowledgement is lost can leave owner-only orphan objects;
  do not delete them blindly. Failed object cleanup is reported after access revocation.
- Keep profiles private. Never revive legacy anonymous mutation privileges to make
  the new screens work. No mocks belong in production catalogs.
- Test recommendation weights with real/isolated academic cases before claiming
  recommendation quality; improve loading/chunking after core hosted validation.

## Session memory

Use Graphify as a local derived index, not an automatic transcript or external
network service. Query it first, then verify source. Preserve `graphify-out/memory/`.
Current Markdown and the user-approved contract outrank older Graphify work notes.
No credentials, user contact data or raw environment contents belong in memory.

## Visual consistency correction — offer and document panels

The user identified that the new marketplace controls did not match the existing
teacher profile. Updated OfferPanel and DocumentsPanel presentation using the
established profile classes: numbered section headings/dividers, slate borders,
white fields, the same text sizes, teal selected subject-style choices, dark save
buttons, matching secondary actions and a compact schedule layout. Checkbox inputs
remain semantic and keyboard-focusable; mobile time fields use a bounded grid.
The existing Supabase operations, validation, map and profile layout are preserved.
TypeScript and production build passed (existing chunk warning remains). The
marketplace browser flow passed with the controlled backend, including publication,
documents, request/guardian handling, cancellation and mobile overflow. Desktop
empty/filled offer and mobile screenshots were inspected. No hosted writes occurred.
