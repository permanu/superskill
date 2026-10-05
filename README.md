# SuperSkill

One-entry orchestrator for coding agents: deterministic rule planning, evidence gates, a project-jailed vault, a local knowledge graph, and safe cache sharing across agent worktrees. Curated packs — not a dump of 90k remote skills.

[![npm](https://img.shields.io/npm/v/superskill)](https://www.npmjs.com/package/superskill)
[![license](https://img.shields.io/badge/license-Apache--2.0-blue)](https://www.apache.org/licenses/LICENSE-2.0)

Prompt normally. Call **`superskill`** with the task. It diagnoses, then loads a combination — Go → Go pack, QA → QA, security bug → review + security — and returns a system brief plus a deterministic rule plan. Defaults: careful-minimal, algorithm-correct, **systems thinking**. Open design branches **grill the human** (HITL). Factory packs (plan, TDD, verify, SRE, grill) are ours.

Everything is local-first: the vault is markdown under `projects/<slug>/`, the search index is derived SQLite, and vault IO is jailed to the current project.

Requires **Node 22.13+** (`node:sqlite`).

## Why

Marketplace skill dumps fill the window with advice that does not know *this* system. Review and security need:

- **Vertical** — this project's ADRs, learnings, sessions
- **Horizontal** — callers, sibling paths, co-activations
- **Fresh** — session complete + `learn`

SuperSkill injects a system brief from the project graph, jails vault IO to `projects/<this-slug>/`, and keeps `.superskill/` **gitignored** so each developer's trajectory stays private.

## Quick start

```bash
npm install -g superskill          # Node 22.13+

# in your repo
superskill-cli skill init          # detect stack, index the in-repo catalog, build .superskill/graph.json
superskill-cli setup               # register MCP + instructions in every detected AI client
```

Two commands ship: **`superskill-cli`** for everything you run yourself (`setup`, `doctor`, `skill`, …), and **`superskill`** — the MCP server your AI client launches; you rarely call it directly (its `--version`/`--help` work if you do).

1. `skill init` detects the stack, indexes the in-repo catalog (not skills.sh), writes `.superskill/graph.json` (project-local, gitignored), registers the repo in the vault map (`project-map.json`) so vault commands auto-detect without `-p`, appends `.superskill/` to `.gitignore`, and adds a short SuperSkill block to an existing `AGENTS.md` / `CLAUDE.md`.
2. `setup` finds installed clients and writes the MCP entry, instruction file, and slash commands (`/review`, `/worktree`, `/watchdog`, `/superskill`) for each host that supports them — plus the harness-agnostic `superskill` skill at `~/.agents/skills/superskill/SKILL.md` so hosts with skill discovery list it. Use `--dry-run` to preview, `--clients claude-code,cursor` to target, `--force` to overwrite.
3. Describe the task — or use a shortcut: `/review [scope]` (18-axis review; empty scope = whole project), `/worktree [status|audit|gc]`, `/watchdog [dig|fix]`, `/superskill <task>`. The router picks packs by language, phase, and specialists; content is budgeted, and review/audit/diff/defect tasks (and security bugs) also get the vault brief plus a caller protocol.
4. Activations write `.superskill/graph.json` (local only).

Want a vault context document too? `superskill-cli init .` prints a draft `context.md`; review it, then save it with `superskill-cli write`.

Verify any time with `superskill-cli doctor`: install vs running MCP servers, vault + project mapping, project graph isolation (fails if `.superskill/` is tracked), catalog validation, compile toolchains, telemetry, and MCP clients.

### Upgrade

```bash
npm install -g superskill@latest
superskill-cli setup        # refresh slash commands + the shared skill (idempotent)
```

`setup --force` also rewrites the MCP entry and instruction file. MCP servers pick up the new version on their next restart.

### Uninstall

```bash
superskill-cli teardown     # MCP entries, instructions, slash commands, shared skill
npm uninstall -g superskill
```

`teardown` supports `--dry-run` and `--clients <list>` and leaves your vault data (`VAULT_PATH`) untouched; project-local `.superskill/` state can be deleted per repo.

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

**Claude Code plugin** — `/plugin marketplace add permanu/superskill`, then `/plugin install superskill@superskill`. The plugin ships the `superskill` skill; run `superskill-cli setup` once to register the MCP server.

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
| `optimizer/adhd` `pipeline/lazy-build` | Output contract (terse, action-first) and build ladder (reuse → minimal) — deep dives under the always-on norms |
| `memory/graph` | Always (tiny). This project's vault only |
| `security/index` | Tiny always-on. Full `compliance` on audit / OWASP / security bugs |
| `code/<lang>` | This repo's stack, or the task names a language |
| `review/architect` | Review / diff / security fix — 18 axes |
| `pipeline/plan` `tdd` `verify` `investigate` `qa` | Spec, TDD, evidence-before-done, debug, Chrome QA |
| `devops/cloud` `devops/sre` | Deploy / SLO / incident — the cloud this repo already uses |
| `watchdog/dig` `watchdog/fix` | Session review + environment optimization — dig for findings, fix what you approve |

skills.sh remains **opt-in install** (`skill install`), not the default catalog.

## Worktree caches

An agent that spawns a git worktree per subagent pays twice: once when the first build starts from cold, and again when `target/`, `node_modules/`, `.venv/`, or `DerivedData/` are duplicated into every worktree. SuperSkill shares the inputs that are safe to share (package stores, compiler caches, module caches), isolates the state that must stay per worktree (build dirs, venvs, DerivedData), and makes a fresh worktree cheap by seeding it with copy-on-write copies instead of a cold build.

### Agent-first usage

No CLI is needed. Activate once per repo — the agent can do it via the MCP tool `worktree_activate` — and after that:

1. Every `git worktree add` fires a guarded `post-checkout` hook that seeds cheap caches (reflink copy where the filesystem supports it) and always exits 0; it never blocks or changes the checkout.
2. Host session hooks inject the shared-cache environment (Claude Code, Codex, Cursor, Gemini CLI, OpenCode, GrokBuild, plus a generic `AGENTS.md` fallback) when a session starts in a worktree.

MCP tools: `worktree_status`, `worktree_audit`, `worktree_env`, `worktree_activate`, `worktree_apply`, `worktree_gc`, `worktree_uninstall`. They mirror the CLI below one-for-one, with two exceptions: there is no `worktree bootstrap` MCP tool, and the MCP `worktree_gc` has no `--verbose` (per-path skip reasons stay CLI-only). An agent can still audit, apply, and collect caches without shelling out.

### What superskill will never do

- Never remove, prune, or move worktrees.
- Never run `git clean`, `git reset`, or `git checkout -f`.
- Never delete dirty, untracked, or ignored user files; never touch stashes, unpushed commits, submodules, or in-progress operations (merge / rebase / cherry-pick / revert / bisect).
- GC touches only the platform cache root, and only by moving directories into `_quarantine/` (reversible with `--undo`). Permanent deletion happens only on `gc --purge --yes`, and only inside `_quarantine/`.
- Worktree-local caches (`node_modules/`, `target/`, `DerivedData/`, …) are reclaimed only with explicit consent plus a seeded-file manifest audit; reclaims are renamed into `.git/superskill/quarantine/<id>` and can be restored.
- When state is unknown, keep it: skipping is always safer than deleting.

### How it works

- **Policy** — `.git/superskill/policy.json` (the repo's common git dir, so all worktrees share it). Records repo id, stacks, toolchain env flags, host list, and activation flags (`hooks`, `seed`, `install`). `hook.state`, `journal.jsonl`, and per-worktree manifests live beside it.
- **Cache payload** — `~/Library/Caches/superskill/<repoHash>` on macOS, `~/.cache/superskill/<repoHash>` (or `$XDG_CACHE_HOME`) on Linux, `%LOCALAPPDATA%\superskill\<repoHash>` on Windows; override the root with `SUPERSKILL_CACHE_ROOT`. Only shared caches live here — per-worktree build state stays in the worktree.
- **post-checkout flow** — `worktree activate` installs a guarded block into `.git/hooks/post-checkout` (or the configured `core.hooksPath`, husky, or `.lefthook-local.yml`). On a worktree-creating checkout it runs `superskill-cli worktree bootstrap --source worktree-create` in the background: seed cheap caches from the main worktree via reflink and record a manifest. The block always exits 0 and never changes the hook's exit status.
- **env injection flow** — host session hooks run `worktree bootstrap --source session`; the OpenCode plugin runs `worktree env --json` and merges the result into every shell. The resolved values are read-only cache locations plus per-worktree build-dir overrides; injection never edits the repo's own files.

### CLI reference

Every subcommand supports `--help`, e.g. `superskill-cli worktree gc --help`.

| Command | Purpose |
|---|---|
| `worktree status` | One-screen health: worktrees, safe/unsafe verdicts, cache size, policy + hook state, budget |
| `worktree audit` | Per-worktree safety verdict, cache duplication, manifest drift, repo items |
| `worktree env` | Print the shared-cache environment for this worktree |
| `worktree activate` | Write policy, install the post-checkout hook and host session adapters |
| `worktree apply` | Apply audit items (policy, hook, seed, prune); dry-run unless `--yes` |
| `worktree gc` | Cache GC: report, quarantine (`--apply`), purge (`--purge --yes`), undo |
| `worktree uninstall` | Remove hooks/adapters; keep policy, caches, and quarantine |
| `worktree bootstrap` | Hook-internal cache seed / env bootstrap (not usually run by hand) |

**Default is a dry-run report; nothing is deleted.** `gc` and `apply` plan first; `gc --apply` only quarantines (reversible); only `gc --purge --yes` permanently deletes, and only inside `_quarantine/`.

#### `worktree status`

Read-only. Options: `--json`; `--budget <size>` (e.g. `2G`, `500M`; notes when cache bytes exceed it).

```bash
superskill-cli worktree status
superskill-cli worktree status --budget 5G --json
```

#### `worktree audit`

Read-only. Options: `--json`; `--sizes` (du every cache dir); `--worktree <name>` (audit one worktree by path or name).

```bash
superskill-cli worktree audit --sizes
superskill-cli worktree audit --worktree feat-login --json
```

#### `worktree env`

Read-only. Options: `--json`; `--eval` (shell `export` lines, the form hooks use); `--shell <sh|fish|powershell>`; `--providers <ids...>` (restrict to detected toolchains such as `rust`, `go`, `node`, `python`, `swift`).

```bash
eval "$(superskill-cli worktree env --eval)"
superskill-cli worktree env --json
superskill-cli worktree env --providers rust node
```

#### `worktree activate`

Options: `--yes` (non-interactive consent); `--dry-run`; `--no-hooks`; `--no-seed`; `--hosts <ids...>` (`claude-code`, `opencode`, `codex`, `cursor`, `gemini`, `grokbuild`, `generic`); `--install`; `--json`. Detected hosts are used when `--hosts` is omitted.

```bash
superskill-cli worktree activate --dry-run
superskill-cli worktree activate --hosts claude-code,opencode
```

#### `worktree gc`

Options:

| Flag | Meaning | Default |
|---|---|---|
| `--all` | All repos in the cache root, not just this one | off |
| `--worktree <name>` | Resolve the repo from this worktree path or name | `$PWD` |
| `--project <name\|path>` | Scope to a vault-mapped project slug | off |
| `--tool <ids...>` | Only these tools (`rust`, `go`, `node`, `python`, `cpp`, `ruby`) | all |
| `--older-than <dur>` / `--min-age <dur>` | Minimum age (`30d`, `12h`, `2w`) | auto tier needs `30d` |
| `--newer-than <dur>` | Maximum age | off |
| `--min-size <size>` / `--max-size <size>` | Size gate (`500M`, `1G`, or bare bytes) | off |
| `--tier <auto\|consent\|both>` | Candidate tier | `both` |
| `--keep-latest <n>` | Keep the n most recent dirs per tool | off |
| `--include <glob...>` / `--exclude <glob...>` | Path globs relative to `<repoHash>/` | off |
| `--apply` | Quarantine selected dirs (reversible) | off (dry-run report) |
| `--purge`, `--yes` | Delete quarantine entries older than 14 days; `--yes` required | plan only |
| `--undo <journalId>` | Restore a quarantine journal | — |
| `--json`, `--verbose` | Machine-readable output / per-path skip reasons (CLI only) | off |

Tiering: `auto` (compiler/build caches such as `go-build`, `sccache`, `pnpm-store`, `uv`) is selected only when at least 30 days old unless you pass an explicit age or tier; `consent` (e.g. `cargo-build`, `node-modules`) requires `--tier consent` or an explicit age filter. Tool-native prunes (`go clean -cache`, `pnpm store prune`, `uv cache prune --ci`, …) are printed as informational commands — run them through the tool when you want them.

```bash
superskill-cli worktree gc                           # report for this repo (dry run)
superskill-cli worktree gc --older-than 30d --apply  # quarantine (reversible)
superskill-cli worktree gc --all --tool node,rust --min-size 1G --json
superskill-cli worktree gc --purge --yes             # delete quarantined dirs >= 14d old
superskill-cli worktree gc --undo 2026-10-05T12-00-00.000Z
```

Default is a dry-run report; nothing is deleted. `--apply` moves candidates into `_quarantine/` (reversible with `--undo`); only `--purge --yes` deletes, and only inside `_quarantine/`.

#### `worktree apply`

Options: `--item <ids...>` (audit ids such as `policy`, `hook`, `env`, `seed:<provider>:<relative>`, `prune:<tool>`, `reclaim:<provider>:<dir-id>`); `--all-safe`; `--yes`; `--undo <journalId>`; `--json`.

```bash
superskill-cli worktree apply --all-safe
superskill-cli worktree apply --item seed --yes
superskill-cli worktree apply --undo 2026-10-05T14-22-01.000Z-a1b2c3d4 --yes
```

Default is a dry-run report; nothing is deleted. `reclaim:<provider>:<dir-id>` items rename a worktree-local cache directory (`node_modules/`, `target/`, `DerivedData/`, …) into `.git/superskill/quarantine/<id>` (never a copy+delete); restore it with `worktree apply --undo <id>`. `--all-safe` skips consent items; name a consent item explicitly with `--item <id> --yes` to apply it. Reclaims and other mutations require `--yes` on the CLI or `confirm: true` on the MCP `worktree_apply` tool.

#### `worktree bootstrap`

Options: `--source <worktree-create|session>`; `--claude-env` (append exports to `$CLAUDE_ENV_FILE`); `--json`. Normally invoked by hooks and adapters; safe to run by hand to re-seed. Skips the main worktree, honors `SUPERSKILL_WORKTREE_BOOTSTRAP=0`, and requires an activated repo.

```bash
superskill-cli worktree bootstrap --source worktree-create
```

#### `worktree uninstall`

Options: `--purge-local` (quarantine this repo's cache namespace; needs `--yes`); `--yes`; `--json`.

```bash
superskill-cli worktree uninstall
superskill-cli worktree uninstall --purge-local --yes
```

Plain uninstall removes the post-checkout hook and host adapters and stops future seeding/env injection; it keeps the policy and touches no cache data. `--purge-local --yes` only moves this repo's cache namespace into quarantine (reversible with `worktree gc --undo <journalId>`); without `--yes` it is skipped.

### Filter cookbook

```bash
# This repo only (the default)
superskill-cli worktree gc

# A vault-mapped project by slug
superskill-cli worktree gc --project my-app

# Every repo in the cache root, keeping the newest dir per tool
superskill-cli worktree gc --all --keep-latest 1

# One tool, old entries only
superskill-cli worktree gc --tool rust --older-than 60d

# Age window
superskill-cli worktree gc --older-than 14d --newer-than 90d

# Size gate
superskill-cli worktree gc --all --min-size 500M

# Interactive TTY: read the report, then apply the same filters
superskill-cli worktree gc --all
superskill-cli worktree gc --all --older-than 30d --apply

# JSON for scripts
superskill-cli worktree gc --all --json | jq '.plan.selected[] | { path, bytes }'

# Undo a quarantine
superskill-cli worktree gc --undo <journalId>
```

### Host support matrix

| Host | Hook surface | What superskill writes | Notes |
|---|---|---|---|
| Claude Code | `SessionStart` hook | `.claude/settings.local.json` | runs `worktree bootstrap --source session --claude-env`, appending exports to `$CLAUDE_ENV_FILE` |
| OpenCode | `shell.env` plugin | `.opencode/plugins/superskill-worktree.js` | runs `worktree env --json` and merges the env into every shell |
| Codex CLI | `SessionStart` hook | `.codex/hooks.json` | env injected when the session starts |
| Cursor | `sessionStart` hook | `.cursor/hooks.json` | notes when a Claude Code bootstrap hook is already present (auto-import) |
| Gemini CLI | `SessionStart` hook | `.gemini/settings.json` | env injected when the session starts |
| GrokBuild | `SessionStart` hook | `.grokbuild/hooks.json` | hook surface unverified; relies on the MCP tools + git post-checkout hook |
| Generic | managed block in `AGENTS.md` | `AGENTS.md` (marker-delimited) | fallback when no host is detected; tells agents to run `worktree env --eval` |
| Git (universal) | `post-checkout` hook | `.git/hooks/post-checkout` or `core.hooksPath` | seeds caches after `git worktree add`; guarded and always exits 0 |

### Troubleshooting

- **First look** — `superskill-cli worktree status` shows repo id, worktrees with safe/unsafe reasons, cache size, policy/hook state, and hosts. Add `--budget 5G` to flag over-budget cache usage.
- **Drill down** — `superskill-cli worktree audit --sizes` shows every cache dir (local vs shared), plus seeded-manifest drift (`modified` / `missing`) for each worktree. Manifest drift is reported, never auto-fixed.
- **Per-path skip reasons** — `superskill-cli worktree gc --verbose` explains why each candidate was not selected.
- **Health check** — `superskill-cli doctor` includes worktree checks (policy active, guarded hook installed) alongside install, MCP wiring, vault, catalog, and toolchains; run it when worktree commands are missing after an upgrade.
- **Hook did not fire** — husky and lefthook are supported; a `.pre-commit-config.yaml` repo needs the post-checkout command added manually (the config is never rewritten). Re-run `worktree activate` after changing hook managers.
- **Where state lives** — policy, `hook.state`, `journal.jsonl`, and manifests under `.git/superskill/`; caches under the platform cache root (`SUPERSKILL_CACHE_ROOT` to move it); quarantined dirs under `<cacheRoot>/_quarantine/`.
- **Opt out** — `SUPERSKILL_WORKTREE_BOOTSTRAP=0` disables post-checkout seeding for one process; `superskill-cli worktree uninstall` removes hooks and adapters entirely.

### Uninstalling the worktree integration

```bash
superskill-cli worktree uninstall
```

This removes the post-checkout hook block and the host session adapters, and stops all future seeding and env injection. What remains: the policy at `.git/superskill/policy.json` and its journal (kept because deletion outside the quarantine root is forbidden), the shared caches, and anything already in `_quarantine/` — all untouched. To also quarantine this repo's cache namespace, run `superskill-cli worktree uninstall --purge-local --yes` and undo with `superskill-cli worktree gc --undo <journalId>`.

## Space hygiene

Worktrees, toolchains, Docker, and Xcode all grow quietly until the disk is full. `hygiene` is a read-only report that answers three questions per cache or leftover: **what is it, how big is it, and is it due?** It never deletes anything — every item carries a reason and the exact command to reclaim it, and acting on it is always a separate, explicit step.

Three ways to reach it:

- **CLI** — `superskill-cli hygiene`
- **MCP** — the `hygiene_report` tool (read-only; agents can call it before heavy builds to warn the user)
- **Agent prompt** — "run a space hygiene report" routes to the tool in every host

```bash
superskill-cli hygiene                          # fast report, all probes
superskill-cli hygiene --due                    # only what is due
superskill-cli hygiene --due --sizes            # measure real bytes on disk (slower)
superskill-cli hygiene --category docker xcode  # limit probes
superskill-cli hygiene --json                   # scripts + agents
```

| Probe | Looks at | Due when |
|---|---|---|
| `caches` | SuperSkill-managed shared caches **and** default locations (`go-build`, `Mozilla.sccache`, pnpm/pip stores, `~/go/pkg/mod`, …) | auto tier past 30d; consent tier ≥ 1 GiB and past 30d |
| `worktrees` | Prunable registrations and live worktrees across vault-mapped repos | stale registrations; live worktree clean, fully pushed, no ignored files, unlocked, idle ≥ 14d |
| `docker` | Dangling images, unreferenced volumes, build cache (read-only `docker system df`) | dangling images / build cache ≥ 1 GiB; unreferenced volumes ≥ 1 GiB and ≥ 14d old |
| `xcode` | DerivedData, legacy iOS DeviceSupport, unavailable simulators | DerivedData ≥ 5 GiB; DeviceSupport older than the newest version; any unavailable simulator |
| `scratch` | Temp/scratch roots; dirs with a `.superskill-scratch.json` marker are *owned*, everything else is *review-only* | owned scratch idle ≥ 72h |

Each item reports `bytes`, `ageDays`, `tier` (`auto` = regenerable, `consent` = needs an explicit OK, `review` = verify manually), `due`, `reason`, and `plan` — the literal command to reclaim it. Due-ness is conservative: unknown sizes/ages never mark an item due, dirty or unpushed worktrees are blocked, ignored files block worktree removals, and scratch is only ever recommended as due when it carries the ownership marker.

Acting on the report is explicit and reuses the existing safety rails:

```bash
# Caches: the plan hands off to worktree gc (dry-run default, quarantine, undo)
superskill-cli worktree gc --all --older-than 30d         # review
superskill-cli worktree gc --all --older-than 30d --apply # quarantine, reversible

# Docker / Xcode / scratch: review the plan, then run it yourself
superskill-cli hygiene --due --sizes                      # each item prints its plan
```

Tune the thresholds with `SUPERSKILL_HYGIENE_CACHE_AGE_DAYS`, `SUPERSKILL_HYGIENE_SCRATCH_TTL_HOURS`, `SUPERSKILL_HYGIENE_DOCKER_AGE_DAYS`, and point scratch scanning at your own roots with `SUPERSKILL_SCRATCH_ROOTS` (colon-separated paths, added to `$TMPDIR`, `/tmp`, and `~/.superskill/scratch`).

## Watchdog

Watchdog reviews the coding-agent environment: the session traces your harness writes (prompts, tool calls, failures, retries, token spend, diffs), pinned against the repo itself — its checks, its steering files, its skill graph — and the machine around it (caches, harness stores, plugins). It returns severity-ranked findings, each with evidence and a concrete proposal, and remembers them across digs so recurring problems carry more weight.

The codebase is the source of truth: traces are claims, findings are only shipped after verification against the repo. Everything runs locally; raw prompts are never persisted — dig notes store findings and evidence references, not transcripts.

### The loop

| Step | Command | What happens |
|---|---|---|
| **dig** | `watchdog dig` | Read-only analysis of a session, a window of sessions, the machine environment, or all of it. Writes a report note under `projects/<slug>/watchdog/`. |
| **fix** | `watchdog fix` | Applies what you approved. Dry-run by default. File reclamation is quarantined and reversible. |
| **status** | `watchdog status` | Past digs, open findings, recurrence counts, and which trace sources were detected. |

Findings are grouped by the part of the environment that failed: **navigation** (thrash, dead pointers), **verification** (edits with no checks run), **tool economy** (error loops, duplicate calls, oversized outputs), **steering** (oversized / duplicated / stale AGENTS.md and CLAUDE.md), **skills** (dead graph nodes, never-selected rules), **plugins** (unused or erroring MCP servers), **prompt** (repeated course corrections), **guardrails** (a repo with no lint/test/CI safety net), and **environment** (leaked temp files, runaway caches, harness store growth).

### Three ways to reach it

- **CLI**

  ```bash
  superskill-cli watchdog dig                              # latest session in this project
  superskill-cli watchdog dig --scope window --since 7d     # bulk review across sessions
  superskill-cli watchdog dig --scope env                   # machine + repo environment
  superskill-cli watchdog dig --scope all --json            # everything, machine-readable
  superskill-cli watchdog status
  superskill-cli watchdog fix --category leaked-tmp         # dry-run preview
  superskill-cli watchdog fix --category leaked-tmp --apply # quarantined, reversible
  ```

- **MCP** — the `watchdog` tool (`action: dig | fix | status`) for any connected agent; `dig` returns the rendered report plus per-session digests that are budgeted for the model.
- **Slash command** — `/watchdog` (installed by `setup`) loads `catalog/watchdog/dig.md` and walks the verify-first flow.
- **Natural language** — "run a watchdog dig over this week's sessions", "what did the last session waste on?", "clean up the leaked temp files", "review the agent environment". The router picks the `watchdog` pack from the task.

### What watchdog reads

The trace registry mirrors the setup client list: **OpenCode** (session store, messages, parts, diffs — richest), **Claude Code** (JSONL transcripts), **Codex CLI** (rollouts). Harnesses without a dedicated reader still degrade gracefully: SuperSkill's own session notes, graph, and telemetry cover them, so the loop works everywhere and gets deeper per harness as readers land.

### Safety

`watchdog fix` never deletes. Reclamation moves files into `~/.superskill/quarantine/<timestamp>/` next to a manifest that records origin paths and the undo step. Harness session data, vault notes, and user files are report-only — they are never touched by `fix`. Steering and guardrail edits stay agent-applied with one source of truth, checks over rules (see `catalog/watchdog/dig.md`).

### Environment variables

| Variable | Effect |
|---|---|
| `SUPERSKILL_OPENCODE_DATA` | Override the OpenCode data root (`~/.local/share/opencode`) |
| `SUPERSKILL_CLAUDE_PROJECTS` | Override the Claude Code projects root (`~/.claude/projects`) |
| `SUPERSKILL_CODEX_SESSIONS` | Override the Codex sessions root (`~/.codex/sessions`) |

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
| `register [path]` | Map a repo to a vault project so commands auto-detect without `-p` (also done by `skill init`) | `-s, --slug <name>` |
| `doctor` | Health check: install vs running MCP servers, vault, mapping, graph isolation, catalog, toolchains, telemetry, clients | `--json` |

### Telemetry

Local, opt-in rule-selection telemetry. Off by default; nothing leaves the machine — events are append-only JSONL under `~/.superskill/telemetry/` and prompts are stored only as truncated SHA-256 hashes.

| Command | Purpose |
|---|---|
| `telemetry status` | Show whether telemetry is enabled and how many events exist |
| `telemetry enable` / `disable` | Opt in or out; existing events are not deleted |
| `telemetry report` | Top-selected, most-dropped, and never-triggered rules; budget stats |
| `telemetry clear` | Delete all local events |

Set `SUPERSKILL_TELEMETRY=1` (or `0`) to override the persisted setting for one process.

### Hygiene

Read-only space report: what is worth reclaiming, what is due, and the exact command for each item. Deletes nothing.

| Command | Purpose | Common flags |
|---|---|---|
| `hygiene` | Machine-wide space hygiene report across caches, worktrees, docker, xcode, and agent scratch | `--due`, `--sizes`, `--category <names...>`, `--json` |

### Watchdog

Session review + environment optimization: dig for findings, fix what you approve.

| Command | Purpose | Common flags |
|---|---|---|
| `watchdog dig` | Analyze a session, a window of sessions, or the machine environment; writes a `watchdog/` report note | `--session <id>` / `--scope session\|window\|env\|all` / `--since 7d` / `--count <n>` / `--all-projects` / `--tool <harness>` / `--no-persist` / `--json` |
| `watchdog fix` | Apply approved findings and reclaim leaks; dry-run unless `--apply`, quarantine + manifest undo | `--finding <ids...>` / `--category <names...>` (incl. `leaked-tmp`) / `--dismiss` / `--apply` / `--json` |
| `watchdog status` | Past digs, open findings, recurrence counts, detected trace sources | `--json` |

## MCP tools

The MCP server exposes the tools below — the superset of the CLI surface. MCP tool names use underscores; the CLI adds `setup`/`teardown` but lacks `link`, `extract`, `capture`, `template`, `snapshot_repo_state`, `env_facts`, `cred_refs`, and `rollback`.

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
| `doctor` | One-shot health check across install, running MCP servers, vault, mapping, graph isolation, catalog, toolchains, and clients. |
| `register` | Map a repo to a vault project so vault commands auto-detect without `-p`. |
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
| `worktree_status` | Worktree health: repo id, worktrees, safe/unsafe verdicts, cache size, policy/hook state. Params: `json`, `budget`. |
| `worktree_audit` | Per-worktree safety verdict, cache duplication, manifest drift, repo items. Params: `json`, `sizes`, `worktree`. |
| `worktree_env` | Resolve the shared-cache environment for the current worktree. Params: `json`, `shell`, `providers`. |
| `worktree_activate` | Write the per-repo policy and install the guarded post-checkout hook + host session adapters. Preview with `confirm: false`; params `confirm`, `hooks`, `hosts`, `seed`, `install`, `dry_run`. |
| `worktree_apply` | Apply audit items (policy, hook, seed, prune); plan unless `confirm: true`. Params: `item`, `all_safe`, `confirm`. |
| `worktree_gc` | Cache GC: dry-run report by default; quarantine/purge/undo with `confirm: true`. Params: `tool`, `older_than`, `newer_than`, `min_size`, `max_size`, `tier`, `include`, `exclude`, `keep_latest`, `project`, `all`, `worktree`, `purge`, `undo`, `confirm`. |
| `worktree_uninstall` | Remove hooks/adapters; policy, caches, and quarantine stay unless `purge_local` + `confirm: true`. |
| `hygiene_report` | Read-only space hygiene report across caches, worktrees, docker, xcode, and agent scratch; every item carries a reason and a remediation command. Never deletes. Params: `sizes`, `categories`. |
| `watchdog` | Session review + environment optimization. `dig` analyzes a session, window, or machine environment (findings with evidence + proposals, per-session digests, report note in the vault); `fix` applies approved findings and reclaims leaks (dry-run default, quarantine + undo); `status` lists past digs and open findings. Params: `action`, `scope`, `session_id`, `tool`, `since`, `count`, `project`, `all_projects`, `persist`, `finding_ids`, `categories`, `dismiss`, `apply`, `report_path`. |

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
- **Pre-commit** — `hooks/pre-commit.sh` runs `gate check --ci "$SUPERSKILL_GATE_TARGET"` only when `SUPERSKILL_GATE_TARGET` is set and both the CLI and `gate` command exist; without a target it exits 0 silently. `git commit --no-verify` bypasses it once, `SUPERSKILL_GATE=off` keeps it installed but skips the check, and `SUPERSKILL_CLI` overrides the CLI command.
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
| `SUPERSKILL_CACHE_ROOT` | platform cache dir | Root for shared worktree caches (default `~/Library/Caches/superskill` on macOS, `~/.cache/superskill` on Linux, `%LOCALAPPDATA%\superskill` on Windows). |
| `SUPERSKILL_WORKTREE_BOOTSTRAP` | unset | `0` makes `worktree bootstrap` a no-op, disabling post-checkout seeding for that process. |
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
