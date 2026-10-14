---
name: superskill
description: Routes authorized coding work through the superskill project knowledge graph and verified rules. Use when this host exposes superskill MCP tools or a repository is initialized with superskill, for project-scoped context, task routing, rules, review, or lifecycle operations.
---

<!-- superskill:skill -->

# SuperSkill

SuperSkill is a consumer skill for a host-configured `superskill` MCP server, not a standalone API or offline service. Use only tool names actually exposed by the host: OpenCode Code Mode uses `tools.superskill.<tool>`, while Claude Code exposes `mcp__superskill__<tool>`. Other hosts may differ; never guess or mechanically rewrite a tool name. If a tool is unavailable, report that or use an already-installed CLI after verifying it with `superskill --help`. Do not install tools or use `npx` unless network use is explicitly approved.

## Scope and authorization

- Treat a coding request as authorization for its specified project and changes only. Establish the actual checkout and project; never guess a project slug. If mapping is needed for authorized work, call `register` with the absolute checkout path and use its returned slug.
- Session registration and completion are coordination bookkeeping for authorized nontrivial code work; completion persists a session note. This does not authorize additional ADRs, learnings, tasks, or reports unless requested or required by project policy.
- Keep data scoped to the named project; access other project history only with explicit scope and authorization. Redact prompt text by default; use `include_prompts` only for bounded excerpts from the current project when explicitly requested and needed. Never expose secrets, credentials, or unrelated history.
- Do not infer permission for network access, installs, global configuration, fixes, dismissals, manual cleanup/cache apply/GC, publishing, or destructive changes. The built-in session-maintenance preservation path below is the exception; preview manual actions and proceed only with explicit authorization.

## Workflow

- Use the smallest workflow that fits. Simple questions and read-only lookups need no session, plan, HLD/LLD, or human-question ritual; ask only when scope, authorization, or risk is genuinely unclear.
- For nontrivial authorized code work, load `project_context` and search relevant project notes before planning. Register once with the `session` tool using `action: "register"`, tool, project, and absolute `workspace_path`; retain `session_id`.
- Route with `superskill` using task, repo-relative files, `session_id`, `workspace_path`, and phase (`explore|implement|review|ship`). Reuse the same session; reroute when task, files, or phase meaningfully change. Complete that session with the outcome and verification evidence.
- Inspect the returned worktree assessment. Use `worktree_env` before installs/builds. Built-in session maintenance may automatically quarantine or relocate eligible clean, idle, session-owned checkouts after session completion once they are proven integrated into the repository's actual default branch; it preserves the whole checkout in a locked recovery archive, returns recovery metadata, and never deletes it. An assessment alone does not authorize manual actions. Manual cleanup, cache apply/GC, permanent removal, policy/config changes, and installs require explicit authorization; never force-remove a checkout.

## Retrieve only what is needed

- Start with graph metadata (`graph_traverse` `resolve`, `children`, or `node`); budget by the returned size estimates, then open only relevant notes, skills, rules, or symbols. Use graph IDs such as `constitution` and `principle:<existing-id>`; resolve references through the graph rather than guessing package-relative paths. Only verified rules are injected by default.
- For paged reads, use `offset_bytes` and bounded `max_bytes`. If `read_complete` is false, continue at `next_offset_bytes` until complete; never rely on a partial instruction or unsafe content.
- If a required tool or dependency is missing, report it or choose an already-available transport. A CLI fallback must be verified installed; never claim an offline API or install/use `npx` without explicit network approval.

## Examples

- **Normal work:** Route a requested code change with its task, files, and phase; reuse the registered session, inspect graph metadata first, then open only the relevant source or rule.
- **Read-only question:** Answer from the smallest relevant lookup; do not create a session, plan, or memory entry when none is needed.
- **Risky watchdog action:** Call the host-discovered `watchdog` MCP tool by its exact exposed name (OpenCode Code Mode: `tools.superskill.watchdog`; Claude Code: `mcp__superskill__watchdog`) with `action: "dig"`, current-project scope, and `persist: false`. Preview fixes with `apply: false`, show the actions, and wait for explicit confirmation before `apply: true`. Set `dismiss: true` only when dismissal is explicitly requested.
