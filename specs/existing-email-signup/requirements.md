# Existing-email signup correction (P0 before mobile frontend)

Authorized bounded bug fix, 2026-09-29.

- WHEN Supabase reports an existing account explicitly or returns an obfuscated
  signup user with an empty identities array and no session, the adapter SHALL
  return `existing-account`, never `confirmation`.
- WHEN that outcome reaches the UI, it SHALL switch to login, preserve the email,
  clear the password and explain that the account already exists, with login,
  password recovery and Google entry available. It SHALL NOT announce email delivery.
- WHEN a real signup returns a nonempty identities array without a session, the UI
  SHALL explain confirmation instructions without claiming inbox delivery was proven.
- WHEN a signup produces a session, existing authenticated onboarding SHALL continue.
- WHEN the response is missing required data or fails, no success SHALL be announced.
- WHEN a submission is pending, duplicate submit events SHALL not issue another call.

## Design / decision

Use Supabase Auth as the authoritative uniqueness boundary; no public email lookup,
extra email registry, admin credential in the browser or automatic recovery email.
Extend AuthPort signup result with `existing-account`. Recognize both
`user_already_exists` and `email_exists`, and the no-session empty-identities response.
This is detection AFTER the native signup request, not a preflight database query.
Supabase handles confirmed duplicate signup without creating another account. The
screenshot alone does not prove an email was delivered. Read-only admin inspection
confirmed the reported account exists and is confirmed; no live signup/mail test made.
Unconfirmed registrations may legitimately receive another confirmation through
Supabase: preventing all such resends requires a separate server mail policy; do not
claim this client fix disables that behavior globally.

Reference: https://supabase.com/docs/reference/javascript/auth-signup

## Tasks

1. Add failing adapter and browser duplicate-response regressions.
2. Implement outcome classification and login guidance; guard in-flight submission.
3. Verify new signup, existing signup, malformed response and errors; run auth browser,
   unit, TypeScript and build checks. No production mail sent for testing.
4. Record results and Graphify memory. Mobile implementation remains queued behind this fix.

## Validation

- Adapter regressions: red before fix; all five pass after fix.
- Full unit suite: 95/95 passing.
- Controlled Auth browser suite: passing, including retained email, cleared password,
  login/recovery guidance and absence of the old confirmation message.
- Hosted validation: read-only account inspection only; no live registration/mail test.
- Mobile frontend implementation remains pending separately.

Validation completed: TypeScript (`npm run lint`) and production build passed.
The existing large-chunk build warning remains; no production deployment was performed.
