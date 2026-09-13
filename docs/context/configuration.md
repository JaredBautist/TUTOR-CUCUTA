# Configuration context

Snapshot: 2026-09-12. This is a reviewed summary, not a copy of environment secrets.

## Supabase local configuration

Source: `supabase/config.toml` (upstream Graphify detection does not natively include
this TOML file in the present corpus; verify the source when changing configuration).

The local project ID is `tutorc_cuta`. API access is configured on port 54321,
PostgreSQL on 54322 with major version 17, shadow DB on 54320, Studio on 54323,
and the local mail viewer on 54324. API TLS is disabled in this local configuration.
Migrations and the reference-sector `seed.sql` are enabled. These configuration
values are not evidence that the local stack is running or that hosted SQL was applied.

The frontend adapter currently accepts an HTTPS Supabase URL. Consequently, the
local HTTP CLI endpoint is not automatically interchangeable with a configured
hosted catalog. This boundary needs an explicit local-development contract later;
Graphify setup does not change it.

## Frontend build and environment

`package.json` defines Vite development on port 3000, production build, TypeScript
checking, Node behavioral tests, and the isolated Chromium test command.
`vite.config.ts` enables React and Tailwind plugins, the `@` project-root alias,
and the existing DISABLE_HMR environment switch.

`tsconfig.json` targets ES2022 with bundler resolution and react-jsx. It does not
turn on strict mode. `src/index.css` imports Tailwind. No separate custom stylesheet
or replacement framework was introduced during cleanup or memory installation.

`src/vite-env.d.ts` declares VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
legacy GEMINI_API_KEY and APP_URL type declarations (unused). Environment
values and all `.env*` files are deliberately excluded from saved context.
A declaration for a provider key is not evidence that an AI feature is implemented.

## Reference and generated SQL

`supabase/migrations/20260908000000_init_tutorcucuta_postgis.sql` defines the schema
and prototype geospatial functions/policies. `20260909000000_remove_mock_match_default.sql`
removes the artificial default request score. The combined `full_schema_and_seed.sql`
also includes `20260910000000_published_tutor_map_locations.sql` before `seed.sql`.
These paths are indexed as source SQL;
the combined file is a convenience entry point rather than an additional database.

The shared map uses MapLibre GL JS 6.9 with OpenFreeMap Liberty/Dark styles.
No Google key, map ID, account or billing setting is used. The actual `.env` was
preserved. Vite bundles the worker with `?worker&url` before `setWorkerUrl()`;
MapLibre CSS is imported in `src/main.tsx`. The canvas keeps explicit absolute
positioning to avoid the SDK's unlayered CSS collapsing the existing container.
See `docs/maps-setup.md` for current setup and publication boundaries.

`test:maps:browser` uses real MapLibre/OpenFreeMap with controlled device/feed
observations on port 4174. `test:maps:db`
uses an existing PostgreSQL 15 Docker image in a disposable offline container;
this is distinct from the configured Supabase PostgreSQL 17 stack. No hosted
migration was applied. Actual markers require validated geographic coordinates;
arbitrary legacy SVG offsets are not treated as real locations.


## Current favorites / release preparation

The initializer also includes private accounts, cloud marketplace and
`20260912010000_student_favorites.sql` before the reference seed. User-applied
hosted account/marketplace/favorites migrations and anonymous protection checks
supersede the historical no-hosted-migration statement above; see session handoff.

Vercel explicitly uses Vite, build command `npm run build`, output `dist` and the
existing `/index.html` SPA fallback. Map/profile screens load on demand. The actual
production domain and hosted redirect configuration still need verification.
Local TOML permits HTTP localhost and 127.0.0.1 root/recovery URLs on port 3000.
The repaired environment example lists only public Supabase configuration;
real environment contents are excluded. See `docs/vercel-readiness.md`.
