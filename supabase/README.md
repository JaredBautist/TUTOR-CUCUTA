# Supabase source recovery

Recovered byte-for-byte from Git revision `56b3b31^` on 2026-11-17.
Files under `migrations/` are historical schema changes, not commands to rerun on
the hosted database. Compare migration history before any future application.

`full_schema_and_seed.sql` and `seed.sql` are historical prototype/demo assets.
Do not execute them in production. Their comments do not certify legal compliance.
The current marketplace uses private accounts, explicit approximate offer zones
and participant-scoped requests, implemented by the later migrations.

Local disposable verification:

```sh
docker pull postgres:15-alpine
npm run test:accounts:db
npm run test:marketplace:db
```

These suites stub Supabase auth/storage tables in isolated containers; they do not
prove a complete Supabase reset, hosted migration parity or backup restoration.
Keep `.temp/`, `.branches/` and environment secrets outside version control.
