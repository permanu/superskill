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

## Lazy retrieval — never bulk-load

Reach content through the graph instead of loading everything:

1. **Resolve** — `graph_traverse` with `action: "resolve"` and your task: returns the proposed load path (matched skills, rules, notes) as `{ id, path, bytes, tokens, reason }` — **no content**.
2. **Descend** — `action: "children"` one level at a time (`rules` → `rules:rust` → `rules:rust/own` → rule ids), or `action: "node"` for metadata + edges.
3. **Open** — `action: "open"` pulls exactly one file's content (capped ~4KB; `full: true` for all) only when you actually need it.

Id prefixes: `vault:<path>`, `skill:<pack/name>`, `rule:<id>`, `code:<path>`; containers like `rules:<lang>/<prefix>`. Budget first (tokens ≈ bytes/4), open second. CLI: `superskill graph resolve|children|node|open`.

## Rules

- The vault is jailed to `VAULT_PATH`; only the superskill MCP tools and the `superskill` CLI touch it.
- No "done" without evidence — run the checks the repo defines and report their results.
- If the project has no vault context yet, say so plainly instead of inventing history.
