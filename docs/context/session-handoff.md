# TutorCúcuta session handoff

Updated: 2026-09-18. This snapshot records the mobile responsiveness optimization, strict light mode enforcement, and UI/UX Pro Max skill integration.

## Mobile responsiveness, light mode and UI/UX skill update (2026-09-18)

- **Skill UI/UX Pro Max installed**: Cloned from `https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git` into `.agents/skills/ui-ux-pro-max` and linked as `.agents/skills/ui-ux-pro-max-skill`. Validated Python CLI search query against WCAG 2.2 and mobile responsive guidelines.
- **Strict Light Mode Enforcement**: Eliminated dark-themed containers (`bg-slate-900`) across all views. Converted tutor profile booking CTA card and mobile sticky booking bar to clean light mode (`bg-white border border-slate-200/90 text-slate-900`) with brand teal primary buttons (`bg-teal-700 hover:bg-teal-800 text-white`). Updated search chips, role selectors, and action buttons in `StudentSearchView`, `StudentResultsView`, `StudentRequestsView`, and `LandingLoginView` to brand teal.
- **Mobile Touch Target Optimization**: Enforced WCAG 2.2 / Apple HIG minimum touch target sizing (`min-h-[44px] min-w-[44px]`) on mobile hamburger navigation (`Header.tsx`), search inputs, and full-width card CTA buttons. Preserved safe area padding (`pb-28 sm:pb-12`) to prevent navigation overlap (`fixed-element-offset`).
- **Repository Cleanliness & GitHub Documentation**: Restructured `README.md` in Spanish with emojis, technical architecture, and test credentials table. Added `supabase/` to root `.gitignore` and pushed updates to `origin/main`.
- **Validation**: 84/84 tests passing (`npm test`), `npm run lint` clean, `npm run build` passing, mobile viewport (`390x844`) audited via browser subagent with screenshot proof. Graphify refreshed (`graphify update .`).

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

- `npm test`: 76 tests passed (including new eligibility/guardian/file regressions).
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

## Historical continuity check before favorites — 2026-09-12

The user reaffirmed that every meaningful project outcome and pending decision must
be saved in Markdown and Graphify. Consult the local graph at session start and
verify the referenced source before edits. Graphify does not disable chat compaction
or automatically record conversations; its CLI and installed project skill provide
explicit retrieval. Do not claim a persistent external connection or guaranteed token savings.

Verified Graphify 0.9.57 is on PATH, the project skill link resolves, and graph queries
return the current marketplace handoff. The initial graph had 670 nodes, 1,425 edges
and no dangling endpoints. Incremental detection found no changed source code;
two recent work-memory records still needed semantic indexing. Preserve older notes
as history; current source and this handoff supersede stale Google Maps/auth claims.

At that earlier memory-only turn, the recommended order was:
1. Validate Google/email login, publication, documents and request transitions with
   real hosted student/tutor accounts; controlled browser checks are already complete.
2. Persist student favorites in Supabase. At that point `src/App.tsx` used component
   state (`savedTutors`); favorites were lost on reload.
3. Evaluate ranking weights using representative academic cases.
4. Check Vercel configuration, authentication redirects and initial bundle loading.

That earlier turn only recorded continuity. The implementation below supersedes its local-only favorites statement.

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

## Persistent favorites, ranking evaluation and Vercel preparation — 2026-09-12

Authorized follow-up contract: `docs/persistent-favorites.md`. The user subsequently authorized agent-driven real hosted tests; see the verification
update below for completed checks and remaining limits.

- Implemented `src/features/favorites/` with a domain Repository port, Supabase
  adapter and application hook. Existing result/profile bookmarks now load private
  account favorites, acknowledge desired-state writes, expose failure/retry and
  disable toggles during loading/writes/errors. Refresh on focus/every 30 visible
  seconds; stale reads cannot overwrite writes. No browser storage fallback.
- `20260912010000_student_favorites.sql` adds owner/student SELECT RLS and a
  security-definer desired-state RPC. Account identity comes from auth.uid(),
  duplicate saves/removals are idempotent, account locks enforce a 500-item limit,
  and only published offers can be newly saved. Withdrawal retains private IDs
  but existing catalog visibility hides withdrawn offers. Legacy rows untouched.
- User applied this migration in SQL Editor and reported “Success. No rows returned”.
  The follow-up remote probe confirmed table presence and anonymous denial 401/42501.
  This supersedes the pre-activation PGRST205 probe. Real favorite saves/recovery
  across hosted accounts/devices remain part of the user's pending browser check.
- Extended real isolated PostgreSQL tests with favorites ownership/role isolation,
  repeat application, idempotency, withdrawal/removal and the 500-item limit.
  Browser checks cover read/write failure, reload, focus sync, logout/login,
  removal and original document/request/contact flows with a controlled backend.
- 76 unit tests, TypeScript, production build and browser suites (accounts, clean
  views, marketplace, maps) pass. Map suite uses real MapLibre/OpenFreeMap with
  controlled native permission and data; screenshots retain the original light UI.
- `docs/recommender-evaluation.md` records six additional scenario tests, including
  24 price/schedule combinations. Hard filters, ordering, neutral missing inputs,
  bounded scores and deterministic ties pass. Weights unchanged; educational
  effectiveness and real relevance judgments remain unvalidated.
- `docs/vercel-readiness.md` records Vite build/routing and exact root/recovery
  redirect requirements. Existing `.env` untouched; `.env.example` repaired to only
  required public variables. Local TOML now allows HTTP localhost/127.0.0.1.
  Hosted URL configuration and production domain remain pending; no deployment.
- Five map/profile screens now load via React lazy/Suspense. Production entry fell
  from 677,835 to approximately 565,570 bytes (minified, not transfer size); MapLibre
  remains deferred. Existing >500 KB warnings remain; no claimed latency benchmark.

Next: collect the user's real two-account flow outcome (including favorite reload,
logout/login and another device), then finalize redirects for the actual production
origin. Do not repeat implemented favorites work or claim hosted end-to-end success
from local tests. No publishing or messages to third parties were performed.


## Live hosted validation completed — 2026-09-12

The user provided existing student/tutor access and then explicitly authorized
fictional test profiles (16-year-old grade 11 student, limits exam, 26-year-old systems
engineer tutor, presencial COP 30,000/h). Report: `docs/hosted-validation-2026-09-12.md`.
The existing port-3000 app was used; no server restart, fake HTTP response or Auth bypass.

Verified live: email sign-in and session restore, profile save/reload, published
rounded map point and offer delivery, real private Storage upload/student PDF view,
server/UI guardian block, declared-test guardian transition, request delivery,
acceptance/contact disclosure, cancellation/contact revocation, private favorites
across independent browsers, focus synchronization, RLS isolation and withdrawal.
Both original private profiles restored; favorite removed; document/object deleted;
offer withdrawn. One cancelled test request and a private withdrawn offer remain
as explicit test history. No contacts were called or messaged. Temporary isolated
browser profiles were removed and the original server remains running.

Evidence: 22 local screenshots and gallery outside the repo at
`~/Escritorio/TutorCucuta-pruebas-2026-09-12/index.html`. No credentials or tokens in
project memory. This supersedes the earlier pending hosted-email-flow statements;
Google consent, actual device GPS, another physical device and production redirects
are still unverified. One read failed transiently and passed on retry.

Next bounded fixes from the live check: truthful weekly-availability text (currently
nextAvailable is blank), remove stale account-connection copy on tutor detail,
propagate the specific topic or hide its empty section, align result/favorite counts
when no search origin exists. No application code was modified during this QA turn.


## Recorded walkthrough — 2026-09-12

User requested a complete video in the existing screenshot folder. Recorded actual
browser interactions against the existing localhost:3000 app and hosted Supabase:
student/tutor profiles, published teaching zone, private demonstration PNG, search
radius and map, explanations, favorite, request, acceptance, cancellation/contact
revocation and a 390px responsive viewport. User-authorized fictional scenario was
reused; no backend mocks or application source changes. Output is a silent MP4 with
Spanish captions and chapters, approximately 4 minutes, plus `video.html` and
`video-notas.md` in `~/Escritorio/TutorCucuta-pruebas-2026-09-12/`.

Original profiles restored and verified; favorite removed; document metadata and
Storage object absent; offer withdrawn. The new video request is cancelled and
retained alongside the earlier cancelled QA request; private withdrawn draft remains.
Both temporary sessions signed out locally and RAM browser profiles removed. A
transient offer-read failure recovered on retry. No contacts called or messaged.
The four previously documented presentation findings remain unfixed; Google OAuth,
physical GPS/device and production checks remain unverified.


## Academic delivery dataset prepared — 2026-09-17

User authorized four tutor and four student demonstration accounts (interpreting
the repeated student count from the preceding tutor request), Colombian-style
fictional names without visible PRUEBA suffixes, varied subjects/modalities/prices/
schedules/zones, and persistent offers for the academic delivery. This authorizes
intentional hosted demonstration records, not a browser mock fallback.

Contract and operator instructions: `docs/delivery-accounts.md`. Dataset:
`scripts/delivery/accounts.ts`. Provisioner: `scripts/provision-delivery-accounts.ts`.
Uses Admin Auth with fictional reserved-domain identities, normal account Repository
and publication RPC, a private credential journal outside the repo, collision/role
checks and resumable stages. Minor profiles leave guardian authorization false.
No real account is overwritten, no university/document credential is invented.

Validation originally covered eight dataset/ownership tests, the full 84-test suite
and TypeScript. On 2026-09-25 hosted verification superseded the earlier pending
state: all eight accounts signed in, four offers were published, and all six expected
budget/proximity/modality/subject/schedule scenarios passed with derived reasons.

Security remediation on 2026-09-25 rotated all eight passwords after plaintext demo
credentials were found in the public repository. `CREDENCIALES_PRUEBAS.md` and
`credenciales.html` were removed; current credentials exist only in mode-0600 files
under `~/.local/share/tutorcucuta/academic-2026-09-17/`. The service-role key and
controlled tutor contacts moved from tracked/default locations into ignored
`.env.admin`; `.env` contains only the public Supabase URL and anon key. Provisioning
now reads `DELIVERY_PHONE_*` variables and supports resumable `--rotate`. A security
regression test prevents publishing credential pages, the previous shared password,
or Colombian contact numbers outside test/spec fixtures. No UI changed.
