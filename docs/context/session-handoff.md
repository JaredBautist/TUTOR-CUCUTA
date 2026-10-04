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
The four presentation findings recorded during this walkthrough were resolved on
2026-09-25 as documented below. Physical GPS/device and production checks remain
separate release validations.


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


## Dependency and README maintenance — 2026-09-25

Removed unused `@google/genai`, `express` and `@types/express` dependencies; no source
module imported them and the academic scope excludes generative AI. Updated README
to state the current React/Vite stack, 85-test suite, Google/email authentication,
persistent Supabase data, hosted demonstration dataset and approximate published map
zones without continuous GPS tracking. The user reports the Google login, schedules,
PostGIS and hosted migrations complete; a read-only Auth settings probe independently
confirmed that Google and email providers are enabled. `npm test` passed 85/85,
TypeScript passed and the production build passed with the existing large-chunk warnings.


## Approximate location privacy correction — 2026-09-25

The user reported that device maps appeared to expose a current real-time location
instead of an approximate zone. Root cause: production already used one-shot
`getCurrentPosition`, but passed its exact coordinates to React/map state and labeled
the marker as the current location. The browser adapter now rounds coordinates to two
decimals before application state and expands the uncertainty circle by native
accuracy plus the privacy-rounding offset. Manual map origins and public tutor rows
are limited to the same precision. UI copy consistently says approximate zone; exact
coordinates are neither rendered, persisted nor published. Targeted regressions cover
rounding, labels, uncertainty and feed precision.

## Hosted presentation findings resolved — 2026-09-25

The four P2 findings from the hosted walkthrough are closed without a database
migration or visual redesign. Results cards summarize the first valid declared weekly
slot and additional-slot count; tutor profile copy states the real contact-release
rule; request views omit an empty structured topic while preserving subject, goal and
student note; and result/favorite tab counts now use the same eligible recommendation
set as the rendered cards. Missing in-person search areas show a direct instruction to
define an approximate zone and radius. Three focused SSR regressions were added.
The full suite passed 90/90, TypeScript and production build passed, and clean-view
plus marketplace browser suites passed. The existing large-chunk build warning remains.

## Flow and use-case documentation — 2026-09-29

Added `docs/flujos-y-casos-de-uso.md`, a Spanish functional guide with Mermaid
access/student/tutor flows, a use-case overview, ten use-case contracts, request
states and sequence, recommendation flow and privacy boundaries. Verified against
current App wiring, marketplace contracts/adapters, polling hook and recommender.
Explicitly documents absent structured request-topic propagation, no completed-class
state, guardian declaration rather than independent verification, and the distinction
between published zone updates and continuous GPS. Production validation remains a
separate activity. No application or hosted data changes were made.

## Mobile-first frontend specification — 2026-09-29

User requested frontend improvement specs prioritizing mobile users. Added
`specs/mobile-first-frontend/` with requirements, design/contracts, dependency-ordered
tasks and an ADR. Covers full weekly schedules, proposed booking times, editable
search-note continuity, feedback/accessibility, session-only results navigation,
student/tutor mobile layouts and measurable performance budgets. No implementation
or hosted changes were made. Tasks remain pending; the existing API note field is
used and proposed times must not imply free/busy knowledge or a reserved session.


## Existing-email signup correction — 2026-09-29

Prioritized ahead of mobile implementation. The Auth adapter now distinguishes
confirmed duplicate signup (empty identities without a session or explicit duplicate
codes) from a new confirmation. The form switches to login, preserves the email,
clears the password and offers existing login/recovery options without claiming mail
was sent. A synchronous in-flight guard prevents repeated submission events.
Contract: `specs/existing-email-signup/requirements.md`. No public email registry,
new database table, hosted migration or admin key in frontend code is introduced.
Read-only hosted inspection confirmed the reported account was already confirmed;
no production signup or email-send test was performed. This detects Supabase's native
response after signup; it does not disable confirmation resends for pending accounts.
Five adapter regressions and the controlled browser duplicate case failed before the
fix and pass afterward. Full unit suite: 95/95; auth browser suite passed against a
controlled backend. Deployment of this local correction has not been verified.

Validation completed: TypeScript (`npm run lint`) and production build passed.
The existing large-chunk build warning remains; no production deployment was performed.

## Mobile-first frontend implementation — 2026-09-30

Implemented the authorized `specs/mobile-first-frontend` contracts locally without
changing Supabase APIs or records. Pure Colombia-time slot proposals and search-note
composition drive the request form; full schedules appear in cards and tutor detail.
Native modal focus/Escape handling, account-owned uncertain submission id/signature,
editable errors and explicit offer refresh preserve acknowledgement semantics.
Results filters/tab/scroll are retained only within the keyed account session.
Shared touch/input/safe-area/reduced-motion styles, profile labels and resilient
avatars improve both portals. Mobile Results defers its map component and retains
an opened instance across tabs; MapLibre CSS is deferred with the engine. Existing
one-shot approximate-location privacy is unchanged.

Evidence and remaining limits: `specs/mobile-first-frontend/validation.md`.
103 unit tests and the controlled auth, marketplace, clean-view and map browser
suites passed; TypeScript and production build passed. Browser matrix includes six
widths, measured targets, 200% text, schedule invalidation, context propagation,
oversized note, uncertain-id retry and results scroll restoration. Lab comparisons
use three cold runs with network/CPU throttling, raw timing/resources and screenshots.
Initial compressed JS fell from about 159kB to 146kB; chunk warnings remain visible.
Physical Android/iPhone keyboards, assistive-technology review and an authorized
smoke test after deployment remain pending (T10). Local fixture results do not prove
hosted delivery. No commit, push, deployment, migration or hosted data change occurred.

## T10 local closure — 2026-09-30

User requested T10, then explicitly chose to finish locally and handle external
publication/device checks. Public read-only Chromium smoke found a working login
at six widths with no overflow or uncaught exceptions, but assets differ from the
local mobile build and public auth controls remain below 44px. This is not evidence
that mobile changes are deployed. No hosted login, submission or mutation occurred.
No iPhone was detected; ADB was unavailable, and no remote physical-device tool or
Vercel CLI/project authentication was available in inspected standard paths.

Added `tests/browser-hosted-smoke.mjs` and
`specs/mobile-first-frontend/t10-release-check.md` with real-device steps and the
public read-only report/captures. T10 local preparation is closed; physical Android,
iPhone, assistive-technology and changed-version hosted checks remain pending.
No Git publication or deployment was performed.

Final local closure checks: `npm test` 103/103, `npm run lint`, `npm run build`,
`node --check tests/browser-hosted-smoke.mjs` and `git diff --check` passed.
The existing large-chunk warning remains. No physical-device result was fabricated.

## T10 release verification and pilot preparation — 2026-10-04

User authorized closing T10 and a small pilot. See
[current evidence and pilot protocol](../pilot-readiness-2026-10-04.md).
GitHub confirms successful Vercel Production deployment 6764382991 for commit
0de1b5bc54d65442bfc164170f63db908bd76166; local/remote main agree. This supersedes
the earlier assumption that the mobile work had not been pushed or deployed.
Public alias passed six-width anonymous smoke with no overflow, runtime exceptions
or undersized visible buttons. Evidence is versioned in
`specs/mobile-first-frontend/evidence/t10-public-20261004/`.

Read-only Supabase protection probes passed; both authorized demo accounts signed in
and read their own role/requests, with four offers visible to the student. No business
records changed; sessions signed out locally. Fresh 103/103 tests, TypeScript and
build passed, existing chunk warnings remain. Physical Android/iPhone and deployed
authenticated UI journeys remain unverified for this revision. Device availability
was requested; no physical access confirmed. A seven-day, four-tutor/four-adult-student
pilot protocol and success/incident ledger are prepared, but no participants were
enrolled or contacted and the pilot is not yet active. No push/deployment was needed
or performed. Do not mark T10 or real-world viability complete from these checks.

## Dedicated deployed UI QA — 2026-10-04

At the user's explicit request, a dedicated QA agent exercised the real Vercel UI
with authorized demonstration accounts in Chromium/CDP. Evidence and exact limits:
[QA report](../t10-dedicated-qa-2026-10-04.md).

Verified student search with subject/level/virtual modality/budget, factual reasons,
complete weekly availability, result filter and 200px scroll restoration after
profile return. Booking preserves search topic/notes; 60-minute Tuesday proposals
span 18:00–20:00 starts in half-hour steps, and changing to 180 minutes clears an
invalid 20:00 selection, leaving 18:00. Focus returns after Escape when the trigger
was focused. Denied GPS remains optional and the map operates. Tutor login, editor
and existing request detail are accessible at 320/390px without page overflow or
undersized measured action targets; cancelled request actions are disabled.

No profile, offer, request or favorite was changed. Incomplete student name/age
prevents submission, so current request delivery/transitions remain untested.
Physical Android/iPhone keyboard, assistive-technology and pilot participation
remain pending. Do not convert emulated Chromium evidence into physical-device
or completed tutoring claims. No application behavior changed during this QA.

Confirmed presentation defect: `App.tsx:233` sets `submissionEnabled` from account
ID AND non-empty student name; `RequestTutorModal.tsx:75` interprets false as
"Inicia sesión". Thus an authenticated account with an incomplete name sees both
the valid profile-completion warning and an incorrect sign-in instruction. Captured
on the public build; report as a UX/state-message defect, not an authentication
failure. No fix was implemented during this testing-only pass.
