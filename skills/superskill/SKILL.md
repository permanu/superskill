---
name: superskill
description: Use when superskill MCP tools are available or this repo uses a superskill vault — load project context at session start, search decisions/learnings/tasks before planning or review, and register/close sessions so concurrent agents stay coordinated.
---

<!-- superskill:skill -->

# SuperSkill

SuperSkill is the shared project memory served by the `superskill` MCP server. Tool names carry the harness prefix (for example `superskill_project_context` or `mcp__superskill__project_context`).

## Session loop

1. **Load context** — call `project_context` for the current project at session start. If auto-detection fails, pass `project` explicitly (usually the repo directory name).
2. **Search before deciding** — call `search` for the topic before planning, large edits, or review; reuse the decisions and learnings it returns.
3. **Coordinate** — call `session` with `action: register` when you start, and `action: complete` with a one-line outcome when you finish.
4. **Write back** — record durable decisions, learnings, and follow-up tasks through the MCP tools so later sessions inherit them.

## Rules

- The vault is jailed to `VAULT_PATH`; only the superskill MCP tools and `superskill-cli` touch it.
- No "done" without evidence — run the checks the repo defines and report their results.
- If the project has no vault context yet, say so plainly instead of inventing history.
