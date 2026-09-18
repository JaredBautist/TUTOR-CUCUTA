# Delivery accounts and multicriteria demonstration

## Approved contract

The user authorized persistent demonstration records for the academic delivery.
Interpret the repeated “4 estudiantes” as four tutors and four students, following
the preceding request. Names are fictional Colombian-style names without a visible
test suffix. Administrative metadata and this document identify their purpose.

- WHEN provisioned, the system SHALL create eight distinct Auth accounts with one
  immutable role and valid private profiles, preserving all existing accounts.
- WHEN a controlled Colombian contact and administrative access are supplied, the
  four tutor accounts SHALL publish through the existing marketplace RPC, including
  actual schedules, prices and approximate teaching zones.
- WHEN searching mathematics/presencial/Monday afternoon/COP 40,000 from Centro,
  only Sebastián SHALL match the demonstration set; raising the budget to COP
  50,000 SHALL additionally include Valentina within a five-kilometre radius.
- WHEN searching mathematics/virtual/Tuesday evening/COP 30,000, only Camilo SHALL
  match; English/virtual/Tuesday evening/COP 40,000 SHALL match Laura.
- WHEN a tutor matches, the existing recommender SHALL derive reasons from the
  supplied filters and offer, without injected scores or verification claims.
- WHEN repeated, provisioning SHALL reuse only its tagged identities and local
  credential journal, refuse unrelated email collisions and avoid duplicate users.

## Design and boundaries

An explicit operator-only script uses Supabase Admin Auth to create confirmed
reserved-domain identities without outgoing email. It then signs in each account
and uses the existing account Repository and marketplace Adapter, so normal RLS,
profile validation and publication contracts remain exercised. Service-role access
is loaded only from `.env.admin`, never from a `VITE_` variable or frontend code.

The dataset lives under `scripts/delivery/`; it is not a browser mock catalog.
The CLI defaults to a read-only local plan; `--apply` explicitly provisions and
`--verify` checks the saved hosted records and recommendation scenarios.
Unique generated passwords live in a mode-0600 local journal outside the repo.
No original accounts, documents, university credentials or guardian declarations
are fabricated or overwritten. Minor profiles leave guardian authorization false.
No random real-looking telephone is used: a user-controlled +57 contact is required.

Direct writes to `auth.users` and browser signup at invented real email addresses
were rejected: the Admin Auth interface avoids schema coupling and unwanted mail.
No migration, UI redesign, password reset or deletion is part of this operation.
Partial runs retain their journal and can resume; existing completed profiles are
not overwritten. Withdrawal/deletion is a separate authorized cleanup action.

## Tasks and validation

1. Define eight profiles, four offers and expected search cases.
2. Validate profiles/offers and recommendation inclusion/exclusion locally.
3. Provision with controlled contact and server-only administrative credentials.
4. Verify all eight email/password logins, roles, profiles, four publications,
   published locations and explanations against real hosted Supabase.
5. Save the delivery outcome and remaining limitations in Graphify and handoff.

Pending prerequisites: controlled Colombian contact and administrative access.
Local plan/tests alone do not prove remote registration.

## Operator commands

Put `SUPABASE_SERVICE_ROLE_KEY` and `DELIVERY_CONTACT_PHONE` in the ignored local
`.env.admin`. Do not paste the secret into a chat, commit it, or prefix it with
`VITE_`. The contact must be controlled by the operator, using +57 and ten digits.
The script uses the existing public `.env` to target the same Supabase project.

```sh
node --import tsx scripts/provision-delivery-accounts.ts          # local plan
node --import tsx scripts/provision-delivery-accounts.ts --apply  # register + verify
node --import tsx scripts/provision-delivery-accounts.ts --verify # hosted checks
```

Generated login details are written only to the owner's private local file
`~/.local/share/tutorcucuta/academic-2026-09-17/accounts.json` (0600), never to
Graphify or repository documentation. Reserved `.example` emails are login names;
email delivery/recovery is deliberately unavailable for these demonstration users.
The confirmed Admin Auth creation does not send mail. Existing real accounts retain
their normal authentication and recovery behavior.

| Tutor | Subjects | Modalities | COP/h | Colombia schedule | Approximate zone |
| --- | --- | --- | ---: | --- | --- |
| Sebastián Mendoza | Mathematics | Presencial | 30,000 | Monday 15:00–18:00 | Centro |
| Valentina Duarte | Mathematics, Physics | Presencial, virtual | 45,000 | Monday 14:00–18:00 | Guaimaral |
| Camilo Becerra | Mathematics | Virtual | 25,000 | Tuesday 18:00–21:00 | Cúcuta |
| Laura Quintero | English | Presencial, virtual | 35,000 | Tuesday 18:00–21:00 | Los Patios |

Students: Mateo Rojas (16), Salomé Torres (17), Santiago Suárez (20), Mariana Castro
(22). All identities and biographies are fictional; no institution is claimed and
no credentials or documents are invented. Minors can search but cannot request a
tutoring session until a genuine guardian declaration/contact is supplied.
