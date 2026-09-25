# Google Maps integration design

Status: Approved for implementation; published approximate teaching locations selected.

Current privacy amendment: MapLibre/OpenFreeMap replaced the proposed Google engine.
Browser positioning uses a single `getCurrentPosition` reading and converts it to a
two-decimal zone at the infrastructure boundary. Exact coordinates never reach React
state or the map adapter. The uncertainty circle includes native accuracy plus the
distance introduced by rounding. This supersedes the continuous `watchPosition` and
exact session-coordinate language in the historical design below.

## Existing integration boundaries

| View | Current map height | Required connection |
| --- | --- | --- |
| StudentSearchView | 280 / 340 / 380 px | Existing radius, explicit reference/device search origin. |
| StudentResultsView | 300 / 380 / 420 px | Same search origin/radius, filtered real tutor markers, selection and feed status. |
| StudentProfileEditView | 260 / 300 px | Explicit own-device mode and consented session position. |
| TutorProfileView | 240 / 280 px | Selected tutor's authorized published location. |
| TeacherDashboardView | 280 / 340 / 380 px | Existing radius around explicit origin; student markers only with authorized coordinates. |
| TeacherProfileEditView | 280 / 340 / 380 px | Existing service-radius preview and own-device control; no false remote save. |
| TeacherRequestDetailView | 240 / 280 px | Only the location that an actual authorized request supplies. |

Retain `UnifiedCucutaMap` as a compatibility boundary. Changes to its callers are
limited to data wiring and truthful map-related labels. Preserve columns, tabs,
cards, slider styles, forms, favorites and screen navigation. The map interior
uses Google's cartography and the existing teal/slate visual language for controls,
radius fill and selection. Loading, permission and feed status remain inside it.

## Feature layout and responsibilities

```text
src/features/maps/
  domain/                  # Geographic validation, units, bounds, motion policy.
  application/             # Typed location/feed ports and orchestration hooks.
  infrastructure/          # Google Maps, browser Geolocation and Supabase adapters.
src/components/common/UnifiedCucutaMap.tsx  # Presentation and compatibility wrapper.
specs/google-maps-live-location/           # Contract, design, tasks and evidence.
```

These boundaries contain the implemented contracts and adapters; there are no
empty abstraction folders. Domain code imports no React, Google or Supabase.

**Adapter** isolates Google's imperative map lifecycle and browser positioning.
**Repository** isolates authorized tutor-location reads/subscriptions from views.
**Observer** is the subscription callback contract for position/feed changes.
No global state library, CQRS infrastructure or application framework migration.

## Contract sketch

```ts
interface GeographicPosition {
  latitude: number;
  longitude: number;
}

interface DevicePosition {
  position: GeographicPosition;
  accuracyMeters: number;
  observedAt: string;
}

type SearchOrigin =
  | { kind: 'reference'; position: GeographicPosition; label: string }
  | { kind: 'device'; observation: DevicePosition }
  | { kind: 'selected'; position: GeographicPosition; label: string };

interface PublishedTutorLocation {
  tutorId: string;
  position: GeographicPosition;
  precision: 'approximate';
  updatedAt: string;
}

type LocationFeedStatus =
  | 'connecting' | 'connected' | 'reconnecting' | 'unavailable';

interface TutorLocationRepository {
  read(): Promise<PublishedTutorLocation[]>;
  subscribe(onInvalidation: () => void,
    onStatus: (status: LocationFeedStatus) => void): () => void;
}
```

Validate finite longitude/latitude and SDK-supported bounds, timestamps and
non-negative accuracy at adapter boundaries. Use typed map/position/feed errors.
Database DTOs map explicitly to these contracts; never pass raw PostGIS geometry,
contact records or Google objects through domain/UI data structures. Shared GPS,
if selected, requires a separate observation/consent contract before implementing it.

## Operation sequence

1. Lazily load one official Maps SDK and required maps/marker libraries. Create one
   map per visible container; release markers/listeners/animations on unmount.
2. Set an explicit origin. The initial city reference is not a personal observation.
   Only maps receiving a radius render `google.maps.Circle`, expressed in meters;
   own-profile and detail maps do not receive an invented radius.
3. Update the existing circle when the slider changes. Animate for approximately
   200 ms, cancel superseded frames and snap to the exact final radius. Keep network
   queries out of this animation. Preserve the user's viewport during ordinary updates.
4. Own-location action requests browser permission through `getCurrentPosition`.
   The infrastructure adapter rounds the observation to two decimals before emitting
   it and increases the uncertainty radius by the rounding displacement. Never expose
   the raw coordinate or promise GPS-level accuracy. Cancel late callbacks on hidden
   views, opt-out or unmount and request a new one-shot observation only when an active
   map explicitly starts again. On Ver tutores, capture the approximate origin/radius
   for Search-to-Results navigation without persisting device observations. Changing
   the search area requires applying criteria again.
5. Read the authorized location snapshot, subscribe, then reconcile after connection
   to close the subscribe/snapshot race. Coalesce invalidations, prevent stale reads
   from overwriting newer reads, and re-read after recovery. Update marker instances
   by tutor ID; selected markers remain linked to existing cards. Loss of coordinates
   removes only a marker if its card is still eligible. If a card leaves the filtered
   catalog, retain the existing first-remaining-card or empty selection behavior.
   Refresh catalog metadata after authoritative location snapshots to discover newly
   published tutor identities. Cancel outdated catalog reads and perform refreshes
   without replacing the mounted Results map with a loading screen.
6. Apply the same geographic inclusion function to cards and markers after applying
   criteria. In-person candidates need valid positions within or on the radius.
   Virtual candidates bypass distance, including those in an any-modality search;
   in-person-only candidates still need valid in-range positions. The search origin
   may be the explicitly labeled city reference. Circle preview does not fabricate
   a personal origin, a match score or travel time. Keep academic eligibility/scoring
   separate; a missing or disconnected feed has a visible state.

## ADR-01: Official Google SDK within the existing UI

| Option | Assessment |
| --- | --- |
| Official Maps JavaScript API with thin adapter | Selected: real gestures, geographic circles and advanced markers; preserves React UI. |
| Google iframe/embed | Rejected: insufficient control over live markers, radius and card selection. |
| Continue the manual Esri tile grid | Rejected: restricted navigation and duplicate map-engine work; does not meet the requested provider. |
| Replace the app with another map/template framework | Rejected: unnecessary migration and conflicts with the fixed interface. |

Load via Google's documented loader approach. Use a map ID for advanced markers;
keep map-level custom overlays outside Google's attribution area. No drawing,
Places, Routes, geocoding or billing-dependent add-on is assumed merely to draw a
circle. Document any dependency additions before installation.

## ADR-02: Own-device display versus location publication

Local own-device observation is implementable without a Supabase write. It does not
prove account identity or a saved home address. For Results, the recommended feed
contains deliberately published approximate teaching locations only.

Do not expose existing `tutors.geom` automatically: neither stored coordinates nor
an open prototype SELECT policy establish publication consent. No new publicly
readable exact-GPS column, open broadcast or anonymous position write is allowed.

The publication design must establish authenticated ownership, allowed audiences,
approved precision, visibility/revocation and server timestamps first. Review old
table/RPC read paths as well as the new projection; a safe projection cannot protect
coordinates still readable through another path. Existing profiles are not bound
to `auth.users`. These dependencies need their own approved implementation tasks.

For a small authorized projection, Postgres Changes plus re-read invalidations is
simpler than a custom broadcaster. Private Broadcast is the preferred alternative
for shared GPS or larger audiences, with channel authorization. Neither approach
is enabled by the local `[realtime] enabled = true` setting alone. No migration or
hosted deployment is included before the ownership/publication contract is agreed.

### Implementation decision: restricted publication projection

Use `public.tutor_map_locations` as a deliberately public, approximate projection:
`tutor_id` references an existing tutor; latitude/longitude have three decimal
places; `updated_at` is server-maintained. Only trusted server/admin processes can
insert/update/delete. Browser roles can read the projection and its Realtime events,
but cannot publish or copy private points into it. No seed locations are inserted.
Delete a row to withdraw publication. Existing catalog reads remain separate.

This makes the read-only feed concrete without inventing authenticated ownership.
The legacy schema's open profile/geometry paths are still an existing security
limitation, not repaired by this projection; no new private coordinates are stored.
Future self-service publication requires the pending auth/RLS contract. The SQL
migration is additive and provided for review/application; no hosted SQL is run.

## Google configuration and real verification

Environment names:

```dotenv
VITE_GOOGLE_MAPS_API_KEY=
VITE_GOOGLE_MAPS_MAP_ID=
```

Use a project-owned standard API key for production, enable Maps JavaScript API,
configure billing and restrict the browser key to intended HTTP referrers and APIs.
The browser key is visible in the frontend bundle by design; restrictions matter.
Do not paste it into chat or commit `.env`. Google's demo options are for prototypes
and cannot establish production readiness. Real-device location requires a secure
context and browser permission. No Cloud account or billing changes are automatic.

Sources checked for this proposal:

- [Google SDK loading](https://developers.google.com/maps/documentation/javascript/load-maps-js-api)
- [Google project/key setup](https://developers.google.com/maps/documentation/javascript/get-api-key)
- [Advanced markers and map IDs](https://developers.google.com/maps/documentation/javascript/advanced-markers/start)
- [Circle API](https://developers.google.com/maps/documentation/javascript/reference/polygon#Circle)
- [Marker animation](https://developers.google.com/maps/documentation/javascript/examples/advanced-markers-animation)
- [Browser one-shot position](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition)
- [Supabase database subscriptions](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes)

## QA and limits

Write a failing behavioral regression for radius propagation before changing the
implementation. Keep current no-fixture/contact-access tests. Adapt Google marker
assertions from server markup to adapter/browser behavior, retaining their meaning.
Run unit/integration checks and `npm test`, TypeScript checks, production build and
critical desktop/mobile browser flows after implementation. Controlled SDK/feed
tests verify our integration logic; independently verify a real keyed map, permitted
device movement and an authorized two-client location update before claiming live
service completion. No synthetic marker motion is acceptable in the product.
