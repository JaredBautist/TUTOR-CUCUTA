# Login usability — approved 2026-11-17

Refine the access component with design-taste-frontend and ui-ux-pro-max while
preserving the existing light layout, teal palette and Supabase authentication.

- Password visibility SHALL toggle with a named44px button, pressed state and no
  value loss/submission. Mode changes SHALL hide and clear the password.
- Native invalid submission SHALL expose Spanish inline field errors associated
  with aria-describedby/aria-invalid. Editing clears the affected field error.
- Asynchronous failure SHALL focus an alert before the form; generic credential
  errors SHALL NOT falsely identify one input as incorrect.
- Recovery SHALL offer explicit return to login, retaining email. Caps Lock SHALL
  show a nonblocking hint. Autocomplete, paste and password managers remain allowed.
- Signup/recovery retain minimum8 characters; login preserves its existing minimum.
- Role controls SHALL expose group and selected state; all access controls SHALL
  support keyboard, visible focus, >=44px targets and320px/200% text layouts.
- Busy actions SHALL announce progress and retain existing single-flight protection.

## Design / tasks

Component refinement under design-taste's component exception: match surroundings,
skip direction draw; preserve palette and composition. Keep native validation and
authentication adapters. Add visibility and field-error state only in presentation.
Add failing browser regressions first; implement; run auth/unit/type/build checks;
inspect before/after at1440/768/390 and visually review each. Record limits separately.
