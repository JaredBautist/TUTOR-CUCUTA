# Graphify project memory

Status: Authorized installation and project-context setup (user request, 2026-09-09).

## Contract

- WHEN Graphify is installed, it SHALL run in an isolated user tool environment,
  using the official project distribution and an existing Python interpreter.
- WHEN a new Codex session opens TutorCúcuta, project instructions SHALL point to
  the current project context, session handoff, and a queryable persistent graph.
- WHEN the project is indexed, source code, SQL and approved documentation SHALL
  be included, together with deliberately saved, non-sensitive work-memory records;
  secrets, dependencies, generated graph/build artifacts and third-party skills
  SHALL be excluded. Historical prototype documentation SHALL be clearly distinguished.
- WHEN context is refreshed, established decisions and the latest verified state
  SHALL remain recoverable. Index facts and source evidence SHALL be distinguishable.
- WHEN setup is complete, a fresh process SHALL retrieve code relationships and
  the current no-mocks/deferred-authentication project state from saved artifacts.

## Scope

Local tooling and project knowledge only. No application behavior changes, hosted
SQL execution, OS package changes, or standalone model API calls. A graph and
written handoff support continuity; they do not promise perfect memory of all chat.
