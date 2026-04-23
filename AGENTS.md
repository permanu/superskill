# obsidian-mcp — AGENTS.md

## Project Overview

Universal Agentic Knowledge Base — a CLI tool and MCP server backed by an Obsidian vault (`~/Vaults/ai/`) that serves as shared memory for AI coding tools. Includes a knowledge graph system that routes skills from skills.sh to coding agents based on project context and task.

## Commands

- **Build:** `npm run build` (TypeScript → dist/)
- **Dev:** `npm run dev` (build + watch via tsc --watch)
- **Lint:** `npm run lint` (type check only: `tsc --noEmit`)
- **Test:** `npm test` (Vitest test runner: `vitest run`)

## Architecture

- `src/cli.ts` — Commander.js CLI entry point
- `src/mcp-server.ts` — MCP server (stdio transport)
- `src/commands/` — Command modules (pure async functions, shared by CLI + MCP)
- `src/commands/skill/` — Skill commands (init, activate, status, index)
- `src/core/` — Command infrastructure (registry, types)
- `src/lib/` — Library modules (vault-fs, frontmatter, search-engine, etc.)
- `src/lib/graph/` — Knowledge graph (schema, store, loader, router, learner)
- `src/lib/skills-sh/` — Skills.sh client (client, cli, audit-cache)
- `src/lib/global-cache.ts` — Global skill content cache (`~/.superskill/skills/`)
- `src/config.ts` — Configuration + `resolveProject()` utility

## Key Patterns

- **Unified command interface:** Every command takes `(args, ctx: CommandContext)` where ctx bundles vaultFs, vaultPath, config, sessionRegistry, and log.
- **Graph-driven routing:** task → router → loader → security gate → content. The knowledge graph determines which skills are relevant based on project stack, phase, and activation history.
- **3-phase loading:** INDEX (project metadata + skill list) → NEIGHBORHOOD (co-activations + recent sessions) → CONTENT (actual SKILL.md files). Each phase is optional and can be skipped.
- **Skills.sh as primary source:** Skills are fetched from skills.sh API, cached globally in `~/.superskill/skills/`, and symlinked into project-local `.superskill/skill-cache/`.
- **Dual interface:** Every command works via both CLI and MCP. Commands are pure async functions.
- **Sandboxed filesystem:** `VaultFS` enforces path validation, symlink escape detection, traversal rejection.
- **Lazy singletons:** Graph store, skills.sh client, and global cache are initialized on first use.
- **Atomic operations:** Graph writes use tmpfile + rename. Session lockfiles use `O_CREAT | O_EXCL`.
- **Project detection:** Auto-detected from CWD via `project-map.json` and git root. Use `resolveProject()` helper.
- **Auto-numbering:** ADRs, tasks, learnings use `NNN-<slug>.md` pattern via `auto-number.ts`.

## Behavioral Guidelines

1. Think before coding — state assumptions explicitly, surface tradeoffs, ask when uncertain
2. Simplicity first — minimum code that solves the problem, nothing speculative
3. Surgical changes — touch only what you must, match existing style
4. Goal-driven execution — define success criteria, loop until verified

## Code Conventions

- TypeScript strict mode, ES Modules (ES2022 target)
- No comments unless explicitly requested
- Use `console.error` with a module prefix (e.g., `[search]`, `[session-registry]`) for debug logging in catch blocks
- Don't swallow errors silently — at minimum log unexpected error codes (EACCES, EISDIR)
- All vault filesystem ops go through `VaultFS`; never use raw `fs` for vault paths
- Use `resolveProject()` from config.ts instead of repeating detectProject/validateProjectSlug
- Use `ctx.vaultPath` from CommandContext instead of passing vaultPath as a separate parameter

## Security

- `VaultFS.resolve()` is private — always use public methods (read, write, list, etc.)
- Session lockfiles use `O_CREAT | O_EXCL` for atomic creation
- External process calls use `execFile` (never `exec` with shell)
- `vault_write` defaults to `append` mode to prevent accidental data loss
- Skill content is security-audited (gen, socket, snyk) before loading. Skills with `fail` audit status are blocked.

## Vault Structure

```
~/Vaults/ai/
  project-map.json
  coordination/
    session-registry.json
    locks/
  projects/<slug>/
    context.md, decisions/, tasks/, learnings/, sessions/, brainstorms/, _archive/
    .superskill/
      graph.json              # project knowledge graph
      skill-cache/            # symlinks to global cache
```
