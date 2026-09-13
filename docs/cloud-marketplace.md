# Cloud marketplace connection

Authorized: 2026-09-12, following the read-only review. Preserve React/Vite,
MapLibre/OpenFreeMap and the existing light interface. This contract records the
already authorized urgent integration, not a redesign.

## Acceptance criteria

- WHEN a tutor explicitly publishes a complete offer, students SHALL see its
  declared subjects, levels, modalities, weekly availability, price and approximate
  teaching zone. Saving a private profile alone SHALL NOT disclose it.
- WHEN an offer is withdrawn, it SHALL disappear from searches/maps and students
  SHALL lose document access. Existing participant requests SHALL remain readable.
- WHEN a student submits a request, the server SHALL derive identity, guardian
  authorization, price and contact from stored records, validate a future date and
  declared availability, and acknowledge persistence before the UI reports success.
- WHEN age is unknown or a minor lacks a named, authorized guardian with contact,
  the server SHALL reject the request. This records declared authorization, not
  identity certification or an institutional/legal verification workflow.
- WHEN a request is pending, contact SHALL be absent from responses. Only its
  tutor may accept/reject; only its student may cancel pending/accepted requests.
  Terminal states cannot be reopened. Accepted participants receive contact.
- WHEN a tutor uploads a PDF/JPEG/PNG of at most 5 MiB, bytes SHALL be stored in
  private Storage, metadata in PostgreSQL, with owner management and authenticated
  student access only while the offer is published. Revocation deletes metadata
  before bytes; already issued signed URLs expire within 60 seconds.
- WHEN writes/read fail, the UI SHALL preserve edits, expose retry/error and never
  fall back to localStorage or claim delivery. Legacy browser data is not imported.
- WHEN recommending, mandatory subject/level/modality/budget/weekly overlap and
  both in-person radii SHALL precede ranking. Virtual ignores distance. Price,
  proximity and overlap provide deterministic explanations; experience/documents
  SHALL NOT add points. Unknown in-person locations fail eligibility.

## Design and ADR

Repository/Adapter boundaries live in `src/features/marketplace/` (domain contracts,
application hooks, Supabase infrastructure). Existing views render the results.
Supabase transactional RPCs enforce mutations; RLS controls readable public offers,
participant request identities and Storage. Authenticated identity is `auth.uid()`.
There is no service key in the browser and no multi-tenant abstraction beyond
account/participant ownership. No additional backend/framework is needed.

New additive tables: `tutor_offers` (safe declared listing), `tutor_offer_contacts`
(private contact), `tutor_offer_locations` (rounded teaching point),
`tutoring_requests` (private snapshots/state), `tutor_documents` (private metadata).
Existing private profiles and legacy catalogs are preserved. The app uses the new
catalog, without silently republishing legacy records. RPC names are versioned `_v1`.

Publication snapshots saved profile facts; offer edits require explicit publication
again. Weekly slots use ISO weekday 1–7, local `HH:mm` in America/Bogota, same-day
intervals. Requests use an ISO timestamp and 0.5–3 hour duration. Date/time replaces
the old ambiguous weekday-only proposal. Concurrent overlapping accepted sessions
are rejected by the server under a tutor advisory lock. UUID submission keys make
retries idempotent. Pending requests are bounded per student and uploads per tutor.

The publication map rounds coordinates to 2 decimal places before sending and on
the server. Only an explicitly selected teaching-zone point is published; an
automatic GPS observation is not consent to publish. Exact addresses/GPS are not
copied into offers or requests. Contacts use international digits including country
code. Private profile photos may be read by students only through a published
offer, using short-lived signed URLs.

Ranking normalization: price 40%, overlap 30%, proximity 30% for in-person;
virtual redistributes weights over price/overlap (4:3). No selected schedule gives
neutral overlap and an explicit explanation. Without a budget, equal neutral price
avoids inventing market benchmarks. These are transparent initial product weights,
not experimentally validated teaching-quality estimates.

Rejected: reusing anonymous legacy writes (privacy gaps), browser-only persistence
(no cross-device delivery), publishing exact home/GPS points, new framework/backend,
and verification badges. Documents carry: “Documento aportado por el tutor.
Autenticidad no verificada”.

## Migration and validation tasks

1. Define DTOs and failing domain regressions for eligibility/guardian boundaries.
2. Add repeatable migration and isolated PostgreSQL authorization/state tests.
3. Connect offer/documents/request repositories and existing views; display only
   acknowledged outcomes. Refresh participant lists on focus/interval and after writes.
4. Run unit, TypeScript, production build, isolated DB and browser checks; repair
   obsolete browser fixtures for one-shot GPS, without weakening behavior assertions.
5. Update Markdown and Graphify with actual results and hosted activation status.

Additive migration takes brief DDL locks on new tables and Storage policies; no
records are deleted or backfilled. Reversal means reverting the app and revoking
new RPC/policies, retaining tables/objects for recovery; never drop user content as
an automatic rollback. Hosted SQL requires administrative access; the established
user SQL Editor workflow remains the fallback after local verification.

Hosted OAuth consent, real Storage service behavior and cross-device real-account
delivery require a final hosted check; isolated tests do not prove these.

## Storage reference

Private objects use Storage RLS and expiring signed URLs following the
[Supabase private bucket documentation](https://supabase.com/docs/guides/storage/buckets/fundamentals).
Metadata access is also checked; a known object path does not grant access.

## Verified outcome (2026-09-12)

Implemented and tested. The user applied the migration through SQL Editor
(“Success. No rows returned”). `npm run verify:marketplace` confirmed all five
new tables exist and reject anonymous reads (401/42501). Unit, TypeScript, build,
PostgreSQL authorization/lifecycle and controlled browser flows passed. See the
session handoff for exact checks and remaining real hosted account validation.
