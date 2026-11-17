# Validation — 2026-11-17

- Recovered ten historical Supabase source files from `56b3b31^`, preserving exact
  contents. Narrowed root ignore rule; nested ignore still excludes local caches.
- Added GitHub Actions quality and browser jobs. No hosted credentials are needed.
  Quality runs TypeScript/unit/build and disposable PostgreSQL account/marketplace
  suites; browser runs controlled auth/clean-view/marketplace suites with Chromium.
- Local tests: 105/105 unit cases passed, TypeScript and production build passed.
  Existing large-chunk warning remains.
- Disposable PostgreSQL suites passed: repeatable migrations, owner isolation,
  immutable roles, favorites, publication, contacts, approximate zones, guardian
  enforcement, idempotency, transitions, schedule conflicts and document withdrawal.
- Real hosted read-only verification passed: eight demonstration account sign-ins,
  exact profiles, four published offers, six recommendation inclusion/exclusion
  scenarios and factual reasons. Sessions signed out; no business records changed.
- The hosted verification is API-based, not a new UI request/accept/cancel journey.
  The complete transaction is covered locally; hosted writes and physical-device
  acceptance remain pending. No emails, invitations, new profiles or migrations sent.
- CI YAML has been prepared locally; GitHub execution and required branch checks
  cannot be claimed until publication and a successful workflow run.

No application behavior changed in this work. Existing uncommitted booking-message
correction was preserved. Historical seed assets must never be run in production.
