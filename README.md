# SuperSkill

One-entry orchestrator for coding agents: deterministic rule planning, evidence gates, a project-jailed vault, a local knowledge graph, and safe cache sharing across agent worktrees. Curated packs — not a dump of 90k remote skills.

[![npm](https://img.shields.io/npm/v/superskill)](https://www.npmjs.com/package/superskill)
[![license](https://img.shields.io/badge/license-Apache--2.0-blue)](https://www.apache.org/licenses/LICENSE-2.0)

Prompt normally. Call **`superskill`** with the task. It diagnoses, then loads a combination — Go → Go pack, QA → QA, security bug → review + security — and returns a system brief plus a deterministic rule plan. Defaults: careful-minimal, algorithm-correct, **systems thinking**. Open design branches **grill the human** (HITL). Factory packs (plan, TDD, verify, SRE, grill, design/UI) are ours — UI work lazily pulls the design pack without being asked.

Everything is local-first: the vault is markdown under `projects/<slug>/`, the search index is derived SQLite, and vault IO is jailed to the current project.

Requires **Node 22.16+ on the 22.x line, or Node 24+**, with SQLite FTS5 enabled. Official Node 22.13–22.15 builds lack FTS5 and cannot run knowledge search.

The [documentation guides](docs/index.md) are the manual; this README is the hub.

## Why

Marketplace skill dumps fill the window with advice that does not know *this* system. Review and security need:

- **Vertical** — this project's ADRs, learnings, sessions
- **Horizontal** — callers, sibling paths, co-activations
- **Fresh** — session complete + `learn`

SuperSkill injects a system brief from the project graph, jails vault IO to `projects/<this-slug>/`, and keeps `.superskill/` **gitignored** so each developer's trajectory stays private.

## Quick start

```bash
npm install -g superskill          # Node 22.16+ (22.x), or 24+

# in your repo
superskill skill init          # detect stack, index the in-repo catalog, build .superskill/graph.json
superskill setup               # register MCP + instructions in supported detected clients
```

One binary, two faces: **`superskill <command>`** runs everything you run yourself (`setup`, `doctor`, `skill`, `graph`, `worktree`, …), and bare `superskill` in a terminal shows the help. With no arguments over piped stdio — how AI clients launch it — the same binary starts the **MCP server**. `superskill-cli` remains a permanent alias, and `SUPERSKILL_FORCE_MCP=1` forces server mode.

1. `skill init` detects the stack, indexes the in-repo catalog (not skills.sh), writes `.superskill/graph.json` (project-local, gitignored), registers the repo in the vault map (`project-map.json`) so vault commands auto-detect without `-p`, appends `.superskill/` to `.gitignore`, and adds a short SuperSkill block to an existing `AGENTS.md` / `CLAUDE.md`.
2. `setup` finds installed clients and writes the MCP entry, instruction file, and slash commands (`/review`, `/worktree`, `/watchdog`, `/superskill`) for each host that supports them — plus the harness-agnostic `superskill` skill at `~/.agents/skills/superskill/SKILL.md` so hosts with skill discovery list it. Use `--dry-run` to preview, `--clients claude-code,cursor` to target, `--force` to overwrite.
3. Describe the task — or use a shortcut: `/review [scope]` (18-axis review; empty scope = whole project), `/worktree [status|audit|gc]`, `/watchdog [dig|fix]`, `/superskill <task>`. The router picks packs by language, phase, and specialists; content is budgeted, and review/audit/diff/defect tasks (and security bugs) also get the vault brief plus a caller protocol.

Verify any time with `superskill doctor`: install vs running MCP servers, vault + project mapping, project graph isolation (fails if `.superskill/` is tracked), catalog validation, compile toolchains, telemetry, and MCP clients.

Full install, MCP client snippets, upgrade, and uninstall: [Getting started](docs/getting-started.md). Setup support is defined in [the harness matrix](docs/harness.md#support-and-verification).

## What it does

- **Deterministic skill routing** — a task becomes packs plus a budgeted rule plan with an audit trail (`selected`, `explain`, `dropped`, `budget`); no catalog dumps. [Concepts](docs/concepts.md#the-plan)
- **Evidence gates** — spec → tickets → evidence → `gate check`, deterministic and non-zero on failure. [Workflows](docs/workflows.md#gates-walkthrough)
- **Project-jailed vault and knowledge graph** — markdown under `projects/<slug>/` is the source of truth; SQLite FTS5 + edges is derived; agents traverse lazily instead of loading dumps. [Knowledge graph](docs/knowledge-graph.md)
- **Code graph** — tree-sitter WASM `impact` and `claims`, with every edge tagged EXTRACTED or INFERRED. [Code graph](docs/knowledge-graph.md#code-graph-impact-and-claims)
- **Obsidian-native memory** — `graph viz` writes Mermaid architecture notes, code notes, a project dashboard, and Bases views. [Obsidian](docs/obsidian.md)
- **Worktree cache sharing** — share safe caches (package stores, compiler caches), isolate build state, seed fresh worktrees copy-on-write; reports and recoverable quarantine by default, with explicit purge controls. [Worktrees](docs/worktrees.md)
- **Space hygiene** — a read-only report of what is worth reclaiming and the exact command to reclaim it. [Hygiene](docs/hygiene.md)
- **Watchdog** — session-trace review pinned against the repo, returning severity-ranked findings with evidence and proposals. [Watchdog](docs/watchdog.md)
- **Local-first and safe** — vault jail, secret scanner, fail-closed skill audits, prompt-injection scan, MCP write rate limits, opt-in local telemetry. [Security](docs/security.md)
- **Two faces, one binary** — every command runs as `superskill <command>`; clients launch the same binary as the MCP server. [Commands](docs/commands.md) · [MCP tools](docs/mcp-tools.md)

## Documentation

| Guide | What it covers |
|---|---|
| [Getting started](docs/getting-started.md) | Install, first run, MCP configuration per client, upgrade, uninstall |
| [Concepts](docs/concepts.md) | Constitution, the plan, flows, gates, code graph, vault, project isolation, packs |
| [CLI reference](docs/commands.md) | Every command and flag: vault, project memory, knowledge graph, skills, gates, code graph, setup, telemetry, hygiene, watchdog |
| [MCP tools](docs/mcp-tools.md) | The MCP tool surface and its parameters |
| [Workflows](docs/workflows.md) | Gates walkthrough (spec → tickets → evidence → gate) and rule planning |
| [Knowledge graph](docs/knowledge-graph.md) | Vault FTS + edges, lazy traversal, code-graph impact/claims, confidence model |
| [Obsidian](docs/obsidian.md) | Viewing your memory: `graph viz`, the project dashboard, Bases views, graph scoping |
| [Worktrees](docs/worktrees.md) | Worktree cache sharing: usage, safety, CLI reference, troubleshooting |
| [Space hygiene](docs/hygiene.md) | Read-only space report across caches, worktrees, docker, xcode, scratch |
| [Watchdog](docs/watchdog.md) | Session review and environment optimization |
| [Configuration](docs/configuration.md) | Environment variables and harness hooks |
| [Security](docs/security.md) | Vault jail, secret scanner, audit gate, prompt-injection scan, rate limits |
| [Harness integration](docs/harness.md) | Client setup matrix, support contracts, hooks, CI |
| [Diagram conventions](docs/diagram-conventions.md) | Rules for the generated architecture diagrams (HLD/LLD/DFD/ERD) |

Everything is also indexed from the [docs home](docs/index.md).

## Contributing

```bash
git clone https://github.com/permanu/superskill.git
cd superskill
npm install
npm run lint              # tsc --noEmit
npm run build             # explicit tsc + vendored parser build
npm test                  # rebuild, then Vitest including built CLI/MCP tests
npm run test:coverage     # rebuild, test, enforce coverage thresholds
npm run validate:rules    # node dist/rules/cli.js validate
```

Rule authoring follows `docs/authoring/CONTRACT.md`: one falsifiable decision per file, primary sources required, compilable Bad/Good snippets, and `status: verified` only after independent verification. See `CONTRIBUTING.md` for the PR workflow.

For native `SKILL.md` files, use the [template](docs/SKILL-TEMPLATE.md) and the `skill validate` profile. Structural validation and unit fixtures establish only the deterministic cases they exercise; even a green result does not establish model effectiveness or compatibility with every harness. Model behavior remains unproven until separate evaluations complete; fixtures or runner scaffolding alone are not a paid-model result. Only report behavior for the exact tested model/harness matrix. See [Anthropic's skill-authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices).

## License

Apache-2.0 — [LICENSE](./LICENSE) · [NOTICE](./NOTICE)

Copyright 2026 Permanu (Atharva Pandey)
