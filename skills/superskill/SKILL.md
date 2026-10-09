---
name: superskill
description: Use when superskill MCP tools are available or this repo uses a superskill vault — load project context at session start, search decisions/learnings/tasks before planning or review, register/close sessions, reroute on meaningful task or phase changes, and consume worktree lifecycle assessments so concurrent agents stay coordinated.
---

<!-- superskill:skill -->

# SuperSkill

SuperSkill is the shared project memory served by the `superskill` MCP server. Tool names carry the harness prefix (for example `superskill_project_context` or `mcp__superskill__project_context`).

## Session loop

At every session start, establish the actual checkout and invoke SuperSkill in the first phase before project work:

1. **Resolve the project and load context** — if the checkout is unmapped, call the `register` tool with `path` set to its absolute path. Use the returned project slug for `project_context` and subsequent project-scoped calls; never invent a slug or borrow another project's knowledge. If no context exists yet, say so and continue with the new mapping.
2. **Search before deciding** — call `search` before planning, large edits, or review; reuse relevant decisions and learnings.
3. **Coordinate** — call `session` with `action: register`, your tool, project and absolute `workspace_path`. Retain the returned `session_id`; do not reuse another thread's ID.
4. **Initialize and route the current work** — immediately call `superskill` with `task`, repo-relative `files`, `session_id`, `workspace_path`, and explicit `phase` (`explore|implement|review|ship`). This first activation initializes a missing graph from the local catalog for the mapped workspace. Repeat when the task, affected files or phase meaningfully change and before verification or completion. Reuse the current result within the same work phase instead of rerouting every tool call.
5. **Consume the worktree assessment** — inspect `result.worktree` from session registration and activation. Follow its next steps before dependency installs/builds and at completion. Run `worktree_env` or `worktree_audit` in the exact returned workspace; use the CLI with that working directory when a tool cannot accept an explicit path. Never assume the MCP server's startup directory is the current thread's checkout.
6. **Close the loop** — record durable decisions, learnings and follow-up tasks, then call `session` with `action: complete`, the same session ID, project and workspace, a concise outcome and verification evidence. Report unresolved worktree actions rather than silently treating them as complete.

Worktree inspection is the default. Use the built-in completed-session cleanup only for clean, idle, session-owned worktrees proven merged into main and reported eligible by the lifecycle checks. Keep anything ineligible, uncertain or still in use; report why. Do not force removal or substitute a shell cleanup. Other policy activation, cache apply/GC and manual removals require existing user authorization for that scope; do not infer permission from an assessment. These instructions guide the host: the MCP server cannot force a harness to call tools or infer an unreported task/phase change.

Run setup once to migrate older managed launchers. Subsequent MCP starts select the stable latest package and refresh existing managed shared skills and recognized Markdown blocks. Start a new host session to load refreshed context. Pinned launchers, custom instructions, and already running servers remain unchanged.

## Local integration before publishing

The coordinator keeps related dependent changes in an ordered local stack of branches/PR layers, integrates worker results, and validates each layer plus the combined top before a batch push. Workers do not independently push or create PRs by default. Keep independent parallel changes separate; do not stack unrelated work just to reduce branch count. Publish or merge remotely only when authorized, preserving required review and CI. After merge into main, complete the owning sessions and consume lifecycle cleanup eligibility; do not leave eligible completed worktrees behind or remove active ones.

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
