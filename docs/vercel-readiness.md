# Vercel release readiness

Prepared 2026-09-12. React/Vite remains the application framework. No deployment or
hosted Auth setting was changed by this preparation.

## Build and routing

`vercel.json` declares Vite, `npm run build`, `dist`, and the existing SPA fallback
to `/index.html`. Run `npm ci`, `npm run lint`, `npm test`, `npm run build`.
Map/profile screens load on navigation using React lazy/Suspense. Login stays eager;
large MapLibre runtime/worker chunks remain deferred rather than hidden by a higher
warning threshold. Actual production latency depends on the device and network.

## Environment and authentication

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the intended Vercel environment
before building. These two variables are intentionally public. Never put service-role
keys, private OAuth secrets or admin tokens in VITE_ variables. MapLibre/OpenFreeMap
needs no API key; Gemini/APP_URL are not used by this app and were removed from the
previous malformed `.env.example`. Existing `.env` is untouched.

The Auth adapter redirects Google/signup to `window.location.origin + '/'` and
password recovery to `origin + '/?auth=recovery'`. For the actual production origin:

1. Set Supabase Authentication > URL Configuration > Site URL to the HTTPS origin.
2. Allow its exact root and recovery URLs. Only add preview URLs you intend to use;
   do not enable an unrestricted wildcard for all Vercel projects.
3. Keep Google's provider callback at the Supabase `/auth/v1/callback` URL shown by
   its dashboard. The app's origin is a separate post-login redirect.
4. Verify Google consent, email confirmation and recovery on the deployed origin.
   Local `supabase/config.toml` edits do not modify hosted dashboard settings.

Local configuration now allows HTTP localhost and 127.0.0.1 root/recovery URLs at
port 3000; the old HTTPS-only extra redirect did not match local Vite.

## Hosted acceptance checklist

- Existing account and marketplace migrations are remotely present; public probes
  confirm anonymous denial, not authenticated end-to-end behavior.
- Apply only `supabase/migrations/20260912010000_student_favorites.sql` in SQL Editor
  after local validation. Do not rerun `full_schema_and_seed.sql` on the existing DB.
- Run `npm run verify:accounts`, `npm run verify:marketplace`, `npm run verify:favorites`.
- In separate student/tutor browser sessions: publish a complete offer, upload/view
  a shareable document, request an available future slot, accept, inspect contact,
  cancel and verify contact is hidden again. Withdraw the document and verify access.
- Save a favorite, reload, sign out/in and use another device; the same account must
  retain it and another account must not receive it. Remove and refocus the first
  browser; changes refresh on focus or within 30 seconds while visible.

Remaining external inputs: actual production domain and hosted two-account test
results. Do not label the release validated until those checks are reported.

## Primary references

- [Vercel Vite SPA routing](https://vercel.com/docs/frameworks/frontend/vite)
- [Supabase redirect allowlist and production URLs](https://supabase.com/docs/guides/auth/redirect-urls)
