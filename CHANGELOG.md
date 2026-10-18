# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.16.1] - 2026-10-18

### Fixed
- MCP setup records the running Node directory and absolute terminal PATH entries so desktop clients can find NVM-managed `node` and `npx`, including when SuperSkill was installed globally with Bun.
- Setup and upgrade repair missing PATH values in existing default JSON, OpenCode array and Codex TOML launchers while preserving vault paths, custom environment values, pinned launchers and unrelated client settings.

### Upgrade notes
- Update SuperSkill, run `superskill setup` or `superskill upgrade` from a terminal where Node and npx work, then restart the AI client. Bun installation still requires Node and npm; its optional postinstall guidance may remain blocked.
- Explicit custom PATH values remain unchanged. If the Node installation was moved or removed, use setup with `--force` for the intended client to regenerate its environment.

## [0.16.0] - 2026-10-16

### Added
- Shared atomic-rule scope: eight language-independent security, logging, testing, audit and financial-integrity controls, referenced by adapters across all eight supported languages. Retrieval follows verified shared references one hop, deduplicates them and respects the same token budget. The catalog contains 2,257 atomic rules.
- Lazy project-domain routing from jailed `context.md` frontmatter (`routing.domains`). Banking guidance loads for explicit banking work or an applicable banking project; ordinary ecommerce, accounting and unrelated documentation work do not automatically load banking methodology.
- Task-routed comment-discipline, production-logging and banking packs, plus a compact universal safety/comment policy reserved even at the minimum activation budget.
- Host-owned MCP tool allowlists (`SUPERSKILL_MCP_ALLOWED_TOOLS`) and skill bundle pins (`SUPERSKILL_SKILL_PINS`, `SUPERSKILL_REQUIRE_SKILL_PINS`). Tool policy is enforced before dispatch and at indirect resource/prompt boundaries.
- A restricted retrieval/routing Docker profile and launcher in the repository checkout: digest-pinned base, read-only data mounts, no network egress, non-root execution, dropped capabilities, no-new-privileges and bounded resources. CI and release workflows run real kernel/MCP isolation smoke tests.
- An external metadata-only audit supervisor for the restricted launcher. Exclusive writer locks, validated existing history, file/directory sync, bounded protocol framing and fail-closed forwarding protect evidence without collecting request or response payloads.

### Changed
- Skill activation reports `delivered`, `partial`, `missing`, `blocked`, `fallback` or `error`, with per-skill delivery and trust metadata. Missing specialists are disclosed rather than silently downloaded; zero delivered skills for a selected/requested set no longer report success.
- Automatic graph task history uses process-keyed opaque labels by default, including minimization of legacy intents in the active graph on activation. `SUPERSKILL_RETAIN_TASK_TEXT=1` explicitly enables screened text retention; authored memories and external backups are not silently deleted.
- Source-backed principles replace unsupported absolutes with applicable, reviewable guidance. Sixteen held principles were independently sourced and restored; all 25 principles have source metadata. Language-specific logging and documentation rules were revised and independently verified, including removal of blanket comment requirements where no project contract requires them.
- Removed decorative/step-by-step production comments and redundant installer narratives while preserving meaningful contracts, safety rationale, tooling directives and licenses.

### Security
- Activation and direct skill/support-file inspection share trust checks. Non-catalog bundles undergo bounded whole-directory scans, file inventory/hash comparison and optional host-pin enforcement; modified, missing, additional or unsafe files are refused. Local manifests and bundled catalog entries are not presented as external attestations or script-execution authorization.
- Prompt-injection screening normalizes tested Unicode/spacing variants and detects the reproduced authority-escalation wording. Scanning remains heuristic; the restricted runtime enforces permissions outside the model.
- MCP exception responses and hardened diagnostics use fixed messages and allowlisted event/code fields. Secret findings no longer include source snippets; quoted credentials, credential URLs and Basic authentication detection were strengthened. Evidence input is scanned before truncation.
- The restricted launcher refuses unsafe mount arguments, remote Docker endpoints, unapproved image pulls, unsafe audit locations and corrupted/partial audit history. Audit failure stops forwarding; arbitrary child diagnostics are withheld. Vault mutations and remote installation are deliberately unavailable in this profile.

### Upgrade notes
- Consumers should inspect activation `status`, delivery records and `isError` rather than treating a successful transport call as complete specialist coverage. Public error wording is intentionally less revealing.
- Restart updated MCP processes to load the new behavior. The version change refreshes the indexed catalog; deliberately pinned installations remain pinned.
- The restricted deployment assets are used from a repository checkout; see `docs/restricted-runtime.md`. Host/model permissions, storage retention and institutional compliance remain deployment responsibilities. This release does not claim a transactional banking writer or zero unknown vulnerabilities.
- npm publication remains manual. The known upstream `sprintf-js` advisory in the unused YAML CLI dependency chain remains documented; no incompatible dependency downgrade or advisory suppression was applied.

### Verification
- The integrated suite passed 4,037 tests across 228 files with unchanged coverage thresholds. The script suite, rule schemas, native-skill authoring, package boundaries, grammar integrity and version parity are release gates.
- Independent reviewers compiled the 24 revised Bad/Good snippets without skips and exercised targeted behavior; principle verification is source/applicability review, not a claim of measured model efficacy. The catalog-wide schema check retains 18 pre-existing compile-exemption warnings.
- Live restricted-runtime tests prove eight kernel checks and real MCP denial, private routing-state, payload-free audit and audit-failure behavior using synthetic fixtures.

## [0.15.1] - 2026-10-14

### Fixed
- Native CLI skill validation works in clean, unmapped checkouts without creating a vault project mapping. Mapped workspace roots and all relative-path, symlink, metadata, and required-reference checks remain intact. Added real built-CLI regressions for valid input and escaping references.
- Native authoring-gate failures preserve structured stdout diagnostics alongside stderr warnings, so a SQLite experimental warning cannot hide the rejection reason.

### Release notes
- Includes the skill delivery, native validation, resource paging, project-safety, and recovery improvements from 0.15.0; see the [full changelog](https://github.com/permanu/superskill/blob/v0.15.1/CHANGELOG.md). The first tag's clean-checkout CI failure was corrected without rewriting `v0.15.0`; npm publication remains manual.
- Release checks pass 3,908 tests in 219 files and 44 offline script tests, with unchanged coverage thresholds. The shipped-skill gate also passes with a fresh, unmapped home and no vault mapping created.

## [0.15.0] - 2026-10-14

### Added
- Three cross-language failure-mode principles, verified and routed by the existing principle selector: `principle-budget-retries-against-headroom` (retry amplification, jitter, retry budgets), `principle-propagate-deadlines` (deadline propagation, abandoned work), `principle-bound-queues-and-shed-overload` (bounded queues, backpressure, load shedding). Verification record: `docs/authoring/verification/principles-batch2.md`.
- Guard assertions in `src/setup/instructions.test.ts` that the session-start instructions name the `session` tool and its `register` action.
- Native skill validation through `superskill skill validate <path>` and MCP `skill_validate`, with Anthropic/portable metadata profiles, contained required-resource checks, and concision/navigation warnings. CI and release gates validate shipped native skills separately from internal packs and atomic rules.
- Deterministic graph targets for principles, constitution, and skill resources, with UTF-8 byte paging through CLI `--offset-bytes`/`--max-bytes` and MCP `offset_bytes`/`max_bytes`. Responses expose `read_complete` and `next_offset_bytes` for lossless continuation through transport caps.
- Three fixture-backed skill-authoring scenarios and an offline protocol CLI for preparing, importing, grading, and comparing no-native-skill, old-source, and improved-source runs without fabricating missing evidence.

### Changed
- `pipeline/plan` now asks for the load a shared path must survive and what fails first, and names the `brainstorm` tool for open design options.
- `docs/mcp-tools.md` documents the full `superskill` parameter set and the `session` action parameters.
- Completed-worktree maintenance now preserves whole eligible checkouts in locked recovery archives with manifests and rescue refs instead of automatically deleting them. Workspace identity and a fresh registry snapshot are required; default-branch integration is no longer hard-coded to `main`.
- Watchdog reports omit sensitive transcript excerpts by default; explicit excerpt opt-in and confirmed cross-project history reads are available. Telemetry mutations require confirmation, persistent opt-out wins over environment opt-in, and new prompt identities use a private per-install HMAC key.
- Generated Obsidian notes carry integrity seals: hand-edited and unsealed legacy notes are preserved, while import/backlink-only changes refresh unedited generated notes. Source names are encoded safely and generated counts reflect actual outcomes.
- Skill installation preserves original `SKILL.md` metadata, formatting, and supporting files from one resolved Git commit rather than reconstructing HTML or replacing descriptions. Separate provenance records installed file hashes and explicitly unversioned skills.sh repository audits, not revision-specific attestations.
- Scanned UTF-8 support scripts are copied without execution; bounded non-executable PNG, JPEG, GIF, WebP, and PDF assets require matching signatures and extensions. Unsupported binaries, archives, unsafe links, and malformed assets fail closed instead of being silently omitted. Claude-targeted installs require the Anthropic native metadata profile.
- Default methodology is lean and task-scoped: optional algorithm/systems guidance is not injected for routine documentation edits, and human blocking is limited to evidence-unresolved decisions. Browser/e2e QA routes to UI review rather than generated graph-note mutation.
- Native skill, setup instructions, slash commands, and authoring templates describe actual host-discovered tool names, dependencies, authorization, safe lifecycle behavior, and bounded retrieval. Existing managed instruction variants remain migratable while custom content is preserved.

### Security
- Centralized bounded, data-only Markdown metadata parsing. Executable frontmatter engines are rejected before evaluation, including native skills and installed support content; loaders no longer populate gray-matter's global content cache.
- Hardened filesystem reads, exclusive publication, private state, lock ownership/recovery, skill-id containment, unaudited support-file scanning, and network response budgets. Search rejects explicit escaping symlinks and excludes personal notes; secret snippets redact all recognized credentials on a line.
- Added runtime MCP argument validation and valid JSON truncation envelopes, separated request budgets, and sanitized unexpected internal errors. Updated the SDK/test dependency lock and pinned workflow actions, Maven artifacts, and vendored grammar verification; one upstream sprintf-js advisory remains in the unused YAML CLI chain.
- Cached skill links must retain the requested owner/repository/skill identity. Supporting resources are confined to their canonical skill directory; graph opening does not trust forged cached source paths.
- Explicit audit failures always block installation, including with `--allow-unaudited`. Native validation rejects absolute drive, UNC, and file-URI references before external-URL handling.

### Fixed
- Session-start instructions no longer say "session register with your tool" — they name the exact `session` tool and `action: "register"`, preventing agents from guessing non-existent tool names (e.g. `workspace_start`). Previously installed instruction texts are recognized and refreshed on the next setup/refresh run (`PREVIOUS_SESSION_INSTRUCTION_TEXT` added to the known-previous set).
- Fixed mapped-workspace `prune --all`, zero-day retention parsing, OpenCode cache-environment extraction, reclaim undo routing, command validation, template replacement, and preservation of user host configuration and backups.
- Full context mode now honors an explicit token budget, including freshness warnings; project-local shared context remains first in the bounded output. Evidence gates require current passing evidence for every explicit acceptance command and reject missing or changed spec hashes.
- Graph I/O failures no longer reset learned state; schema versions, graph contents, weights and session identifiers are validated. Rule queues retain lock ownership across recovery, rule validation matches recursive loading and the authoring contract, and negative code claims remain unverifiable when binding evidence is incomplete.
- Fixed Java wildcard import bindings, Swift enclosing-class call resolution, phantom Python `from`-import bindings, and missing names in Go multi-variable declarations. Added real-grammar and command/privacy/error-path regression coverage without lowering coverage thresholds.
- Skill loading no longer elides fenced commands, scripts, examples, or Mermaid content. A shared resolver aligns nested native skills and dotted repository sources across activation and traversal.
- Setup/startup reconciliation preserves explicit package pins, Git refs, direct binaries, and custom launcher arguments. Doctor diagnostics distinguish intentional configurations, upgrade-supported legacy launchers, foreign entries, and missing entries consistently across JSON and TOML.
- Telemetry and watchdog distinguish unreadable, malformed, oversized, or incomplete sources from genuinely empty data; required rule/native validation gates reject missing inputs and zero-checked results.
- Unrelated nearby optional prose cannot waive a required skill reference. Watchdog examples use the actual host-specific route, and generated commands no longer assume checkout-relative catalog files or unsupported bare commands.

### Verification and remaining limits
- The integrated gate passes 3,905 tests in 218 files, with unchanged thresholds and 93.19% line / 83.08% branch coverage; 43 offline script/protocol tests, shipped native validation, 2,245 structural rule checks, grammar integrity, package boundaries, and version parity also pass.
- Nine headless behavioral attempts timed out without verifiable session/model evidence. Skill efficacy, natural triggering accuracy, and provider token/cost improvements remain unproven; these attempts are not reported as model or skill passes.
- The known upstream `sprintf-js` advisory remains as four moderate dependency entries; there are no known high/critical audit findings. Publication does not replace already running or deliberately pinned MCP servers.

## [0.14.0] - 2026-10-13

### Added
- Obsidian-native visualization: `graph viz` (shorthand `superskill viz`, MCP `knowledge_viz`) writes four Mermaid architecture notes to `projects/<slug>/architecture/` (`high-level-architecture`, `low-level-architecture`, `data-model-erd`, `dataflow`) and generated code notes to `projects/<slug>/code/<repo-relative path>.md` — frontmatter, symbol list, `[[wikilink]]` imports/imported-by, and the full source in a fenced code block; `--open` deep-links Obsidian to the project context.
- Session notes emit `[[wikilinks]]` to the project context and to code notes for the files touched.
- Knowledge index normalizes `[[...]]` related values and `.ts` wikilink targets.
- Project dashboard note: `graph viz` writes `projects/<slug>/index.md` with hub links, scoped search/graph hints, the latest decisions/learnings/sessions, and a pointer to the code notes.
- Bases views file: `graph viz` writes `projects/<slug>/views.base` with live table views (Decisions, Learnings, Sessions, Tasks, All notes) scoped with `file.inFolder(...)` — no global Obsidian config is touched, and deleting the marker line keeps manual edits.
- `graph viz --scope-graph` (shorthand `superskill viz --scope-graph`) writes `path:projects/<slug>` into the vault's `.obsidian/graph.json` so Obsidian's graph view opens scoped to the project.

### Changed
- Documentation restructured: the usage manual moved from the README into `docs/` guides with a docs index; the README is now a hub.
- Code notes are indexed as metadata + edges only — source text does not enter search. Code notes are regenerated on every run; hand-edited architecture notes are preserved.
- Mermaid diagrams render at natural size (`useMaxWidth: false`) — large diagrams scroll instead of shrinking.
- `graph viz --open` lands on the project dashboard when there is no `context.md` (context → dashboard → architecture note).

### Removed
- The HTML visualization stack (`knowledge-graph.html`, `architecture-diagrams.html`, `knowledge-graph.canvas`, and all CDN/HTML output), the `qa` CLI command, the `qa_viz` MCP tool, and the Chrome/playwright QA harness.

### Fixed
- `graph viz --open` reports the vault path instead of failing silently when Obsidian cannot be launched.

## [0.13.0] - 2026-10-13

### Added
- Autonomous legacy repair at MCP server start: managed launchers (JSON + TOML), owned legacy `obsidian-mcp`/`obsidian-kb` aliases, and instruction blocks — including unmarked legacy OpenCode/Cursor files — are reconciled and upgraded to the current format without a manual `setup` run. `superskill upgrade` performs the same reconciliation on demand, with `--dry-run` and `--json`.
- `setup --check` reports configuration drift read-only, and setup/upgrade dry runs now report what would actually change.
- Session coordination hardening: exclusive TTL'd workspace leases (`allow_shared` for co-tenants), heartbeat file-lease refresh with conflict reporting, `expired` sessions with pid/host liveness, `listInterrupted` (surfaced by `resume`), and worktree cleanup gated on completion age and live pids.
- Incremental knowledge index: a per-file `files` table with `user_version` migration means only changed notes are re-parsed; `removeVaultFileFromIndex` keeps prune/move/delete in sync; extract/capture write through the index and validate item types.
- Search recall: `KnowledgeIndex.search` does AND-first retrieval with an OR fallback and recency-decayed ranking; `graph_traverse resolve` accepts `files` and pre-filters natural-language vault queries.
- MCP output bounding: compact JSON by default (`SUPERSKILL_PRETTY=1` for pretty), a global `SUPERSKILL_MAX_RESPONSE_BYTES` cap (default 64 KB) with explicit truncation markers, `read.max_bytes`, full-mode `project_context.max_tokens`, and `limit` on list actions (default 50, cap 500, negatives clamped).
- Security: fail-closed skill installs for unknown/warn audits with an explicit `allow_unaudited`/`--allow-unaudited` override, audit provenance in `skill list`/`skill status`, extended secret patterns (OpenAI, Anthropic, Google, AWS secret keys, Slack webhooks, generic tokens), whole-skill-directory prompt-injection scans, a local vault write audit trail, 0700/0600 telemetry permissions, trust-on-first-use Maven jar hashing, and pinned CDN assets with SRI (no external font requests).
- Doctor health checks: version parity (package vs plugin/marketplace), managed-launcher staleness, config backup residue, stale graph/session/cleanup locks, session registry and knowledge-index schema health, and a real worktree-cache probe.
- CI version-parity gate (`npm run check:versions`).
- Rules: stem-variant `termsMatch` matching (e.g. `cache` ↔ `caching`) across router, principles, and traverse; phase inference scores the earliest matched keyword instead of the first matching group; loader warns on id/filename mismatches and content resolution falls back to the parsed index.

### Changed
- MCP tool responses are compact JSON and bounded; error payloads stay uncapped.
- `write` validates its mode and snapshots existing content before any replacement, not just explicit `overwrite`.
- Session registry operations never hold the registry lock across worktree cleanup; stale locks (registry, cleanup, graph) are recovered when their owning pid is dead, and a live pid is never stolen.
- Prune validates retention values (negative/NaN rejected), honors learning/brainstorm/ADR retention, computes `oldestFile`, and keeps the knowledge index consistent on archive/delete.
- Setup writes are atomic (temp file + revalidation + rename) and ownership-gated: foreign MCP entries are preserved and reported; instruction rewrites are scoped to managed markers so user content survives.
- Telemetry, `knowledge_rebuild`, and `qa_viz` annotations/rate limits corrected; list tools paginate via `limit`.
- `graph cross-project` help text now states it is project-jailed by design.

### Fixed
- Router `files` hints no longer flood selection with language-wide glob matches; keyword evidence outranks glob-only candidates and ties break by keyword/symbol hit counts.
- `session complete` persists the session note using the resolved project when `project` is omitted (MCP clients no longer lose the memory loop).
- Knowledge index writes no longer trigger a full project rebuild on the next search; `.stamp` state migrates to the per-file table.
- Traverse cache is sectioned (code/rules/vault) and written atomically with unique temp files; symbol spans detect stale files instead of returning wrong line ranges.
- Corrupt `graph.json` is quarantined (`graph.json.corrupt-<ts>`) instead of permanently bricking mutations; stale graph locks are recovered by pid liveness.
- `resume` reports interrupted sessions; `onboard` counts installed skills; `link` rejects unsafe wikilink targets; `snapshot` dead branch removed; watchdog `--count` rejects NaN.
- Doctor's worktree-cache check is a real probe instead of a hard-coded `ok`.

### Removed
- The `preuninstall` lifecycle script (npm ≥ 7 never runs uninstall scripts). Use `superskill teardown` to remove MCP entries, instructions, slash commands, and the shared skill.

## [0.12.0] - 2026-10-12

### Changed
- Published package no longer ships source maps or `.d.ts` files (`files` exclusions) — smaller tarball; local builds keep both.
- Tree-sitter grammar wasms are vendored into `dist/lib/codegraph/grammars/` at build time from the `tree-sitter-wasms` devDependency (sha256-verified against `MANIFEST.json`); `tree-sitter-wasms` moved from `dependencies` to `devDependencies`, removing ~49 MB from default installs with no language coverage change.
- `playwright-core` moved from `dependencies` to `devDependencies`: Chrome QA/viz is now opt-in (`npm install playwright-core`). QA commands fail with install guidance when it is missing, and `doctor` reports QA browser availability.
- `doctor` validates the rules catalog with bounded-concurrency reads (compile checks stay sequential to avoid toolchain races) and gains `--fast` to skip catalog validation and toolchain probes.
- `doctor` caches catalog validation keyed by a fingerprint of the rules tree (`~/.superskill/cache/rules-validation.json`); warm runs skip re-parsing ~2,200 files and report the cached age. The explicit `validate` CLI still runs fresh.
- `project_context` now derives bounded **open threads** (top 3 of `blocked` / `partially_completed`, deduped, from the five most recent sessions) and the MCP context prompt renders them — parked work recorded at session close is visible at session start, with no separate backlog file to maintain.

### Removed
- The deprecated `todo` command layer: `todo list|add|complete` CLI aliases, `todos.md` retention in `prune` (`--todos` retention flag), and the `todo` frontmatter type. `task` remains the single vault task surface.
- Committed campaign artifacts: `results.txt`, `validator.json`, and `workstreams/{plan,state}.json`; rules-campaign working state is now gitignored and `workstreams/STATUS.md` moved to `docs/authoring/rules-campaign-status.md`.

## [0.11.2] - 2026-10-11

### Fixed
- Repo identity for local-path remotes (`file://`, absolute/relative paths): the identity now follows the chain to the source repo's own remote (or its git dir), so local clones share one cache namespace instead of each getting a unique snowflake namespace. Legacy per-path namespaces are renamed into the shared identity on the next `worktree bootstrap` (session or worktree-create) or `worktree activate`, preserving cached content.
- Per-worktree cache dirs (`cargo-build/<worktreeKey>`) whose worktree path no longer exists are flagged as orphans and promoted from consent to auto tier in `worktree gc`/hygiene, so age-based reclamation actually reaches them. Worktrees register liveness markers under `<repoHash>/.worktrees/` via bootstrap and `worktree activate`.
- `SCCACHE_CACHE_SIZE` no longer hardcodes `20G` (2x the sccache default); it now defaults to `10G` and can be overridden with `SUPERSKILL_SCCACHE_CACHE_SIZE`.

## [0.11.1] - 2026-10-10

### Fixed
- OpenCode host adapter: `worktree activate` now writes an OpenCode V2 plugin definition (`export default { id, setup }` registering the `shell` `create.before` hook) instead of the V1 `shell.env` function form, which OpenCode 2.x rejects with "Plugin must export a default definition with an id and an effect or setup function". The removed Bun `$` helper is replaced with `node:child_process`; the CLI call, JSON merge, and silent-on-failure behavior are unchanged, and a V1 `server()` fallback keeps OpenCode 1.18.29+ working.
- Re-run `superskill worktree activate` in a repo to regenerate the plugin; the previous file is backed up as `<plugin>.bak.superskill`. Adapter tests now import the generated module and run the shell hook end-to-end so format drift fails CI.

## [0.11.0] - 2026-10-10

### Added
- Session-start orchestration with workspace-aware routing, explicit work phases, first-use graph initialization, and release-aware catalog refresh that preserves learned state.
- Completed-session worktree cleanup after verified integration into local main, with active/dirty/locked checkout protection and archival of local graph metadata.
- Local integration guidance for related dependent agent changes before authorized batch pushes.
- Managed MCP launchers follow npm's latest tag on new server starts; managed skill and recognized Markdown instructions refresh at startup. Pinned/custom launchers remain unchanged.
- Generic project architecture and knowledge views with directory/file/symbol traversal and bounded source excerpts.

### Fixed
- Cooperative atomic vault updates, concurrent ticket dependency allocation, graph/session ownership locks, and fail-closed session registry validation.
- File- and phase-aware skill routing, bounded compact diagnostics, and isolated session learning.
- Nested Codex trace activity and structured failure detection; documented harness setup contracts and safe legacy migrations.
- Project and installer path confinement, secret rejection/redaction, knowledge-index initialization and cache freshness.

### Requirements
- Node.js 22.16+ on the 22.x line, or 24+, with SQLite FTS5. Older runtimes fail with an actionable upgrade message.
- Existing installations should run setup once and restart their MCP server to migrate managed launchers. Future latest-tag updates take effect on subsequent starts, not during active sessions.

## [0.10.0] - 2026-10-05

### Added
- Deep contracts adopted from community skills, alongside the pstack-derived `catalog/principles/*`: `optimizer/adhd` (action-first replies, banned preamble/recap/closer patterns, ≤5 grouped lists, evidence labels, auto-clarity escapes, intensity levels) and `pipeline/lazy-build` (reuse → stdlib → platform → minimal ladder, root-cause rule, hard safety floors, `ponytail:` tradeoff markers), referenced from the always-on `pipeline/norms`.

### Fixed
- Router: triggered `pipeline` skills (`plan`, `tdd`, `verify`, `lazy-build`) now load in every phase; previously the pack was never allowed during task matching, so their triggers could not fire.

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
