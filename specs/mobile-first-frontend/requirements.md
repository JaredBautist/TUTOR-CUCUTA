# Mobile-first frontend — Requirements

Status: implemented; local automated checks passed and Production deployment confirmed
on 2026-10-04. Complete hosted journeys and physical-device validation remain pending;
see [release evidence](../../docs/pilot-readiness-2026-10-04.md).
Requested: 2026-09-29. Owner: TutorCúcuta engineering.

## Objective and scope

Improve search-to-request completion for a predominantly mobile audience while
preserving the existing light visual identity, React/Vite stack, Google/email Auth,
Supabase contracts, participant privacy and approximate maps. Cover both student
and tutor portals: authentication, profiles, offers, search/results, documents,
favorites and requests. This specification authorizes no production data changes.

## Existing baseline

- Weekly schedules are published but result cards summarize only the first slot.
- RequestTutorModal uses manual date/time inputs and durations from 1 to 3 hours
  in half-hour steps. Keep that UI duration range in this iteration.
- Only the subject is passed from search into the request form. The request API
  accepts a note, not a structured focalTopic.
- Main/profile/map chunks trigger build size warnings. A warning alone is not a
  measurement of mobile experience; collect a reproducible baseline first.
- Prior landing-page mobile checks do not cover authenticated production screens.

## Acceptance criteria (EARS)

| ID | Requirement | Verification |
| --- | --- | --- |
| MF-01 | WHEN a user opens availability from a card or profile, the system SHALL expose all declared weekly slots in chronological order, labeled as Colombia time, using an accessible expand/collapse control. | Multiple days/slots; keyboard and touch; missing schedule. |
| MF-02 | WHEN a date and duration are selected, the system SHALL derive proposed start times from published weekly intervals in America/Bogota, exclude past starts and dates beyond 180 days, and require the entire duration to fit a single interval. | Fixed clock; boundary, midnight and different device timezone tests. |
| MF-03 | WHEN proposed times are shown, the system SHALL describe them as declared availability subject to tutor confirmation; it SHALL NOT claim a slot is unoccupied or reserved. | Copy and conflict response tests. |
| MF-04 | WHEN duration/date changes invalidate a selected time, the system SHALL clear that selection, explain why and prevent submission until a valid selection exists. | Interaction regression. |
| MF-05 | WHEN publication changes or the server rejects a schedule, the system SHALL show the error, retain editable input and offer a refresh/reselection path without silently retrying writes. | Unavailable offer and conflict cases. |
| MF-06 | WHEN the request form opens from a search, the system SHALL prefill eligible subject/modality and combine non-empty specificTopic/studentNote into an editable message; WHEN reopened after closing, it SHALL initialize from the current search. | Empty context, invalid subject, changed tutor and repeated opening. |
| MF-07 | WHEN the composed note exceeds 2000 characters, the system SHALL show the full editable content and a limit error, block submission and avoid silently truncating user text. | Boundary tests; server note limit preserved. |
| MF-08 | WHEN a submission outcome is uncertain, the system SHALL preserve its identifier and prevent a changed payload from being retried under the same identifier; checking My Requests SHALL remain available. | Lost acknowledgement and rapid double tap tests. |
| MF-09 | WHEN content loads or a mutation runs, the system SHALL distinguish loading, empty, failed and confirmed states; expose pending state accessibly and announce success only after acknowledgement. | Slow network, read/write failures and retries. |
| MF-10 | WHEN used at 320, 360, 390, 430, 768 and 1280 CSS-pixel widths, all core screens SHALL remain usable without page-level horizontal overflow or clipped primary controls. | Screenshot matrix; long Spanish names and large text. |
| MF-11 | WHEN a mobile keyboard or safe-area inset reduces the viewport, the focused field, validation message and submit action SHALL remain reachable by scrolling; sticky actions and bottom navigation SHALL NOT obscure content. | Android Chrome and iOS Safari physical-device checks. |
| MF-12 | WHEN used by touch, primary actions, icon buttons, tabs and map controls SHALL provide at least 44 by 44 CSS-pixel activation areas without overlapping adjacent targets. | Measured hit boxes and touch interactions. |
| MF-13 | WHEN a dialog opens, focus SHALL enter it, remain inside while open and return to its trigger on close; fields SHALL have labels and errors associated with them. WHEN idle, Escape SHALL close the dialog. | Keyboard, accessible names, screen-reader check. |
| MF-14 | WHEN an operation is in flight, the system SHALL explain temporary close/submit restrictions and SHALL NOT strand keyboard focus; after completion or failure normal dismissal SHALL return. | Pending/error dialog lifecycle. |
| MF-15 | WHEN text is enlarged to 200 percent or reduced motion is enabled, core content SHALL remain readable and usable; essential information SHALL NOT depend on animation, color or hover. | Zoom/reflow and reduced-motion checks; contrast audit. |
| MF-16 | WHEN the mobile map tab is hidden, map assets SHALL NOT be loaded solely for that hidden view; WHEN first opened, it SHALL load on demand, preserve search context and respect denied location permission. | Cold network trace; tab round trips; permission denial. |
| MF-17 | WHEN the mobile result list returns from a tutor profile, filters, selected tab, search text and list position SHALL be restored within the same account session. Account changes SHALL discard that state. | Back navigation and account-switch test. |
| MF-18 | WHEN images load, dimensions/aspect ratios SHALL reserve space; offscreen images SHALL load lazily where appropriate and failed photos SHALL retain a meaningful fallback. | Slow image and broken image checks. |
| MF-19 | WHEN release performance is measured, the team SHALL record reproducible before/after mobile traces, initial JS bytes and map-loading cost against the budgets in design.md, and SHALL report any unmet target explicitly. | Three cold runs per scenario; same build conditions. |
| MF-20 | WHEN validated for release, student and tutor core journeys SHALL pass at desktop and mobile sizes against an isolated test backend, followed by an authorized hosted smoke test. Mocked checks SHALL NOT be reported as hosted evidence. | Test matrix and evidence ledger. |

## Explicit exclusions and limits

No framework migration, new visual theme, offline writes, payments, notifications,
new chat, live GPS or new recommendation weights. Declared weekly availability is
not a shared free/busy calendar. Exact-address disclosure and cross-account private
calendar reads are prohibited. The guardian requirement stays unchanged. Structured
request-topic persistence would require a separate versioned server contract; this
iteration uses the existing note. Google authentication is already implemented.
