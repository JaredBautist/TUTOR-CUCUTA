# Mobile-first frontend — Design and contracts

Status: accepted and implemented locally on 2026-09-30. See validation.md for evidence and release limits.

## Architecture and proposed locations

Keep domain <- application <- infrastructure/interface dependencies. Extend existing
features rather than introduce another global state manager or backend.

```text
src/features/marketplace/domain/bookingSlots.ts       # pure interval selection
src/features/marketplace/application/bookingContext.ts # search-to-note mapping
src/components/marketplace/WeeklyAvailability.tsx     # shared schedule presentation
src/components/modals/RequestTutorModal.tsx           # proposed-slot selection
src/features/recommender/application/                 # session-only results state
src/components/common/                               # existing dialog/status primitives
specs/mobile-first-frontend/                          # contract and evidence
```

These paths are implemented. Results continuity lives in `resultsSession.ts` and the
account-owned ref passed to StudentResultsView. Use the existing
Repository/Adapter boundary for persistence. Pure functions own slot selection and
message composition; JSX renders their results. Keep results state in the existing
authenticated account container or a feature hook, resetting with account identity.
No Redux/Zustand or global event bus is justified by this scope.

## Contracts

```ts
interface BookingSlotQuery {
  slots: readonly WeeklySlot[];
  date: string;                 // YYYY-MM-DD, interpreted in America/Bogota
  durationMinutes: 60 | 90 | 120 | 150 | 180;
  nowIso: string;               // injected clock; never inferred inside domain rules
}
interface ProposedBookingSlot {
  startsAt: string;             // ISO with Colombia offset
  endsAt: string;
  label: string;                // Colombia local time
}
type SlotSelectionResult =
  | { ok: true; slots: ProposedBookingSlot[] }
  | { ok: false; code: 'INVALID_DATE' | 'INVALID_DURATION' | 'INVALID_SCHEDULE' };
interface BookingSearchContext {
  subject: string;
  modality: 'presencial' | 'virtual' | 'any';
  specificTopic: string;
  studentNote: string;
}
interface ComposedBookingNote {
  text: string;
  exceedsLimit: boolean;
}
```

Use the existing WeeklySlot type. Validate external values before running pure
calculations. Do not mutate published intervals. Generate starts every 30 minutes
anchored at each interval's declared start, remove duplicate starts, order them and
keep only complete sessions. Example: 08:15–10:15 with 60-minute duration yields
08:15, 08:45 and 09:15. Keep only starts strictly after now and no later than now
plus 180 days; reject cross-midnight intervals as the publication contract does.
A valid date with no qualifying intervals returns an empty list, not an error.

Never use the browser's local timezone to interpret Colombia wall-clock input.
Inject the current clock to make date boundaries reproducible. The server remains
responsible for identity, current publication, schedule validation and acceptance
conflicts. Client-generated options are proposals, not locked appointments.

Compose the message as `Tema: <specificTopic>` followed by a blank line and the
student note, omitting empty sections. Initialize once per opened form; do not
append repeatedly during rerenders or overwrite manual edits. An unsupported subject
requires selection; an unsupported modality remains unselected. For `any`, choose
the offer's first declared modality and show it explicitly for user confirmation.
Map the editable composed message into the existing RequestInput.note. No API shape
or SQL migration is required. Never log note content in performance/error telemetry.

## Interaction and mobile layout

- Cards retain their existing hierarchy, teal palette and light surfaces. Add a
  compact accessible schedule disclosure with all slots and Colombia timezone.
- A native date control plus duration control drives a keyboard-accessible list of
  proposed times. Avoid an oversized custom calendar and horizontal time carousels.
- Use full-width, scrollable booking presentation on small screens; account for
  dynamic viewport height and safe areas. Keep sticky elements only when they leave
  enough reading space with the keyboard open; otherwise use in-flow actions.
- Field text should be at least 16 CSS pixels on mobile to avoid input zoom behavior.
  Labels, hint text and focus outlines remain readable without hover.
- Use semantic buttons and headings, persistent visible labels, aria-expanded on
  disclosures and polite status announcements. Associate invalid fields with errors.
- Cover lists, private documents, photos, profile forms and teacher offer editing,
  not only the student search. PDF viewing must retain a usable close control.
- Defer map import/initialization until the visible map is requested. A hidden map
  does not trigger a new permission prompt. Avoid duplicate map instances/listeners.

## Performance measurement and budgets

Measure the production build, not Vite development. Record tool/browser versions,
build revision, viewport 390x844, cold cache, network 1.6 Mbps down/750 Kbps up with
150 ms latency and 4x CPU slowdown. Use three runs and report the median for public
login, authenticated Results list and opening the map. Use isolated seeded fixtures
for repeatability and a separate authorized hosted smoke test for real latency.

| Metric | Proposed acceptance target |
| --- | --- |
| Login cold-load LCP | <= 2.5 seconds in the stated lab profile |
| Login/list CLS | <= 0.1 |
| Login initial JS, compressed transfer | <= 200 KiB, excluding deferred map assets |
| Hidden mobile map | Zero MapLibre SDK/worker/tile requests attributable to it |
| UI reaction to filter, tab and slot interactions | <= 200 ms p75 over at least 20 recorded interactions per scenario in the lab profile |
| Field monitoring when representative traffic exists | Track p75 LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1 separately from lab results |

These are project targets, not current measured achievements. Lab interaction timing
is not a substitute for field INP. Compare authenticated load against its baseline;
record payload/network bottlenecks rather than hide chunk warnings. Keep real-user
telemetry optional until a provider, sampling and redaction policy are chosen.

## Failure, privacy and rollback

Preserve form input on network failure. Mutation uncertainty keeps the same request
identifier; changed payload requires explicitly starting a new attempt after checking
existing requests. Do not implement automatic write retries or offline queues.
Hide exact device coordinates from state and telemetry; preserve rounding at the
adapter. No new reads of other users' private requests for availability calculation.
Roll back the affected UI commit if regression occurs; no data transformation or
migration rollback is necessary for this frontend-only scope.

## Implementation notes — 2026-09-30

- Native `dialog.showModal()` supplies modal inertness and keyboard containment.
  Layout cleanup closes it and restores the triggering control; idle Escape closes.
- An account-owned attempt ref survives closing/reopening the request form. A failed
  response retains id/signature; changed input cannot reuse that id. The user can
  inspect My Requests and explicitly declare that no request exists before resetting.
- Map component import is deferred in mobile Results. Once opened, its instance stays
  mounted across tab switches; the existing visibility hook pauses hidden updates.
  MapLibre CSS now loads with the SDK rather than with public login.
- Lazy account views reduce initial JS; shared ProfileImage reserves dimensions and
  replaces failed avatars with an accessible User icon. No persistence API changed.
