# TutorCúcuta project context

Snapshot: 2026-09-10. This document separates the intended academic product from
the behavior currently implemented. Recheck the source and latest handoff before
making changes.

## Source order and project boundaries

1. The user's latest instructions establish the authorized work and constraints.
2. Current source and current validation establish implemented behavior.
3. Current approved feature specifications establish the contract for changes.
4. The supplied academic reference establishes the intended MVP and its limits.
5. Historical prototype specifications explain earlier work; they are not proof
   of current functionality.

Read [the session handoff](session-handoff.md), [the README](../../README.md), and
the active feature requirements before implementing behavior. The completed
[mock-removal specification](../../specs/clean-views-real-data/requirements.md)
supersedes conflicting prototype assumptions. The older
[`specs/spec.md`](../../specs/spec.md), [`specs/design.md`](../../specs/design.md),
and [`specs/tasks.md`](../../specs/tasks.md) still describe demo people, simulated
authentication, and a removed prototype scoring function. Preserve those original
documents as historical context; do not restore their mocks or interpret their
completed task boxes as current release readiness.

This workspace is TutorCúcuta. Do not infer that instructions for another local
project authorize changes here or elsewhere.

## Intended academic product

TutorCúcuta is a platform for identifying private tutors compatible with the needs
of basic/secondary students, university students, and adults in the Cúcuta
metropolitan area. The academic scope covers San José de Cúcuta, Villa del Rosario,
Los Patios, El Zulia, San Cayetano, and Puerto Santander.

The intended differentiator is a rule-based, geospatial, multicriteria, explainable
recommender. Its agreed conceptual sequence is:

1. Receive the student's or guardian's tutoring requirements.
2. Exclude tutors who fail mandatory subject, educational-level, schedule, or
   modality conditions.
3. Evaluate approximate distance for in-person tutoring only.
4. Rank eligible candidates using defined criteria such as price, approximate
   distance, experience, and manually reviewed profile documentation.
5. Explain recommendations using the facts and conditions actually evaluated.
6. Leave the selection decision to the student or guardian.

A high score cannot compensate for failing a mandatory condition. Distance must
not affect virtual tutoring. Scoring weights require a separate agreed design and
evaluation; the academic reference does not establish final weights. Explanations
use rules and templates, without requiring generative AI. A compatibility score
does not certify teaching quality or identify an objectively best tutor.

Tutors may register the subjects they offer. The MVP does not guarantee availability
for every subject. DBA learning references are optional for basic/secondary
education and are not standards for university students or adults. Academic support
does not include taking examinations or producing academic work on another person's
behalf.

The original academic scope uses approximate locations and minimizes personal data.
It excludes publishing exact home addresses and continuous shared GPS tracking.
A minor's request must be associated
with guardian authorization or accompaniment. A manually reviewed-document badge
is not a professional certification.

Payments, invoicing, video calls, live chat, GPS tracking, employment placement,
automatic document verification, machine learning, and generative explanations are
outside this academic MVP.

### Academic provenance

The user supplied a document titled “Sistema de recomendación geoespacial,
multicriterio y explicable para la selección de tutores por estudiantes en el Área
Metropolitana de Cúcuta”. Its original local attachment is:

```text
/home/balckyshadown/.codex/attachments/7301f527-7594-4341-99fd-5e188163e619/pasted-text.txt
```

This is a derived summary of that document, especially sections 1 and 4. The original
attachment is preserved. Its educational statistics and external references have
not been independently refreshed for this context setup and must not be presented
as current measurements.

## Current implementation

The application is a React 19, TypeScript, Vite, and Tailwind client SPA. Supabase
client adapters and PostgreSQL/PostGIS schema files exist. This is not a Next.js or
NestJS application; changing frameworks is not part of the approved work.

| Location | Current responsibility |
| --- | --- |
| `src/App.tsx` | Screen navigation, selections, catalog loading, and shared local state |
| `src/types.ts` | Application data and explicit missing-value contracts |
| `src/components/views/` | Student and teacher screens |
| `src/components/common/` | Responsive navigation and shared MapLibre wrapper |
| `src/features/maps/` | Geographic rules, local device lifecycle, public feed and provider adapters |
| `src/components/modals/` | Tutoring request form and unavailable submission state |
| `src/utils/storage.ts` | Browser persistence for existing local records and drafts |
| `src/utils/supabase.ts` | Explicit read outcomes and database-to-application mapping |
| `src/utils/demoRecords.ts` | Exact retired-fixture identities and synthetic-metadata filtering |
| `src/utils/contact.ts` | Available contact normalization and validation |
| `src/data/searchDefaults.ts` | Initial search preferences, without demo people |
| `supabase/` | Schema migrations, reference-sector seed, and combined initialization SQL |
| `tests/` | Behavioral regressions and isolated Chromium scenarios |

The authorized first phase removed visible mocks while preserving the visual
identity and genuine data. Known fixtures are hidden by exact reserved IDs in local
and remote reads. Names alone never identify a fixture. Browser payloads, legacy
keys, and hosted records are preserved. Missing values are omitted or shown as
neutral empty states instead of fabricated profiles, photos, availability,
percentages, locations, distances, contacts, or delivery claims.

Catalog text search, ordering and favorites operate inside the authenticated account
session. Google/email signup and login, PKCE callbacks, email confirmation/recovery,
restored sessions, logout and private profile/photo persistence are implemented.
Each account has one immutable role; catalog tutors are never impersonated as the
current account. A new private `user_accounts` table supports incomplete profiles,
optimistic versions and owner-only RLS. Legacy drafts remain untouched and are not
automatically imported. See [the account contract](../auth-and-profiles.md).

The user applied the account migration in SQL Editor. Hosted read-only probes now
confirm that private accounts and legacy emails deny public access (42501), while
public tutor display reads remain available (200). Google is still disabled. Local
SQL/browser checks do not establish hosted activation, email delivery or Google consent.
Request delivery and teacher publication remain unavailable. The applied modality/radius filters real geographic points; academic
eligibility and ranking remain pending. MapLibre + OpenFreeMap renders the published
points and optional own-device position. Legacy SVG offsets are not real locations.
Geographic filtering is not a PostGIS recommendation or route service.

Both SQL initialization paths now seed reference sectors only. A forward migration
removes the artificial default request score without deleting or rewriting existing
rows. The cleanup did not execute SQL against a hosted database.

## Validation and remaining development

The [cleanup verification record](../../specs/clean-views-real-data/verification.md)
records 14 passing behavioral tests, TypeScript checks including unused-symbol
checks, a passing production build, and isolated Chromium desktop/mobile checks.
The build retained an existing large-chunk warning. Controlled browser catalog
responses do not establish hosted PostgreSQL/RLS behavior, authentication, or real
account/request persistence.

The next work is Google provider activation and real-account validation,
then contracts for request participants, guardian/contact authorization, scheduling,
eligibility/ranking and deliberate teacher publication. Local implementation alone
does not make the system ready for real-user production use.

## Working conventions

Use Spec-Driven Development: EARS-style acceptance criteria first, design and
interfaces second, dependency-ordered testable tasks third, implementation last.
Define and agree on behavior before meaningful code changes. Explain architectural
choices and record an ADR when viable options require a decision. Avoid introducing
frameworks or abstractions without a concrete need.

Preserve existing UI and genuine user data. Do not reintroduce mocks as fallbacks,
clear browser storage wholesale, execute hosted SQL, or claim remote success without
evidence. Write meaningful failing regressions before bug fixes, then run checks
appropriate to the actual change. Keep business/data logic out of presentation
where a service or adapter boundary is warranted.

Conversation follows the user's Spanish; code, comments, and technical documents
default to English. Context notes must distinguish intended behavior, implemented
behavior, recorded checks, and checks performed in the current session. Never write
secrets or real user records into project memory.

## Implemented map evolution and activation boundary

The user approved replacing Google Maps with MapLibre + OpenFreeMap on 2026-09-10.
The shared engine now uses Liberty/Dark vector styles without keys or billing,
preserving all seven map placements, animated geographic circles, automatic browser permission for local
geolocation and the public teaching-location feed. See `docs/maps-setup.md` and
`session-handoff.md` for current setup and verification. Google-specific setup and
evidence in `specs/google-maps-live-location/` are historical; their provider-neutral
location and publication contracts still apply.

Local own-device display is distinct from publishing coordinates. The academic
exclusion of shared GPS remains the baseline. Results uses deliberately published
approximate teaching locations, with changes received through Supabase Realtime.
The projection permits trusted admin/server writes only and never copies legacy
geometry. Student observations stay in session memory. Self-service publication
requires future identity/consent/audience/revocation contracts. After the user SQL
Editor step, `npm run verify:location-feed` passed against the configured project:
public snapshot and Realtime subscription work, with 0 published teaching points.
Actual update/withdrawal delivery with genuine records remains untested.
Authentication is implemented and the private-account migration is applied. Google activation, real-account validation and the full multicriteria recommender remain pending.

The user explicitly requested implementation and Graphify memory for already-agreed
bounded changes, without creating another specification for every edit. Reuse the
existing contract for this provider replacement; define new behavior when its
contract is actually missing. Save verified outcomes and corrections in Graphify.
