# SuperSkill: Dynamic Skill Package Manager

**Date:** 2026-03-23
**Status:** Draft
**Author:** Atharva Pandey

## Summary

Evolve SuperSkill from a static skill router into a dynamic skill package manager for AI coding agents. One install, every skill — fetched on demand from original repos, cached locally, routed intelligently. Replaces the hardcoded catalog with a central registry, adds version-pinned disk caching, and simplifies the LLM-facing tool description to maximize activation rates across all model tiers.

## Problem

1. **Invisible skills** — The tool description hardcodes 11 of 24+ domains. LLMs never discover skills in unlisted domains (market-research, Go patterns, investor materials, etc.)
2. **No caching** — Every activation fetches from GitHub. Wasteful, fragile, offline-broken.
3. **Static catalog** — Adding a skill requires a code change to `catalog.ts`, a build, and a release. Not scalable.
4. **Bloated alternatives** — Users install 9 repos with 90+ skills. Most are irrelevant to their project. Token waste, collision hell.

## Product Identity

SuperSkill is a unified skill package manager + knowledge vault for AI coding agents. Three pillars:

- **Skill runtime** — dynamic fetch, cache, route, activate
- **Knowledge vault** — ADRs, tasks, learnings, sessions (existing, untouched)
- **Project context** — stack detection, session resume, awareness injection (existing, untouched)

## Architecture

### Registry

Central registry file at `registry/index.json` in the superskill repo. You control it, you curate it. Repo authors don't need to do anything.

```json
{
  "registry_version": "1.0.0",
  "updated_at": "2026-03-23T00:00:00Z",
  "sources": {
    "ecc": {
      "repo": "affaan-m/everything-claude-code",
      "base_url": "https://raw.githubusercontent.com/affaan-m/everything-claude-code/main"
    },
    "superpowers": {
      "repo": "obra/superpowers",
      "base_url": "https://raw.githubusercontent.com/obra/superpowers/main"
    }
  },
  "skills": {
    "ecc/golang-testing": {
      "name": "Go Testing",
      "version": "1.2.0",
      "source": "ecc",
      "path": "skills/golang-testing/SKILL.md",
      "domains": ["testing", "go"],
      "triggers": ["test", "go test", "table-driven", "benchmark", "fuzz"],
      "description": "Go testing patterns with TDD methodology",
      "tokens_estimate": 2000,
      "prefetch": false
    }
  }
}
```

Key fields:
- `triggers` — server-side matching keywords, tunable without code changes
- `prefetch: true` — downloaded on install, always available offline
- `version` — cache invalidation key; bump manually by registry curator to trigger re-fetch
- `source` + `path` — reconstructs full URL at runtime from `sources` map. The indirection via `sources` avoids duplicating base URLs across 90+ entries and enables the federated future (a federated source just adds an entry to `sources`)
- `tokens_estimate` — approximate token count, updated when version is bumped. Used for context window budget decisions. Acceptable to be slightly stale between bumps.

No `.md` skill files in the superskill repo. All content fetched dynamically from original repos.

### Local Storage

```
~/.superskill/
├── registry.json           # cached registry (24h TTL refresh)
├── registry_etag           # for HTTP 304 checks
├── cache/
│   ├── superpowers/
│   │   └── brainstorming@5.0.5.md
│   ├── ecc/
│   │   └── tdd-workflow@1.2.0.md
│   └── ...
└── sessions/
    └── {sessionId}.json    # per-session skill choices
```

Estimated cache size: 15-20 actively used skills = ~100KB. Negligible.

### Tool Description

The LLM-facing interface — optimized for maximum trigger rate across all model tiers:

```
SuperSkill is your skill package manager — expert methodologies
for any coding task, fetched on demand. Call superskill whenever
you're about to:

- Write, review, test, or debug code
- Plan, architect, or design something
- Ship, deploy, or secure a system
- Research, write content, or prepare materials

Describe the task and SuperSkill finds the right methodology.
Don't overthink domain selection — just describe what you need.
```

Input schema:

```json
{
  "task": "Free text — describe what you're doing",
  "skill_id": "Direct load by ID (e.g. 'ecc/tdd-workflow')",
  "action": "activate | manifest | search"
}
```

Changes from current:
- Dropped `domain` param — server does the routing, not the LLM. Accepted as a deprecated alias during transition (maps to trigger matching internally) but not advertised in schema.
- Dropped `profile` param — auto-detected
- Added `search` action — browse skills by keyword, returns metadata without loading content (no context token cost)
- `task` is now the primary param, not a fallback

### Activation Flow

```
LLM calls: superskill({task: "write tests for my Go API"})
  │
  ├─ 1. Check registry (cached, refresh if >24h)
  ├─ 2. Tokenize task, score against triggers + stack context
  ├─ 3. Check session memory for prior choices
  │
  ├─ 0 matches → Web discovery (see below)
  ├─ 1 match  → Load from cache (or fetch), return content
  └─ 2+ matches →
      ├─ Session has saved choice? → Load saved choice
      └─ No prior choice → Return options for user:
           "Present these options to the user:
            1. Go Testing — table-driven tests, benchmarks, fuzzing
            2. TDD Workflow — red-green-refactor, 80%+ coverage
            Ask which they prefer."
           │
           └─ User picks → LLM calls superskill({skill_id: "ecc/..."})
                         → Save choice to session → Return content
```

### Web Discovery (zero-match fallback)

When the registry has no matching skill, superskill searches the web instead of giving up.

**Search order:**
1. GitHub search API — repos containing `SKILL.md` + task keywords
2. GitHub topic search — repos tagged `mcp-skill`, `claude-code-skill`, `ai-skill`
3. npm search — packages with `superskill-skill` or `mcp-skill` keyword

**Flow:**
```
0 matches in registry
  → "No skill in catalog. Searching..."
  → Found N candidates
  → Present to user with trust signals (repo name, stars, last updated)
  → User confirms → fetch, validate, cache
  → Activated. Next time: served from cache.
```

**Safety:**
- Never auto-load from unknown sources — user confirmation required
- Show trust signals: star count, last commit date, source repo
- First-time sources get a warning: "This is from an unverified source"
- Users can allowlist trusted sources after first use
- Optionally submit discovered skills to the registry via automated PR (with consent)

This makes the registry the fast path and the web the safety net. The catalog can never be incomplete.

### Matching Algorithm

**Step 1: Exact skill_id** — if provided, skip matching entirely, load directly.

**Step 2: Trigger keyword scoring**

Tokenize the `task` string into lowercase words. For each skill in the registry, count how many of its `triggers` appear as substrings in the tokenized task. Score = matched triggers / total triggers for that skill.

```
task: "write tests for my Go API"
tokens: ["write", "tests", "for", "my", "go", "api"]

ecc/golang-testing triggers: ["test", "go test", "table-driven", "benchmark", "fuzz"]
  matched: "test" (in "tests"), "go test" (substring in tokens) → 2/5 = 0.40

ecc/tdd-workflow triggers: ["test", "tdd", "red-green", "coverage", "refactor"]
  matched: "test" (in "tests") → 1/5 = 0.20
```

**Threshold:** Score >= 0.2 (at least 1 trigger matched) qualifies as a candidate. Below threshold = no match for that skill.

**Step 3: Stack boost**

If auto-detected stack matches a skill's `domains`, multiply score by 1.5. Example: Go project detected + skill has `"go"` in domains → boosted.

```
ecc/golang-testing: 0.40 × 1.5 (Go project) = 0.60
ecc/tdd-workflow:   0.20 × 1.0 (no stack match) = 0.20
```

**Step 4: Rank and resolve**

Sort candidates by final score descending. If top two candidates are within 0.1 of each other → multi-match (present options to user). Otherwise → single match (load the winner).

Profiles are no longer used for runtime collision resolution. They remain available for the `vault_skill generate` command (bulk SKILL.md generation for users who want the old static flow), but the `superskill` tool uses interactive selection on multi-match.

### Search Action

`superskill({action: "search", task: "database migration"})` returns matching skills with metadata but does NOT load content:

```json
{
  "results": [
    {
      "id": "ecc/database-migrations",
      "name": "Database Migrations",
      "description": "Zero-downtime schema migrations",
      "score": 0.60,
      "domains": ["database"]
    },
    {
      "id": "ecc/postgres-patterns",
      "name": "Postgres Patterns",
      "description": "Query optimization and schema design",
      "score": 0.35,
      "domains": ["database"]
    }
  ]
}
```

This lets the LLM (or user) browse without committing context tokens. Follow up with `superskill({skill_id: "ecc/database-migrations"})` to load.

### Session Memory

Reuses vault session system. Per-session choices keyed by **skill ID** (not domain), so choices are unambiguous regardless of how matching evolves.

```json
{
  "session_id": "abc123",
  "started_at": "2026-03-23T10:00:00Z",
  "choices": {
    "ecc/golang-testing": true,
    "superpowers/brainstorming": true
  },
  "loaded_skills": ["ecc/golang-testing", "ecc/tdd-workflow"],
  "stack": {"primary": "go", "frameworks": ["echo"]}
}
```

When a multi-match scenario arises and the user picks skill X over skill Y, both are recorded: `X: true` (chosen), `Y: false` (rejected). On the next activation with a similar match set, the session skips the question and loads X directly.

Session memory persists across AI tools (Claude Code, Cursor, OpenCode) because the vault is shared.

### Fetch, Cache, and Degradation

**Postinstall (first run):**
1. Fetch `registry/index.json` → cache to `~/.superskill/registry.json`
2. Find all skills with `prefetch: true` (~8 core skills)
3. Fetch each from original repo → cache as `{source}/{name}@{version}.md`
4. Core skills ready immediately, zero network needed for common tasks

**Normal activation:**
1. Match task → skill ID
2. Check `~/.superskill/cache/{source}/{name}@{version}.md`
3. Cache hit → serve instantly
4. Cache miss → fetch from source repo → cache → serve

**Registry refresh (24h TTL):**
1. On activation, check registry age
2. If >24h, fetch with `If-None-Match` header
3. 304 → unchanged, done
4. 200 → new registry, diff versions → delete stale cache entries (lazy re-fetch on next activation)

**Offline / GitHub down:**
1. Registry fetch fails → use cached registry (warn, don't block)
2. Skill fetch fails + cached version exists → serve stale (warn)
3. No cache, no network → "Skill unavailable. Proceeding without methodology."
4. Never crash, never block the user's work

### Prefetched Core Skills

These 8 skills are fetched on install and always available:

| Skill ID | Name | Source | Why core |
|----------|------|--------|----------|
| `superpowers/brainstorming` | Brainstorming | superpowers | Every project starts here |
| `ecc/plan` | Planning | ecc | Architecture before code |
| `ecc/tdd-workflow` | TDD Workflow | ecc | Testing is universal |
| `ecc/go-review` | Code Review | ecc | Quality gate |
| `superpowers/systematic-debugging` | Debugging | superpowers | Every developer debugs |
| `ecc/security-review` | Security | ecc | Non-negotiable |
| `ecc/verification-loop` | Verification | ecc | Build/lint/test gates |
| `ecc/deployment-patterns` | Shipping | ecc | Deploy is the finish line |

## Migration Plan

### What Changes

| Component | Current | New |
|-----------|---------|-----|
| Skill catalog | Hardcoded TS array in `catalog.ts` | `registry/index.json` loaded at runtime |
| Skill content | Fetched every time, no cache | Version-pinned disk cache in `~/.superskill/cache/` |
| Tool description | 11 hardcoded domains, `domain` param | 4-line trigger, `task` param primary |
| Matching logic | Regex patterns in `marketplace.ts` | Trigger keyword scoring against registry |
| Session memory | None | `~/.superskill/sessions/{id}.json` via vault session |
| Offline | Fails silently | Prefetched core + cached skills, graceful degradation |
| First run | Nothing until `vault_skill generate` | Postinstall prefetches core skills automatically |

### What Stays the Same

- Vault (ADRs, tasks, learnings, sessions) — untouched
- Stack detection — untouched, used for boost scoring
- Tool detection — untouched, used for context window sizing
- Profile/collision resolution — retained for `vault_skill generate` (bulk static flow). Not used in `superskill` tool activation (replaced by interactive selection)
- All other MCP tools (vault_read, vault_write, etc.) — untouched
- Vault-based skill files (`skills/super-skill/SKILL.md`) — still generated by `vault_skill generate` for users who want static skill files. The `superskill` tool uses `~/.superskill/cache/` instead. Both paths coexist.

## Federated Future

Not built now, but the interface supports it. When superskill gains adoption:

```json
{
  "federated_sources": [
    {
      "repo": "some-author/cool-skills",
      "manifest_url": "https://raw.githubusercontent.com/some-author/cool-skills/main/superskill-manifest.json"
    }
  ]
}
```

On registry refresh, superskill fetches federated manifests and merges into the local index. Same schema as registry `skills` entries. Zero code change needed — the registry loader adds one extra merge step.

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| GitHub rate limiting on raw URLs | Cache aggressively, version-pinned invalidation, 24h registry TTL |
| Trigger matching misses the right skill | Tunable triggers in registry (no code change), fallback to `manifest`/`search` action for manual browse |
| Skill author changes file path | Registry `path` field is the contract — if it breaks, registry update fixes it |
| User has no internet on first install | Postinstall warns but doesn't fail — skills fetched on first activation when online |
| Registry grows to 500+ skills | Trigger matching scales linearly, scoring is cheap. Manifest action can add pagination later |
| Skill version drift (content changes but registry version not bumped) | Manual process by design. Acceptable trade-off: curated registry means deliberate version bumps. Future option: periodic CI job that checks source commit SHAs and flags stale versions |
| Concurrent access from multiple AI tools writing to `~/.superskill/` | Use atomic write pattern (write to temp file, then rename). JSON files are small, write contention is rare. No file locking needed at this scale |
| Federated sources as supply chain attack vector | Deferred to federated phase. When built: skill content is markdown injected into LLM context — require signature verification or allowlist for federated sources |
| Cache growth over time | LRU eviction when cache exceeds 5MB (unlikely near-term at ~5KB/skill, but future-proofed). Eviction skips prefetched core skills |
| Registry schema breaking changes | `registry_version` field enables client-side migration. Client checks major version — if registry major > supported major, re-fetch superskill npm package for updated client |

## Success Criteria

1. LLM calls superskill for 80%+ of tasks that have a matching skill (trigger rate)
2. Zero network calls for cached skills (performance)
3. First-run experience works with only postinstall fetch (onboarding)
4. Adding a new skill = one JSON entry in registry, no code change (maintainability)
5. Offline usage works for core skills (reliability)
