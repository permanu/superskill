# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.0] - 2026-10-05

### Added
- `superskill-cli register [path] --slug <name>` (and the MCP `register` tool): map a repo to a vault project so vault-backed commands auto-detect without `-p`. `skill init` now registers automatically and reports the mapping.
- `superskill-cli doctor` (and the MCP `doctor` tool): one-shot health check across runtime, install-vs-running-MCP freshness, vault, project mapping, project graph isolation, rules catalog, compile toolchains, telemetry, and MCP clients.
- **Watchdog**: session review + environment optimization. `superskill-cli watchdog dig|fix|status` and the `watchdog` MCP tool review harness session traces (OpenCode, Claude Code, Codex; harnesses without a reader fall back to SuperSkill session notes, graph, and telemetry), pin findings against the repo, and produce severity-ranked findings with evidence and proposals. `dig` scopes: one session, a window (`--since`/`--count`), the machine environment, or all; reports persist as `projects/<slug>/watchdog/` notes with machine-readable finding status. `fix` is dry-run by default; file reclamation quarantines into `~/.superskill/quarantine/<timestamp>/` with a manifest for undo. `status` tracks open findings and recurrence across digs.
- Watchdog findings cover navigation thrash, verification gaps, tool error loops/duplicates, oversized outputs, steering bloat/duplication/staleness, dead skills, unused or erroring MCP servers, repeated prompt corrections, missing repo guardrails, and environment bloat (leaked `.tmp` files, runaway caches, harness store growth).
- New `watchdog` catalog pack (`catalog/watchdog/dig.md`, `catalog/watchdog/fix.md`) and a `/watchdog` slash command installed by `setup`; the router selects the pack for natural-language requests like "run a watchdog dig" or "clean up the agent environment".
- Session data quality: `session complete` records the registry's real `started_at`, closes the repo graph session with a mapped outcome and insights, and `learn` increments `learnings_captured` on the matching session note. Graph schema v3 adds `lastUsed` per skill (updated on every activation).
- Docs: new **Watchdog** README guide (loop, finding categories, CLI/MCP/slash/natural-language access, safety contract, env overrides).
- **Worktree shared-cache policy**: agents can share cheap caches (package stores, compiler caches, module caches) across git worktrees while keeping per-worktree build state isolated. `worktree activate` writes `.git/superskill/policy.json` and installs a guarded `post-checkout` hook that seeds new worktrees (reflink where available) and always exits 0.
- Host session adapters for Claude Code, OpenCode, Codex, Cursor, Gemini CLI, and GrokBuild (plus a generic `AGENTS.md` fallback) inject the shared-cache environment at session start; the OpenCode plugin merges `worktree env --json` into every shell.
- MCP tools `worktree_status`, `worktree_audit`, `worktree_env`, `worktree_activate`, `worktree_apply`, `worktree_gc`, `worktree_uninstall` (mirrored by `superskill-cli worktree …`). `worktree status` / `worktree audit` report per-worktree safety verdicts, cache duplication, seeded-manifest drift, and a `--budget` flag.
- `worktree gc` defaults to a dry-run report, quarantines selected dirs with `--apply` (reversible via `--undo <journalId>`), and permanently deletes only quarantine entries with `--purge --yes`; filters cover scope (`--all`, `--worktree`, `--project`, `--tool`), age (`--older-than`/`--min-age`, `--newer-than`), size, tier, globs, and `--keep-latest`.
- `worktree apply` applies audit items (policy, hook, seed, prune) behind consent; `worktree uninstall` removes hooks/adapters and keeps policy, caches, and quarantine. Seeding can be disabled with `SUPERSKILL_WORKTREE_BOOTSTRAP=0`; the cache root is configurable with `SUPERSKILL_CACHE_ROOT`.
- Docs: new **Worktree caches** README guide (agent-first usage, safety contract, full CLI reference, filter cookbook, host support matrix, troubleshooting, uninstall) and per-language `## Worktree & caches` notes in `catalog/code/`.
- **Slash-command installer**: `setup` writes `/review`, `/worktree`, and `/superskill` command files for every host that supports them (markdown for most hosts, TOML for Gemini CLI); installs are idempotent and marker-guarded, and `teardown` removes them.
- `doctor` now includes worktree checks (shared policy present, guarded post-checkout hook installed) alongside runtime, install, MCP freshness, vault, graph isolation, catalog, toolchains, telemetry, and clients.
- Pre-commit hook runs `gate check` only when `SUPERSKILL_GATE_TARGET` is set; without a target it is a silent no-op.
- Deep contracts adopted from community skills, alongside the pstack-derived `catalog/principles/*`: `optimizer/adhd` (action-first replies, banned preamble/recap/closer patterns, ≤5 grouped lists, evidence labels, auto-clarity escapes, intensity levels) and `pipeline/lazy-build` (reuse → stdlib → platform → minimal ladder, root-cause rule, hard safety floors, `ponytail:` tradeoff markers), referenced from the always-on `pipeline/norms`.

### Fixed
- CLI bin symlinks (`superskill`, `superskill-cli`) execute correctly when invoked through `node_modules/.bin`.
- Quarantine containment hardening: worktree-local reclaims stay inside the worktree, cache-root quarantines stay inside the cache root, and symlinked or escaping quarantine roots are refused.
- Worktree activation is consent-gated: policy and hooks are written only with explicit `--yes` / `confirm: true`.
- MCP `worktree_gc` tier validation rejects unknown tiers, and MCP write tools are rate-limited.
- Seeded-manifest verification covers directory entries, concurrent writes, and containment before a manifest is trusted.
- Hook backup/restore preserves bytes exactly.
- VaultFS rejects symlink escapes on every read/write path.
- Skill installer rejects path traversal and fails closed when audit status is unavailable.
- `prune` validates the mode before acting.
- Project-scope commands fail closed when no project slug can be resolved.
- Session registry, auto-number, and evidence writes are race-safe.

## [0.8.1] - 2026-10-05

### Fixed
- `superskill --version` / `--help` (and `-V` / `-h` / `version` / `help`) now print and exit on the MCP binary; previously they exited silently with no output. MCP client launches with no arguments are unchanged.

## [0.8.0] - 2026-10-05

### Added
- **Atomic rules catalog** (`catalog/rules/`): 2,245 source-backed, compile-verified rules across Rust, TypeScript, Python, Go, Swift, Java, C, and C++.
- **Deterministic rule engine**: pure-function router (stable tie-breaks, Plan/explain), token-budget packing, verified-only injection, and spec → freeze → tickets → evidence gates that block "done" without proof.
- **Code graph**: tree-sitter extractors for the 8 languages with EXTRACTED/INFERRED confidence, `impact` and `claims` verification.
- **Compile harnesses** for all 8 languages (`src/rules/harness/`): every Bad/Good snippet compiles with its real toolchain; 18 rules carry documented `compile_exempt` reasons.
- **Principles layer** (`catalog/principles/`): cross-language axioms between the constitution and atomic rules, wired into planning and activation.
- **Local, opt-in rule-selection telemetry**: `superskill telemetry status|enable|disable|report|clear` plus the MCP `telemetry` tool — append-only JSONL with hashed prompts and a top-selected / most-dropped / never-triggered report.
- **Per-language CI compile matrix**: fast schema check plus a toolchain matrix with `--strict` (fails instead of silently skipping a missing toolchain).
- **Campaign tracker**: batch claim/release/complete, `superseded` status, and `status-cli revise-plan|reconcile` (`workstreams/`).

### Changed
- License changed from AGPL-3.0-or-later to Apache-2.0.
- Catalog playbooks are **project-agnostic** (any repo SuperSkill is used on), not SuperSkill-internal lore.
- CI no longer publishes to npm. Releases still cut GitHub notes on `v*` tags. Publish with `npm publish` locally.
- Activation also injects atomic rules and principles, budgeted alongside packs.

### Fixed
- `skill activate` / `skill status` / the MCP tool now point at `superskill skill init` for setup (previously a different command).
- Phase inference matches whole words with inflections and recognizes fix/debug/test/optimize/migrate/verify/validate/analyze; no more "fixture" → fix or "stage" → tag false positives.
- Validator no longer treats C/C++ preprocessor lines as comments; catalog warnings 356 → 18 (all documented `compile_exempt`).
- `setup --dry-run` reports clients "would be configured".

## [0.7.1] - 2026-09-21

### Added
- Always-on **systems thinking** (`pipeline/systems`): boundary, stock, flow, feedback, delay.
- **Grill / HITL** (`pipeline/grill`): stop and ask when a review axis or design branch is open. Loaded on review/plan.

## [0.7.0] - 2026-09-21

### Added
- Per-project **SQLite FTS5 + edges** index (`projects/<slug>/.knowledge-index.sqlite`). Porter stemming search; 2-hop related notes without spawning ripgrep. Rebuilt from markdown on write and via `knowledge_rebuild`.
- In-harness **browser QA** (`qa_viz` / `superskill-cli qa viz`): system Chrome via playwright-core, clicks graph nodes and reads the panel. Not a plugin.
- Optional **HTML graph viz** (`knowledge_viz` / `superskill-cli graph viz`) — `knowledge-graph.html` (browser) and `knowledge-graph.canvas` (Obsidian Canvas, no plugin).
- In-repo **catalog packs** (`memory`, `code/<lang>`, `review`, `security`, `ops`, `devops`, `optimizer`) indexed on `init` instead of scraping skills.sh.
- Inverted-index skill router (query tokens → posting lists) with language gates and phase packs.
- **System brief** on every `superskill` activate: stack, recent sessions, co-activations. Review/ship phases require vault `project_context` / `resume` / `search` before judging.
- Project-jailed `VaultFS`: paths rewritten under `projects/<slug>/`; sibling projects denied.
- Vault writes with secret-like content throw `SECRET_REJECTED`.

- **Orchestrator JSON** on every activate (`defaults`, specialists). Security bugs route to review + security + investigate.
- **18-axis code review** playbook (`n/a` required per axis).
- Factory packs: `pipeline/plan`, `tdd`, `verify`, `devops/sre`.
- HTML viz tabs (Graph / HLA / LLA / ERD / Modules), mermaid diagrams, vault inventory in the panel.
- `.superskill/` gitignored; `init` appends it so trajectories stay per-developer.

### Changed
- `init` / `activate` no longer auto-discover from skills.sh or `~/.claude/skills` (project-local skills still index).
- Review phase is `review`/`refactor`/`audit`/`diff` plus **security bugs** — not every `fix`/`test`.
- `search` and `graph_cross_project` are scoped to the current project.
- Session `list_active` / resume filter to the current project.
- Secret scanner is blocking, not a warning.

## [0.6.1] - 2026-05-08

### Added
- **`inject: always` frontmatter** — Mark any file in `shared/` with `inject: always` to have it prepended to every `context` response, before truncation.
- **Stale context warning** — `context` tool emits a `stale_context: true` flag and a markdown warning when the context file's `updated` date is more than 30 days old.

### Changed
- **Stale session cleanup** — Sessions that exceed the TTL are now deleted from the registry instead of being marked `"stale"`. The `resume` tool no longer surfaces interrupted sessions (they were unreliable indicators).
- **Session status type** — Removed `"stale"` from the `Session.status` union; only `"active"` and `"completed"` remain.

## [0.6.0] - 2026-05-04

### Added
- **Structured session notes** — Session `complete` action now accepts `completed`, `partially_completed`, `blocked`, `verification_run`, and `commands_to_resume` fields. Session notes render as machine-actionable sections instead of prose blobs.
- **`snapshot_repo_state` tool** — Snapshot current git state (branch, dirty files, last commit) into the vault for cross-session continuity.
- **`env_facts` tool** — Store and query stable environment facts (auth backend, env file locations, local URLs, required env vars). Not for secrets.
- **`cred_refs` tool** — Store pointers to where credentials are documented, not the credentials themselves. E.g., "Django admin creds are in tests/live/test_all_endpoints.py".
- **`rollback` tool** — Manage rollback checkpoints with commit hash, purpose, scope, and follow-up tracking. Mark when follow-up work starts after a checkpoint.
- **`capture` tool** — Batch-capture multiple insights from a conversation into individual vault items in one call. Supports any content type.
- **`template` tool** — Pre-filled templates for 12 vault item types (adr, prd, decision, learning, spec, rfc, roadmap, competitive-analysis, incident, research, vision, strategy).
- **Vault item versioning** — Overwriting a vault file via `write --mode overwrite` automatically snapshots the previous version to `_versions/`.
- **Secret detection guardrails** — `write` command now scans content for potential secrets (API keys, tokens, private keys, webhook secrets, etc.) and logs warnings. Does not block writes.
- **Improved search** — Search now returns up to 3 matches per file (was 1) and deduplicates by path, surfacing better snippets.

### Changed
- **Session resume** — Now surfaces `blocked` items and `commands_to_resume` from recent sessions in the markdown output.
- **ResumeContext interface** — Extended with `completed`, `partially_completed`, `blocked`, `verification_run`, `commands_to_resume` fields.

## [0.5.1] - 2026-05-04

### Added
- **Freeform content types** — Vault `type` field now accepts any lowercase slug (e.g. `prd`, `vision`, `roadmap`, `rfc`, `competitive-analysis`) instead of a rigid enum of 12 types.
- **`link` tool** — Create forward links between vault notes via `[[wikilinks]]`. Integrates with existing `graph_related` for bidirectional graph traversal.
- **`extract` tool** — Extract decisions, learnings, or other items from a monolithic document into individual vault files with auto-numbering and backlinks.
- **`published` status** — New frontmatter status for draft-to-published workflow.
- **Workflow skill discovery** — `superskill init` now also discovers brainstorming, planning, design, code-review, and testing skills beyond stack-specific skills.
- **Explore phase keywords** — Router recognizes brainstorm, research, investigate, discover, plan, design, prototype, spike as explore-phase tasks.

### Changed
- **Type validation relaxed** — Types validated as lowercase slugs (`/^[a-z][a-z0-9-]*$/`) instead of allowlist. Known types expanded to 21 for documentation.

## [0.5.0] - 2026-03-25

### Added
- **Version-pinned skill cache** — Cache paths include version (`name@1.0.0.md`), with LRU eviction at 5MB. Core prefetch skills exempt from eviction. (#3)
- **Context-aware skill budgeting** — Skills are loaded within a token budget (15% of detected context window, 2k-50k range). Priority-respecting cutoff ensures highest-scored skill always loads. (#10)
- **Windsurf, Aider, Continue support** — Tool detection and setup for 3 new AI tools (11 total). (#14)
- **`superskill-cli onboard` command** — Auto-detects AI tools, configures MCP, scans installed skills. Non-interactive for CI/MCP compatibility. (#15)
- **Skill authoring guide** — CONTRIBUTING.md with authoring docs, SKILL-TEMPLATE.md with triggers field, PR template for skill submissions. (#8)
- **Full skill directory scanning** — Scanner now covers all 11 AI tool directories (added Windsurf, Aider, Continue, Crush, Droid)

### Changed
- **Registry version synced to 0.5.0** — Was stuck at 0.3.0 since initial release
- **Cache uses mtime** — Replaced atime (unreliable on Linux/containers) with mtime for LRU ordering
- **Error handling improved** — Cache write failures now logged with context, temp files cleaned up on failure

### Removed
- **Dead backward-compatible exports** — Unused `DOMAINS`, `CATALOG`, `DOMAIN_PRIORITY` static exports removed from catalog.ts

## [0.4.0] - 2026-03-25

### Added
- **Skill scanner** — Discovers installed SKILL.md files from `~/.claude/skills/`, `~/.cursor/skills/`, and other standard directories. Works with skills installed via `npx skills add` (skills.sh ecosystem) or manual installation.
- **Local skill merging** — Scanned local skills are merged into the registry at startup. Trigger matcher scores against both built-in and locally installed skills.

### Changed
- **Repositioned as runtime intelligence layer** — SuperSkill is no longer positioned as a package manager. It's the routing layer that sits on top of the Agent Skills ecosystem (skills.sh). "skills.sh is where you find skills. SuperSkill is what loads the right one at the right time."
- **README rewritten** — New positioning, skills.sh integration documented, clearer value proposition
- **Tool description updated** — "Runtime skill router" replaces "skill package manager"
- **Skill awareness block** — Shows installed skill count when local skills are detected
- **Package description** updated across package.json, plugin.json, MCP server

## [0.3.0] - 2026-03-25

### Added
- **Central skill registry** — Runtime JSON registry at `registry/index.json` replaces hardcoded TypeScript catalog. 87 skills, 28 domains, 9 sources, 3 profiles. Adding a new skill is now a JSON edit, not a code change. (#2, #17)
- **Trigger-based skill matching** — Keyword scoring with lightweight stemming replaces regex-based `TASK_DOMAIN_MAP`. All 28 domains now discoverable by LLMs via dynamic tool description. Fixes "UX design" tasks returning "No matching superskill". (#4)
- **Session-aware skill memory** — In-process cache remembers activated skills so repeat calls with similar tasks return instantly without re-fetching. (#5)
- **Registry loader** — `registry-loader.ts` loads registry from user override (`~/.superskill/registry/index.json`) or bundled fallback. Schema validation, memory caching.

### Changed
- **web-discovery.ts refactored** — 438-line mixed-concern file decomposed into 4 focused modules: `text-utils.ts`, `url-utils.ts`, `security-scanner.ts`, `github-client.ts`
- **catalog.ts rewritten** — Now a facade over the registry with getter functions (`getCatalog()`, `getDomains()`, `getDomainPriority()`). Static exports kept as fallbacks for backward compatibility.
- **Tool description dynamic** — `superskill` MCP tool description now lists all 28 domain names so LLMs know the full capability surface
- **License simplified** — AGPL-3.0-or-later only, removed commercial dual-license

### Testing
- 832 tests across 57 files, 90%+ coverage on all new code
- 20 regression tests ensuring TASK_DOMAIN_MAP parity with trigger scoring
- Registry data integrity tests (valid sources, domains, triggers, profiles)

## [0.2.7] - 2026-03-23

### Added
- **Prefetch core skills on install** — 8 core skills (brainstorming, planning, TDD, code review, debugging, security, verification, shipping) fetched from source repos during `npm install` and cached at `~/.superskill/cache/` for offline availability (#6)
- **Local analytics** — Privacy-first skill activation tracking at `~/.superskill/analytics.json`. Tracks activations, match methods, failed searches, and web discovery attempts. Auto-rotates at 1000 entries. (#9)
- **Contributing guide** — Release discipline, PR workflow, skill submission process, test patterns, and security guidelines (#8)

### Fixed
- **Security scanner false positive** — Role-play instructions ("you are now acting as X") moved from hard block to soft warning. Skills legitimately adopt personas; only memory wipe instructions remain blocked.

### Changed
- **README overhaul** — Repositioned as product storefront. One-liner value prop, 3-step setup, collapsible skill catalog, supported tools table. Removed internal implementation details. (#13)
- **marketplace.ts split** — 809-line god file decomposed into 5 focused modules: activate.ts, resolve.ts, generate.ts, manifest.ts, helpers.ts. Barrel re-export preserves backward compatibility.

### Performance
- **Web discovery caching** — Results cached at `~/.superskill/discovery-cache.json` with 24h TTL, max 100 entries with LRU eviction. Avoids GitHub API rate limits on repeated searches.

### Testing
- **11 integration tests** for the full activation flow — direct skill_id load, domain activation, task trigger matching, multi-domain, web discovery fallback, GitHub URL loading, 3-per-domain cap, manifest generation

## [0.2.6] - 2026-03-23

### Fixed
- **Web discovery search** — Repo search now uses `in:name,description,readme` instead of restrictive topic filters. `deanpeters/Product-Manager-Skills` (2340 stars) and similar repos now discoverable
- **Code search** — Uses `filename:SKILL` qualifier instead of `language:markdown` for more accurate results

### Added
- **Security scanning for community skills** — All discovered skills are scanned before loading for prompt injection, identity hijacking, data exfiltration, destructive commands, and script injection. Hard blocks on dangerous content, soft warnings on suspicious patterns
- **50KB size cap** on skill files to prevent oversized payloads

## [0.2.5] - 2026-03-23

### Added
- **Web Discovery** — When no skill matches in the catalog, superskill searches GitHub for community skills instead of giving up. Results include trust signals (stars, freshness, source repo) and require user confirmation before loading
- **Full domain coverage** — Task matching expanded from 11 to 28 domains. Skills in Go, Python, Django, Swift, Docker, content-business, 3D animation, and more are now discoverable

### Fixed
- **Invisible skills bug** — Tool description and task matching previously hardcoded 11 of 28 domains, making half the catalog invisible to LLMs
- **Single skill per domain** — Activating a domain now loads up to 3 skills (collision winner + alternatives) instead of just one
- **False positive patterns** — Tightened regex for `go`, `eval`, `query`, `ship` to prevent over-triggering

### Changed
- **Tool description** — Replaced 15-line domain taxonomy with 4-line verb-led trigger format
- **`task` is now the primary param** — `domain` accepted as optional alias

## [0.2.4] - 2026-03-23

### Added
- **Claude Code Plugin Discovery** — `marketplace.json` manifest for first-class plugin marketplace listing
- **Legacy Migration** — Setup automatically detects and removes old `obsidian-mcp` / `obsidian-kb` MCP entries during install
- **Package Manager Design Spec** — Architecture for evolving SuperSkill into a dynamic skill package manager with on-demand fetch, version-pinned caching, and intelligent routing

### Fixed
- **Plugin MCP server** now uses `npx superskill@latest` instead of local `dist/` path — works reliably as an installed plugin without requiring the repo to be cloned locally
- **Teardown** cleans up all legacy entry names (`obsidian-mcp`, `obsidian-kb`) in addition to `superskill`

## [0.2.0] - 2026-03-22

### Added
- **Skill Marketplace** — 87 skills cataloged from 9 repos (ECC, Superpowers, gstack, Anthropic, design repos)
- **Collision Detection** — 12 domains mapped with 55 competing skills, profile-based resolution
- **Smart Skill Activation** — `superskill` MCP tool: LLM picks domain based on user intent, loads expert methodology on demand
- **Per-Project Filtering** — Auto-detects stack (Go, React, Django, etc.) and loads only relevant skills (68% bloat reduction)
- **Progressive Disclosure** — Lightweight manifest + on-demand `vault_skill_load` for context-efficient skill loading
- **Auto-Detection** — Stack detector (languages/frameworks), tool detector (Claude Code/Codex/OpenCode/Gemini), auto-profile selection
- **3 Built-in Profiles** — `ecc-first`, `superpowers-first`, `minimal` for collision resolution
- **Layered Generation** — Core (~25k tokens), Extended (~50k), Reference (~31k) tiers sized to model context windows
- **Claude Code Plugin** — `.claude-plugin/plugin.json` + `.mcp.json` for first-class plugin support
- **Dual Licensing** — AGPL-3.0-or-later + Commercial license for businesses >$1M revenue
- **SPDX Headers** — All 51 source files tagged with `AGPL-3.0-or-later OR Commercial`

### Changed
- **Rebranded** from `obsidian-mcp` to `superskill` across all source, tests, configs, and documentation
- **Skill awareness injection** — `vault_resume` and `inject-project-context` now include skill domain menu
- **npm package** renamed to `superskill`
- **GitHub repo** renamed to `permanu/superskill`

## [0.1.2] - 2026-03-21

### Added
- **Auto-setup**: `superskill-cli setup` and `teardown` commands for multi-client MCP registration
- Supports 8 AI clients: Claude Code, Claude Desktop, Cursor, OpenCode, Crush CLI, Codex CLI, Gemini CLI, Droid
- Auto-detects installed clients and configures MCP server entries + behavioral instructions
- Postinstall script prints detected clients after `npm install`
- Preuninstall script cleans up configuration on `npm uninstall`
- `--all`, `--clients`, `--dry-run`, `--force`, `--vault-path` flags for fine-grained control
- Idempotent setup with marker-based instruction injection and backup-before-write safety

## [0.1.1] - 2026-03-20

### Added
- Dual CLI and MCP server interface
- VaultFS for safe filesystem operations
- Project context management and auto-discovery from CWD
- Architecture Decision Records (ADRs)
- Task management with kanban board
- Learning capture and query
- Session registry for multi-agent coordination
- Session resume context for continuing work across sessions
- Full-text search with ripgrep
- Brainstorm documents
- Knowledge graph traversal
- Content lifecycle management: prune, stats, deprecate
- Skill installer plugin with full lifecycle management
- CLI shorthand commands (`r`, `w`, `s`, `c`, `t`, `l`, `sk`)
- MCP tool annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`)

[0.2.7]: https://github.com/permanu/superskill/compare/v0.2.6...v0.2.7
[0.2.6]: https://github.com/permanu/superskill/compare/v0.2.5...v0.2.6
[0.2.5]: https://github.com/permanu/superskill/compare/v0.2.4...v0.2.5
[0.2.4]: https://github.com/permanu/superskill/compare/v0.2.0...v0.2.4
[0.2.0]: https://github.com/permanu/superskill/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/permanu/superskill/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/permanu/superskill/releases/tag/v0.1.1
