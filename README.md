# TutorCúcuta

A tutoring platform for students and tutors in the Cúcuta metropolitan area.
The academic scope is a geospatial, multicriteria, explainable recommendation
system. Prototype records have been removed. MapLibre GL JS + OpenFreeMap, animated search
radii, local device positioning and a published teaching-location feed are now
implemented. Google/email authentication, session restoration and private profile persistence are implemented. The private-account migration is applied and public permission probes passed; Google activation and real-account validation remain pending. The full recommendation workflow remains pending.

## Stack

React 19, TypeScript, Vite, Tailwind CSS, and Supabase/PostgreSQL with PostGIS.

## Local development

Use Node.js 22 and the dependencies recorded in `package-lock.json`.

```sh
npm ci
cp .env.example .env
npm run dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for Supabase Auth, profiles and the catalog.
Never put a service-role key in a browser environment variable. Access requires a configured Supabase client and an authenticated account.
The development server uses port 3000. Follow [authentication setup](docs/auth-and-profiles.md) to apply the private-account migration and configure Google and email redirects.

Maps load automatically without an API key or billing account. Visible maps request
native browser location permission and center on the first permitted position. Follow
[Maps and location setup](docs/maps-setup.md) for OpenFreeMap, the additive Supabase
migration, publication rules and verification.

## Project structure

| Path | Purpose |
| --- | --- |
| `src/App.tsx` | Screen navigation, selections, and shared local state |
| `src/components/views/` | Student and teacher screens |
| `src/components/common/` | Navigation and the shared MapLibre wrapper |
| `src/features/accounts/` | Account validation, session controller, Auth adapter and private profile repository |
| `src/features/maps/` | Geographic rules, location lifecycle, feed and provider adapters |
| `src/components/modals/` | Tutoring request form |
| `src/data/searchDefaults.ts` | Initial search preferences; no demo people |
| `src/utils/` | Data adapters, local storage, fixture identification, and contact formatting |
| `supabase/` | Schema migrations, reference-sector seed, and combined SQL |
| `specs/clean-views-real-data/` | Agreed cleanup requirements, design, tasks, and verification |
| `specs/google-maps-live-location/` | Original location contract and historical Google provider evidence |
| `tests/` | Behavioral regressions and isolated Chromium checks |

## Validation

```sh
npm test
npm run lint
npm run build
npm run test:browser
npm run test:maps:browser
npm run test:maps:db
npm run test:accounts:browser
npm run test:accounts:db
npm run verify:accounts # read-only account/provider activation check
npm run verify:location-feed # read-only check of the configured hosted feed
```

The browser check requires an existing `chromium` executable and an available
ports 4173/4174/4175. The map test renders the real MapLibre SDK and public OpenFreeMap
cartography; device/catalog/feed/Auth responses are controlled. It needs network
access and WebGL2 support. The database test uses an existing `postgres:15-alpine`
Docker image in a disposable isolated container and verifies the new migration's
actual permissions and constraints. No test modifies hosted records.

## Preview and deployment boundary

`npm run build` creates `dist/`; `npm run preview` serves the static build locally.
Configure the Vite environment variables before building a hosted preview.
Production rollout still requires Google provider activation, real-account validation, request participant authorization and recommendation validation.

Accounts have one immutable role. Both profile forms save private database records after authentication. Legacy device drafts are preserved but never claimed by a new account. Search/favorites remain within the active session. Request submission and teacher publication remain unavailable.

Both SQL initialization paths seed reference sectors only. The cleanup migration
removes the artificial default match score without deleting existing rows. These
files have not been executed against a hosted database as part of the UI cleanup.
