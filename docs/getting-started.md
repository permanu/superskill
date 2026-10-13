# Getting started

## Requirements

Requires **Node 22.16+ on the 22.x line, or Node 24+**, with SQLite FTS5 enabled. Official Node 22.13–22.15 builds lack FTS5 and cannot run knowledge search.

## Install

```bash
npm install -g superskill          # Node 22.16+ (22.x), or 24+
```

One binary, two faces: **`superskill <command>`** runs everything you run yourself (`setup`, `doctor`, `skill`, `graph`, `worktree`, …), and bare `superskill` in a terminal shows the help. With no arguments over piped stdio — how AI clients launch it — the same binary starts the **MCP server**. `superskill-cli` remains a permanent alias, and `SUPERSKILL_FORCE_MCP=1` forces server mode.

## Quick start

```bash
# in your repo
superskill skill init          # detect stack, index the in-repo catalog, build .superskill/graph.json
superskill setup               # register MCP + instructions in supported detected clients
```

1. `skill init` detects the stack, indexes the in-repo catalog (not skills.sh), writes `.superskill/graph.json` (project-local, gitignored), registers the repo in the vault map (`project-map.json`) so vault commands auto-detect without `-p`, appends `.superskill/` to `.gitignore`, and adds a short SuperSkill block to an existing `AGENTS.md` / `CLAUDE.md`.
2. `setup` finds installed clients and writes the MCP entry, instruction file, and slash commands (`/review`, `/worktree`, `/watchdog`, `/superskill`) for each host that supports them — plus the harness-agnostic `superskill` skill at `~/.agents/skills/superskill/SKILL.md` so hosts with skill discovery list it. Use `--dry-run` to preview, `--clients claude-code,cursor` to target, `--force` to overwrite.
3. Describe the task — or use a shortcut: `/review [scope]` (18-axis review; empty scope = whole project), `/worktree [status|audit|gc]`, `/watchdog [dig|fix]`, `/superskill <task>`. The router picks packs by language, phase, and specialists; content is budgeted, and review/audit/diff/defect tasks (and security bugs) also get the vault brief plus a caller protocol.

Activations write `.superskill/graph.json` (local only).

Setup support is defined in [the harness matrix](harness.md#support-and-verification). Native MCP setup excludes Aider; Continue setup targets its IDE extension. Configuration tests and live host checks are separate evidence.

Want a vault context document too? `superskill init .` prints a draft `context.md`; review it, then save it with `superskill write`.

## Verify with doctor

Verify any time with `superskill doctor`: install vs running MCP servers, vault + project mapping, project graph isolation (fails if `.superskill/` is tracked), catalog validation, compile toolchains, telemetry, and MCP clients.

## MCP configuration

`setup` defaults to `npx -y --prefer-online superskill@latest`. Each new MCP process asks npm for fresh metadata and resolves the stable `latest` tag. Publishing a new version under that tag makes it available on the next MCP start; it does not replace an active server or push code into running sessions. Offline/cache behavior may retain a cached version or fail to start; no upgrade is guaranteed without registry access. Explicit pinned versions and direct installed binaries remain manual-update choices. See [npm exec configuration](https://docs.npmjs.com/cli/v11/commands/npm-exec/#prefer-online).

Run setup once to install or migrate the integration. Future MCP starts update server code and atomically refresh the existing SuperSkill-managed shared skill, launchers, owned legacy aliases, and recognized instruction blocks — including Cursor MDC and OpenCode instruction files — upgrading legacy `superskill:start` markers and unmarked legacy files to the current format while preserving user content around them. It does not create missing integrations. Start a new host session to load refreshed instructions.

**Claude Code / Claude Desktop** — `~/.claude.json`, or `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS:

```json
{
  "mcpServers": {
    "superskill": {
      "command": "npx",
      "args": ["-y", "--prefer-online", "superskill@latest"],
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
      "command": "npx",
      "args": ["-y", "--prefer-online", "superskill@latest"],
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
      "command": ["npx", "-y", "--prefer-online", "superskill@latest"],
      "environment": { "VAULT_PATH": "~/Vaults/ai" }
    }
  }
}
```

**Codex CLI** — `~/.codex/config.toml`:

```toml
[mcp_servers.superskill]
command = "npx"
args = ["-y", "--prefer-online", "superskill@latest"]

[mcp_servers.superskill.env]
VAULT_PATH = "~/Vaults/ai"
```

**Claude Code plugin** — `/plugin marketplace add permanu/superskill`, then `/plugin install superskill@superskill`. The plugin ships the `superskill` skill; run `superskill setup` once to register the MCP server.

Then prompt normally and call the `superskill` tool with the task.

## Upgrade

```bash
npm install -g superskill@latest
superskill upgrade      # reconcile launchers, instructions, legacy aliases
superskill setup        # or re-run setup for the full install path (idempotent)
```

`setup` and `upgrade` upgrade recognized generated launchers without `--force`, preserving their existing vault path and extra environment settings. Pinned versions, direct binaries and customized arguments are left unchanged. `--force` explicitly replaces an entry; use it only when that replacement is intended.

You normally do not need to run either manually: when a host starts the MCP server, SuperSkill reconciles managed launchers, removes its own legacy `obsidian-mcp`/`obsidian-kb` aliases, and upgrades legacy instruction blocks in place. Run `superskill setup --check` to see drift read-only, or `superskill upgrade --dry-run` to preview the automatic reconciliation.

## Uninstall

```bash
superskill teardown     # MCP entries, instructions, slash commands, shared skill
npm uninstall -g superskill
```

`teardown` supports `--dry-run` and `--clients <list>` and leaves your vault data (`VAULT_PATH`) untouched; project-local `.superskill/` state can be deleted per repo.
