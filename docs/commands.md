# CLI reference

All commands work as `superskill <command>`. Many commands accept `-p, --project <slug>`; the project is auto-detected from the current directory when omitted. Every command supports `--help`, and the [MCP tools](mcp-tools.md) mirror most of this surface.

## Vault

| Command | Purpose | Common flags |
|---|---|---|
| `read <path>` | Read a vault note | |
| `list <path>` | List a vault directory | `-d, --depth <n>` |
| `write <path>` | Write/create a note | `-c, --content`, `-m, --mode overwrite\|append\|prepend` (default `append`), `-f, --frontmatter <json>` |
| `append <path>` | Append to a note | `-c, --content` |
| `search <query>` | FTS5 vault search, project-scoped | `-p, --project`, `-l, --limit`, `-s, --structured` |
| `context` | Project context document | `-p, --project`, `-d, --detail summary\|full` |

`write --mode overwrite` snapshots the previous version to `_versions/` first.

## Project memory

| Command | Purpose | Common flags |
|---|---|---|
| `init <project-path>` | Scan a repo and print a draft `context.md` (does not write) | `-s, --slug` |
| `decide` | Log an ADR | `-t, --title`, `--decision`, `--context`, `--alternatives`, `--consequences` |
| `task list\|add\|update\|board` | Kanban tasks | `-s, --status`, `--priority p0\|p1\|p2`, `--assigned-to`, `--blocked-by`, `--tags` |
| `learn add\|list` | Capture/query learnings | `-t, --title`, `-d, --discovery`, `--tags`, `--confidence high\|medium\|low`, `--tag` |
| `brainstorm <topic>` | Start or continue a brainstorm doc | `-c, --content` |
| `session register\|heartbeat\|complete\|list` | Multi-agent session registry | `--tool`, `--task`, `--files`, `--summary`, `--outcome`, `--tasks`, `--workspace`, `--allow-shared`, `--blocked`, `--partially-completed`, `--verification-run` |
| `resume` | Recent sessions, blocked work, next steps | `-l, --limit`, `--json` |
| `stats` | File counts and task breakdown | |
| `prune` | Archive/delete stale content | `-a, --all`, `-m, --mode dry-run\|archive\|delete`, `--sessions <days>`, `--done-tasks <days>` |
| `deprecate <path>` | Mark a vault item deprecated | `-r, --reason` |

Sessions carry a TTL'd exclusive claim on their `workspace_path`: a second agent registering the same workspace gets the holder's tool/task back instead of silently co-tenanting, unless it passes `allow_shared`. Heartbeats refresh the claim and report file overlaps (including `files_touched` updates); sessions that stop heartbeating become `expired` and their worktrees become eligible for the completed-worktree cleanup, which never removes a worktree with a live pid or a completion younger than 60 seconds.

## Knowledge graph

| Command | Purpose | Common flags |
|---|---|---|
| `graph rebuild` | Rebuild SQLite FTS5 + edges from markdown | |
| `graph viz` | Write Mermaid architecture notes and generated code notes under `projects/<slug>/` | `--open` opens the project in Obsidian; shorthand `superskill viz` |
| `graph related <path>` | Backlinks and outgoing links | `--hops <n>` |
| `graph cross-project <query>` | Project-jailed search; cross-project is denied | `-l, --limit` |
| `graph node <id>` | Metadata + edges for one traversal node | `--json` |
| `graph children <id>` | One-level lazy descent (vault/rules/skills/code) | `--limit <n>` |
| `graph resolve <task>` | What would load: paths + byte/token estimates, no content | `--limit <n>` |
| `graph open <id>` | Content for exactly one node | `--full` |

## Skills

| Command | Purpose | Common flags |
|---|---|---|
| `skill init` | Detect stack, index the catalog, build `.superskill/graph.json`, update `.gitignore` + `AGENTS.md`/`CLAUDE.md` | `--bridge` |
| `skill activate [task]` | Load packs for a task | `--skill-id <id>` |
| `skill install <source>` | Install skills from a GitHub repo; audits must be all-pass unless `--allow-unaudited` | `--select <names>`, `--allow-unaudited` |
| `skill list` | List installed skills | |
| `skill remove <name>` | Remove an installed skill | |
| `skill status` | Graph state: skills, weights, recent sessions | |
| `onboard` | One-shot: create the vault, detect tools, configure clients | `--vault-path` |

## Gates

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

## Code graph

| Command | Purpose | Common flags |
|---|---|---|
| `impact <target>` | Definitions, importers, callers, and shortest path for a file or symbol | `-t, --to`, `-r, --root` |
| `claims` | Verify structured claims against a deterministic scan | `-c, --claims <json>`, `-r, --root` |

## Setup

| Command | Purpose | Common flags |
|---|---|---|
| `setup` | Auto-configure detected AI clients | `--all`, `--clients`, `--dry-run`, `--check`, `--force`, `--vault-path` |
| `upgrade` | Reconcile managed launchers, legacy aliases, and instruction blocks (also runs automatically at MCP start) | `--dry-run`, `--json` |
| `teardown` | Remove SuperSkill configuration | `--clients`, `--dry-run`, `--silent` |
| `register [path]` | Map a repo to a vault project so commands auto-detect without `-p` (also done by `skill init`) | `-s, --slug <name>` |
| `doctor` | Health check: install vs running MCP servers, vault, mapping, graph isolation, catalog, toolchains, telemetry, clients | `--json` |

## Telemetry

Local, opt-in rule-selection telemetry. Off by default; nothing leaves the machine — events are append-only JSONL under `~/.superskill/telemetry/` and prompts are stored only as truncated SHA-256 hashes.

| Command | Purpose |
|---|---|
| `telemetry status` | Show whether telemetry is enabled and how many events exist |
| `telemetry enable` / `disable` | Opt in or out; existing events are not deleted |
| `telemetry report` | Top-selected, most-dropped, and never-triggered rules; budget stats |
| `telemetry clear` | Delete all local events |

Set `SUPERSKILL_TELEMETRY=1` (or `0`) to override the persisted setting for one process.

## Hygiene

Read-only space report: what is worth reclaiming, what is due, and the exact command for each item. Deletes nothing.

| Command | Purpose | Common flags |
|---|---|---|
| `hygiene` | Machine-wide space hygiene report across caches, worktrees, docker, xcode, and agent scratch | `--due`, `--sizes`, `--category <names...>`, `--json` |

## Watchdog

Session review + environment optimization: dig for findings, fix what you approve.

| Command | Purpose | Common flags |
|---|---|---|
| `watchdog dig` | Analyze a session, a window of sessions, or the machine environment; writes a `watchdog/` report note | `--session <id>` / `--scope session\|window\|env\|all` / `--since 7d` / `--count <n>` / `--all-projects` / `--tool <harness>` / `--no-persist` / `--json` |
| `watchdog fix` | Apply approved findings and reclaim leaks; dry-run unless `--apply`, quarantine + manifest undo | `--finding <ids...>` / `--category <names...>` (incl. `leaked-tmp`) / `--dismiss` / `--apply` / `--json` |
| `watchdog status` | Past digs, open findings, recurrence counts, detected trace sources | `--json` |
