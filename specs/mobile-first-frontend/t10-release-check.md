# T10 — Local closure and external release checks

Date: 2026-09-30. Status: local preparation complete; physical-device and changed
hosted-version verification remain pending. The user chose to finish locally and
will handle publication/device checks. Do not mark all of T10 complete from this file.

## Observed evidence

- The public URL returned HTTP 200. A fresh Chromium session rendered email,
  password and Google controls at 320/360/390/430/768/1280px without page overflow
  or uncaught exceptions. No login, form submission or hosted mutation occurred.
- Public assets: `index-DqC9XXWX.js` and `index-CONQrz8X.css`. These differ from the
  local mobile build. The public login still has three buttons below 44px, whereas
  the local implementation adds the shared minimum target size. This smoke test
  does not validate deployment of the mobile improvements.
- No iPhone was reported by `idevice_id -l`. Android ADB was unavailable; therefore
  no conclusion about an attached Android device or its keyboard is possible.
  No remote physical-device test tool was exposed in this session.
- No local Vercel CLI/project link or CLI authentication was available in the
  checked standard paths. No deployment or Git publication was attempted.
- Local implementation and browser evidence are in [validation.md](validation.md).
  Final local unit/type/build checks are recorded in the session handoff.

Public smoke artifacts: [report](evidence/t10-public/report.json),
[390px capture](evidence/t10-public/login-390.png). These are emulated viewports of
an older public deployment, not physical-device evidence.

## Remaining checks after publishing this version

Use only designated demonstration accounts. Do not alter unrelated profiles or
send test requests to real tutors. Record device model, OS/browser version, deployed
revision, result and date for each check; keep passwords and session tokens out of
screenshots and reports.

| Check | Android Chrome (physical) | iPhone Safari (physical) |
| --- | --- | --- |
| Login controls and keyboard; input and submit stay reachable | Pending | Pending |
| Student search with >=3 criteria; collapsed/expanded weekly schedule | Pending | Pending |
| Open profile, return; filters and scroll position retained | Pending | Pending |
| Request prefilled from search; change date/duration and reselect time | Pending | Pending |
| With keyboard open, reach note validation and submit; rotate device | Pending | Pending |
| While sending, wait indication and close protection; recover after error | Pending | Pending |
| Check existing requests before restarting an uncertain submission | Pending | Pending |
| Tutor profile/offer editor: keyboard, weekly slots and bottom actions | Pending | Pending |
| Private document viewer opens and can be closed | Pending | Pending |
| Map opens on demand; denied GPS remains optional; zones stay approximate | Pending | Pending |
| Favorite, request, accept/reject/cancel using only demonstration records | Pending | Pending |
| VoiceOver/TalkBack labels, errors, focus order and dismissal | Pending | Pending |

Clean up newly created demonstration requests/favorites according to their normal
lifecycle. A failure should include the step, expected/observed behavior and browser
version, without private contact details.

## Reusable public smoke command

```sh
node tests/browser-hosted-smoke.mjs https://tutor-cucuta.vercel.app/ /tmp/tutorcucuta-hosted-smoke
```

This script is deliberately unauthenticated and read-only. It records viewport
measurements, undersized buttons, JavaScript exceptions, asset URLs and screenshots.
It does not replace the authenticated physical-device checklist above.
