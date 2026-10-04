# Pilot readiness and T10 evidence — 2026-10-04

Status: release checks advanced; pilot prepared, not activated. Physical Android/iPhone
acceptance and participant availability remain unconfirmed. No invitations sent.

## Verified release evidence

- Local main and remote main: `0de1b5bc54d65442bfc164170f63db908bd76166`.
- GitHub reports Vercel Production deployment `6764382991` successful for that SHA,
  at `2026-09-30T16:17:20Z`. A different local bundle hash alone is not evidence of
  missing publication: build environment can affect output. The deployment-specific
  URL returned a page without app assets, so its content was not equated to the
  public alias. Production SHA association is supported by GitHub deployment metadata.
- Public alias `https://tutor-cucuta.vercel.app/`: HTTP 200, assets
  `index-AOf_DIH3.js` and `index-qjfJPaEZ.css`.
- Public unauthenticated Chromium smoke passed at 320/360/390/430/768/1280px:
  email/password/Google controls present, no horizontal overflow, no uncaught
  JavaScript exceptions, no visible buttons below 44px in either dimension.
- [Public report](../specs/mobile-first-frontend/evidence/t10-public-20261004/report.json)
  and [390px screenshot](../specs/mobile-first-frontend/evidence/t10-public-20261004/login-390.png).
- Supabase zero-row probes passed for private accounts, offer contacts/locations,
  documents, requests and favorites: anonymous access denied. Email and Google
  providers enabled, email confirmation required. This is not a full RLS audit.
- Both previously authorized demonstration accounts authenticated via the real
  Supabase API and read their own role and participant request list. The student
  read four published offers. The tutor read zero catalog entries under its role;
  this is not proof that the student catalog is empty. No profile, offer, favorite,
  request or document mutation was performed. Test sessions signed out locally.
- Fresh local validation: 103/103 unit tests, TypeScript and production build passed.
  Existing large-chunk warnings remain. These do not replace hosted UI journeys.
- ADB unavailable; `idevice_id -l` could not retrieve a device list. No physical
  Android/iPhone evidence was obtained. A device-availability question is pending.

## Remaining T10 gate

Use the full [physical-device checklist](../specs/mobile-first-frontend/t10-release-check.md).
The publication-pending statement in that historical September 30 record is
superseded by the deployment metadata above; its physical-device checks remain open.

WHEN a designated tester completes a deployed journey, the release record SHALL
include device model, OS/browser version, date, observed result and sanitized evidence.
WHEN a check is performed with emulation or direct API calls, it SHALL NOT be
reported as a physical-device or end-to-end browser result.

Before activation:

1. Complete student and tutor journeys on Android Chrome and iPhone Safari: login,
   search with at least three criteria, explanation, complete weekly schedule,
   profile return, favorite persistence, request, response and cancellation.
2. Verify keyboard/rotation/safe areas, document viewing, optional denied GPS,
   approximate zones and VoiceOver/TalkBack labels/focus/errors.
3. Verify recovery email delivery and login redirects using designated accounts;
   enabled provider settings alone do not prove delivery or completed OAuth consent.
4. Identify a support contact and who can inspect errors, restore data and revert
   a faulty deployment. Backup availability/recovery has not been audited here.

## Small pilot protocol

Bounded operational defaults, without new application features:

- Duration: seven days starting after the remaining gate passes and participants
  are confirmed. No start date or participant commitment is claimed today.
- Cohort: four willing tutors and four adult students with actual study needs.
  Start with adults to avoid treating fictional guardian declarations as consent.
  Existing demonstration offers/accounts are excluded from product-success counts.
- Scope: existing subjects, modalities, prices, weekly availability and approximate
  teaching zones. No payments, chat, continuous GPS or credential certification.
- Project owner selects willing participants and shares access through their chosen
  channel. No automated invitations or third-party messages are authorized here.
- Each tutor confirms their own profile, availability, contact and published offer.
  Each student completes a relevant search and a request when a suitable offer exists.
  Do not create artificial compatibility or requests just to meet a metric.
- The owner reviews participant feedback once daily, records reproducible problems
  and prioritizes defects affecting the core journey before cosmetic changes.

### Proposed success criteria

These thresholds are pilot decisions, not measured results or statistically validated
market targets. Review them after the small cohort, not as market-fit certification.

| Measure | Pilot threshold | Observed |
| --- | --- | --- |
| Tutor can publish without assistance | At least 3 of 4 | Not measured |
| Student completes a search with >=3 criteria without assistance | At least 3 of 4 | Not measured |
| Student understands one factual compatibility reason | At least 3 of 4 | Not measured |
| Relevant requests receive a tutor response within 24 hours | All submitted pilot requests | Not measured |
| Participants coordinate a suitable tutoring session | At least one pair, participant-confirmed | Not measured |
| Critical access/privacy/data-loss failures | Zero unresolved | Not measured |

Accepted status alone does not prove a session happened. Record coordination and
actual attendance separately, only if participants report them.

### Incident handling

Stop onboarding and investigate any cross-account/private-data exposure, data loss
or inability to complete the core journey. Do not silently reset records or overwrite
profiles. Correct the issue, run its regression and recheck the affected deployed
journey before resuming. Preserve logs without passwords, tokens or private contacts.

| Date | Participant code | Device/browser | Step and expected result | Observed result | Severity | Evidence | Resolution/retest |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Pending | — | — | — | — | — | — | — |

At day seven, compare the observed counts with the thresholds and decide whether to
continue, correct a blocking issue, or adjust tutor coverage. Do not add unrelated
features solely because the pilot is small.

## Completion boundary

No new deployment was necessary: the mobile commit already has a successful
Production deployment. No push, invitations, production business-data writes,
physical-device tests or actual pilot participation occurred in this review.
T10 remains partially complete; pilot activation is pending the explicit gates above.
