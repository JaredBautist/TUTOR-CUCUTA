# Clean views and real-data readiness

Status: Mock-removal phase authorized by the user on 2026-09-09; implementation and verification completed for this phase.
Date: 2026-09-09

## Context

The current work repairs views and removes demo records. Removing demo tutors
exposed assumptions that a tutor always exists. The duplicated map footer has been repaired; empty-catalog rendering still needs correction. Existing specifications describe an earlier prototype
and do not establish that the current application is ready for real users.

Product reference: the user-provided document titled "Sistema de recomendación
geoespacial, multicriterio y explicable para la selección de tutores por estudiantes
en el Área Metropolitana de Cúcuta". Recommendations require eligibility checks
before ranking; distance does not affect virtual tutoring; explanations must be
supported by evaluated criteria. An unevaluated score is not a compatibility result.

## Objective and boundary

Deliver views that compile, tolerate missing data, preserve user-entered records,
and accurately represent the capabilities and data currently available. Preserve
the existing visual identity, screen organization, and responsive layout.

This feature is the first stage of readiness. Multi-user operation also requires
agreed authentication, authorization, persistence, and recommendation contracts.
Cleaning the interface alone does not establish those capabilities.

## Agreed first phase

The user requested removing all visible mock records, starting with student Results,
before continuing real-system development. This authorizes fixture filtering in
both cache and database adapters, neutral empty states, removal of fabricated UI
claims, safe seed cleanup, and the dependent absence-handling fixes. It does not
approve implementing authentication, remote onboarding, or the recommendation engine.
Remote request actions remain unavailable until participant identity is connected.
Local profile drafts and favorites remain usable and are described as local.

## Acceptance criteria

| ID | Requirement | Verification |
| --- | --- | --- |
| CV-01 | WHEN the application is checked and built, it SHALL have valid JSX and compatible component props. | Type check and production build. |
| CV-02 | WHEN tutor or request collections are empty, the application SHALL render navigable empty states without accessing missing entities or creating demo entities. | Empty-cache and empty-response render scenarios. |
| CV-03 | WHEN an entity is not selected or no current tutor identity is available, the application SHALL show an appropriate unavailable state and SHALL NOT treat an unrelated catalog tutor as the current account. | Student and teacher navigation with missing selections. |
| CV-04 | WHEN names, photos, contact details, credentials, availability, scores, or geographic results are absent, the interface SHALL use neutral empty states or omit the relevant element instead of inventing values. | Review every view with incomplete records. |
| CV-05 | WHEN a count or verification badge is displayed, it SHALL be derived from the relevant available records and verification state. | Empty, unverified, and populated view scenarios. |
| CV-06 | WHEN no valid authorized contact is available, the application SHALL provide no actionable telephone or WhatsApp link; links SHALL never use a demo fallback number. | Contact-link assertions before and after acceptance. |
| CV-07 | WHEN a data operation fails, the application SHALL report failure and preserve the user's input; it SHALL NOT announce remote success, notification delivery, or synchronization without confirmation. | Rejected read/write scenarios. |
| CV-08 | WHEN local-only state is saved, the interface SHALL describe that result accurately; WHEN remote capabilities are unavailable, related actions SHALL communicate their unavailable state. | Missing configuration, missing identity, and local-save scenarios. |
| CV-09 | WHEN a profile, selection, or booking input changes, dependent views SHALL use the current values; favorites SHALL have one shared source of truth. | Profile update, favorite toggle, and reopened booking scenarios. |
| CV-10 | WHEN geographic data is absent, the map SHALL remain usable without invented user locations, tutor pins, distances, or travel times; WHEN valid locations exist, only supplied locations SHALL be represented. | Empty map and supplied-location scenarios. |
| CV-11 | WHEN a new database is initialized from the seed files, it SHALL receive reference sectors but no demo people or tutoring requests. | Inspect both SQL entry paths and compare their seed content. |
| CV-12 | WHEN existing browser data is read, the application SHALL preserve user-entered records and SHALL NOT identify demo content solely by a person's name. | Same-name real-user and existing-record scenarios. |

## Data preservation

- Editing repository seed files does not authorize executing SQL against a database.
- Do not delete hosted records or reset databases as part of this feature.
- Do not clear browser storage wholesale. Before any removal of old fixtures,
  identify exact provenance and preserve user-edited or ambiguous records.
- Keep genuine reference information, including subjects, educational options,
  municipalities, and sectors. Instructional placeholders are not saved records.
- Preserve the user's academic document and existing source specifications.

## Readiness dependencies

The following require separate approved contracts before claiming real-user readiness:

1. Authenticated user identity, onboarding, role association, and real sign-out.
2. RLS restricted to participants, protected contact access, and guardian authorization.
3. Complete profile/request persistence with UUIDs, participant IDs, explicit errors,
   and persisted schedule semantics.
4. Eligibility, ranking, geospatial inputs, and explanations matching the academic scope.
5. Integration tests against PostgreSQL/RLS and critical browser-flow validation.

Payments, billing, live chat, video calls, GPS tracking, automated document
verification, and machine learning remain outside the academic MVP.
