# Watchdog

Watchdog reviews the coding-agent environment: the session traces your harness writes (prompts, tool calls, failures, retries, token spend, diffs), pinned against the repo itself — its checks, its steering files, its skill graph — and the machine around it (caches, harness stores, plugins). It returns severity-ranked findings, each with evidence and a concrete proposal, and remembers them across digs so recurring problems carry more weight.

The codebase is the source of truth: traces are claims, findings are only shipped after verification against the repo. Everything runs locally; raw prompts are never persisted — dig notes store findings and evidence references, not transcripts.

## The loop

| Step | Command | What happens |
|---|---|---|
| **dig** | `watchdog dig` | Read-only analysis of a session, a window of sessions, the machine environment, or all of it. Writes a report note under `projects/<slug>/watchdog/`. |
| **fix** | `watchdog fix` | Applies what you approved. Dry-run by default. File reclamation is quarantined and reversible. |
| **status** | `watchdog status` | Past digs, open findings, recurrence counts, and which trace sources were detected. |

Findings are grouped by the part of the environment that failed: **navigation** (thrash, dead pointers), **verification** (edits with no checks run), **tool economy** (error loops, duplicate calls, oversized outputs), **steering** (oversized / duplicated / stale AGENTS.md and CLAUDE.md), **skills** (dead graph nodes, never-selected rules), **plugins** (unused or erroring MCP servers), **prompt** (repeated course corrections), **guardrails** (a repo with no lint/test/CI safety net), and **environment** (leaked temp files, runaway caches, harness store growth).

## Three ways to reach it

- **CLI**

  ```bash
  superskill watchdog dig                              # latest session in this project
  superskill watchdog dig --scope window --since 7d     # bulk review across sessions
  superskill watchdog dig --scope env                   # machine + repo environment
  superskill watchdog dig --scope all --json            # everything, machine-readable
  superskill watchdog status
  superskill watchdog fix --category leaked-tmp         # dry-run preview
  superskill watchdog fix --category leaked-tmp --apply # quarantined, reversible
  ```

- **MCP** — the `watchdog` tool (`action: dig | fix | status`) for any connected agent; `dig` returns the rendered report plus per-session digests that are budgeted for the model.
- **Slash command** — `/watchdog` (installed by `setup`) loads `catalog/watchdog/dig.md` and walks the verify-first flow.
- **Natural language** — "run a watchdog dig over this week's sessions", "what did the last session waste on?", "clean up the leaked temp files", "review the agent environment". The router picks the `watchdog` pack from the task.

## What watchdog reads

The trace registry mirrors the setup client list: **OpenCode** (session store, messages, parts, diffs — richest), **Claude Code** (JSONL transcripts), **Codex CLI** (rollouts). Codex parsing records literal nested tool calls and file paths without executing trace code. Unresolved asynchronous calls remain unknown; dynamic script effects are not inferred. Harnesses without a dedicated reader still degrade gracefully: SuperSkill's own session notes, graph, and telemetry cover them, so the loop works everywhere and gets deeper per harness as readers land.

## Safety

`watchdog fix` never deletes. Reclamation moves files into `~/.superskill/quarantine/<timestamp>/` next to a manifest that records origin paths and the undo step. Harness session data, vault notes, and user files are report-only — they are never touched by `fix`. Steering and guardrail edits stay agent-applied with one source of truth, checks over rules (see `catalog/watchdog/dig.md`).

## Environment variables

| Variable | Effect |
|---|---|
| `SUPERSKILL_OPENCODE_DATA` | Override the OpenCode data root (`~/.local/share/opencode`) |
| `SUPERSKILL_CLAUDE_PROJECTS` | Override the Claude Code projects root (`~/.claude/projects`) |
| `SUPERSKILL_CODEX_SESSIONS` | Override the Codex sessions root (`~/.codex/sessions`) |
