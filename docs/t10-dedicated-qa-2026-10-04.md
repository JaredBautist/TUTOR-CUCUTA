# T10 — Dedicated hosted-browser QA

Date: 2026-10-04. Status: authenticated hosted-browser checks passed within the
scope below; T10 remains open for physical-device and complete transaction checks.

## Environment and method

- Target: <https://tutor-cucuta.vercel.app/> with the real Supabase connection.
- Dedicated headless Chromium 153.0.8010.52 (Arch Linux)/CDP session, isolated
  temporary browser profile.
- Mobile viewport emulation: 390×844 and 320×844 CSS pixels; not Android/iPhone hardware.
- Signed in through the deployed email/password form with the two previously
  authorized demonstration accounts. No authentication fixtures or session injection.
- Current deployment association is recorded in [pilot readiness](pilot-readiness-2026-10-04.md).
- No profile, offer, document, favorite or request writes. No invitations, messages,
  deployment or application-code changes. Logged out after the checks; temporary
  browser profile removed. Credentials and session tokens are absent from artifacts.
- Layout and target measurements were taken on the original DOM, before screenshot
  sanitization. Input/textarea contents and images were hidden only for capture.
  Screenshot hiding preserves element geometry; it is not application behavior.

## Verified results

| Check | Observed result |
| --- | --- |
| Student email login | Authenticated student search screen loaded. |
| Search with >=3 criteria | Mathematics + Grade 11 + virtual + maximum COP 40,000 returned one offer at COP 25,000/hour. These are actual deployed search results, not fixtures. |
| Explainability | Reasons explicitly covered subject, educational level, affordable rate and virtual modality. With no schedule chosen, the UI explicitly said schedule compatibility was still to be chosen. Distance did not contribute to the virtual recommendation. |
| Full weekly schedule | Expandable schedule exposed Tuesday 18:00–21:00, Colombia time, with declared-availability/confirmation disclaimer. |
| Return from tutor profile | Result text filter and exact 200px scroll position were retained. Profile loaded without horizontal overflow at 390px. |
| Booking context | Subject, `Tema: Límites` and the typed preparation note reached the request form. |
| Compatible times | For 2026-10-06 and 60min, options were 18:00, 18:30, 19:00, 19:30 and 20:00. Increasing duration to 180min cleared the selected 20:00 and left only 18:00, with a reselection message. |
| Incomplete profile protection | Submission stayed disabled and explained that name and age must be completed. No profile was invented to bypass this boundary. |
| Modal focus | Entry focus was inside the dialog. Escape closed it; after opening from a focused request button, focus returned to that button. |
| Results layout | At 320px and 390px: no horizontal overflow, no visible button/summary below 43.5px in either dimension (44px target with rounding tolerance). |
| Optional denied GPS | Emulated permission denial displayed `Permiso de ubicación denegado`; the map canvas and surrounding search interface remained available. |
| Student profile layout | At 320px: no horizontal overflow and no undersized visible buttons/summaries. No save performed. |
| Tutor email login | Authenticated tutor dashboard loaded two existing requests. |
| Tutor offer editor | Unpublished offer editor loaded; at 320px and 390px, no horizontal overflow or undersized visible buttons/summaries. No publication or save performed. |
| Existing tutor request detail | Opened an existing cancelled request at 390px. Cancellation notice was present; Accept/Reject controls were disabled. No horizontal overflow or undersized visible buttons/summaries. |
| Session persistence | After signing back in as student and reloading the page, search reappeared without a login form. |
| Runtime | Zero uncaught JavaScript exceptions recorded during the active hosted session. |

The empty-profile guard is a data/setup limitation for this demonstration account,
not evidence of a broken request workflow. One misleading status message was found
(see below). This is not an exhaustive accessibility/security audit.

## Confirmed presentation defect — medium UX severity (MF-09)

An already authenticated student with an empty profile name sees both
`Completa tu nombre y edad en Mi perfil antes de solicitar.` and
`Inicia sesión para enviar una solicitud` in the booking form.

Reproduction: authenticate with the authorized incomplete student account, search,
open a compatible offer's request form. Expected: explain the missing profile fields
without asking the signed-in user to sign in again. Observed: the contradictory
login instruction shown in the booking screenshot below.

Source: `src/App.tsx:233` passes `submissionEnabled` from profile ID **and nonempty
name**; `src/components/modals/RequestTutorModal.tsx:75` treats its false value as
an unauthenticated state. The submission block itself is correct. This is a status
message/contract distinction issue, not an authentication or permission bypass.
No fix was made in this QA-only task; add a failing regression before remediation.

## Sanitized screenshots

Directory: `specs/mobile-first-frontend/evidence/t10-dedicated-20261004/`.

- [Results and weekly schedule, 390px](../specs/mobile-first-frontend/evidence/t10-dedicated-20261004/student-results-reasons-390.png).
- [Expanded compatibility reasons, 390px](../specs/mobile-first-frontend/evidence/t10-dedicated-20261004/student-reasons-390.png).
- [Booking form, 390px](../specs/mobile-first-frontend/evidence/t10-dedicated-20261004/student-booking-390.png).
- [Map with denied location permission, 320px](../specs/mobile-first-frontend/evidence/t10-dedicated-20261004/student-map-denied-320.png).
- [Unpublished tutor offer editor, 320px](../specs/mobile-first-frontend/evidence/t10-dedicated-20261004/tutor-offer-320.png).

No screenshot was taken of login credentials or private request details.

## Not checked / remaining gate

1. Physical Android Chrome and iPhone Safari: keyboard, rotation, safe areas and
   TalkBack/VoiceOver. Browser viewport and permission emulation do not close these.
2. Complete real hosted create/accept/cancel flow: student profile is incomplete;
   the designated tutor account's offer is unpublished. Existing cancelled request
   reads are not evidence of a new successful transaction.
3. Favorite writes/reload, document signed-URL viewing, OAuth consent and recovery
   email delivery were not exercised in this dedicated pass.
4. Offer publication/editing and uncertain network-write handling were not exercised
   against production. Earlier controlled tests remain distinct evidence.
5. Actual pilot participants, successful coordination and product outcomes remain
   unconfirmed. No pilot activation or contact with participants occurred.

Retain the [T10 physical-device checklist](../specs/mobile-first-frontend/t10-release-check.md)
and [pilot gate](pilot-readiness-2026-10-04.md). Do not label T10 fully complete from
these automated hosted-browser results.
