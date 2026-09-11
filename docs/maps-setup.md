# MapLibre + OpenFreeMap and published teaching locations

The shared map uses MapLibre GL JS 6.9 and OpenFreeMap in all seven existing map
placements. No API key, Google account, map ID or billing configuration is needed.
The existing forms, navigation, cards, map containers and controls are preserved.

## Map configuration

Run `npm ci` and `npm run dev`, or `npm run build` and `npm run preview`.
The engine loads lazily when a map becomes visible. Vite bundles the MapLibre v6
worker through `?worker&url`; plain `?url` would omit its imported shared module in
production. WebGL2 and network access to `tiles.openfreemap.org` are required.

The layer button switches between Liberty streets and Dark vector cartography.
The app retains required OpenFreeMap/OpenMapTiles/OpenStreetMap attribution.
The public service currently needs no account or key; it provides no SLA. Hosting
policies may change. The map engine can be retained if a different tile service is
needed later. No satellite imagery or routing service is introduced.

Sources: [MapLibre Vite installation](https://maplibre.org/maplibre-gl-js/docs/),
[OpenFreeMap quick start](https://openfreemap.org/quick_start/),
[OpenFreeMap public service](https://openfreemap.org/).

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
  Opening a visible map automatically requests native browser location permission.
  After permission is granted, its first fix centers the map. The circle uses
  geographic meters, animates to the latest value, and respects reduced motion.
- “Ver tutores” captures that origin/radius. In-person cards and markers use the
  same radius; virtual offerings bypass distance. Distances are approximate straight
  lines, with no travel-time, schedule, ranking or match-score claims.
- In Resultados, published point changes update markers and card eligibility.
  A later own-device observation does not move the applied search circle.
- In Mi Perfil, location is requested automatically when its map becomes visible.
  It stays in session memory, never replaces a saved address, and is never uploaded
  to Supabase. Hidden views pause the watcher; leaving or stopping releases it.

Geolocation requires browser permission and a secure context (HTTPS or localhost).
The browser may reuse a previous grant or denial instead of showing another prompt.
Automatic start occurs once per mounted map; stopping or denying prevents automatic
retries in that map. The location button provides an explicit retry. Tracking pauses
when hidden. The typed home address is preserved: a current GPS observation is not
a verified residence or an automatically geocoded address.
A desktop may return a coarse network location; the app displays observed accuracy.

```sh
npm test
npm run lint
npm run build
npm run test:browser
npm run test:maps:browser
npm run test:maps:db
```

Browser checks require existing Chromium and ports 4173/4174. The map suite uses
the real MapLibre SDK and OpenFreeMap vector features; device and catalog/feed
fixtures are confined to tests. It verifies radius animation and keyboard input,
style changes, selection, published point changes/removal, local geolocation,
mobile visibility, reduced motion and absence of Google Maps requests. The database test requires Docker and an
already installed `postgres:15-alpine` image. It creates and removes an isolated
container without host ports, network access, or hosted database connections.

After hosted feed activation, verify permitted real-device movement and a trusted
publication update/withdrawal observed by two browser sessions. Physical touch and
real permission/GPS checks remain distinct from controlled browser observations.
The hosted migration was activated through the user SQL Editor step after the
provider migration. Public reads and a Realtime subscription were verified on
2026-09-10 with 0 published teaching points. The full
geospatial, multicriteria, explainable recommender remains a separate pending
feature; map rendering and radius filtering do not implement its ranking logic.

## Verify the configured hosted feed

After the user SQL Editor step, `npm run verify:location-feed` passed on 2026-09-10
with 0 published points. Run it again when checking the configured project. This read-only command uses
the existing public browser configuration, validates the snapshot, joins Realtime
and reads again. It prints counts/status only, never coordinates or credentials.
An empty connected feed is valid; genuine teaching points must be deliberately
published by their authorized administrator. The check does not insert mock tutors
or claim to verify delivery of actual updates between two users.
