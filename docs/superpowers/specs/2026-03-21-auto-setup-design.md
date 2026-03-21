# Auto-Setup: MCP Registration & Behavioral Hooks on Install

**Date:** 2026-03-21
**Status:** Draft (rev 2 — post spec-review fixes)
**Author:** arvee + Claude

## Problem

After `npm install -g @gopherine/obsidian-mcp`, users must manually configure each AI client to register the MCP server and have no way to inject behavioral instructions that tell the AI to use obsidian-mcp as its knowledge base. This friction reduces adoption.

## Solution

A hybrid approach:

1. **`postinstall` script** — lightweight detection that prints which clients were found and tells the user to run `obsidian-mcp-cli setup`
2. **`obsidian-mcp-cli setup` command** — auto-configures detected clients with MCP server entries and behavioral instructions
3. **`obsidian-mcp-cli teardown` command** — removes all obsidian-mcp configuration from clients
4. **`preuninstall` script** — runs teardown silently on `npm uninstall`

### Binary Routing

The package has two binaries:
- `obsidian-mcp` → `dist/mcp-server.js` (MCP stdio server — must not be changed)
- `obsidian-mcp-cli` → `dist/cli.js` (Commander CLI)

The `setup` and `teardown` commands are registered as subcommands on the existing `obsidian-mcp-cli` Commander program. They are **not** on the `obsidian-mcp` binary since that is the MCP stdio server.

The postinstall/preuninstall scripts import setup modules directly (no CLI dispatch needed).

## Supported Clients

| Client | Config Format | Config Path (macOS) | Root Key | Command Type | Env Key | Instruction Strategy |
|--------|--------------|---------------------|----------|-------------|---------|---------------------|
| Claude Code | JSON | `~/.claude.json` | `mcpServers` | string | `env` | `~/.claude/CLAUDE.md` |
| Claude Desktop | JSON | `~/Library/Application Support/Claude/claude_desktop_config.json` | `mcpServers` | string | `env` | none |
| Cursor | JSON | `~/.cursor/mcp.json` | `mcpServers` | string | `env` | `~/.cursor/rules/obsidian-kb.mdc` |
| OpenCode | JSON | `~/.config/opencode/opencode.json` | `mcp` | array | `environment` | `instructions` config array |
| Crush CLI | JSON | `~/.config/crush/crush.json` | `mcp` | string | `env` | none |
| Codex CLI | TOML | `~/.codex/config.toml` | `mcp_servers` | string | `env` | `~/.codex/AGENTS.md` |
| Gemini CLI | JSON | `~/.gemini/settings.json` | `mcpServers` | string | `env` | `~/.gemini/GEMINI.md` |
| Droid | JSON | `~/.factory/mcp.json` | `mcpServers` | string | `env` | `~/.factory/CLAUDE.md` (unverified — Droid claims Claude Code compatibility) |

### Platform-Specific Config Paths

**Claude Desktop:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

**OpenCode:**
- All: `~/.config/opencode/opencode.json` (or `$OPENCODE_CONFIG`)

**Crush CLI:**
- macOS/Linux: `~/.config/crush/crush.json` (or `$XDG_CONFIG_HOME/crush/crush.json`)
- Windows: `%LOCALAPPDATA%\crush\crush.json`

**Gemini CLI:**
- All: `~/.gemini/settings.json`

**Codex CLI:**
- All: `~/.codex/config.toml` (or `$CODEX_HOME/config.toml`)

**Droid:**
- All: `~/.factory/mcp.json` (MCP), `~/.factory/CLAUDE.md` (instructions)

**Claude Code, Cursor:** Same paths on all platforms.

**Windows note:** All path construction uses `path.join()` and `os.homedir()` to handle platform separators correctly.

## Client Registry

Each client is described by a `ClientConfig`:

```typescript
interface ClientConfig {
  name: string;                      // Display name: "Claude Code"
  slug: string;                      // Identifier: "claude-code"
  configPaths: {
    darwin: string;
    linux: string;
    win32: string;
  };
  configFormat: 'json' | 'toml';
  rootKey: string;                   // "mcpServers" | "mcp" | "mcp_servers"
  commandType: 'string' | 'array';
  envKey: string;                    // "env" | "environment"
  extraFields?: Record<string, unknown>;
  instructionStrategy: 'markdown-file' | 'mdc-file' | 'config-array' | 'none';
  instructionConfig?: {
    filePath?: Record<string, string>;   // per-platform path to instruction file
    configKey?: string;                  // for config-array strategy (e.g. "instructions")
  };
  verified: boolean;                 // has this client's config format been verified?
}
```

Detection: check if the global config file/directory exists for the current platform. Detection is best-effort — a config file existing doesn't guarantee the client is installed, and vice versa. This is acknowledged as a pragmatic heuristic.

## MCP Server Entry

The vault path is resolved in this order:
1. `--vault-path` flag (if provided)
2. `VAULT_PATH` environment variable (if set)
3. Default: `~/Vaults/ai`

The MCP entry written to each client (adapted to format):

**JSON clients (most):**
```json
{
  "command": "npx",
  "args": ["-y", "@gopherine/obsidian-mcp"],
  "env": {
    "VAULT_PATH": "~/Vaults/ai"
  }
}
```

**OpenCode (array command, `environment` key):**
```json
{
  "type": "local",
  "command": ["npx", "-y", "@gopherine/obsidian-mcp"],
  "environment": {
    "VAULT_PATH": "~/Vaults/ai"
  }
}
```

**Codex CLI (TOML):**
```toml
# obsidian-mcp:start
[mcp_servers.obsidian-mcp]
command = "npx"
args = ["-y", "@gopherine/obsidian-mcp"]

[mcp_servers.obsidian-mcp.env]
VAULT_PATH = "~/Vaults/ai"
# obsidian-mcp:end
```

## Behavioral Instruction

The same core instruction, adapted per client's mechanism:

```
You have an Obsidian knowledge base available via MCP (obsidian-mcp).
Always check it at the start of every session:
1. Use vault_project_context to load context for the current project
2. Use vault_search to find relevant decisions, learnings, and tasks
3. Use vault_session to register your session for coordination
Treat the vault as your persistent memory across sessions.
```

### Instruction Strategy by Client

**Claude Code — `~/.claude/CLAUDE.md`:**

Appended to `~/.claude/CLAUDE.md` (create if missing). This is the global CLAUDE.md that Claude Code reads at every session start. Unlike SessionStart hooks (whose output goes to the user's terminal, not the model), CLAUDE.md content is injected into the model's system prompt.

```markdown
<!-- obsidian-mcp:start -->
You have an Obsidian knowledge base available via MCP (obsidian-mcp).
Always check it at the start of every session:
1. Use vault_project_context to load context for the current project
2. Use vault_search to find relevant decisions, learnings, and tasks
3. Use vault_session to register your session for coordination
Treat the vault as your persistent memory across sessions.
<!-- obsidian-mcp:end -->
```

**Droid — `~/.factory/CLAUDE.md`:**

Same approach as Claude Code (Droid is Claude Code-compatible). Marked as **unverified** — may need adjustment.

**Cursor — `~/.cursor/rules/obsidian-kb.mdc`:**

Written to `~/.cursor/rules/obsidian-kb.mdc`:

```
---
description: Obsidian knowledge base integration
alwaysApply: true
---

You have an Obsidian knowledge base available via MCP (obsidian-mcp).
Always check it at the start of every session:
1. Use vault_project_context to load context for the current project
2. Use vault_search to find relevant decisions, learnings, and tasks
3. Use vault_session to register your session for coordination
Treat the vault as your persistent memory across sessions.
```

**Gemini CLI — `~/.gemini/GEMINI.md`:**

Appended to `~/.gemini/GEMINI.md` (create if missing):

```markdown
<!-- obsidian-mcp:start -->
You have an Obsidian knowledge base available via MCP (obsidian-mcp).
Always check it at the start of every session:
1. Use vault_project_context to load context for the current project
2. Use vault_search to find relevant decisions, learnings, and tasks
3. Use vault_session to register your session for coordination
Treat the vault as your persistent memory across sessions.
<!-- obsidian-mcp:end -->
```

**Codex CLI — `~/.codex/AGENTS.md`:**

Appended to `~/.codex/AGENTS.md` (create if missing):

```markdown
<!-- obsidian-mcp:start -->
You have an Obsidian knowledge base available via MCP (obsidian-mcp).
Always check it at the start of every session:
1. Use vault_project_context to load context for the current project
2. Use vault_search to find relevant decisions, learnings, and tasks
3. Use vault_session to register your session for coordination
Treat the vault as your persistent memory across sessions.
<!-- obsidian-mcp:end -->
```

**OpenCode — `instructions` config:**

Add instruction file path to `~/.config/opencode/opencode.json`:

```json
{
  "instructions": ["~/.config/opencode/obsidian-mcp-instructions.md"]
}
```

And write `~/.config/opencode/obsidian-mcp-instructions.md` with the instruction content. If the `instructions` array already contains this path, skip (idempotent).

**Claude Desktop & Crush CLI:**

No instruction mechanism. Print a note:

```
  i Claude Desktop: MCP configured. No instruction mechanism — the AI will discover tools automatically.
```

## CLI Interface

### `obsidian-mcp-cli setup`

```
Usage: obsidian-mcp-cli setup [options]

Auto-configure AI clients to use obsidian-mcp as knowledge base

Options:
  --all                Configure all supported clients (even undetected)
  --clients <list>     Comma-separated client slugs to configure
  --dry-run            Show what would change without writing
  --force              Overwrite existing obsidian-mcp entries
  --vault-path <path>  Override vault path (default: $VAULT_PATH or ~/Vaults/ai)
  -h, --help           Show help
```

**Flag precedence:** `--clients` takes precedence over `--all`. If both are provided, only the specified clients are configured.

**Output example:**
```
Scanning for AI clients...

  + Claude Code       ~/.claude.json
  + Cursor            ~/.cursor/mcp.json
  + Gemini CLI        ~/.gemini/settings.json
  - Claude Desktop    (not found)
  - OpenCode          (not found)
  - Crush CLI         (not found)
  - Codex CLI         (not found)
  - Droid             (not found)

Configuring detected clients...

  Claude Code
    + MCP server added to ~/.claude.json
    + Instruction added to ~/.claude/CLAUDE.md

  Cursor
    + MCP server added to ~/.cursor/mcp.json
    + Rule written to ~/.cursor/rules/obsidian-kb.mdc

  Gemini CLI
    + MCP server added to ~/.gemini/settings.json
    + Instruction added to ~/.gemini/GEMINI.md

Done! 3 clients configured.

Not detected: Claude Desktop, OpenCode, Crush CLI, Codex CLI, Droid
Run "obsidian-mcp-cli setup --all" to configure them anyway.
```

### `obsidian-mcp-cli teardown`

```
Usage: obsidian-mcp-cli teardown [options]

Remove obsidian-mcp configuration from all AI clients

Options:
  --clients <list>  Comma-separated client slugs to teardown (default: all)
  --dry-run         Show what would be removed without changing files
  --silent          Suppress output (for preuninstall script)
  -h, --help        Show help
```

## Postinstall Script

Runs on `npm install -g @gopherine/obsidian-mcp`. Detection only, no config writes. Wrapped in try/catch to never break `npm install`.

```typescript
// src/setup/postinstall.ts
try {
  import { detectClients } from './detect.js';

  if (!process.stdout.isTTY) process.exit(0); // silent in CI

  const detected = detectClients();

  console.log('\n  obsidian-mcp installed!\n');

  if (detected.length > 0) {
    console.log(`  Detected: ${detected.map(c => c.name).join(', ')}`);
    console.log('  Run "obsidian-mcp-cli setup" to auto-configure them as your knowledge base.');
  } else {
    console.log('  No AI clients detected.');
  }

  console.log('  Run "obsidian-mcp-cli setup --all" to configure all 8 supported clients.\n');
} catch {
  // never break npm install
  process.exit(0);
}
```

**`package.json` additions:**
```json
{
  "scripts": {
    "postinstall": "node dist/setup/postinstall.js",
    "preuninstall": "node dist/setup/preuninstall.js"
  }
}
```

## Preuninstall Script

```typescript
// src/setup/preuninstall.ts
try {
  const { teardownAll } = await import('./teardown.js');
  await teardownAll({ silent: true });
} catch {
  // never block uninstall
}
process.exit(0);
```

## File Structure

```
src/
  setup/
    clients.ts        # Client registry — all 8 ClientConfig definitions
    detect.ts         # detectClients() — check which are installed
    configure.ts      # configureMcp() + configureInstructions() per client
    teardown.ts       # teardownMcp() + teardownInstructions() per client
    postinstall.ts    # Lightweight postinstall detection script
    preuninstall.ts   # Silent teardown wrapper
    index.ts          # CLI subcommand wiring into existing Commander program in cli.ts
```

`index.ts` exports a function that takes the root Commander `Command` and registers `setup` and `teardown` as subcommands, following the same pattern as existing commands in `cli.ts`.

## Edge Cases & Safety

**Config file safety:**
- Read-then-merge: never overwrite entire files
- Backup before modify: `config.json` → `config.json.bak.obsidian-mcp` (single backup, overwritten on subsequent runs)
- Invalid JSON/TOML: skip client, warn user, continue with other clients
- Preserve original file permissions
- `teardown` does NOT remove backup files (user can manually delete)

**TOML handling (Codex):**
- String template insertion/removal using `# obsidian-mcp:start` / `# obsidian-mcp:end` comment markers
- Insertion: append the marked block at end of file
- Removal: regex match between markers (inclusive), remove the block
- If file has invalid TOML before our changes: skip and warn (we don't validate the whole file, just find/insert our marked block)
- If markers are partially present (start without end, or vice versa): treat as corrupted, warn and skip unless `--force` (which removes any partial markers and re-inserts cleanly)

**Idempotency:**
- `setup` twice: detects existing entries, prints `~ already configured` and skips
- `teardown` twice: prints "nothing to clean up"
- OpenCode instructions array: checks if path already exists before adding

**CI/Docker:**
- postinstall checks `process.stdout.isTTY`, exits silently if false
- `setup` works explicitly in Dockerfiles when desired

**Conflict handling:**
- Existing `obsidian-mcp` entry with different config: warn and skip unless `--force`
- Instruction files: only touch content between `<!-- obsidian-mcp:start/end -->` markers
- Cursor `.mdc` file: overwrite entirely (it's a single-purpose file owned by us)

**No new dependencies:**
- Node.js built-in `fs`, `os`, `path` only
- TOML: string template insertion (no parser)

**Verified vs. unverified clients:**
- Verified (config format confirmed): Claude Code, Claude Desktop, Cursor, Codex CLI, Gemini CLI
- Unverified (based on docs/community reports): OpenCode, Crush CLI, Droid
- Unverified clients are marked in the registry and a note is printed during setup

## Testing Strategy

- Unit tests for each client's config read/write/remove (mock file system)
- Unit tests for detection logic (mock `fs.existsSync`)
- Unit tests for TOML marker-based insertion/removal
- Unit tests for markdown marker-based insertion/removal
- Integration test: setup → verify files → teardown → verify cleanup
- Edge cases: missing files, invalid JSON, existing entries, permission errors, partial markers
- Idempotency tests: setup twice, teardown twice
