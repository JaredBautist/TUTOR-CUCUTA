# Project memory design

## Components and layout

- User tool: `uv` installs official `graphifyy[sql]` with existing Python 3.12.
- `.codex/skills/graphify/`: upstream Codex skill and references;
  `.agents/skills/graphify` links to it for project skill discovery.
- `AGENTS.md`: persistent project entry point, SDD constraints and context order.
- `.graphifyignore`: explicit corpus boundaries.
- `docs/context/`: academic scope, implementation state, session handoff and usage.
- `graphify-out/`: derived local graph/report/viewer and Graphify work-memory records.
- `specs/graphify-project-memory/`: installation contract and verification trail.

The Graphify tool is separate from the application's npm dependency graph.
The source code remains the authority for implemented behavior; current approved
specifications outrank historical prototype docs. The academic reference establishes
intended functionality, not a claim that the recommender already exists.

## ADR: Project-scoped integration

Options: global assistant changes; project skill plus persistent instructions;
external hosted memory service.

Decision: project-scoped skill/instructions with local graph and handoff documents.
This makes context discoverable in later project sessions, preserves unrelated
assistant settings, and avoids a daemon or hosted account dependency.

## Refresh contract

Rebuild or update after meaningful source/spec changes. Save concise verified
outcomes and corrections, never credentials or fabricated claims. Validate a code
query and a project-status query from a fresh process. A source-fingerprint check
or Graphify's manifest must identify stale corpus files before relying on the graph.
