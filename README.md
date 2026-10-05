# SuperSkill

One-entry orchestrator for coding agents: deterministic rule planning, evidence gates, a project-jailed vault, and a local knowledge graph. Curated packs — not a dump of 90k remote skills.

[![npm](https://img.shields.io/npm/v/superskill)](https://www.npmjs.com/package/superskill)
[![license](https://img.shields.io/badge/license-Apache--2.0-blue)](https://www.apache.org/licenses/LICENSE-2.0)

Prompt normally. Call **`superskill`** with the task. It diagnoses, then loads a combination — Go → Go pack, QA → QA, security bug → review + security — and returns a system brief plus a deterministic rule plan. Defaults: careful-minimal, algorithm-correct, **systems thinking**. Open design branches **grill the human** (HITL). Factory packs (plan, TDD, verify, SRE, grill) are ours.

Everything is local-first: the vault is markdown under `projects/<slug>/`, the search index is derived SQLite, and vault IO is jailed to the current project.

Requires **Node 22+** (`node:sqlite`).

## Why

Marketplace skill dumps fill the window with advice that does not know *this* system. Review and security need:

- **Vertical** — this project's ADRs, learnings, sessions
- **Horizontal** — callers, sibling paths, co-activations
- **Fresh** — session complete + `learn`

SuperSkill injects a system brief from the project graph, jails vault IO to `projects/<this-slug>/`, and keeps `.superskill/` **gitignored** so each developer's trajectory stays private.

## Quick start

```bash
npm install -g superskill          # Node 22+

# in your repo
superskill-cli skill init          # detect stack, index the in-repo catalog, build .superskill/graph.json
superskill-cli setup               # register MCP + instructions in every detected AI client
```

1. `skill init` detects the stack, indexes the in-repo catalog (not skills.sh), writes `.superskill/graph.json`, appends `.superskill/` to `.gitignore`, and adds a short SuperSkill block to an existing `AGENTS.md` / `CLAUDE.md`.
2. `setup` finds installed clients and writes the MCP entry (plus an instruction file where the client supports one) for each. Use `--dry-run` to preview, `--clients claude-code,cursor` to target, `--force` to overwrite.
3. Describe the task. The router picks packs by language, phase, and specialists; content is budgeted, and review/audit/diff tasks (and security bugs) also get the vault brief plus a caller protocol.
4. Activations write `.superskill/graph.json` (local only).

Want a vault context document too? `superskill-cli init .` prints a draft `context.md`; review it, then save it with `superskill-cli write`.

### MCP configuration

Prefer the installed binary over `npx -y` so the client runs this version. `setup` writes `npx -y superskill` entries by default; both forms work.

**Claude Code / Claude Desktop** — `~/.claude.json`, or `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS:

```json
{
  "mcpServers": {
    "superskill": {
      "command": "superskill",
      "env": { "VAULT_PATH": "~/Vaults/ai" }
    }
  }
}
```

**Cursor** — `~/.cursor/mcp.json` (same `mcpServers` shape):

```json
{
  "mcpServers": {
    "superskill": {
      "command": "superskill",
      "env": { "VAULT_PATH": "~/Vaults/ai" }
    }
  }
}
```

**OpenCode** — `~/.config/opencode/opencode.json`:

```json
{
  "mcp": {
    "superskill": {
      "type": "local",
      "command": ["superskill"],
      "environment": { "VAULT_PATH": "~/Vaults/ai" }
    }
  }
}
```

**Codex CLI** — `~/.codex/config.toml`:

```toml
[mcp_servers.superskill]
command = "npx"
args = ["-y", "superskill"]

[mcp_servers.superskill.env]
VAULT_PATH = "~/Vaults/ai"
```

Claude Code plugin: `/plugin marketplace add permanu/superskill` then `/plugin install superskill`.

Then prompt normally and call the `superskill` tool with the task.

## Core concepts

### Constitution

`catalog/constitution.md` holds the T0 axioms — always-on principles such as evidence-before-done, parse-at-boundaries, no-secrets, and verified-only injection. Each axiom names the mechanism that enforces it (gate check, validator, security scanner, router, review). The harness hook can inject it at session start; it is not something you load manually.

### The Plan

`superskill` never dumps rules. A deterministic router builds a plan from explicit keys:

- **Language scope** — project stack, task words, and the extensions of the `files` you pass. Rules for other languages are not eligible.
- **Phase** — inferred from the task: `deploy`/`release`/`ship` → ship, `review`/`refactor`/`audit`/`diff` → review, `add`/`build`/`create`/`implement` → implement, `brainstorm`/`plan`/`design` → explore.
- **Eligibility** — only `status: verified` rules by default; drafts are pull-only.
- **Ranking** — severity (`must` → `should` → `prefer`), then score (file match 100, keyword 10, symbol 1), then rule id.
- **Budget** — a phase-sized token budget; rules that do not fit are reported in `dropped`, never silently cut.
- **Explain** — every selection carries the keys that matched it.

The response's `rules_plan` is the audit trail: `selected`, `explain`, `dropped`, `budget`.

### Flows

Plans carry a `flows` slot for named multi-step procedures alongside the rule set. The enforced flow today is the gate pipeline — spec → tickets → evidence → gate check — where every step is a command with a deterministic outcome.

### Gates

Work is not "done" because a model says so. The gate pipeline is:

1. **Spec** — a fixed skeleton (goal, non-goals, constraints, context, files, acceptance, risks, rollback). Approve requires zero gaps; freeze pins a content hash and makes the spec immutable.
2. **Tickets** — derived from a frozen spec. Each ticket carries acceptance criteria (each needs a command or a manual reason), `blocked_by`, an optional review requirement, and an evidence slot.
3. **Evidence** — appended per ticket with command, exit code, truncated output, commit, and timestamp.
4. **Gate check** — deterministic pass/fail on a spec or ticket, exiting non-zero on failure. No LLM in the loop.

### Code graph

A deterministic, local-only code graph built with tree-sitter WASM. No LLM, no network, no native modules. Every edge is tagged **EXTRACTED** (read directly from an AST) or **INFERRED** (resolved by a rule or heuristic), so verification can restrict itself to facts that are true by construction. Use it through `impact` and `claims`.

### Vault

Markdown under `~/Vaults/ai/projects/<slug>/` is the source of truth. SQLite FTS5 + an edges table is a derived index (porter stemming: `authorize` hits `Authorization`), rebuilt from markdown on write and via `graph rebuild`. The project is auto-detected from the current directory (git root + `project-map.json`); override with `--project`.

### Project isolation

- Vault IO is jailed to `projects/<slug>/`. Sibling projects are denied.
- `search` and `graph cross-project` stay inside the current slug — cross-project search is denied, not just discouraged.
- `VAULT_PATH` must resolve under your home directory.
- Secret-like writes throw `SECRET_REJECTED` before touching disk.
- `.superskill/` is per-developer and gitignored.

### Packs

| Pack | When |
|------|------|
| `pipeline/delivery` + `norms` | Always. Diagnose, then load a combination — not a 10-step ritual |
| `optimizer/algorithm` | Always. Invariant, O(…), HLD/LLD that pay rent |
| `memory/graph` | Always (tiny). This project's vault only |
| `security/index` | Tiny always-on. Full `compliance` on audit / OWASP / security bugs |
| `code/<lang>` | This repo's stack, or the task names a language |
| `review/architect` | Review / diff / security fix — 18 axes |
| `pipeline/plan` `tdd` `verify` `investigate` `qa` | Spec, TDD, evidence-before-done, debug, Chrome QA |
| `devops/cloud` `devops/sre` | Deploy / SLO / incident — the cloud this repo already uses |

skills.sh remains **opt-in install** (`skill install`), not the default catalog.

## CLI reference

All commands work as `superskill-cli <command>`. Many commands accept `-p, --project <slug>`; the project is auto-detected from the current directory when omitted.

### Vault

| Command | Purpose | Common flags |
|---|---|---|
| `read <path>` | Read a vault note | |
| `list <path>` | List a vault directory | `-d, --depth <n>` |
| `write <path>` | Write/create a note | `-c, --content`, `-m, --mode overwrite\|append\|prepend` (default `append`), `-f, --frontmatter <json>` |
| `append <path>` | Append to a note | `-c, --content` |
| `search <query>` | FTS5 vault search, project-scoped | `-p, --project`, `-l, --limit`, `-s, --structured` |
| `context` | Project context document | `-p, --project`, `-d, --detail summary\|full` |

`write --mode overwrite` snapshots the previous version to `_versions/` first.

### Project memory

| Command | Purpose | Common flags |
|---|---|---|
| `init <project-path>` | Scan a repo and print a draft `context.md` (does not write) | `-s, --slug` |
| `decide` | Log an ADR | `-t, --title`, `--decision`, `--context`, `--alternatives`, `--consequences` |
| `task list\|add\|update\|board` | Kanban tasks | `-s, --status`, `--priority p0\|p1\|p2`, `--assigned-to`, `--blocked-by`, `--tags` |
| `learn add\|list` | Capture/query learnings | `-t, --title`, `-d, --discovery`, `--tags`, `--confidence high\|medium\|low`, `--tag` |
| `brainstorm <topic>` | Start or continue a brainstorm doc | `-c, --content` |
| `session register\|heartbeat\|complete\|list` | Multi-agent session registry | `--tool`, `--task`, `--files`, `--summary`, `--outcome`, `--tasks` |
| `resume` | Recent sessions, blocked work, next steps | `-l, --limit`, `--json` |
| `stats` | File counts and task breakdown | |
| `prune` | Archive/delete stale content | `-a, --all`, `-m, --mode dry-run\|archive\|delete`, `--sessions <days>`, `--done-tasks <days>`, `--todos <days>` |
| `deprecate <path>` | Mark a vault item deprecated | `-r, --reason` |
| `todo …` | **Deprecated** — use `task` | |

### Knowledge graph

| Command | Purpose | Common flags |
|---|---|---|
| `graph rebuild` | Rebuild SQLite FTS5 + edges from markdown | |
| `graph viz` | Write `knowledge-graph.html`, `knowledge-graph.canvas`, `architecture-diagrams.html` | |
| `graph related <path>` | Backlinks and outgoing links | `--hops <n>` |
| `graph cross-project <query>` | Project-jailed search; cross-project is denied | `-l, --limit` |
| `qa viz` | Regenerate the graph HTML and click through it in system Chrome | |

### Skills

| Command | Purpose | Common flags |
|---|---|---|
| `skill init` | Detect stack, index the catalog, build `.superskill/graph.json`, update `.gitignore` + `AGENTS.md`/`CLAUDE.md` | `--bridge` |
| `skill activate [task]` | Load packs for a task | `--skill-id <id>` |
| `skill install <source>` | Install skills from a GitHub repo | `--select <names>` |
| `skill list` | List installed skills | |
| `skill remove <name>` | Remove an installed skill | |
| `skill status` | Graph state: skills, weights, recent sessions | |
| `onboard` | One-shot: create the vault, detect tools, configure clients | `--vault-path` |

### Gates

| Command | Purpose | Common flags |
|---|---|---|
| `spec create` | Draft a spec skeleton | `-t, --title`, `--goal`, `--non-goals`, `--constraints`, `--context`, `--allowed-files`, `--forbidden-files`, `--acceptance`, `--risks`, `--rollback` |
| `spec status <ref>` | Gaps and hash state | |
| `spec approve <ref>` | Approve a gap-free spec | |
| `spec freeze <ref>` | Freeze an approved spec (pins content hash) | |
| `spec list` | List project specs | |
| `tickets create` | Create tickets from a frozen spec | `--spec <ref>`, `--tickets <json>` |
| `tickets list\|board\|ready\|update` | List / kanban / unblocked in topological order / update status | `-s, --status` |
| `evidence add <ticket>` | Append evidence (command, exit, output, commit) | `-c, --command`, `--exit`, `--output`, `--commit`, `--cwd` |
| `evidence list <ticket>` | Read evidence records | |
| `gate check <target>` | Check a spec or ticket; exits non-zero on failure | `--ci`, `--head`, `--cwd` |

### Code graph

| Command | Purpose | Common flags |
|---|---|---|
| `impact <target>` | Definitions, importers, callers, and shortest path for a file or symbol | `-t, --to`, `-r, --root` |
| `claims` | Verify structured claims against a deterministic scan | `-c, --claims <json>`, `-r, --root` |

### Setup

| Command | Purpose | Common flags |
|---|---|---|
| `setup` | Auto-configure detected AI clients | `--all`, `--clients`, `--dry-run`, `--force`, `--vault-path` |
| `teardown` | Remove SuperSkill configuration | `--clients`, `--dry-run`, `--silent` |

### Telemetry

Local, opt-in rule-selection telemetry. Off by default; nothing leaves the machine — events are append-only JSONL under `~/.superskill/telemetry/` and prompts are stored only as truncated SHA-256 hashes.

| Command | Purpose |
|---|---|
| `telemetry status` | Show whether telemetry is enabled and how many events exist |
| `telemetry enable` / `disable` | Opt in or out; existing events are not deleted |
| `telemetry report` | Top-selected, most-dropped, and never-triggered rules; budget stats |
| `telemetry clear` | Delete all local events |

Set `SUPERSKILL_TELEMETRY=1` (or `0`) to override the persisted setting for one process.

## MCP tools

The MCP server exposes the tools below. The CLI covers the same surface plus `setup`/`teardown`; tool names use underscores.

| Tool | What it does |
|---|---|
| `superskill` | Route a task to packs + a deterministic rule plan. Params: `task`, `skill_id`, `files`. |
| `read` | Read a file or directory listing from the vault. |
| `write` | Write/append/prepend a vault file (default append). |
| `search` | FTS5 search scoped to this project; structured mode matches frontmatter. |
| `project_context` | Project context document (auto-detects from CWD). |
| `generate_context` | Scan a repo and return a draft `context.md` (does not write). |
| `decide` | Log an ADR to the project's decisions directory. |
| `task` | Add/list/update/board project tasks. |
| `learn` | Capture/list learnings. |
| `brainstorm` | Start/continue a brainstorm document. |
| `session` | Register/heartbeat/complete/list agent sessions; `complete` writes a session note. |
| `resume` | Recent sessions, interrupted work, in-progress tasks, next steps. |
| `stats` | Project content statistics. |
| `prune` | Archive/delete stale content by retention policy (dry-run first). |
| `deprecate` | Mark a vault item deprecated with a reason. |
| `init` | Initialize SuperSkill for the current project (stack, catalog, graph). |
| `status` | Knowledge graph state: skills, weights, recent sessions. |
| `telemetry` | Local, opt-in rule-selection telemetry: `status`/`enable`/`disable`/`report`/`clear`. |
| `skill_install` | Install skills from a GitHub repo. |
| `skill_list_installed` | List locally installed skills. |
| `skill_remove` | Remove an installed skill by name. |
| `link` | Append a `[[wikilink]]` between two vault notes. |
| `extract` | Extract items from a source document into individual vault files. |
| `capture` | Batch-capture insights into individual vault items. |
| `template` | Pre-filled templates for common vault item types. |
| `graph_related` | Related notes via the FTS/edges index, jailed to this project. |
| `graph_cross_project` | Project-jailed search; cross-project is denied. |
| `knowledge_rebuild` | Rebuild the project's FTS + edges index from markdown. |
| `knowledge_viz` | Write `knowledge-graph.html` and `knowledge-graph.canvas`. |
| `qa_viz` | Regenerate the graph HTML and drive system Chrome to verify it. |
| `snapshot_repo_state` | Snapshot git state (branch, dirty files, last commit) into the vault. |
| `env_facts` | Store/query stable environment facts (not secrets). |
| `cred_refs` | Store pointers to where credentials are documented. |
| `rollback` | Manage rollback checkpoints (commit, purpose, scope, follow-up). |
| `spec` | Deterministic plan specs: create/status/approve/freeze/list. |
| `tickets` | Tickets from frozen specs: create/list/board/ready/update. |
| `evidence` | Record/read ticket evidence. |
| `gate` | Deterministic evidence gate for a spec or ticket. |
| `impact` | Code-graph impact: definitions, importers, callers, shortest path. |
| `claims` | Verify structured claims against a code-graph scan. |

## Workflows

### Gates walkthrough

```bash
# 1. Draft a spec. Gaps are reported back; nothing is enforced yet.
superskill-cli spec create -t "Add OAuth login" \
  --goal "Users sign in through the company IdP" \
  --non-goals "No SAML, no SCIM" \
  --constraints "No new runtime dependencies" \
  --context "Auth is currently password-only" \
  --allowed-files "src/auth/**" "src/routes/login.ts" \
  --forbidden-files "src/db/**" \
  --acceptance "Login redirects to the IdP | run: npm test -- auth" \
  --acceptance "Error copy matches the design | manual: design review" \
  --risks "IdP outage blocks all logins" \
  --rollback "Revert the merge commit"

# 2. Fill every gap, approve, then freeze (freeze pins the content hash).
superskill-cli spec status 001
superskill-cli spec approve 001
superskill-cli spec freeze 001

# 3. Derive tickets from the frozen spec.
superskill-cli tickets create --spec 001 --tickets '[
  { "title": "Add IdP redirect",
    "acceptance": [{ "text": "Redirect works", "command": "npm test -- auth" }] },
  { "title": "Handle callback errors",
    "acceptance": [{ "text": "Copy reviewed", "manual": "design review" }],
    "requires_review": true }
]'
superskill-cli tickets ready

# 4. Record evidence at HEAD, then gate.
superskill-cli evidence add ticket-001 -c "npm test -- auth" --output "42 passed"
superskill-cli gate check ticket-001     # exit 0 only when the gate passes
superskill-cli gate check --ci 001       # JSON output for CI
```

What the gate enforces:

- **Spec** — every skeleton field filled, acceptance items valid, status `frozen`, stored hash matches content.
- **Ticket** — acceptance present and valid; spec frozen and unchanged since ticket creation (`spec_hash`); latest evidence recorded at the current git HEAD with exit 0; a passing review record (`review` / `review:<verdict>`) when `requires_review` is set.

`evidence add` defaults `--commit` to git HEAD and truncates stored output. Use `--head` to override the HEAD used by a gate check.

### Rule planning

Rule selection is deterministic and explainable. Pass `files` (repo-relative) so file-triggered rules are selected without guessing:

```jsonc
// MCP tool call
{ "task": "harden the upload retry path", "files": ["src/upload/s3.ts"] }
```

The response includes `rules_plan`:

- `selected[]` — `{ id, title, reason }`; `reason` lists matched keys: `file <glob> (Nx)`, `keyword '<term>' (Nx)`, `symbol '<Name>' (Nx)`.
- `explain[]` — one derivation line per rule: `rule <id> selected: <matches>, severity <must|should|prefer>`.
- `dropped[]` — `{ id, reason: "oversized" | "budget", tokens }`.
- `budget` — `{ allocated, used }`.

Only `status: verified` rules are eligible by default, so a catalog with no verified rules returns an empty `selected` list — the plan is honest about it rather than injecting drafts. Authoring and verification rules live in `docs/authoring/CONTRACT.md`; validate the catalog with `npm run validate:rules`.

## Knowledge graph

Two graphs, one project scope:

### Vault FTS + edges

Markdown is the source of truth; `projects/<slug>/.knowledge-index.sqlite` is a derived FTS5 index with an edges table (frontmatter `related` + `[[wikilinks]]`). It is rebuilt on write and by `graph rebuild`. `graph related <path>` reads backlinks/outgoing links from the index (`--hops` for traversal depth).

```bash
superskill-cli graph rebuild -p my-project
superskill-cli graph viz -p my-project
superskill-cli qa viz -p my-project
```

`graph viz` writes `projects/<slug>/knowledge-graph.html` (tabs **Graph · HLA · LLA · ERD · Modules**; keys `g` `h` `l` `e` `m`), `knowledge-graph.canvas` for Obsidian (vault root = `VAULT_PATH`), and `architecture-diagrams.html`. `qa viz` drives system Chrome via `playwright-core` (in-harness, not a plugin) to click nodes and read the panel.

### Code graph: impact and claims

```bash
superskill-cli impact src/lib/codegraph/scan.ts
superskill-cli impact Reporter --to normalize
superskill-cli claims -c '[{"kind":"symbol-exported","name":"Reporter","file":"src/lib/codegraph/query.ts"}]'
```

`impact` returns EXTRACTED definitions, importers, INFERRED callers, and the shortest graph path between two targets. `claims` verifies structured claims (`file-exists`, `symbol-exists`, `symbol-exported`, `import-resolves`, `no-other-importers`, `no-other-callers`) and returns `verified` / `refuted` / `unverifiable` with node ids and edge confidence; it exits non-zero when any claim is refuted.

### Confidence model

| Edge | Confidence | Why |
|---|---|---|
| `defines` | EXTRACTED | lexical containment in the AST |
| `imports` module → imported specifier | EXTRACTED | the import statement names it |
| `exports` | EXTRACTED | export modifier read from the AST |
| `imports` module → module | INFERRED | specifier resolution (path heuristics) |
| `references` | INFERRED | identifier use resolved by name |
| `calls` | INFERRED | callee resolved by name |

Verification should only trust EXTRACTED edges — they are exactly what the AST states. Resolution-derived knowledge is INFERRED and may be wrong for overloads, shadowing, or name collisions. See `docs/authoring/codegraph.md` for the full data model and per-language limits.

## Harness hooks

Both hooks are optional and non-breaking: a missing constitution, CLI, or gate command never blocks a session or commit.

- **Session start** — `hooks/session-start.sh` reads `catalog/constitution.md` and emits it as session context. `hooks/session-start.sh --claude-code` prints the Claude Code SessionStart JSON; copy `hooks/claude-settings.example.json` into `.claude/settings.json` to wire it up. Other harnesses can run the script and inject stdout.
- **Pre-commit** — `hooks/pre-commit.sh` runs the gate check when the CLI and `gate` command exist; otherwise it prints a hint and exits 0. `git commit --no-verify` bypasses it once, `SUPERSKILL_GATE=off` keeps it installed but skips the check, and `SUPERSKILL_CLI` overrides the CLI command.
- **CI** — `.github/workflows/ci.yml` runs a fast schema-only `validate --no-compile`, then a per-language toolchain matrix (`validate --lang <lang> --strict`) that compiles every Bad/Good snippet with the real compiler. `--strict` fails a job instead of silently skipping when a toolchain is missing.

Details and installation snippets: `docs/harness.md`.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `VAULT_PATH` | `~/Vaults/ai` | Knowledge vault. Must resolve under `$HOME`. |
| `MAX_INJECT_TOKENS` | `1500` | Max tokens for context injection (clamped 100–50000). |
| `SESSION_TTL_HOURS` | `2` | Session heartbeat TTL (clamped 1–168). |
| `CHROME_PATH` | macOS Chrome | Browser used by `qa viz`; Chromium/Brave paths are also probed. |
| `SUPERSKILL_TELEMETRY` | unset | `1`/`0` override for local rule-selection telemetry (also `telemetry enable`). |
| `SUPERSKILL_RUST_HARNESS_DIR` | `~/.superskill/cache/rust-harness` | Warm cargo fixture used by the rules compile harness. |
| `SUPERSKILL_JAVA_JAR_CACHE` | `~/.superskill/cache/jars` | JUnit/JMH jars used by the Java compile harness. |

npm publish is **manual** (`npm publish` on a maintainer machine). CI does not ship tokens.

## Security

- **Vault jail** — paths are rewritten under `projects/<slug>/`; traversal and symlink escapes are rejected; sibling projects are denied. `VAULT_PATH` is bounded to the home directory.
- **Secret scanner** — `write` blocks secret-like content with `SECRET_REJECTED` before anything is stored.
- **Audit gate** — skills with a `fail` audit status (gen / socket / snyk) are blocked at load; medium-risk findings surface as warnings. Fail-closed: a blocked skill is not injected.
- **Prompt-injection scan** — skill content is scanned before injection for override, exfiltration, secrecy, and destructive-command patterns; hard blocks are dropped with a warning.
- **MCP rate limit** — write tools are limited to 30 operations per minute per server.

## Contributing

```bash
git clone https://github.com/permanu/superskill.git
cd superskill
npm install
npm run lint              # tsc --noEmit
npm test                  # vitest
npm run build             # tsc
npm run validate:rules    # node dist/rules/cli.js validate
```

Rule authoring follows `docs/authoring/CONTRACT.md`: one falsifiable decision per file, primary sources required, compilable Bad/Good snippets, and `status: verified` only after independent verification. See `CONTRIBUTING.md` for the PR workflow.

## License

Apache-2.0 — [LICENSE](./LICENSE) · [NOTICE](./NOTICE)

Copyright 2026 Permanu (Atharva Pandey)
