# Worktree caches

An agent that spawns a git worktree per subagent pays twice: once when the first build starts from cold, and again when `target/`, `node_modules/`, `.venv/`, or `DerivedData/` are duplicated into every worktree. SuperSkill shares the inputs that are safe to share (package stores, compiler caches, module caches), isolates the state that must stay per worktree (build dirs, venvs, DerivedData), and makes a fresh worktree cheap by seeding it with copy-on-write copies instead of a cold build.

## Agent-first usage

No CLI is needed. Activate once per repo — the agent can do it via the MCP tool `worktree_activate` — and after that:

1. Every `git worktree add` fires a guarded `post-checkout` hook that seeds cheap caches (reflink copy where the filesystem supports it) and always exits 0; it never blocks or changes the checkout.
2. Host session hooks inject the shared-cache environment (Claude Code, Codex, Cursor, Gemini CLI, OpenCode, GrokBuild, plus a generic `AGENTS.md` fallback) when a session starts in a worktree.

MCP tools: `worktree_status`, `worktree_audit`, `worktree_env`, `worktree_activate`, `worktree_apply`, `worktree_gc`, `worktree_uninstall`. They mirror the CLI below one-for-one, with two exceptions: there is no `worktree bootstrap` MCP tool, and the MCP `worktree_gc` has no `--verbose` (per-path skip reasons stay CLI-only). An agent can still audit, apply, and collect caches without shelling out.

## What superskill will never do

- Never remove, prune, or move worktrees.
- Never run `git clean`, `git reset`, or `git checkout -f`.
- Never delete dirty, untracked, or ignored user files; never touch stashes, unpushed commits, submodules, or in-progress operations (merge / rebase / cherry-pick / revert / bisect).
- GC touches only the platform cache root, and only by moving directories into `_quarantine/` (reversible with `--undo`). Permanent deletion happens only on `gc --purge --yes`, and only inside `_quarantine/`.
- Worktree-local caches (`node_modules/`, `target/`, `DerivedData/`, …) are reclaimed only with explicit consent plus a seeded-file manifest audit; reclaims are renamed into `.git/superskill/quarantine/<id>` and can be restored.
- When state is unknown, keep it: skipping is always safer than deleting.

## How it works

- **Policy** — `.git/superskill/policy.json` (the repo's common git dir, so all worktrees share it). Records repo id, stacks, toolchain env flags, host list, and activation flags (`hooks`, `seed`, `install`). `hook.state`, `journal.jsonl`, and per-worktree manifests live beside it.
- **Cache payload** — `~/Library/Caches/superskill/<repoHash>` on macOS, `~/.cache/superskill/<repoHash>` (or `$XDG_CACHE_HOME`) on Linux, `%LOCALAPPDATA%\superskill\<repoHash>` on Windows; override the root with `SUPERSKILL_CACHE_ROOT`. Only shared caches live here — per-worktree build state stays in the worktree.
- **post-checkout flow** — `worktree activate` installs a guarded block into `.git/hooks/post-checkout` (or the configured `core.hooksPath`, husky, or `.lefthook-local.yml`). On a worktree-creating checkout it runs `superskill worktree bootstrap --source worktree-create` in the background: seed cheap caches from the main worktree via reflink and record a manifest. The block always exits 0 and never changes the hook's exit status.
- **env injection flow** — host session hooks run `worktree bootstrap --source session`; the OpenCode plugin runs `worktree env --json` and merges the result into every shell. The resolved values are read-only cache locations plus per-worktree build-dir overrides; injection never edits the repo's own files.

## CLI reference

Every subcommand supports `--help`, e.g. `superskill worktree gc --help`.

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

### `worktree status`

Read-only. Options: `--json`; `--budget <size>` (e.g. `2G`, `500M`; notes when cache bytes exceed it).

```bash
superskill worktree status
superskill worktree status --budget 5G --json
```

### `worktree audit`

Read-only. Options: `--json`; `--sizes` (du every cache dir); `--worktree <name>` (audit one worktree by path or name).

```bash
superskill worktree audit --sizes
superskill worktree audit --worktree feat-login --json
```

### `worktree env`

Read-only. Options: `--json`; `--eval` (shell `export` lines, the form hooks use); `--shell <sh|fish|powershell>`; `--providers <ids...>` (restrict to detected toolchains such as `rust`, `go`, `node`, `python`, `swift`).

Cache namespaces are keyed by repo identity: the normalized `origin` URL, or the repo's git dir when there is no remote. A `file://` or plain-path remote is followed (bounded, cycle-safe) to the source repo's own identity, so local clones share one namespace; namespaces created under the old per-path scheme are renamed into the shared identity on the next `worktree bootstrap`/`activate` run. `SUPERSKILL_CACHE_ROOT` relocates the cache root; `SUPERSKILL_SCCACHE_CACHE_SIZE` overrides the sccache size cap (default `10G`).

```bash
eval "$(superskill worktree env --eval)"
superskill worktree env --json
superskill worktree env --providers rust node
```

### `worktree activate`

Options: `--yes` (non-interactive consent); `--dry-run`; `--no-hooks`; `--no-seed`; `--hosts <ids...>` (`claude-code`, `opencode`, `codex`, `cursor`, `gemini`, `grokbuild`, `generic`); `--install`; `--json`. Detected hosts are used when `--hosts` is omitted.

```bash
superskill worktree activate --dry-run
superskill worktree activate --hosts claude-code,opencode
```

### `worktree gc`

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

Tiering: `auto` (compiler/build caches such as `go-build`, `sccache`, `pnpm-store`, `uv`) is selected only when at least 30 days old unless you pass an explicit age or tier; `consent` (e.g. `cargo-build`, `node-modules`) requires `--tier consent` or an explicit age filter. Nested per-worktree dirs (e.g. `cargo-build/<worktreeKey>`) are promoted to `auto` and tagged `orphan` once their registered worktree path is gone — worktrees register a marker under `<repoHash>/.worktrees/` via the session/worktree-create bootstrap or `worktree activate`. Tool-native prunes (`go clean -cache`, `pnpm store prune`, `uv cache prune --ci`, …) are printed as informational commands — run them through the tool when you want them.

```bash
superskill worktree gc                           # report for this repo (dry run)
superskill worktree gc --older-than 30d --apply  # quarantine (reversible)
superskill worktree gc --all --tool node,rust --min-size 1G --json
superskill worktree gc --purge --yes             # delete quarantined dirs >= 14d old
superskill worktree gc --undo 2026-10-05T12-00-00.000Z
```

Default is a dry-run report; nothing is deleted. `--apply` moves candidates into `_quarantine/` (reversible with `--undo`); only `--purge --yes` deletes, and only inside `_quarantine/`.

### `worktree apply`

Options: `--item <ids...>` (audit ids such as `policy`, `hook`, `env`, `seed:<provider>:<relative>`, `prune:<tool>`, `reclaim:<provider>:<dir-id>`); `--all-safe`; `--yes`; `--undo <journalId>`; `--json`.

```bash
superskill worktree apply --all-safe
superskill worktree apply --item seed --yes
superskill worktree apply --undo 2026-10-05T14-22-01.000Z-a1b2c3d4 --yes
```

Default is a dry-run report; nothing is deleted. `reclaim:<provider>:<dir-id>` items rename a worktree-local cache directory (`node_modules/`, `target/`, `DerivedData/`, …) into `.git/superskill/quarantine/<id>` (never a copy+delete); restore it with `worktree apply --undo <id>`. `--all-safe` skips consent items; name a consent item explicitly with `--item <id> --yes` to apply it. Reclaims and other mutations require `--yes` on the CLI or `confirm: true` on the MCP `worktree_apply` tool.

### `worktree bootstrap`

Options: `--source <worktree-create|session>`; `--claude-env` (append exports to `$CLAUDE_ENV_FILE`); `--json`. Normally invoked by hooks and adapters; safe to run by hand to re-seed. Skips the main worktree, honors `SUPERSKILL_WORKTREE_BOOTSTRAP=0`, and requires an activated repo.

```bash
superskill worktree bootstrap --source worktree-create
```

### `worktree uninstall`

Options: `--purge-local` (quarantine this repo's cache namespace; needs `--yes`); `--yes`; `--json`.

```bash
superskill worktree uninstall
superskill worktree uninstall --purge-local --yes
```

Plain uninstall removes the post-checkout hook and host adapters and stops future seeding/env injection; it keeps the policy and touches no cache data. `--purge-local --yes` only moves this repo's cache namespace into quarantine (reversible with `worktree gc --undo <journalId>`); without `--yes` it is skipped.

## Filter cookbook

```bash
# This repo only (the default)
superskill worktree gc

# A vault-mapped project by slug
superskill worktree gc --project my-app

# Every repo in the cache root, keeping the newest dir per tool
superskill worktree gc --all --keep-latest 1

# One tool, old entries only
superskill worktree gc --tool rust --older-than 60d

# Age window
superskill worktree gc --older-than 14d --newer-than 90d

# Size gate
superskill worktree gc --all --min-size 500M

# Interactive TTY: read the report, then apply the same filters
superskill worktree gc --all
superskill worktree gc --all --older-than 30d --apply

# JSON for scripts
superskill worktree gc --all --json | jq '.plan.selected[] | { path, bytes }'

# Undo a quarantine
superskill worktree gc --undo <journalId>
```

## Host support matrix

| Host | Hook surface | What superskill writes | Notes |
|---|---|---|---|
| Claude Code | `SessionStart` hook | `.claude/settings.local.json` | runs `worktree bootstrap --source session --claude-env`, appending exports to `$CLAUDE_ENV_FILE` |
| OpenCode | plugin `setup` (`ctx.shell.hook`) | `.opencode/plugins/superskill-worktree.js` | V2 default-export definition with a V1 `server()` fallback; runs `worktree env --json` and merges the env into every shell |
| Codex CLI | `SessionStart` hook | `.codex/hooks.json` | env injected when the session starts |
| Cursor | `sessionStart` hook | `.cursor/hooks.json` | notes when a Claude Code bootstrap hook is already present (auto-import) |
| Gemini CLI | `SessionStart` hook | `.gemini/settings.json` | env injected when the session starts |
| GrokBuild | `SessionStart` hook | `.grokbuild/hooks.json` | hook surface unverified; relies on the MCP tools + git post-checkout hook |
| Generic | managed block in `AGENTS.md` | `AGENTS.md` (marker-delimited) | fallback when no host is detected; tells agents to run `worktree env --eval` |
| Git (universal) | `post-checkout` hook | `.git/hooks/post-checkout` or `core.hooksPath` | seeds caches after `git worktree add`; guarded and always exits 0 |

For the MCP client setup matrix, see [harness integration](harness.md#support-and-verification).

## Troubleshooting

- **First look** — `superskill worktree status` shows repo id, worktrees with safe/unsafe reasons, cache size, policy/hook state, and hosts. Add `--budget 5G` to flag over-budget cache usage.
- **Drill down** — `superskill worktree audit --sizes` shows every cache dir (local vs shared), plus seeded-manifest drift (`modified` / `missing`) for each worktree. Manifest drift is reported, never auto-fixed.
- **Per-path skip reasons** — `superskill worktree gc --verbose` explains why each candidate was not selected.
- **Health check** — `superskill doctor` includes worktree checks (policy active, guarded hook installed) alongside install, MCP wiring, vault, catalog, and toolchains; run it when worktree commands are missing after an upgrade.
- **Hook did not fire** — husky and lefthook are supported; a `.pre-commit-config.yaml` repo needs the post-checkout command added manually (the config is never rewritten). Re-run `worktree activate` after changing hook managers.
- **Where state lives** — policy, `hook.state`, `journal.jsonl`, and manifests under `.git/superskill/`; caches under the platform cache root (`SUPERSKILL_CACHE_ROOT` to move it); quarantined dirs under `<cacheRoot>/_quarantine/`.
- **Opt out** — `SUPERSKILL_WORKTREE_BOOTSTRAP=0` disables post-checkout seeding for one process; `superskill worktree uninstall` removes hooks and adapters entirely.

## Uninstalling the worktree integration

```bash
superskill worktree uninstall
```

This removes the post-checkout hook block and the host session adapters, and stops all future seeding and env injection. What remains: the policy at `.git/superskill/policy.json` and its journal (kept because deletion outside the quarantine root is forbidden), the shared caches, and anything already in `_quarantine/` — all untouched. To also quarantine this repo's cache namespace, run `superskill worktree uninstall --purge-local --yes` and undo with `superskill worktree gc --undo <journalId>`.
