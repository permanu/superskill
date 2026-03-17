# Obsidian-Powered Universal Agentic Knowledge Base

**Date**: 2026-03-17
**Status**: Implementing
**Scope**: User-level (not project-specific)

## Problem

AI coding tools (Claude Code, OpenCode, Codex) maintain fragmented, siloed memory systems:
- Claude Code: file-based per-project memories in `~/.claude/projects/<path>/memory/`
- OpenCode: vector-embedded memory (nomic-embed, 768d) in a 710MB SQLite DB
- Codex: 53MB SQLite state + session index, `memories` feature flag not yet stable

Across 19+ projects, context is lost between sessions, tools can't share knowledge, and there's no unified way to track decisions, brainstorms, todos, or patterns cross-project.

## Solution

`obsidian-kb` — a CLI tool + MCP server backed by an Obsidian vault that serves as the universal context backbone for all AI coding tools.

**Two vaults**:
- `~/Vaults/ai/` — AI-operated (all tools read/write via CLI/MCP)
- `~/Vaults/personal/` — Human-only (AI never touches)

## Architecture

```
AI Tools + Human ──┬── MCP Protocol ──┬── obsidian-kb MCP Server
                   └── Direct CLI ────┘          │
                                          Filesystem I/O + Obsidian REST API
                                                  │
                                           ~/Vaults/ai/
```

## CLI: `obsidian-kb`

18 commands: read, write, append, list, search, context, decide, todo (list/add/complete), brainstorm, session (register/heartbeat/complete/list), graph (related/cross-project)

## MCP Server

8 tools, 2 resources, 2 prompts. Connected to Claude Code, OpenCode, and Codex via their respective MCP configs.

## Bootstrap Protocol

Hybrid auto + on-demand:
- **Auto-inject** (~1500 tokens): project summary, blockers, recent decisions, session conflicts
- **On-demand**: full ADRs, brainstorm threads, cross-project search, graph traversal

## Key Design Decisions

1. CLI + MCP dual interface (not MCP-only)
2. Filesystem + optional REST API (works without Obsidian running)
3. Per-project folders (not flat tags)
4. Token-budgeted bootstrap
5. Lock-free advisory coordination for swarming
