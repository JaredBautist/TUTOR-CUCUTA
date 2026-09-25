# Google Maps and live location

Status: Approved for implementation by the user's "implementa ya, los cambios".
Requested: 2026-09-09. Scope: existing TutorCúcuta student and teacher interfaces.

## Privacy amendment — 2026-09-25

This amendment supersedes earlier requirements to display exact observations or
continuous tracking. The current MapLibre/OpenFreeMap implementation SHALL request
one browser observation, round latitude and longitude to two decimals before the
coordinates enter application state, and expand the displayed uncertainty radius to
cover both native accuracy and the privacy offset. Maps SHALL label this point as an
approximate zone. Manual origins and public tutor locations SHALL use the same
two-decimal precision. Exact device coordinates SHALL NOT be rendered, persisted or
published, and the application SHALL NOT use continuous `watchPosition` tracking.

## User requirements and current defect

Replace the existing map engine with the official Google Maps JavaScript API,
restore the interactive radius, show real location updates, and preserve the
surrounding interface. Remove no navigation, form, card, favorite or request flow.

The search slider changes local state and passes `radiusKm`, but
`UnifiedCucutaMap` ignores that prop and renders no radius circle. The current
engine pans a fixed 3-by-3 Esri image grid and supports only zoom levels 12–14.
Supabase reads omit tutor coordinates; there is no location subscription or
browser geolocation. A map provider replacement alone cannot supply live tutors.

## Acceptance criteria

| ID | EARS requirement | Verification |
| --- | --- | --- |
| GM-01 | WHEN any existing map mounts, the system SHALL render the official Google map inside the existing container, preserving dimensions, responsive layout, forms, cards, colors and navigation outside it. | Desktop/mobile comparison across all seven map placements. |
| GM-02 | WHEN the student changes the search radius from 1 to 15 km in 0.5 km steps, the system SHALL update the label and a geographically scaled circle whose final radius is exactly `radiusKm * 1000` meters. | Slider, keyboard, limits and reset integration regression. |
| GM-03 | WHEN either teacher radius slider changes, the system SHALL update its circle with the existing slider bounds and preserve the current profile-save semantics. | Dashboard 2–12 km and teacher profile 2–15 km. |
| GM-04 | WHEN radius changes, the system SHALL animate locally toward the latest radius, cancel superseded animation, and avoid map reconstruction or a remote call on every frame. | Rapid changes settle on the latest value using one map instance. |
| GM-05 | WHEN the user pans or zooms, the system SHALL support Google mouse/touch gestures; panning SHALL NOT silently change the search origin. Existing zoom, center and layer controls SHALL operate on the real map. | Mouse, keyboard, touch, street/satellite and recenter checks. |
| GM-06 | WHEN no real origin is available, the system SHALL show a clearly labeled Cúcuta reference center and reference circle, without calling that point the user's location. | No permission/no coordinates scenario. |
| GM-07 | WHEN the user activates the map's own-location control and grants permission, the system SHALL reduce the single device observation to a two-decimal approximate zone before displaying it. | Controlled position event and privacy-rounding regression. |
| GM-08 | WHEN permission is denied, positioning fails, the page or its map tab becomes hidden, tracking is stopped or the user leaves the view, the system SHALL show the appropriate state and release/pause the watcher without fabricating a position. | Permission/error/page and CSS-tab visibility/unmount lifecycle tests. |
| GM-09 | WHEN the student opens Mi Perfil and enables location, its existing map SHALL display only the student's approximate zone. Exact observations SHALL NOT enter application state, replace the saved address or be published. | Approximate-zone view and persistence/network inspection. |
| GM-10 | WHEN a valid real tutor location is received in Results, the system SHALL add/update its marker and preserve marker-to-card selection. Losing a position SHALL remove the marker; selection SHALL persist if its card remains eligible. Removing the tutor/card SHALL follow the existing next-card/empty-selection behavior. | Snapshot, insert, update, location loss, removal and selection tests. |
| GM-11 | WHEN the tutor-location feed connects, disconnects or recovers, the system SHALL distinguish those states, refresh its snapshot after recovery, and never claim live GPS from a static record. | Feed state and reconnection integration tests. |
| GM-12 | WHEN a position lacks valid geographic coordinates, the system SHALL omit its personal marker. Legacy SVG offsets, fixtures, generated scores and fabricated movement SHALL never become live location data. | Invalid/absent/legacy coordinate regressions. |
| GM-13 | WHEN the user requests reduced motion, the system SHALL apply radius/zone changes without decorative animation. Otherwise, marker movement SHALL interpolate only between approved approximate zones. | Reduced-motion and rapid-update tests. |
| GM-14 | WHEN Google credentials, network or SDK initialization fail, the system SHALL show a contained map error/retry state and preserve the usable surrounding interface. | Missing key, rejected key, load failure and retry tests. |
| GM-15 | WHEN Maps renders, the system SHALL leave Google's attribution and terms visible, use accessible named controls and avoid duplicate SDK loads/listeners. | Browser inspection and lifecycle checks. |
| GM-16 | WHEN the user applies an in-person search, the system SHALL apply the confirmed geographic radius to both cards and markers, include its boundary, and exclude tutors whose location is absent or outside it. Virtual tutoring SHALL NOT be excluded by radius. With modality any, a virtual offering remains eligible regardless of radius; an in-person-only offering needs a valid position in range. Distances SHALL be identified as straight-line distances, not travel times or recommendation scores. | Inside/boundary/outside/missing position tests for all three modalities. |
| GM-17 | WHEN the user presses Ver tutores, the system SHALL capture the visible approximate origin and radius for that search. Later observations SHALL NOT silently change that search area; the user's approximate zone remains a separate marker. | Search-to-Results origin snapshot and subsequent zone update. |
| GM-18 | WHEN a view has no radius contract, the system SHALL omit the search circle while retaining its location markers and controls. | Student profile, tutor detail and request detail map checks. |

## Adopted publication scope

**What “live tutors” means in Results:**

1. Recommended: the tutor's deliberately published, approximate teaching location,
   with database changes reflected immediately in the map. This follows the existing
   academic scope and does not imply the tutor is moving or online.
2. Expanded scope: the tutor's device location while the tutor explicitly shares it.
   This requires authenticated ownership, audience rules, precision, expiry and
   immediate revocation. It supersedes the prior exclusion of shared GPS tracking.

The implementation adopts option 1, the recommended published teaching-location
contract, following the user's instruction to proceed. Publication is restricted
to trusted server/admin writers until authenticated tutor ownership is implemented.
There are no automatic copies of existing private geometry and no browser GPS
uploads. The student's own local device display is separate from publication.

## Readiness boundaries

- Google Maps credentials are absent from the current `.env`. Real Google rendering
  requires Maps JavaScript API configuration; advanced markers require a map ID.
- Repository SQL contains geographic points but has open prototype RLS and no
  authenticated profile ownership or configured location publication. Hosted state
  has not been audited or modified.
- Real cross-device location verification requires authorized records, a deployed
  location contract, and a working subscription. Controlled SDK/feed tests are
  separate from that verification.
- The user has authorized implementation. Existing screen layouts remain fixed
  constraints. Google account configuration and applying hosted SQL remain external
  activation steps, not reasons to leave the local implementation unfinished.
