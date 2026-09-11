# TutorCúcuta engineering and session context

## Resume a session

1. Read `docs/context/session-handoff.md` and `docs/context/project-context.md`.
2. Follow the latest user-approved specification; use current source as evidence
   of implemented behavior. `specs/clean-views-real-data/` records the completed
   cleanup. `specs/spec.md`, `specs/design.md`, and `specs/tasks.md` are historical
   prototype documents, not proof that their mocked features work today.
3. Consult the local Graphify graph for relevant code relationships and project
   decisions, then verify the specific source files before making a change.
4. See `docs/context/graphify-usage.md` for installation, refresh and memory commands.
   A graph is a derived index, not a transcript of every conversation.

## Engineering contract

- Use Spec-Driven Development: EARS acceptance criteria first, design/contracts
  and relevant ADRs second, dependency-ordered tasks third, implementation last.
  The user's explicit authorization carries forward; do not repeatedly ask approval.
- For already agreed bounded changes, implement using the existing contract and
  record verified outcomes in Graphify; the user explicitly rejected a new spec
  for every edit (2026-09-10). Define new contracts when behavior is missing.
- Define and agree behavior/contracts before meaningful feature code. Reverse-engineer
  pasted code's inputs, outputs, invariants and errors before changing behavior.
- Preserve the React/Vite stack, existing visual identity, real records and original
  documents. Do not add mocks to solve missing data. Do not impersonate a catalog
  tutor as the current account or announce unconfirmed saves, delivery or verification.
- Keep framework-independent business rules outside React presentation. Use hooks
  and adapters deliberately; follow domain <- application <- interface/infrastructure
  dependency direction as real features are introduced. Avoid framework migrations
  or unnecessary abstraction in a bounded fix.
- Define DTOs, validation and error contracts at boundaries. Use intentional names,
  focused functions, explicit missing values and typed errors. No swallowed failures,
  hardcoded secrets, dead prototype logic, or fabricated recommendation scores.
- Treat auth, participant-scoped RLS, guardian authorization, constraints and indexes
  as design requirements. Review migration reversibility and lock impact. Do not run
  hosted SQL or reset databases merely because repository SQL files were edited.
- Preserve semantic HTML, keyboard access, responsive behavior, color contrast and
  deliberate typography/spacing. Match state management to actual complexity.
- Write meaningful failing regressions before bug fixes; validate behavior, not
  implementation details. Existing checks: `npm test`, `npm run lint`,
  `npm run build`, and `npm run test:browser` for affected critical UI flows.
- Review correctness, architecture, security, performance and maintainability with
  source evidence. Distinguish mocked browser tests from real PostgreSQL/RLS tests.
- Conversational language is Spanish. Code, comments and technical docs default
  to English. Communicate directly, preserve scope, and report actual verification.
- Graphify installation does not authorize AUR packages, global assistant config
  changes, external model API calls, publishing, or sending messages to others.

## Maintain session memory

At the end of meaningful authorized project work, update the session handoff with
verified changes, validation and next pending contract. Refresh changed code using
`graphify update .`; refresh changed documentation through the installed `$graphify`
skill with `--update`. Save concise, evidence-based Graphify work-memory outcomes
and corrections. Never save credentials, user contact data or raw environment files.
Do not delete graph work memory when refreshing generated indexes.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
