# TutorCúcuta session handoff

Updated: 2026-09-11.

## Latest: architectural adjustments and DOM verification (student & teacher roles)

Completed the 6 user-approved architectural adjustments (AMC) across student and teacher flows:
1. Retiro de verificación: replaced "Docente verificado" / "Documentación revisada" with neutral badge "Información declarada".
2. Soportes PDF / JPG / PNG: added Section 4 in `TeacherProfileEditView` allowing tutors to upload/manage documents (up to 5MB) with mandatory legal disclaimer: «Documento aportado por el tutor. Autenticidad no verificada», explicitly stating that documents do not grant algorithmic points.
3. Ubicación puntual sin rastreo continuo: replaced `watchPosition` with single-shot `getCurrentPosition` in `browserGeolocation.ts`; virtual modality ignores distance.
4. Ratificación tecnológica: preserved React 19 + Vite + Tailwind CSS stack.
5. Recomendador Multicriterio Explicable: implemented deterministic 3-factor recommender (`isCandidateEligible`, `scoreAndExplainCandidate`, `recommendTutors`) with strict pre-filtering and transparent template reasons («¿Por qué te recomendamos este tutor?»). Unit tests in `tests/recommender.test.ts` (5 tests, 100% passing).
6. Ciclo de vida de solicitudes: wired `storage.getRequests()` persistence, guardian data for minors, and locked contact channels (WhatsApp/phone) on pending requests with the explicit notice.

DOM inspection verified on live Chromium instance (`http://127.0.0.1:3000/`) with real user accounts:
- Student: `dylanmaxter1810@gmail.com` (Search, Results, Profile, Requests).
- Teacher: `balckyfureu@gmail.com` (Dashboard metrics, Section 4 document uploader & legal disclaimer, Solicitudes recibidas).
- Automated tests: 61/61 tests passing (`node --import tsx --test tests/*.test.ts`). TypeScript check clean (`npm run lint`), bundle builds cleanly (`npm run build`).


User confirmed one role per account. Implemented Google OAuth and email/password
signup/login, confirmation handling, PKCE recovery, SDK session persistence/refresh,
logout and private profile saves for both roles. Contract: `docs/auth-and-profiles.md`.
`src/features/accounts/` contains validated domain payloads, session controller,
Auth adapter and private profile/photo Repository. Stale account responses are
ignored; conditional versions prevent silently overwriting another tab's saves.

Both forms await acknowledged writes, preserve edits on errors, and use account
identity/email. Teacher drafts accept missing numeric facts without inventing them.
Photos use owner-prefixed private Storage paths, 24-hour signed URLs, 30-minute
refresh and bounded JPEG/PNG/WebP uploads. Existing light UI and all maps remain.
Legacy browser records are preserved without automatic import. Search/favorites
reset with the authenticated session. Teacher publication/requests remain separate.

Migration: `supabase/migrations/20260910010000_auth_private_accounts.sql`, also
included before the unchanged reference seed in the combined initializer. It adds
owner-only accounts and Storage policies, immutable role/identity column grants,
JSON validation/server versions and closes legacy PII/precise-geometry read paths.
The public tutor display catalog remains readable. No records were seeded/deleted.

Verified locally: 56 behavioral tests; TypeScript including unused-symbol checks;
production build; isolated PostgreSQL 15 RLS/constraint checks; Chromium account
registration confirmation, invalid login, restore, save/reload, error/conflict,
account isolation, logout and PKCE recovery; existing desktop/mobile view checks;
real MapLibre/OpenFreeMap radius, device/feed and native permission regressions.
Mobile access and desktop light profile screenshots were visually inspected.
Existing bundle-size warning remains. Tests use controlled Auth/backend responses;
they do not prove hosted email, Google consent or real photo Storage operations.

Hosted migration applied by the user via SQL Editor ("Success. No rows returned").
Subsequent `npm run verify:accounts` confirmed private_accounts and legacy email
reads denied (401/42501), while the public catalog join returned 200. Email is
active with confirmation. Google remains disabled, so the verifier still exits
nonzero for that outstanding provider setting. No administrative credentials are
available here; the user performed the hosted SQL execution. Google client
credentials/redirects must be configured server-side using the setup guide. Never
request/persist secrets in chat or Graphify. Real Google consent, email delivery,
authenticated profile/photo persistence and cross-account hosted checks remain
pending user-owned account validation; do not equate anonymous probes to full RLS tests.

Older "local profile saves" and "role selection only navigates" entries below are
historical and superseded by the local implementation above. Google activation and
real-account validation remain the immediate pending work.

## Latest avatar adjustment

The shared navigation header now also uses the User icon instead of initials
when no photo exists, for student and teacher in desktop and mobile navigation.
The header and mobile avatar now also use a white background, teal border and
gray User icon; hover stays light teal. Uploaded header photos are preserved. TypeScript including unused symbols,
production build and desktop/mobile browser checks passed.

The student's empty-photo avatar now uses the same Lucide User icon and white,
teal-bordered appearance as the teacher's photo editor. Applied consistently to
student profile header, photo editor and preview; uploaded photos remain intact.
Removed the unused rendered-initials calculation and updated the photo hint.
Existing stored initials and other screens were not changed. TypeScript including
unused-symbol checks, production build and desktop/mobile browser checks passed.
The desktop screenshot was inspected; the existing bundle warning remains.

## Latest UI correction: student profile save labels and light preview

Changed both student-profile submit buttons to "Guardar", removed both "Borrador
local" badges and made field instructions neutral. The profile preview now uses
white/light surfaces, slate text and teal accents, matching the existing interface.
No layout or persistence behavior was changed. Browser regression checks verify
neutral labels, a computed white preview surface and the existing save outcome.
TypeScript, production build and desktop/mobile browser checks passed; the existing
large-chunk build warning remains. Verified the desktop screenshot visually.

Source review confirmed `App.handleSaveStudentProfile` still calls
`storage.setStudentProfile`, which writes localStorage. Supabase connectivity for
catalog/location reads does not implement authenticated profile writes. Keep the
save result truthful; do not claim cloud synchronization until its account and
persistence contract is implemented. This distinction was explained to the user.

## Previous change: automatic native geolocation and hosted feed verification

The user requested automatic positioning in every map, using the browser's native
permission request, and activation of the published Supabase location feed.

Implemented: each visible mounted map requests location once, displays the first
permitted observation and centers its camera. Previously granted permissions are
reused; denial and explicit stop do not trigger automatic retry loops. Hidden maps
pause, and explicit retry stays available. The typed residence address remains
unchanged; current device position is not a verified residence or reverse-geocoded
address. The existing UI, published teaching-point contract and applied Results
search origin/radius are preserved. Exact GPS is not persisted or uploaded.

Verified: 41 behavioral tests, TypeScript including unused symbols, production build,
existing desktop/mobile regressions and real MapLibre/OpenFreeMap browser scenarios.
Native Chromium permission checks cover denied/granted states and automatic camera
centering with emulated sensor coordinates, without replacing the Geolocation API.
This does not claim physical GPS accuracy or a visually inspected native prompt.
The existing bundle-size warning remains.

Hosted feed activated and verified on 2026-09-10 after the user's SQL Editor step.
`npm run verify:location-feed` passed against the configured project: validated
public snapshot, successful Supabase Realtime subscription and a second validated
read. There are 0 published teaching points. No writes were made by verification.
The earlier PGRST205 missing-table condition is resolved. Actual update/withdrawal
delivery between real users remains untested because no genuine points are
published. Do not seed mock tutors or copy private legacy geometry to fill the map.

## Previous completed phase: MapLibre + OpenFreeMap

Status: provider migration implemented and verified locally. No map API key or
billing account is required. Google-specific activation instructions below are
historical, superseded by [the current setup guide](../maps-setup.md).

The user approved this replacement and requested Graphify as a second brain, with
no new specification for every already-agreed bounded edit. Existing location and
publication contracts were reused; no new spec was created for this migration.

- Replaced the Google loader/adapter/types with lazy MapLibre 6.9 and OpenFreeMap
  Liberty/Dark vector styles. All seven surrounding map layouts remain intact.
- Preserved explicit geolocation, accuracy/stale states, animated radius/markers,
  applied origin, real-point filtering and the published-location Realtime feed.
  A pure geodesic polygon now draws radius/accuracy circles in geographic meters.
- Fixed the real-browser container CSS collision and configured the v6 worker via
  Vite `?worker&url`, including its production shared-module dependency.
- Removed Google environment declarations and obsolete SDK fixtures. Existing
  `.env` and hosted data were preserved; no prototype tutors were introduced.

Verified: 40 behavioral tests; `npm run lint` plus unused-symbol TypeScript checks;
`npm run build`; `npm run test:browser`; `npm run test:maps:browser`. The latter
loads actual MapLibre and OpenFreeMap geographic features and styles in Chromium,
with controlled device/catalog/feed responses. Production preview also rendered
actual streets, labels, radius and attribution using the emitted worker, with no
uncaught browser exceptions. The existing large-chunk warning remains. OpenFreeMap
styles emit nonfatal missing-pattern/shield-property warnings for some features.

The hosted published-location migration has not been applied. The current preview
therefore showed no connected teaching-location feed and invented no markers.
A permitted real-device/two-browser hosted check remains pending. No shared GPS,
authentication, self-service teacher publication, or complete geospatial/multicriteria
ranking is claimed. Earlier isolated PostgreSQL checks were not rerun because this
provider replacement did not change SQL. Graphify context and work memories must
retain this correction over the older Google activation outcome.

## Resume order

1. Read the project instructions and [project context](project-context.md).
2. Read the current feature specification and this handoff.
3. Check source changes and the graph's source fingerprint or manifest before
   relying on indexed facts. Rebuild or update a stale graph.
4. Query the saved graph for navigation, then inspect the cited source before
   making decisions or implementation changes.
5. At handoff, record the actual changes, verification outcomes, pending work, and
   decisions. Refresh the graph after meaningful source/specification changes.

Graphify and these documents provide persisted, refreshable context. They do not
guarantee complete recall of every chat message or replace current source evidence.

## Last completed application work

The user approved removing all visible mocks, starting with student Results,
before continuing development of the real system. That phase is complete and is
documented in [the cleanup tasks](../../specs/clean-views-real-data/tasks.md) and
[verification record](../../specs/clean-views-real-data/verification.md).

- Removed visible fixture identities and synthetic claims across student and
  teacher views, adapters, and seeds.
- Added safe empty states, explicit missing metadata, shared favorites, and honest
  local-save/unavailable-action feedback.
- Preserved raw browser records, legacy keys, same-name real records, and hosted
  data. Fixture filtering uses exact reserved IDs, not personal names.
- Kept only reference sectors in SQL seeds and added a migration removing the
  artificial match-score default. No hosted SQL or data deletion was performed.
- Recorded 14 passing behavioral tests, passing TypeScript checks including unused
  symbols, a successful production build, and isolated desktop/mobile Chromium
  checks. The existing large-chunk build warning remains.

These are recorded results from the cleanup phase. They are not a claim that all
checks were rerun during the Graphify installation session. Browser tests use
controlled catalog responses and do not validate hosted RLS or authentication.

## Last completed tooling phase: Graphify setup

Status: installation and project-memory integration complete.

The user authorized installing the official Graphify project and preparing durable
project context for future sessions. The authorized footprint and verification
contract are in [the installation requirements](../../specs/graphify-project-memory/requirements.md),
[design](../../specs/graphify-project-memory/design.md), and
[tasks](../../specs/graphify-project-memory/tasks.md).

This session separates the current application state from the academic product
goals, records the academic attachment's provenance, and identifies the older root
specifications as historical prototype documents. Original specifications and the
original attachment remain intact.

- Installed and verified `graphifyy[sql]==0.9.57` in an isolated `uv` tool using
  the existing Python 3.12; dependency consistency passed.
- Registered the project Codex skill and `.agents/skills/graphify` discovery link.
  Root `AGENTS.md` carries the engineering contract and session resume order.
- Indexed code, SQL, approved documentation and three curated work-memory records.
  `.graphifyignore` excludes environment files, credentials, dependencies, builds
  and third-party skills. TOML/CSS settings are summarized in `configuration.md`.
- Verified fresh-process code queries, the `App.tsx` to `supabase.ts` import path,
  and retrieval of the completed cleanup and pending authentication state.
- Saved two useful findings and one correction of historical prototype claims;
  `graphify reflect --if-stale` generated persistent lessons from all three.
- Verified `graphify update .` preserves semantic context and work-memory files.
  Code updates can change community labels and AST references; use the installed
  skill to refresh document semantics and review the complete graph afterward.
- Exported the interactive graph. Graph counts and extraction diagnostics live in
  `graphify-out/GRAPH_REPORT.md` and `graphify-out/graph-diagnostics.json`; final
  installation checks are recorded in `graphify-out/installation-verification.json`.

The installation uses local AST extraction and semantic analysis in the current
assistant session, with no standalone model API calls. Host-session semantic token
usage was not measured. Benchmark savings are estimates, not measured billing.
No application files, hosted database, global Codex settings or OS packages were
changed for this installation. No watcher, MCP server or Git repository was started.
See [the usage guide](graphify-usage.md) for session, query and refresh commands.

## Historical phase: Google Maps implementation (superseded)

Status: local implementation and automated verification complete; external Google
configuration and hosted migration/application verification remain pending.

The user approved implementation with “implementa ya, los cambios” and “sigue”.
The recommended approximate published teaching-location contract was adopted.
Do not ask for the same implementation approval again. See
[requirements](../../specs/google-maps-live-location/requirements.md),
[design](../../specs/google-maps-live-location/design.md),
[verification](../../specs/google-maps-live-location/verification.md), and
[activation guide](../google-maps-setup.md).

- Replaced the shared Esri engine with the official Google Maps JavaScript SDK
  adapter in all seven map placements, retaining surrounding layouts and controls.
- Connected student/teacher radius sliders to geographic circles with cancellable
  animations and reduced-motion support. Maps and marker identities are reused.
- Added explicit browser positioning with observed accuracy, freshness/error states,
  hidden-tab pauses, stop/unmount cleanup, and no exact-coordinate persistence or
  Supabase upload. Mi Perfil uses its own device position without a search circle.
- Captured the applied search origin/radius for Results. In-person cards and markers
  use one geographic inclusion rule; virtual offerings bypass radius. Later own
  observations do not move the applied circle. Other eligibility/ranking is pending.
- Added a validated public-location repository and Realtime reconciliation, including
  disconnection/removal and background catalog refresh for newly published tutors.
- Added `tutor_map_locations` SQL with three-decimal coordinates, browser read-only
  RLS, trusted admin/server writes, server timestamps and publication membership.
  The combined initialization file includes it before the unchanged reference seed.
  No locations are seeded; legacy private geometry is never copied automatically.
- Added `@types/google.maps` as a development dependency. `.env.example` and Vite
  types declare the two Maps variables. Existing `.env` values were preserved.

Verified this phase: 42 behavioral tests; TypeScript including unused-symbol checks;
production build; existing desktop/mobile browser regressions; controlled Google
SDK/device/feed browser scenarios; and actual PostgreSQL 15 migration/RLS/constraint
checks in a disposable offline Docker container. The existing large-chunk warning
remains. Test fixtures live only under `tests/`; none enter production catalogs.

The Maps key and map ID are absent from `.env`. Real Google cartography, attribution,
native touch gestures and a permitted real-device/two-browser hosted feed check
have not been verified. The SQL migration was tested locally but not applied to
hosted Supabase. No Cloud configuration/billing change was made. The setup guide
documents these activation steps without treating them as completed.

## Application work still pending

The Graphify setup does not implement application features or authorize hosted
database operations. Role selection remains screen navigation, not authentication.
Request delivery and teacher/profile publication remain unavailable until real
participant identity and persistence contracts exist.

The next application phase must specify authentication/onboarding, participant
authorization and RLS, guardian/contact access, actual profile/request persistence,
schedule semantics, the eligibility-first recommender, and wider database integration
tests. The implemented modality/radius filter is not a complete recommender or a
working PostGIS ranking/route service. Legacy open RLS remains a separate issue;
the new public projection does not secure existing private read paths.

## Session-memory rules

- Keep a concise latest handoff with an explicit date and feature status. Preserve
  durable decisions in their specifications/ADRs and cite their source paths.
- Record actual test commands and results, not planned checks as successful checks.
  Distinguish simulated/isolated scenarios from hosted or authenticated validation.
- Mark corrections and superseded claims explicitly. Never restore prototype
  mocks or treat historical completed tasks as proof of current readiness.
- Refresh the graph after meaningful source or specification changes. Check its
  freshness again when resuming a later session.
- Exclude secrets, environment values, real student/contact records, browser data,
  dependencies, generated builds, and unrelated projects from memory/index inputs.
- Do not index the entire home directory or attachment/session archive. Use the
  project context's derived academic summary and its preserved source provenance.
- Treat a graph relationship as an aid to finding evidence; inspect the source
  when accuracy or behavior changes depend on it.
