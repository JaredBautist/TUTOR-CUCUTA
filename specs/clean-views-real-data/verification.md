# Mock-removal verification

Date: 2026-09-09.
Scope: the authorized first phase of removing visible demo records and claims.

## Evidence

| Check | Result |
| --- | --- |
| Pre-fix regressions | Six failures reproduced: SQL fixture IDs leaked through cache, same-name real records were hidden, empty App crashed, teacher defaults were fictitious, empty remote responses restored old cache, and SQL seeded people. |
| `npm test` | 14 behavioral tests pass. |
| `npm run lint -- --noUnusedLocals --noUnusedParameters` | Passes. |
| `npm run build` | Passes; existing large-chunk warning remains (approximately 610 kB before gzip). |
| `npm run test:browser` | Desktop and 390-pixel mobile scenarios pass in isolated Chromium. |
| Source/seed review | No visible fixture identities, stock-person images, fixed match percentages, invented locations/routes, demo contact links, or simulated delivery messages remain. |

The browser check covers an old three-tutor seed cache with an empty remote response,
a real same-name tutor, shared favorites, an editable local student draft, teacher
navigation without an identity, unavailable request submission, the empty mobile
map, and recovery after a failed read. No uncaught browser exceptions or horizontal
mobile overflow were observed. Desktop and mobile screenshots were inspected.

Contact tests exercise both teacher views with pending, rejected, and accepted
requests and valid, absent, invalid, or unauthorized guardian phone values. Map
tests distinguish geographic coordinates from the prototype's arbitrary SVG offsets.

## Data and readiness boundaries

- Existing browser payloads and legacy keys are preserved. Known fixture identities
  are hidden on read; names alone never identify a fixture.
- Supabase initialization files now seed reference sectors only. A forward migration
  removes the artificial default request score. No hosted SQL or data deletion ran.
- Remote catalog responses in tests are controlled. These checks do not establish
  PostgreSQL/RLS behavior, real authentication, or real account/request persistence.
- Search preferences are stored but not applied by an eligibility/ranking engine.
  Catalog text search, ordering, and favorites remain functional.
- Role navigation explores views. Authentication, participant authorization, real
  request delivery, profile publication, and the recommender require the next spec.
