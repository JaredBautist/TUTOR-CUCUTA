# Graphify: project context across sessions

## Installed footprint

- Official package: `graphifyy[sql]==0.9.57` from the Graphify-Labs project.
- Isolated tool: `~/.local/share/uv/tools/graphifyy/`, using the existing Python 3.12.
- Executable: `~/.local/bin/graphify` (already on PATH).
- Codex integration: `.codex/skills/graphify/`, `.codex/hooks.json`, and `AGENTS.md`.
- Skill discovery: `.agents/skills/graphify` links to the project Codex skill.
- Persistent source context: this folder. Derived graph: `graphify-out/`.

The project instructions carry session continuity. The Codex PreToolUse hook is
an upstream intentional no-op, not an automatic transcript recorder. The graph
persists on disk and must be refreshed when source or documentation changes.
No global Codex settings were changed. No graph watcher/daemon is required.

## Start a new session

Open TutorCúcuta in Codex. Read `session-handoff.md` and `project-context.md`, then
consult the saved graph. The skill can be invoked as `$graphify` in a new session.
If the new skill is not listed in an already-open session, reopen that session;
the `graphify` terminal commands are available immediately.

```sh
graphify query "StudentResultsView cleanTutors" --budget 1500
graphify explain "StudentResultsView"
graphify path "App.tsx" "supabase.ts"
graphify query "authentication pending mock removal" --budget 1500
```

Queries match the graph's labels. For Spanish questions, select corresponding
terms actually present in the graph (for example `mock removal` or `authentication`)
instead of assuming the CLI automatically translates or stems words.

## Refresh

For changed code, run from the project root:

```sh
graphify update .
```

For changed documents or a complete rebuild, ask Codex to use the installed skill:

```text
$graphify . --update
```

The skill combines local AST extraction with semantic interpretation by the current
assistant session. No separate model API key is needed for that workflow. Do not run
headless `graphify extract .` expecting document interpretation without a backend;
`graphify extract . --code-only` is local but skips the documentation semantic pass.

A code-only update preserves existing semantic context but does not reinterpret
changed documentation. It can also change graph communities and their labels.
Use the skill's incremental detection/cache check before relying on indexed facts.
`graphify check-update .` only reports a pending flag written by the watcher; silent
output does not prove freshness when no watcher is running. For a direct check:

```sh
~/.local/share/uv/tools/graphifyy/bin/python - <<'PY'
from pathlib import Path
from graphify.detect import detect_incremental
for kind in ("ast", "semantic"):
    changes = detect_incremental(Path.cwd(), kind=kind)
    print(kind, "changed/new:", changes["new_total"], "deleted:", len(changes["deleted_files"]))
    print(changes["new_files"])
PY
```

Refresh changed documents through the skill before relying on those facts. Do not
use a code-only full extraction to replace the richer code-plus-doc graph.

## Save a session outcome

Update `session-handoff.md` with the actual outcome and source evidence. Record useful
findings and corrections with Graphify; avoid complete chat dumps or personal data.

```sh
graphify save-result --question "What changed in Results?" --answer "Known fixtures are filtered by reserved IDs; empty catalogs render safely." --nodes src_utils_demorecords_cleantutors src_components_views_studentresultsview_studentresultsview --outcome useful
graphify reflect --if-stale --graph graphify-out/graph.json
```

Work memory lives under `graphify-out/memory/`; derived lessons are in
`graphify-out/reflections/LESSONS.md`. Preserve these when updating the graph.
The written context and handoff remain the durable, readable project record.

## Inspect the graph and installation

Open `graphify-out/graph.html` for the interactive visualization. Read
`graphify-out/GRAPH_REPORT.md` for an architectural overview. Graph interpretation
must still be verified against cited source files before behavior changes.
The upstream HTML loads its visualization library from the unpkg CDN and needs
network access for that asset; terminal graph queries use the saved local index.

```sh
graphify --version
uv tool list
graphify god-nodes --top 5
```

The corpus excludes `.env*`, keys, dependencies, build output, third-party skills,
local databases, and unrelated home/session folders via `.graphifyignore`.
Graphify deliberately includes the curated Markdown records in `graphify-out/memory/`
as a special case; other generated graph artifacts remain excluded. The
unsupported TOML/CSS configuration details are summarized in `configuration.md`.
Historical prototype specs are indexed as historical; they do not override current
source or the approved cleanup specification.

The generated graph and work memory are local ignored files. Version-control or
back up `docs/context/` and the project instructions for portable session context.
No Git repository was initialized by this installation.
