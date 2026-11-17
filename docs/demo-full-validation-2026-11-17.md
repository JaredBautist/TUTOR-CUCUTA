# Demonstration validation — 2026-11-17

User authorized full testing with tutors and students. Reused the existing eight
tagged demonstration identities rather than creating duplicate users. No real
participants or academic documents were invented or changed.

## Real hosted Supabase checks

- All four tutor and four student credentials authenticated; private profiles matched
  the declared dataset. Four offers remained published.
- Six recommendation scenarios passed: subject, modality, budget, schedule, proximity,
  negative/empty case and factual explanations. Each eligible result scored100 under
  the newly approved criterion-compliance contract. This executes local recommender
  code against hosted records; it does not certify deployment of the new score UI.
- Adult demonstration student and virtual mathematics tutor completed the real RPC
  lifecycle: create request, tutor reads pending, student acceptance denied, unrelated
  demo student cannot read it, tutor accepts, contact appears, student cancels, both
  roles read cancelled and neither receives contact fields afterward.
- A saved favorite was read through a fresh repository and restored to its original
  value. The whole favorites list was compared after restoration.
- The adult student had no contact. Temporarily used the existing operator-controlled
  demo offer contact, then restored and read back the exact original profile JSON.
  Profile version/audit timestamps naturally advanced. No guardian declaration added.
- All sessions signed out locally. Cancelled request remains as demonstration history;
  no raw SQL/admin deletion. No contact links followed or messages sent.

Operator command, with explicit hosted-write acknowledgement:

```sh
node --import tsx scripts/verify-demo-lifecycle.ts --apply
```

The utility reads the private external credential journal; no password, token or
contact is logged. Normal participant repositories perform all business operations.

## Local checks and limits

107 unit tests, TypeScript and production build passed; large-chunk warnings remain.
The controlled marketplace browser run initially failed because results retained
Presencial after a Virtual-selection step. This observation is not a hosted failure;
retain the failure even if a subsequent run passes. No application fix was inferred
from this automation failure. A second run reached the modal and failed querying
its DOM during a transition. The harness now waits for nonempty loaded screens
and an open booking dialog before asserting focus. The final run passed favorites,
publication, private documents, guardian guard, request retry, participant flow and
contact controls against the controlled backend. Earlier failures remain recorded.

Hosted operations above use API/adapters, not browser clicks. Physical Android/iPhone,
OAuth consent, recovery email delivery, actual session attendance and complete
accessibility acceptance remain outside this evidence. No production deployment or
push performed. Historical seed scripts were not executed.
