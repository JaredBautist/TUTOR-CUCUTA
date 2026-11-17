# Persistent presentation demo

User authorization 2026-11-17 supersedes cleanup-only testing: leave useful fictional
records visible for client presentation. Reuse the existing eight tagged accounts.

WHEN prepared, the demo SHALL retain four published tutors, four student profiles,
adult-student contact fields sourced from the operator-controlled demo tutor contact,
favorites and four representative requests: pending, accepted, rejected, cancelled.
Two adult students SHALL support usable request flows; minor accounts SHALL retain
the existing guardian guard rather than fabricate real guardian consent.
Add a visibly fictional study-support PDF, never an academic credential, to one
tutor and verify the student can obtain and fetch its private signed URL.

The operator script SHALL use only tagged journal-owned identities and normal
repositories. It SHALL default to no changes, require --apply, and persist scenario
UUIDs/payloads outside Git BEFORE mutation, enabling idempotent retries. Existing
scenario states changed during presentation SHALL be preserved, not reset. Fresh
dates SHALL fit declared weekly hours; accepted requests SHALL not overlap. No
unrelated accounts, contacts, documents or offers may be changed. No messages sent.

Design: explicit seed fixture adapter using existing repositories and external
0600 ledger. No frontend mocks or schema changes. Guide SHALL distinguish hosted
demo state from deployed UI code and physical-device testing.

Tasks: define scenarios; populate owned records; verify both participant reads,
favorites/documents; write presenter guide and preserve session outcomes.
