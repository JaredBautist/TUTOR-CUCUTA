# Hosted account validation — 2026-09-12

## Scope and authorization

The user requested real tests against the already-running `http://localhost:3000`
application and supplied two existing accounts. After discovering incomplete
profiles, the user explicitly authorized fictional test data: a 16-year-old grade-11
student studying limits for a mathematics exam and a 26-year-old systems-engineer
tutor, in person. The test rate was COP 30,000/hour and the scheduled interval was
2026-09-14 16:00–17:00 America/Bogota, within published Monday availability.

Profiles, contact placeholders, guardian declaration and offer were explicitly
marked as technical test data. The guardian declaration is fictional test input,
not evidence of authorization by a real guardian. No contact links were followed.
The uploaded PDF explicitly states that it is a temporary storage test, not an
academic credential. Map points were selected reference zones, not observed GPS.

Three isolated Chromium sessions used the real app and hosted Supabase. No network
fixtures, intercepted API responses, authentication bypass or new Vite server were
used. Two sessions authenticated as the same student to check independent session
recovery. This is not evidence from two physical devices.

## Acceptance checks and results

| Check | Observed result | Evidence |
| --- | --- | --- |
| Email/password sign-in for both roles | Correct role screens and private accounts loaded | 01–02 |
| Private profile save/reload | Temporary note persisted in both profiles after reload; original note restored | 03–04 |
| Incomplete offer | UI refused publication with missing required fields | 05 |
| Complete in-person offer | Acknowledged publication; appeared in the other account with rounded teaching point, price and declared facts | 07 |
| Private document upload/view | Real Storage upload and metadata save; student opened the PDF through a signed URL and native PDF viewer | 06, 08 |
| Minor without guardian declaration | Submit disabled; direct authenticated RPC also returned GUARDIAN_REQUIRED/P0001 | 09 |
| Fictional guardian declaration supplied | Profile saved; request became available | 10–11 |
| Real request delivery | Student submitted; tutor's independent session received it after refresh | 12–13 |
| Identity and transition permissions | Student could not accept own request: server denied 42501 | RPC check |
| Contact before acceptance | No telephone/WhatsApp links or contact fields in participant response | 13 |
| Acceptance | Tutor accepted; both interfaces exposed the appropriate authorized contact links | 14–15 |
| Cancellation | Student cancelled; tutor saw cancellation, participant response was cancelled and both UIs hid contact | 18–19 |
| Favorite persistence | Save acknowledged; separate student browser recovered favorite after applying a geographic search | 17 |
| Favorite synchronization/removal | Removing in second browser was reflected in first on focus | Live UI check |
| Favorite privacy | Tutor could not read student favorites or write own favorite; server denied 42501 | RPC/RLS check |
| Private accounts | Student's query for other account IDs returned zero rows | RLS check |
| Mobile results/map | 390×844 viewport, no horizontal page overflow, map and list controls usable | 20–21 |
| Document withdrawal | Metadata and object removed; student saw no document and could not obtain a new signed URL | Storage/RLS check |
| Offer withdrawal | Student catalog/map removed the offer; no published test teacher remained | 22 |

These are live authenticated hosted checks, extending the earlier controlled browser
and isolated PostgreSQL tests. They do not certify teaching quality or document
validity. One additional request-list read failed transiently and succeeded on retry;
its cause was not established. An early automation click ran before the document
button appeared; the corrected wait/retry opened and visually verified the actual
PDF. Do not describe these two events as zero-error execution.

## Presentation findings resolved — 2026-09-25

The four presentation findings observed during this hosted validation were resolved
without changing the hosted database contract:

1. Result cards derive a compact summary from the declared weekly `availability`
   instead of claiming that no schedule exists.
2. The tutor profile explains the actual contact-release rule instead of referring
   to an already connected account.
3. Empty `focalTopic` fields are omitted in student and teacher request views; the
   preserved subject, goal and student note remain visible.
4. Results tab counts use the same eligible recommendation set as the cards, and an
   in-person visit without a search area guides the student to define one.

`tests/presentation-findings.test.ts` provides regressions for all four corrections.

## Cleanup and evidence

- Both original profile payloads restored and read back for field-by-field equality.
  Profile version/audit timestamps naturally advanced with the test saves.
- Test favorite removed; student's favorites returned to zero.
- Test document metadata and actual Storage object deleted; tutor object listing
  returned zero and further student signing was denied.
- Offer withdrawn. Its private withdrawn draft and the cancelled request remain as
  test history because the application intentionally exposes no history-delete flow.
  No administrator deletion or raw SQL cleanup was performed.
- All three test sessions signed out with local scope; temporary RAM browser profiles
  removed. Existing user browser sessions and the port-3000 server were preserved.
- No credentials, auth tokens, environment contents or actual contact values are
  included in Markdown/Graphify. Screenshots omit login credentials and mask account
  email fields where visible. Only fictional test contact values appear.

Local gallery: `~/Escritorio/TutorCucuta-pruebas-2026-09-12/index.html`, with 22 PNG
screenshots. Screenshots 08 and 21 were visually inspected for actual PDF content
and the mobile map. The gallery is outside the repository and the Graphify corpus.

Remaining: real Google OAuth consent, native GPS with an actual device, a second
physical device, production-domain redirects and Vercel deployment. The hosted
email/account/marketplace/favorites core flow above is now verified.
