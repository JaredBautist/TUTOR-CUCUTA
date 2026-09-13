# Persistent favorites and release readiness

Authorized 2026-09-12. Preserve the existing React/Vite UI and bookmark controls.

## Acceptance criteria

- WHEN a student saves/removes a tutor, the system SHALL persist the desired boolean
  state under the authenticated account and show it only after acknowledgement.
- WHEN reloading, signing in again or using another device, the system SHALL load
  that student's favorites. Focus and visible-page polling refresh other-device edits.
- WHEN a read or write fails, the UI SHALL expose retry and disable further toggles
  until a successful read reconciles the server state. No localStorage fallback.
- WHEN a tutor/anonymous user or another student accesses favorites, the database
  SHALL prevent reading or mutating someone else's favorites.
- WHEN an offer is withdrawn, its favorite SHALL remain private but SHALL NOT
  expose the withdrawn offer. Republishing restores its appearance in eligible results.
- WHEN duplicate save/remove requests arrive, operations SHALL be idempotent.

## Design / ADR

Use a FavoritesRepository port with `list(): Promise<string[]>` and
`set(tutorId: string, saved: boolean): Promise<boolean>`, a Supabase Adapter and
an application hook. Keep this bounded feature separate from marketplace DTOs.
Errors carry a code and a safe user message. App wires existing view props.

New `student_favorites(student_id, tutor_id, created_at)` composite primary key,
foreign keys to private accounts and offers, owner/student-only SELECT RLS.
No direct browser writes. `set_student_favorite_v1(uuid, boolean)` derives identity
from auth.uid(), verifies role, serializes per-account writes and checks publication
before a new save. At most 500 favorites per student bounds reads/storage. Duplicate
saves still succeed at the limit. Withdrawal retains rows; removing remains allowed.
Last serialized desired state wins across devices; no toggle RPC or optimistic UI.

Rejected: legacy `saved_tutors` (old identity model), browser storage (not portable),
Realtime infrastructure for this small list (focus/30-second polling is sufficient).
No multi-tenant framework or new global store. Private account key remounts the hook.

Additive migration touches only a new table/function/policy and takes brief DDL
locks; no legacy data backfill. Rollback: revert app and revoke RPC; retain rows.
Hosted application uses the established user SQL Editor workflow.

## Tasks and validation

1. Verify hosted public settings and request real two-account participation.
2. Add failing PostgreSQL and controlled browser persistence/isolation/retry checks.
3. Implement migration, adapter, hook and existing button loading/error wiring.
4. Evaluate deterministic ranking with representative isolated scenarios, reporting
   rules tested separately from educational effectiveness (no weight tuning by guess).
5. Validate Vercel SPA config, documented environment/redirects and production build.
6. Record actual outcomes, activation boundaries and evidence in Markdown/Graphify.

Real account sign-in, hosted Storage and delivery need user sessions. No automatic
account creation, real tutor impersonation, deployment or production seed is part
of the local validation. Production URL is required to finalize hosted redirects.

## Bounded loading change

Load map/profile-heavy screen modules with React lazy/Suspense when navigated to,
using a light loading status inside the existing main area. Keep login and header
available immediately. This uses native component code splitting rather than a
manual vendor split or framework migration. Validate login and marketplace browser
flows and compare production entry size; the MapLibre SDK remains a deferred chunk.


## Verified outcome

Implemented and locally verified: 76 unit tests, TypeScript/build, disposable
PostgreSQL authorization/idempotency/limit checks and all four browser suites.
Browser persistence tests use an isolated controlled backend. User applied the
favorites migration through SQL Editor; remote table probe returns anonymous denial
401/42501. Actual hosted favorite writes and cross-device recovery await user results.
See the current session handoff for verification details and deployment boundaries.
