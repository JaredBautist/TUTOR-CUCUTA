# Recovery design

Recover exact SQL from the Git parent of the deletion commit `56b3b31`; do not invent
new migrations or apply historical schema to production. Track SQL/config/docs only,
and keep `.temp` and local runtime data ignored. Review recovered files for secrets.

Use GitHub Actions with read-only repository permissions, Node 22, npm ci and two
independent jobs: static/unit/build and Chromium controlled browser checks. Browser
checks use reserved fixture endpoints and need no hosted credentials. The database
suite runs against disposable PostgreSQL where supported by the recovered sources.

Hosted demonstration verification remains an explicit operator command. It is not
part of CI and must not expose private credential journals. No new business logic,
schema, API contract or framework is introduced.
