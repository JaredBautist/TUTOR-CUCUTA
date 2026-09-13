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

## Current Supabase publication (2026-09-12)

Apply `supabase/migrations/20260912000000_cloud_marketplace.sql` after the existing
account migration. The app now uses `tutor_offer_locations` tied to authenticated
`tutor_offers`, not the legacy `tutor_map_locations` catalog. Both old tables and
records are preserved. The user applied this migration and remote table protection checks passed; see the
[session handoff](context/session-handoff.md).

Tutor publication uses an explicit selected teaching zone and rounds to two decimals
before transmission and on the server. Native GPS observations are local and never
implicitly published. Withdrawing or switching an offer to virtual-only removes its
map point. Authorized student sessions read points and receive Realtime invalidation;
no movement is tracked or shared. Request/offer mutations use versioned RPCs.

Native geolocation uses `getCurrentPosition`, requires a secure context/browser
permission, and may be denied. A stale observation is labeled as last observed,
not live. Manual map selection remains available; virtual results ignore distance.

Validation: `npm run test:maps:browser` exercises real cartography/worker/slider and
controlled feed/native permission scenarios. `npm run test:marketplace:db` covers
publication rounding/withdrawal/authorization in PostgreSQL. Use
`npm run verify:marketplace` for read-only remote availability/anonymous denial;
real authenticated feed delivery still needs a hosted account check.

The older `verify:location-feed` script now reads the protected offer feed and cannot
prove it anonymously. Use the signed-in app plus the marketplace checks instead.
