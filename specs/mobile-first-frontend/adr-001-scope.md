# ADR-001: Mobile improvements within the existing frontend contracts

Status: accepted and implemented locally. Date: 2026-09-29.

## Context

Most expected users arrive by mobile. Weekly schedules and authenticated persistence
exist; the booking form does not help choose a compatible time or carry search notes.
Private schedules of other students must remain inaccessible.

## Options and decision

| Decision | Chosen approach | Considered and rejected for this scope |
| --- | --- | --- |
| Architecture | Extend React/Vite feature hooks and pure domain functions. | Next.js rewrite: unrelated to the observed mobile friction. |
| Schedule selection | Derive proposals from declared weekly slots; server validates. | Shared live free/busy calendar: needs a new privacy and reservation contract. |
| Topic continuity | Prefill the existing editable note field. | Add a structured server topic now: requires versioned backend changes. |
| Results continuity | Session-only state under authenticated account identity. | Persist private form/search content in browser storage by default. |
| Mobile experience | Progressive changes preserving visual identity. | Independent mobile application or new theme: duplicates scope and maintenance. |
| Dialog accessibility | Native modal dialog with focus restoration. | Custom focus trap: duplicates browser inertness and keyboard behavior. |
| Performance | Measure critical path and defer unused map assets. | Raising chunk-warning thresholds: changes reporting without improving load. |

## Consequences

No schema migration or new authentication implementation is required. Proposed times
may still conflict at acceptance; the UI must communicate that limitation. Structured
topic analytics and reservations remain future work. Physical-device and deployment
checks are necessary even when automated viewport tests pass.
