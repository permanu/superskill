---
name: graph
pack: memory
always: true
triggers: [vault, memory, graph, context, session, learning, adr]
---

# Shared memory

Vault notes are **this project only**. Do not read or search sibling `projects/`. Do not write secrets, keys, tokens, or `.env` values — store a name in `cred_refs` instead.

The graph is how the agent stays current: session complete, `learn add`, ADRs. A review that skips vault + graph is guessing.

On start: `project_context` → `search` (this slug) → `resume` → `session` register. Prefer `superskill` with the user task over listing skills.

Keep writes atomic: one ADR, one learning, one task. If another session holds the same files, stop and coordinate.
