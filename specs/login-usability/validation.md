# Login usability verification — 2026-11-17

Skills: design-taste-frontend (component refinement; composition/palette/type kept)
and ui-ux-pro-max. Domain searches verified Password Visibility, Accessible
Authentication, Focusable Error Summary and Error Placement; React search verified
label associations. No new packages, photos, invented proof or account operations.

## Implemented contract

- Teal primary actions retained. Password reveal/hide is labelled, pressed-state
  aware,44px and value-preserving; managers/paste/autocomplete remain enabled.
- Explicit labels and email keyboard/capitalization behavior; Spanish native-invalid
  field feedback connected by aria-describedby and aria-invalid. Generic server
  failures remain form-level, with focusable top alert. Existing single-flight guard,
  duplicate-account notice, signup/recovery and immutable role behavior preserved.
- Password length guidance for signup/recovery, Caps Lock hint, nonblocking progress
  announcement and explicit recovery-to-login return that preserves email.
- Role buttons have group name and selected state; decorative icons hidden.
- Intro shortened, micro-labels increased, contrast improved, emoji replaced with
  Lucide icons, resting shadows and pulsing attention dots removed. Coverage caption
  moved below its diagram to avoid covering sector names. Brand and split layout kept.

## Tests and evidence

- 108 unit tests passed. TypeScript and production build passed; existing large-chunk
  warning remains.
- Controlled browser auth passed: invalid credentials, confirmation/duplicate signup,
  sign-in, profile save/reload/conflict, role/account isolation, logout and recovery.
  Added reveal/hide/value/pressed-state, missing email, focus-to-error, recovery back,
  target-size and overflow checks at320/390/768/1440, plus200% text reflow.
- The first new browser test failed before implementation at the missing reveal
  control. A later harness failure was due to leaving390px emulation active before
  desktop navigation assertions; restoring its original1440px fixed the harness.
- taste lint app-mode:0 FAIL,0 WARN. Render inspector: initial4 FAIL/3 WARN;
  final0 FAIL/1 WARN at1440/768/390. Remaining colour-sprawl warning reflects the
  user-approved teal on role and access actions; keeping these prominent is intentional.
- [Final inspector measurements](evidence/report.json),
  [before mobile](evidence/before-mobile.png), [after mobile](evidence/mobile-fold.jpg),
  [desktop](evidence/desktop-fold.jpg), [tablet](evidence/tablet-fold.jpg).
  Opened every final fold and page contact sheet, not only the login fold.

## Visual critique (subjective, not user research)

ROUND 1
Seen in one second: TutorCúcuta access with student/tutor choice and teal actions.
Idea (one sentence): TutorCúcuta's shared student/tutor entrance keeps account access
first and geographic coverage as supporting context.
Live thing: working role choice, access modes, validation and password visibility.
Layout words by section: header=brand / access=working form / coverage=illustration.
Scores: design6.5 · usability7.5 · creativity6 · content8 → overall6.9.
Caps applied: existing composition retained; no novel art direction claimed.
Top three problems (most visible first), each with screenshot and fix:
1. Initial mobile: labels/diagram micro-text; increase to readable sizes.
2. Initial desktop: floating explanation hides diagram labels; move below diagram.
3. Initial tablet: password is opaque and role selection only visual; add controls
   and selected-state semantics without moving the access tasks.

ROUND 2
Seen in one second: role selection and a legible account form.
Idea (one sentence): familiar TutorCúcuta access with clearer task feedback.
Live thing: visibility toggle and recovery path, plus preserved real Auth adapters.
Layout words by section: header=brand / access=form / coverage=unobscured diagram.
Scores: design7 · usability8.5 · creativity6 · content8 → overall7.4.
Caps applied: component refinement, no gallery-level creative redesign claimed.
Top three remaining limitations, visible or requiring external validation:
1. Final mobile: coverage remains below the form; intentional secondary priority.
2. Final desktop: both Google and email actions use teal; intentional approved palette.
3. Screenshots cannot prove native keyboard or screen-reader usability; physical
   Android/iPhone and assistive-technology validation remain pending.

No hosted login/signup/email or account mutation occurred during these checks.
No deployment or push. Measurements are scoped evidence, not WCAG certification.
