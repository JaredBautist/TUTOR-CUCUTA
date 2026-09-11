# Activate Google Maps and published teaching locations

> Historical guide: superseded by [MapLibre + OpenFreeMap](maps-setup.md) on
> 2026-09-10. Google keys, map IDs and billing are no longer used by this app.

The official Maps JavaScript adapter is implemented in all seven existing map
placements. This guide covers external configuration; it does not deploy SQL,
create a Google Cloud account, enable billing, or publish a person's location.

## Google configuration

1. In the intended Google Cloud project, enable Maps JavaScript API and configure
   billing. Create a browser API key restricted to Maps JavaScript API and the
   actual website HTTP referrers. Include the localhost development origin when
   needed. The loader uses origin-only referrers; avoid path-specific restrictions.
2. Create a JavaScript map ID for that project. Advanced markers require it.
3. Add these values to your existing, ignored `.env`, preserving its other values:

   ```dotenv
   VITE_GOOGLE_MAPS_API_KEY=your_project_browser_key
   VITE_GOOGLE_MAPS_MAP_ID=your_javascript_map_id
   ```

4. Restart `npm run dev`. For a hosted build, configure the same build-time
   variables in the hosting environment and rebuild with `npm run build`.

Browser Maps keys are visible in the frontend by design; API and referrer
restrictions are required. Never use a Supabase service-role key in a `VITE_`
variable. Never commit `.env` or paste credentials into context documents.

Without configuration the map shows a contained configuration state, preserving
the surrounding screen. Network failures have a retry action. After a Google
authorization failure, correct the Cloud settings and reload the page: reusing
the rejected SDK does not restore authorization.

Sources: [Google project/key setup](https://developers.google.com/maps/documentation/javascript/get-api-key),
[SDK loading and referrers](https://developers.google.com/maps/documentation/javascript/load-maps-js-api),
[advanced markers and map IDs](https://developers.google.com/maps/documentation/javascript/advanced-markers/start).

## Supabase publication

For an existing database, review and apply only the additive migration
[`20260910000000_published_tutor_map_locations.sql`](../supabase/migrations/20260910000000_published_tutor_map_locations.sql)
through your normal migration process. Do not rerun the combined initialization
file against an existing database as a substitute for migration management.

The migration creates `public.tutor_map_locations`, enables RLS, and adds it to an
existing `supabase_realtime` publication. It inserts no locations and copies no
legacy `tutors.geom`. Its primary key also indexes the tutor foreign key.

| Column | Publication contract |
| --- | --- |
| `tutor_id` | An existing, genuine `public.tutors.id`. |
| `latitude`, `longitude` | An intentionally published teaching point, rounded by the authorized publisher to three decimal places. More precise input is rejected, not silently rounded. |
| `precision` | `approximate`. |
| `updated_at` | Server-maintained on every insert/update. |

Only a trusted administrator/backend may insert, update or delete these rows.
Browser `anon` and `authenticated` roles can read this public projection but cannot
write. A location must be intentionally approved for public teaching use; rounding
alone does not establish consent or make a private address safe to publish.
Delete its row to withdraw a point. Deleting the tutor also removes its point.

The app reconciles a snapshot after the subscription joins and after each change
or reconnection. It refreshes catalog metadata in the background so newly published
tutors appear without rebuilding the active map. Disconnection withdraws markers
and displays the feed state. A published point says where teaching is offered;
it does not establish that a tutor is currently online or moving.

The old prototype profile/geometry policies remain a separate auth/RLS issue.
This new public projection does not secure legacy read paths. Self-service teacher
publication remains unavailable until authenticated ownership is implemented.

Source: [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes).

## Use and verification

- In Buscar Tutores, change the existing radius or select a point on the map.
  “Usar mi ubicación” starts browser positioning explicitly. The circle uses
  geographic meters, animates to the latest value, and respects reduced motion.
- “Ver tutores” captures that origin/radius. In-person cards and markers use the
  same radius; virtual offerings bypass distance. Distances are approximate straight
  lines, with no travel-time, schedule, ranking or match-score claims.
- In Resultados, published point changes update markers and card eligibility.
  A later own-device observation does not move the applied search circle.
- In Mi Perfil, activate location to see the device observation and accuracy.
  It stays in session memory, never replaces a saved address, and is never uploaded
  to Supabase. Hidden views pause the watcher; leaving or stopping releases it.

Geolocation requires browser permission and a secure context (HTTPS or localhost).
A desktop may return a coarse network location; the app displays observed accuracy.

```sh
npm test
npm run lint
npm run build
npm run test:browser
npm run test:maps:browser
npm run test:maps:db
```

Browser checks require existing Chromium and ports 4173/4174. Their SDK, device and
catalog fixtures are confined to tests. The database test requires Docker and an
already installed `postgres:15-alpine` image. It creates and removes an isolated
container without host ports, network access, or hosted database connections.

After external activation, verify actual Google cartography/attribution, mouse and
touch gestures, street/satellite controls, permitted device movement, and a trusted
publication update/withdrawal observed by two browser sessions. These real-service
checks are distinct from the automated controlled tests.
