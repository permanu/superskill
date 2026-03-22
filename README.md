# SuperSkill

**Universal skill marketplace + knowledge vault for AI coding agents.** Auto-detects your stack, resolves skill collisions across repos, and loads expert methodologies on demand.

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![npm](https://img.shields.io/npm/v/superskill)](https://www.npmjs.com/package/superskill)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.0.0-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)

## What It Does

- **Skill Marketplace** — 87 skills from 9 repos (ECC, Superpowers, gstack, Anthropic, design repos). Catalog, search, filter by domain.
- **Collision Detection** — 12 domains where skills from different repos compete (TDD, planning, code review, etc.). Profile-based resolution picks the best skill per domain.
- **Per-Project Filtering** — Auto-detects your stack (Go+Echo, React+Next, Django, etc.) and loads only relevant skills. Go project? No Django/Spring/frontend skills loaded.
- **Progressive Disclosure** — Lightweight manifest (~100 tokens/skill) + on-demand loading. Small context models get essentials only.
- **Knowledge Vault** — Persistent project memory: tasks, decisions (ADRs), learnings, sessions, brainstorms. Cross-tool, cross-session continuity.
- **Multi-Agent Coordination** — Session registry for agent swarms. No file conflicts.

## Install

### Claude Code Plugin (recommended)

```bash
/plugin marketplace add permanu/superskill
/plugin install superskill
```

### npm (any MCP-compatible tool)

```bash
npm install -g superskill
```

Or use directly:
```bash
npx superskill
```

### From source

```bash
git clone https://github.com/permanu/superskill.git
cd superskill
npm install && npm run build
```

## Quick Start

Once installed, SuperSkill auto-detects your project and loads skills on demand. The main MCP tool is `superskill` — the LLM calls it automatically when it recognizes a task that matches a skill domain.

### How It Works

1. Agent starts session → SuperSkill injects skill awareness via `vault_resume`
2. User says "let's think about this problem"
3. Agent recognizes brainstorming intent → calls `superskill({domain: "brainstorming"})`
4. SuperSkill returns expert methodology → agent follows it

No manual commands needed. The LLM decides when to use skills based on your intent.

### Skill Domains

| Domain | What It Covers |
|--------|---------------|
| `brainstorming` | Thinking through problems, exploring ideas, ideating |
| `planning` | Architecture, implementation strategy, scoping |
| `code-review` | PR review, code quality, feedback |
| `tdd` | Writing tests, coverage, test-driven development |
| `debugging` | Investigating errors, troubleshooting, root cause |
| `security` | Vulnerability review, auth, OWASP, hardening |
| `verification` | Build checks, lint, type validation |
| `shipping` | Deployment, CI/CD, releases, rollbacks |
| `frontend-design` | UI/UX, components, visual design |
| `agent-orchestration` | Multi-agent, parallel tasks, subagents |
| `database` | SQL, schemas, migrations, query optimization |

### CLI

```bash
# Marketplace
superskill-cli skill catalog                        # 87 skills, 9 repos
superskill-cli skill catalog --search "tdd"         # search
superskill-cli skill collisions                     # 12 collision domains
superskill-cli skill resolve --profile ecc-first    # see winners

# Generate super-skill (auto-detects stack)
superskill-cli skill generate                       # Go project → 14 skills, React → different set

# Smart activate (describe task, get skill)
superskill-cli skill activate "brainstorm this"     # → loads brainstorming skill
superskill-cli skill activate "write tests"         # → loads TDD skill
superskill-cli skill activate "review PR" --domain code-review  # direct domain

# Progressive disclosure
superskill-cli skill manifest                       # lightweight index
superskill-cli skill load ecc/tdd-workflow          # load one skill

# Knowledge vault
superskill-cli context                              # project context
superskill-cli task add "Fix auth bug" --priority p0
superskill-cli task board                           # kanban view
superskill-cli learn add --title "Redis pattern"    # capture learning
superskill-cli decide --title "Use PostgreSQL"      # log ADR
superskill-cli resume                               # what happened last session
```

## MCP Setup (non-plugin)

For tools that don't support Claude Code plugins, configure as a standard MCP server:

### Claude Code

```bash
claude mcp add superskill -e VAULT_PATH=~/Vaults/ai -- npx -y superskill
```

### Claude Desktop / Cursor / Codex / OpenCode

Add to your MCP config:

```json
{
  "mcpServers": {
    "superskill": {
      "command": "npx",
      "args": ["-y", "superskill"],
      "env": {
        "VAULT_PATH": "~/Vaults/ai"
      }
    }
  }
}
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `superskill` | **Main tool** — load expert methodology by domain, task description, or skill ID |
| `vault_read` | Read file or directory from vault |
| `vault_write` | Write/append/prepend content |
| `vault_search` | Full-text search across vault |
| `vault_project_context` | Get project context (auto-detects from CWD) |
| `vault_init` | Generate draft context.md from a git repo |
| `vault_decide` | Log architecture decision |
| `vault_task` | Manage tasks (add/list/update/board) |
| `vault_learn` | Capture/list learnings |
| `vault_session` | Multi-agent session coordination |
| `vault_skill` | Skill marketplace operations (catalog/collisions/resolve/generate) |
| `vault_resume` | Resume context — recent sessions, interrupted work, next steps |
| `vault_prune` | Archive/delete stale content |
| `vault_stats` | Content statistics |
| `vault_deprecate` | Mark items as deprecated |

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `VAULT_PATH` | `~/Vaults/ai` | Path to knowledge vault |
| `MAX_INJECT_TOKENS` | `1500` | Max tokens for context injection |
| `SESSION_TTL_HOURS` | `2` | Session heartbeat TTL |

## Vault Structure

```
~/Vaults/ai/
├── project-map.json           # Path → slug mappings
├── coordination/
│   ├── session-registry.json  # Active agent sessions
│   └── locks/                 # PID lockfiles
├── skills/
│   ├── installed/             # Installed skills
│   ├── super-skill/           # Generated super-skill files
│   └── registry.json          # Skill metadata
└── projects/<slug>/
    ├── context.md             # Project overview
    ├── decisions/             # Architecture Decision Records
    ├── tasks/                 # Task files
    ├── learnings/             # Learning captures
    ├── sessions/              # Session notes
    ├── brainstorms/           # Brainstorm documents
    └── _archive/              # Pruned content
```

## Testing

```bash
npm test                           # Run all tests (Vitest)
npm run test:coverage              # With coverage
npm test src/lib/auto-profile.test.ts  # Specific file
```

## License

AGPL-3.0-or-later — See [LICENSE](./LICENSE)

Commercial license available for organizations with >$1M annual revenue. See [LICENSE-COMMERCIAL.md](./LICENSE-COMMERCIAL.md).

Copyright 2026 Permanu (Atharva Pandey)
