# Production readiness — bounded recovery

## Approved scope

Restore database migration sources, add continuous integration and validate the
restored hosted service. Preserve existing UI, Auth and database contracts.

- WHEN a clean checkout is obtained, reviewed historical migrations SHALL be present
  without local Supabase cache files, secrets or automatic hosted execution.
- WHEN a pull request or main push occurs, CI SHALL install locked dependencies and
  run TypeScript, unit tests, build and critical controlled-browser journeys.
- WHEN hosted checks run, they SHALL use designated demonstration accounts, preserve
  existing records and distinguish authenticated reads from completed transactions.
- WHEN changes are recovered, the report SHALL identify their historical revision,
  actual validation and unresolved external checks.
