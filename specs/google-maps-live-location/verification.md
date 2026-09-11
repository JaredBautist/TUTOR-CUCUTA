# Google Maps implementation verification

Session: 2026-09-09. Implementation authorized by “implementa ya, los cambios”,
continued by “sigue”. Scope: official Google Maps inside the existing UI, animated
radius, own-device observation and deliberately published approximate tutor points.

## Executed checks

| Check | Result and scope |
| --- | --- |
| `npm test` | 42 passing behavioral tests, including all 14 previous cleanup/contact regressions. |
| `npm run lint` | Passed TypeScript compilation checks. |
| `tsc --noEmit --noUnusedLocals --noUnusedParameters` | Passed. |
| `npm run build` | Passed; existing bundle-size warning remains (largest JS chunk approximately 632 kB before gzip). |
| `npm run test:browser` | Passed existing desktop/mobile empty views, genuine same-name records, local drafts, shared favorites, unavailable submission and read-error/retry checks. Maps configuration is explicitly absent in this harness. |
| `npm run test:maps:browser` | Passed controlled SDK/feed/device integration in actual Chromium, including radius/keyboard/reset, rapid animation, new tutor/point updates and withdrawal, card selection, applied-origin stability, own profile, teacher slider bounds, hidden mobile tabs, reduced motion and permission denial. No uncaught exceptions or horizontal page overflow. |
| `npm run test:maps:db` | Passed actual PostgreSQL 15 migration reapplication, initially empty table, publication membership, browser SELECT/write denial, trusted writes, precision/bounds/FK constraints, server timestamps, withdrawal and tutor-deletion cascade. Disposable Docker container removed afterward. |

## Acceptance coverage

- GM-01/05/15/18: all seven call sites use the shared adapter. Browser checks cover
  reachable student search/results/profile and teacher dashboard/profile flows.
  Adapter tests cover no-radius detail maps, selection, explicit origin clicks and
  cleanup. Existing detail/contact rendering regressions remain intact. Native
  Google gestures, attribution and real cartography require the keyed service check.
- GM-02/03/04/13: exact kilometer-to-meter values, existing slider bounds, latest
  radius wins, interpolation only between received positions, reduced-motion snap,
  one map instance per mounted container, and marker removal/lifecycle checks.
- GM-06/07/08/09: clearly labeled city reference; explicit positioning, accuracy,
  invalid observations, denial/timeout/staleness, discarded old callbacks, hidden
  tab pauses/resumption and stop/unmount cleanup. Exact observations never entered
  browser persistence or Supabase writes in controlled browser checks.
- GM-10/11/12: validated public DTOs, concurrent invalidation reconciliation,
  reconnect snapshot, missing configuration/read failure, publication insertion,
  new catalog tutor discovery, movement and removal. No legacy geometry copying,
  seed people or fabricated live movement.
- GM-16/17: in-range/boundary/outside/missing points, virtual and any-modality
  exemption, same cards/markers filter, and stable applied Search-to-Results origin.
- GM-14: missing configuration, SDK load coalescing, failed-script cleanup/retry,
  late-script callback isolation and authorization rejection, including cached SDK
  retry refusing to falsely report readiness.

## Regressions found and repaired

Failing behavior was reproduced before fixes: the original radius produced no
Google circle; a native animation callback lost its Window receiver; invalid first
device observations could leave positioning pending; newly published tutors were
missing from a previously fetched catalog; and rejected/late SDK loads could make
retries report an invalid ready state. Unit or real-browser regression coverage now
exercises each repaired path. Test-harness document-reload races were fixed without
suppressing application runtime exceptions.

Desktop/mobile screenshots were captured and inspected for existing layout and
contained missing-configuration behavior. Controlled map screenshots validate the
surrounding UI only; their test canvas is not Google's cartography.

## External checks not performed

The existing `.env` has no Google Maps key or map ID. No real Google SDK, map
attribution, mouse/touch cartography, permitted physical-device movement, hosted
Supabase RLS/JWT, or authorized two-browser hosted publication was verified.
No hosted SQL, private location publication, Cloud setting or billing change ran.

The database test bootstraps minimal tutor/role prerequisites and applies the new
migration in PostgreSQL 15. It does not validate the full legacy PostGIS schema or
the configured Supabase PostgreSQL 17 environment. The public projection's tested
permissions do not repair pre-existing open prototype policies.

Follow [the activation guide](../../docs/google-maps-setup.md) for the two Google
variables, migration application, approved teaching-point publication and the real
service verification sequence. Authentication, self-service teacher publication,
request persistence and full eligibility/ranking remain separate future work.
