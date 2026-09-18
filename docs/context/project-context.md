# TutorCúcuta project context

Snapshot: 2026-09-12. Current code and the latest session handoff establish what is
implemented; historical prototype specs and old Graphify notes are not proof.

## Product scope

TutorCúcuta connects students and private tutors across Cúcuta, Villa del Rosario,
Los Patios, El Zulia, San Cayetano and Puerto Santander. The intended differentiator
is geospatial, multicriteria and explainable tutor selection. Basic/secondary,
university and adult education are supported; availability depends on actual offers.

The latest user-supplied academic document is the attachment
`15215c45-ddd6-42b2-9e17-a6e599a13c4c/pasted-text.txt` (2026-09-11 conversation).
It supersedes the broader original prototype scope. The user explicitly authorized
supporting PDF/JPG/PNG documents on tutor detail, without authenticity verification.
Original source documents remain untouched.

## Approved boundaries

1. Preserve the existing React/Vite interface, light profile styling, shared User
   icon placeholders, MapLibre/OpenFreeMap and interactive search-radius controls.
   Vercel deployment does not require a Next.js rewrite; no migration is authorized.
2. One immutable role per authenticated account; Google/email access and persistent
   private profiles. Publish a separate, deliberately shared tutor offer.
3. Tutor qualifications/experience are self-declared. Do not verify documents with
   universities, certify authenticity, show verification badges or score documents.
   Required caption: “Documento aportado por el tutor. Autenticidad no verificada”.
4. Use approximate teaching zones, not public exact homes or live movements. GPS is
   a one-shot, permission-based local aid. Only an explicitly selected, rounded zone
   can be published. Dynamic maps do not imply continuous personal tracking.
5. Apply mandatory subject, level, modality, schedule overlap, maximum budget and
   both participant search/tutor coverage radii before ranking. Virtual excludes
   distance. Rank by price, additional overlap and proximity with factual templates.
   No experience/verification bonus, generative AI, invented scores or market rates.
6. Requests support pending/accepted/rejected/cancelled states and participant-only
   access; contacts become available only on acceptance. Minors require declared
   guardian authorization/contact. The platform is not an institutional certifier.
7. Exclude payments, invoices, employment/institution hiring, chat/video, transport
   routes/real travel time, behavior tracking, grading analytics, ML and AI diagnosis.
8. No production mock people. Test fixtures remain isolated from real records.

## Architecture and current implementation

React 19 + TypeScript + Vite + Tailwind, Supabase Auth/PostgreSQL/Storage/Realtime,
MapLibre GL JS + OpenFreeMap. No new backend framework was introduced.

- `src/features/accounts/`: framework-independent validation/session use cases,
  Supabase Auth adapter, owner-only profile/photo Repository.
- `src/features/marketplace/`: domain DTOs and validation, request-refresh hook and
  Supabase Repository. Versioned RPCs own publication/request/document mutations.
- `src/features/favorites/`: private owner favorites Repository/Adapter and refresh hook;
  acknowledged saves/removals, no local fallback. Hosted migration applied and
  anonymous reads denied; real cross-device recovery awaits user validation.
- `src/features/recommender/domain/recommender.ts`: deterministic eligibility and
  ranking; explicit initial weights documented in `docs/cloud-marketplace.md`.
- `src/features/maps/`: geographic calculations, feed/device sessions and adapters.
- `src/components/marketplace/`: offer and document panels embedded in existing views.
- `src/App.tsx`: authenticated navigation and wiring; no local request delivery claims.

Private `user_accounts` are distinct from safe `tutor_offers`. Contacts stay in a
private table. `tutoring_requests` snapshots are exposed only through participant
RPCs which omit contact until accepted. Private document metadata/object policies
require owner access or an authenticated student viewing a published offer.
`tutor_offer_locations` supplies explicitly rounded teaching zones to the map feed.
Legacy catalogs/geometry/requests remain preserved and are not automatically imported.

## Operational truth

Google/email and the previous private-account migration are enabled. New marketplace
code and local checks are complete. The user applied its hosted migration in SQL
Editor; all five tables exist and deny anonymous reads (401/42501). Real hosted
authenticated Storage and cross-device delivery still need account validation. See [session handoff](session-handoff.md) and
[cloud marketplace contract](../cloud-marketplace.md) for exact validation and limits.
Never claim real delivery or hosted Storage authorization from a mocked browser test.

No hosted resets, seeds, messages, credential changes or Git publication are implicit
in normal code work. The current user-approved migration workflow is SQL Editor when
administrative access is unavailable. Record verified outcomes without secrets or
personal contact data in Markdown and local Graphify memory.

Favorites and release preparation: see [persistent favorites](../persistent-favorites.md),
[ranking evaluation](../recommender-evaluation.md) and [Vercel readiness](../vercel-readiness.md).
Technical scenario tests passed with unchanged ranking weights; no claim of academic
effectiveness or completed deployment. Existing visual identity is preserved.


## Live verification update — 2026-09-12

[Hosted account verification](../hosted-validation-2026-09-12.md) supersedes earlier
pending email/Storage/request/favorites checks: the agent tested both real accounts
with explicitly authorized fictional data, restored the original private profiles,
removed test favorites/documents, withdrew the offer and cancelled the request.
Only the cancelled request/private withdrawn draft remain as test history. No mocks
were added to source. Google OAuth consent, actual GPS/device and production checks
remain outside this evidence. Four UI/data presentation findings are documented
for a subsequent bounded correction; the existing UI was not modified by testing.


### Approved academic demonstration dataset — 2026-09-17

The user now explicitly authorizes eight persisted fictional demonstration identities
(four tutors/four students) with natural Colombian-style display names, administrative
demo metadata and documented provenance. This is a bounded exception for the delivery
dataset, not authorization to restore old inline mocks or present fictional credentials
as verified. `docs/delivery-accounts.md` defines the dataset and provisioning contract.
Implementation is prepared and locally validated; hosted creation is pending a
server-only administrative key and controlled +57 contact. No accounts were created
by this preparation. Existing real profiles and the visual design are preserved.
