# MCP tools

The MCP server exposes the tools below. MCP tool names use underscores; the CLI mirrors the same surface under dash-separated command names (`snapshot`, `env-facts`, `cred-refs`) and adds `setup`/`teardown`, which have no MCP equivalent.

Arguments are validated before adaptation or filesystem work. An unresolved workspace cannot access implicit vault memory. Supported explicit-project reads select a project jail; workspace-derived tools cannot redirect checkout code into a sibling project. Pass `workspace_path` where the tool schema declares it to select the actual thread checkout. Oversized responses use a parseable `{truncated, bytes, preview}` JSON envelope rather than cut-off JSON. Per-server sliding budgets distinguish writes/index-building calls, ordinary reads, and expensive diagnostics; rate errors return `RATE_LIMITED`.

| Tool | What it does |
|---|---|
| `superskill` | Route a task to packs + a deterministic rule plan. Params: `task`, `skill_id`, `files`, `phase`, `max_tokens`, `session_id`, `detail`, `workspace_path`. |
| `read` | Read a file or directory listing from the vault. |
| `write` | Write/append/prepend a vault file (default append). |
| `search` | FTS5 search scoped to this project; structured mode matches frontmatter. |
| `project_context` | Project context document (auto-detects from CWD). |
| `generate_context` | Scan a repo and return a draft `context.md` (does not write). |
| `decide` | Log an ADR to the project's decisions directory. |
| `task` | Add/list/update/board project tasks. |
| `learn` | Capture/list learnings. |
| `brainstorm` | Start/continue a brainstorm document. |
| `session` | Register/heartbeat/complete/list_active agent sessions; `complete` writes a session note. Params: `action`, `tool`, `project`, `workspace_path`, `session_id`, plus per-action fields. |
| `resume` | Recent sessions, interrupted work, in-progress tasks, next steps. |
| `stats` | Project content statistics. |
| `prune` | Archive/delete stale content by retention policy (dry-run first). |
| `deprecate` | Mark a vault item deprecated with a reason. |
| `init` | Initialize SuperSkill for the current project (stack, catalog, graph). |
| `status` | Knowledge graph state: skills, weights, recent sessions. |
| `telemetry` | Local, opt-in rule-selection telemetry: `status`/`enable`/`disable`/`report`/`clear`. State-changing actions require `confirm: true`. |
| `doctor` | One-shot health check across install, running MCP servers, vault, mapping, graph isolation, catalog, toolchains, and clients. `fast: true` skips catalog and toolchain checks. |
| `register` | Map a repo to a vault project so vault commands auto-detect without `-p`. |
| `skill_install` | Install skills from a GitHub repo. |
| `skill_list_installed` | List locally installed skills. |
| `skill_remove` | Remove an installed skill by name. |
| `link` | Append a `[[wikilink]]` between two vault notes. |
| `extract` | Extract items from a source document into individual vault files. |
| `capture` | Batch-capture insights into individual vault items. |
| `template` | Pre-filled templates for common vault item types. |
| `graph_related` | Related notes via the FTS/edges index, jailed to this project. |
| `graph_traverse` | Lazy project metadata and content: `action: node\|children\|resolve\|open`, `id`, `task`, `limit`, `full`, `offset_bytes`, `max_bytes`, `workspace_path`. `open` returns `next_offset_bytes` and `read_complete` for byte-paged content. |
| `graph_cross_project` | Project-jailed search; cross-project is denied. |
| `knowledge_rebuild` | Rebuild the project's FTS + edges index from markdown. |
| `knowledge_viz` | Write Mermaid architecture notes and generated code notes for the project. |
| `snapshot_repo_state` | Snapshot git state (branch, dirty files, last commit) into the vault. |
| `env_facts` | Store/query stable environment facts (not secrets). |
| `cred_refs` | Store pointers to where credentials are documented. |
| `rollback` | Manage rollback checkpoints (commit, purpose, scope, follow-up). |
| `spec` | Deterministic plan specs: create/status/approve/freeze/list. |
| `tickets` | Tickets from frozen specs: create/list/board/ready/update. |
| `evidence` | Record/read ticket evidence. |
| `gate` | Deterministic evidence gate for a spec or ticket. |
| `impact` | Code-graph impact: definitions, importers, callers, shortest path. |
| `claims` | Verify structured claims against a code-graph scan. |
| `worktree_status` | Worktree health: repo id, worktrees, safe/unsafe verdicts, cache size, policy/hook state. Params: `json`, `budget`. |
| `worktree_audit` | Per-worktree safety verdict, cache duplication, manifest drift, repo items. Params: `json`, `sizes`, `worktree`. |
| `worktree_env` | Resolve the shared-cache environment for the current worktree. Params: `json`, `shell`, `providers`, `timeout_ms`. |
| `worktree_activate` | Write the per-repo policy and install the guarded post-checkout hook + host session adapters. Preview with `confirm: false`; params `confirm`, `hooks`, `hosts`, `seed`, `install`, `dry_run`. |
| `worktree_apply` | Apply audit items or restore local quarantine; plan unless `confirm: true`. Params: `item`, `all_safe`, `undo`, `confirm`. |
| `worktree_gc` | Cache GC: dry-run report by default; quarantine/purge/undo with `confirm: true`. Params: `tool`, `older_than`, `newer_than`, `min_size`, `max_size`, `tier`, `include`, `exclude`, `keep_latest`, `project`, `all`, `worktree`, `purge`, `undo`, `journal_id`, `confirm`. |
| `worktree_uninstall` | Remove hooks/adapters; policy, caches, and quarantine stay unless `purge_local` + `confirm: true`. |
| `hygiene_report` | Read-only space hygiene report across caches, worktrees, docker, xcode, and agent scratch; every item carries a reason and a remediation command. Never deletes. Params: `sizes`, `categories`. |
| `watchdog` | Session review + environment optimization. `dig` analyzes a session, window, or machine environment (findings with evidence + proposals, per-session digests, report note in the vault); `fix` applies approved findings and reclaims leaks (dry-run default, quarantine + undo); `status` lists past digs and open findings. Params: `action`, `scope`, `session_id`, `tool`, `since`, `count`, `project`, `all_projects`, `confirm`, `include_prompts`, `persist`, `finding_ids`, `categories`, `dismiss`, `apply`, `report_path`. `all_projects` requires confirmation; transcript excerpts are omitted unless explicitly opted in. |
