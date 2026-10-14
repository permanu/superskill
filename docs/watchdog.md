# Watchdog

Watchdog reviews the coding-agent environment: the session traces your harness writes (prompts, tool calls, failures, retries, token spend, diffs), pinned against the repo itself — its checks, its steering files, its skill graph — and the machine around it (caches, harness stores, plugins). It returns severity-ranked findings, each with evidence and a concrete proposal, and remembers them across digs so recurring problems carry more weight.

Analysis runs locally and Watchdog does not upload reports to an analysis service. Native probes can contact user-configured services, such as a remote Docker daemon; MCP responses go to the connected host/model. Findings are heuristic signals, not proof of a defect: review their evidence against the repo before applying a proposal. Missing or truncated traces can hide activity, including verification commands.

By default, returned digests and persisted reports omit prompt excerpts, session titles, command inputs, failure text, and free-text session outcomes/blockers. They retain counts, token totals, call/session references, and relevant file paths. Reports are not anonymous: project paths, file paths, tool names, and session identifiers remain visible. Explicitly opting in with `includePrompts: true` (`include_prompts` over MCP, `--include-prompts` in the CLI) includes bounded sensitive excerpts, including commands and errors, in both the response and any saved report. Review them for secrets; use `persist: false` / `--no-persist` when no report should be saved. Existing reports are not rewritten or scrubbed.

## The loop

| Step | Command | What happens |
|---|---|---|
| **dig** | `watchdog dig` | Reads source data without changing it. By default, writes an analysis report under `projects/<slug>/watchdog/`; disable persistence explicitly if needed. |
| **fix** | `watchdog fix` | Applies what you approved. Dry-run by default. File reclamation is quarantined and reversible. |
| **status** | `watchdog status` | Past digs, open findings, recurrence counts, and which trace sources were detected. |

Findings are grouped by the part of the environment that failed: **navigation** (thrash, dead pointers), **verification** (edits with no checks run), **tool economy** (error loops, duplicate calls, oversized outputs), **steering** (oversized / duplicated / stale AGENTS.md and CLAUDE.md), **skills** (dead graph nodes, never-selected rules), **plugins** (unused or erroring MCP servers), **prompt** (repeated course corrections), **guardrails** (a repo with no lint/test/CI safety net), and **environment** (leaked temp files, runaway caches, harness store growth).

## Three ways to reach it

- **CLI**

  ```bash
  superskill watchdog dig                              # latest session in this project
  superskill watchdog dig --scope window --since 7d      # recent sessions in this project
  superskill watchdog dig --scope window --all-projects --confirm --no-persist
  superskill watchdog dig --include-prompts --no-persist # sensitive excerpts, explicitly requested
  superskill watchdog dig --scope env                   # machine + repo environment
  superskill watchdog dig --scope all --json            # everything, machine-readable
  superskill watchdog status
  superskill watchdog fix --category leaked-tmp         # dry-run preview
  superskill watchdog fix --category leaked-tmp --apply # quarantined, reversible
  superskill watchdog fix --finding <id> --dismiss      # dry-run preview
  superskill watchdog fix --finding <id> --dismiss --apply # apply reviewed dismissal
  ```

- **MCP** — the `watchdog` tool (`action: dig | fix | status`) for any connected agent; `dig` returns the rendered report plus per-session digests that are budgeted for the model. `all_projects: true` requires boolean `confirm: true` before any cross-project history is listed or read. `include_prompts` defaults to false. `fix` is dry-run unless `apply: true` is explicitly supplied.
- **Slash command** — `/watchdog` (installed by `setup`) loads `catalog/watchdog/dig.md` and walks the verify-first flow.
- **Natural language** — "run a watchdog dig over this week's sessions", "what did the last session waste on?", "clean up the leaked temp files", "review the agent environment". The router picks the `watchdog` pack from the task.

`--dismiss` selects the dismissed status; it is not itself a dry-run bypass. The status mutation requires `--apply`, and should be applied only after reviewing and approving the finding. Without `--apply`, both dismissal and other fixes only produce a plan.

## What watchdog reads

The trace registry supports **OpenCode** (JSON session store, messages, parts, diffs), **Claude Code** (JSONL transcripts), and **Codex CLI** (rollouts). Codex parsing records literal nested tool calls and file paths without executing trace code. Unresolved asynchronous calls remain unknown; dynamic script effects are not inferred. Harnesses without a dedicated reader fall back to SuperSkill's own session notes; they do not gain native tool-call coverage. Watchdog does not read telemetry events as a substitute for traces.

History is scoped to the selected project, including explicit session IDs. Watchdog MCP contexts bind explicit projects to the actual checkout even when `workspace_path` is omitted; direct calls cannot replace that scoped project. The current repo is resolved from its git root, even from a subdirectory. Unknown project paths and unresolved/null vault scopes skip harness history rather than scanning an ancestor directory. Confirmed `all_projects` broadens history sources, not the current project's report storage/status scope. Claude's lossy directory slugs are not converted into guessed paths: a bounded JSON header must provide a real `cwd` for project-scoped matching. Codex checks modification times before reading bounded headers, so recently updated older sessions remain eligible.

JSONL payloads are streamed through file handles with a maximum 64 MiB byte budget per trace and 500 retained calls. Claude lines over 1 MiB and Codex lines over 4 MiB are skipped. Limits count UTF-8 bytes, not characters; a budget-cut final line is not parsed. Commands, file metadata, and pending results from discarded calls are not retained. OpenCode JSON payloads also use bounded reads with an aggregate byte/file budget. Unsupported, malformed, missing, or capped data is incomplete evidence, not evidence of a clean session.

Steering files are read through no-follow, nonblocking regular-file handles with a 40,000-byte cap before decoding or computing metrics. Symlinks, devices, FIFOs, and directories are not steering payload sources. When capped, retained-prefix line/character/token metrics are explicitly marked incomplete rather than presented as whole-file measurements.

## Safety

File reclamation moves only selected `.tmp` files directly under `~/.superskill/` into a unique quarantine directory. Quarantine directories are `0700`; manifests and moved files are `0600`. The manifest is written before moves, so it remains a recovery reference after partial failure. Restore only regular files to their exact original paths when those paths are absent; never overwrite an existing file or follow symlinks. The internal restore helper enforces these checks; there is no watchdog restore CLI action.

`fix` updates finding status and appends a fix log to the selected watchdog report. It does not modify harness transcripts, other vault notes, or project files. Steering and guardrail edits remain agent-applied after reviewing the proposal and running checks (see `catalog/watchdog/dig.md`).

Environment size probes share entry, root, and elapsed-time budgets across caches and harness stores, rather than receiving a fresh allowance for every directory. Limits are checked between filesystem operations. A capped scan reports lower bounds and explicitly identifies unassessed data. Hygiene worktree probes are restricted to the selected repo by watchdog; hygiene has its own probe limits.

## Local telemetry consent

Rule-selection telemetry is separate from watchdog and disabled by default. It never sends network requests. Newly recorded prompt identities use HMAC-SHA256 with a random per-install key stored privately in `~/.superskill/telemetry/task-key`, not a globally stable hash of guessable prompt text. Raw prompts are not written to events. Deleting events with `telemetry clear` also removes this key; older event files may contain legacy hashes until cleared.

MCP `telemetry` actions `enable`, `disable`, and `clear` require boolean `confirm: true`; read-only `status` and `report` do not. `SUPERSKILL_TELEMETRY=0` always disables recording. `SUPERSKILL_TELEMETRY=1` opts in only when there is no explicit persisted opt-out: `telemetry disable` stays effective even if that environment variable is on. `enable` reports the effective state if the environment still disables recording.

## Environment variables

| Variable | Effect |
|---|---|
| `SUPERSKILL_OPENCODE_DATA` | Override the OpenCode data root (`~/.local/share/opencode`) |
| `SUPERSKILL_CLAUDE_PROJECTS` | Override the Claude Code projects root (`~/.claude/projects`) |
| `SUPERSKILL_CODEX_SESSIONS` | Override the Codex sessions root (`~/.codex/sessions`) |
