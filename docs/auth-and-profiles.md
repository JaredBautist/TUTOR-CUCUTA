# Authentication and persistent profiles

## Agreed behavior

User-authorized on 2026-09-10: Google OAuth or email/password registration and sign-in,
persistent sessions, database-backed student/teacher profiles and one role per account.
Preserve the current React/Vite UI, light profile previews, avatars and maps.

- WHEN no valid session exists, the application SHALL show the access screen.
- WHEN registering with email, it SHALL handle required email confirmation honestly.
- WHEN signing in with Google, it SHALL use Supabase OAuth with PKCE and a fixed same-origin callback.
- WHEN a valid stored session exists, it SHALL restore the account without registering again.
- WHEN an account is initialized, its role SHALL be chosen once and immutable to browser updates.
- WHEN a profile is saved, success SHALL follow an acknowledged database write; errors retain edits.
- WHEN accounts change or sign out, old profile responses and private UI state SHALL be discarded.
- WHEN authenticated, users SHALL read/write only their own private account/profile and photo objects.
- WHEN old device drafts exist, they SHALL remain intact without automatically attaching them to an account.
- WHEN saving a teacher profile, it SHALL remain private until a separate publication contract is implemented.

Email/password recovery is included so existing users do not need duplicate accounts.
Favorites/search preferences live within the signed-in account session and reset on logout; tutor publication,
request mutations and multicriteria ranking are separate work.

## Design and contracts

Use an Auth Adapter around Supabase Auth; a profile Repository around a new private
`user_accounts` table; a framework-independent session controller owns async identity
changes. React hooks subscribe to it; existing views receive account state/actions.
Avoid adding a server framework or duplicating Supabase password/token handling.

`user_accounts`: `id` references `auth.users`, immutable `role`, validated JSON profile,
private avatar path or HTTPS avatar URL, monotonic version and server timestamps.
The JSON profile preserves incomplete drafts without inventing age, credentials,
rate or geometry. Student and teacher payloads have separate allowlists and validation.
The authenticated email comes from Auth and is not editable as an unverified profile field.
Optimistic version checks prevent a stale browser tab silently overwriting newer saves.

An authenticated account is distinct from the existing public tutor catalog. This
avoids auto-publication and preserves legacy records without claiming ownership by
email, selected role or the first catalog row. Existing public catalog reads retain
only tutor display columns; legacy student/contact/request reads and the precise-
geometry SECURITY DEFINER search RPC are revoked from browser roles. New own-account
RLS and column grants prevent changing identity, role, timestamps or version directly.

Photos use a private `profile-avatars` Storage bucket with user-ID-prefixed paths;
own reads use expiring signed URLs. Existing image upload/URL controls are retained.
Only JPEG/PNG/WebP uploads up to 5 MiB and HTTPS image URLs are accepted. External URLs
remain user-selected references; the backend does not fetch them.

ADR: a new private account table was chosen over forcing incomplete editable drafts
into the legacy public profiles/tutors schema, whose required geometry and public
contact columns are incompatible with secure account onboarding. Publication later
maps deliberately approved teaching data into the public catalog/projection.

Auth errors use stable codes and Spanish messages. Missing migration/provider,
confirmation required, invalid credentials, rate limits, conflicts and offline reads
are explicit states. The SDK owns session persistence/refresh; the app does not add password/provider-token storage or write private profiles to localStorage. The SDK owns its authenticated session record.

## Dependency order and checks

1. Define domain payload/validation and adapter/controller contracts with behavior tests.
2. Add private account/Storage migration and close legacy access paths; verify PostgreSQL
   owner isolation, immutable roles, validation, optimistic versions and public catalog access.
3. Implement SDK adapter, profile/photo repository and session restore/logout/recovery.
4. Connect the existing access screen and both profile forms; retain responsive styling.
5. Test confirmation/login/restore/logout/account-switch/save/recovery in isolated browsers,
   plus actual local SQL/RLS checks. Controlled Auth responses do not prove Google consent.
6. User applies the reviewed migration and Google/dashboard settings; verify hosted
   configuration and permitted real-account flows separately.

## Hosted setup

Current read-only settings check: email enabled, signup enabled, email confirmation
required, Google disabled. The user applied the account migration in SQL Editor;
private account and legacy email reads now return permission denied (42501).
Administrative credentials are not configured locally.

In Supabase Authentication > Sign In / Providers > Google, configure the OAuth web
Client ID and Client Secret from Google Auth Platform. In Google, use the Supabase
Google-provider page's exact callback URL as the authorized redirect URI. Set
`http://localhost:3000` as a JavaScript origin for local use. Keep the client secret
in Supabase, never in Vite variables or chat.

In Supabase URL Configuration, allow `http://localhost:3000/` and
`http://localhost:3000/?auth=recovery` (and the equivalent exact production URLs when
there is a production host). Configure the Site URL to the intended app origin.
Users should open the app on that same origin during PKCE registration/recovery.
Do not use arbitrary user-provided redirect destinations.

Sources: [Google provider setup](https://supabase.com/docs/guides/auth/social-login/auth-google),
[password authentication](https://supabase.com/docs/guides/auth/passwords),
[PKCE sessions](https://supabase.com/docs/guides/auth/sessions/pkce-flow),
[Auth state changes](https://supabase.com/docs/reference/javascript/auth-onauthstatechange).

## Activation and verification

Execute only `supabase/migrations/20260910010000_auth_private_accounts.sql` in the
existing project's SQL Editor. Do not rerun the combined initialization script on
an existing project. The migration was verified in disposable PostgreSQL 15; it
preserves rows and narrows browser grants. The user applied it through SQL Editor; subsequent hosted permission probes passed. Run `npm run verify:accounts` afterward for read-only
provider/permission checks; its nonzero exit indicates incomplete activation.

Automated checks: `npm test`, `npm run lint`, `npm run build`,
`npm run test:accounts:db`, `npm run test:accounts:browser`,
`npm run test:browser`, and `npm run test:maps:browser`.
Controlled browser Auth responses test the actual SDK/session/UI integration, not
Google consent, actual email delivery or hosted Storage. A real account check after
activation must confirm signup email, login/refresh, profile/photo save and reopen,
logout and rejection of a different account's private row/object access.

Private signed photo URLs last 24 hours and refresh every 30 minutes while the app
is open. Replacing a confirmed photo attempts deletion of the previous object;
cleanup errors are reported without misreporting a successful profile write.
Unacknowledged uploads are retained because a lost HTTP response can follow a
committed save. Administrative orphan-object cleanup remains maintenance work.
A private profile does not publish a teacher, verify credentials, authorize a
minor's guardian, send requests or activate multicriteria ranking.

Last hosted read-only check after SQL Editor reported Success: private accounts
and legacy email reads denied with 42501; public catalog join returns 200. Google
remains disabled and email confirmation remains enabled. Google activation and
real-account/email/photo validation are still pending; the migration is applied.
