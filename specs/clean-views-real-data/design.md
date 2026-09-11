# Clean views: design and contracts

Status: Mock-removal phase authorized; backend readiness deferred.

## Existing failure points

- `UnifiedCucutaMap.tsx`: duplicated footer and mismatched JSX closing tags.
- `TeacherRequestDetailView.tsx`: `teacher-detail` is not a supported map mode.
- `App.tsx`: initial selection and header props assume nonempty tutor collections.
- Views and adapters contain demo identities, fixed scores, fixed contacts,
  synthetic coordinates, and unsupported success/verification statements.
- The results/profile screens do not supply tutors to the dynamic map.
- The profile favorite state is independent of the persisted favorite collection.
- Supabase mutations do not inspect their returned errors; request payloads do not
  match the database identity contract.

## Module boundaries

Keep the existing screen components and Tailwind identity. Use `App.tsx` to compose
screen state and callbacks. Small framework-independent helpers belong in a
existing `src/utils/` directory for this bounded cleanup.
Do not introduce a framework migration, global state library, or generic service bus.

The existing Supabase module remains an Adapter: it maps database records into
application values and reports operation outcomes. The storage module owns browser
persistence. Views render explicit states rather than creating replacement people.

## Agreed interfaces

| Concern | Contract |
| --- | --- |
| Selection | Selected tutor/request IDs may be absent. Resolve the current entity from the latest collection; render absence explicitly. |
| Account identity | A catalog entry does not establish a signed-in tutor. Absent identity must remain absent until authentication is implemented. |
| Missing values | Use explicit absence for unknown age, distance, match score, contact, or coordinates. Zero and invented defaults must not represent unknown values. |
| Read outcome | Distinguish loading, successful empty result, successful populated result, and failure. An empty remote result must not restore stale catalog entries. |
| Write outcome | Await the operation and expose either confirmed success or a typed failure. Preserve draft input when unsuccessful. |
| Favorites | Receive saved IDs and a shared toggle callback in both list and profile views. |
| Booking | Refresh inputs from the current subject, student, and tutor when opened. Missing required identity or persistence capability makes submission unavailable. |
| Geography | A geographic position requires actual approximate longitude/latitude input. Legacy SVG display offsets cannot be presented as measured coordinates. |
| Contact | Render an actionable link only for a valid available contact and the allowed request state. Server authorization remains a separate dependency. |

Any changes to shared TypeScript types must be propagated to all consumers.
Database response mapping and view contracts must remain explicit; `any` casts
must not be used to hide missing entities or unsupported map modes.

## Sequence of operations

1. Initialize editable local state safely, without demo identities.
2. Render an explicit catalog loading/empty state and valid navigation.
3. Read configured remote data; distinguish failure from an empty result.
4. Resolve active selections against the current collections.
5. Render only available facts; allow drafts where appropriate.
6. For an enabled remote write, await and inspect its result before reporting success.
7. Retain entered data on failure and provide a meaningful message.

## ADR-01: Represent absence explicitly

Context: clearing fixtures leaves empty collections and missing profile fields.

Options: recreate placeholder tutors; scatter optional chaining around existing
assumptions; represent missing selections and unavailable values in the contract.

Decision: explicit absence with screen-level empty states.

Consequences: some props and mappings change, but no fictitious user is introduced
and future authentication can supply a genuine identity.

## ADR-02: Truthful capability states

Context: views currently announce successful remote saves, Google authentication,
verification, and notifications without the corresponding confirmed operation.

Options: retain prototype claims; implement all backend capabilities in one cleanup;
show confirmed outcomes and unavailable states while specifying backend dependencies.

Decision: confirmed outcomes and clear unavailable states.

Consequences: unfinished actions may be unavailable after cleanup. The application
must not be described as ready for real users until its readiness dependencies pass.

## SQL and cache strategy

Remove demo-person inserts from the repository's seed and combined SQL while
retaining reference sectors. Keep both initialization paths consistent. Do not
modify policies or run SQL in this cleanup feature. Do not add name-based cache
deletion or discard user records when storage versions differ.

## Validation strategy

Write failing behavioral regression checks before each bug fix. Existing installed
React rendering and TypeScript tooling can cover empty states and pure contracts.
Run type checking and production build after the implementation. Validate mobile
and desktop navigation in Chromium using isolated browser data. If additional
test dependencies are needed, resolve their installation separately before use.

Static checks and isolated rendering do not substitute for PostgreSQL/RLS testing
or an end-to-end authenticated workflow.

## Implementation contract for the mock-removal phase

- `Tutor.matchScore`, `Tutor.distanceKm`, and legacy display `coordinates` are optional.
  The catalog adapter supplies no calculated metadata until a real evaluator exists.
- Student profile/request `age` and request geographic/match fields are optional.
- Known fixtures are recognized by reserved seed UUIDs or historical fixture IDs,
  never by names. Reads preserve the original storage payload.
- Successful empty remote collections replace the in-memory catalog. Read errors
  expose an error state rather than silently reporting a successful empty fetch.
- No catalog tutor is selected as the current teacher without authenticated identity.
- Tutor-profile favorites share the application's saved IDs. Booking requires an
  actual participant identity; no simulated send or contact notification is offered.
- Geographic display uses only supplied approximate longitude/latitude; existing
  SVG offsets are not evidence of a real position. The default map is a city view.

ADR-03: Keep this phase at the existing adapter boundary. A small shared fixture
filter avoids divergent cache/SQL rules. A new repository framework or scoring
implementation would add unrelated behavior and is deferred.

## Final scope and persistence boundary

The application no longer queries a global request collection or impersonates the
first catalog tutor. Local requests require an explicit student ID association to
be displayed. Role navigation does not supply authenticated identity. Incomplete
prototype write methods and the unused prototype score generator were removed;
remote writes and ranking will be implemented against separate agreed contracts.

A metadata-only forward migration drops the request `match_score` default. It does
not backfill or delete existing scores. The combined initialization script includes
this migration before the reference seed. Applying it obtains the normal short
table DDL lock; a rollback could restore the old default, but would reintroduce the
unsupported score. No SQL was run against a database.

Cache reads hide known fixture IDs and discard synthetic display metadata in memory.
The raw cache and legacy keys remain intact. Successful remote reads update the
visible catalog without overwriting unrelated browser records. Local draft saves
report storage failure and retain entered form values.
