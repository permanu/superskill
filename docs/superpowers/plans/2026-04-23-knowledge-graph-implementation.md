# SuperSkill Knowledge Graph — Implementation Plan

**Spec:** `docs/superpowers/specs/2026-04-23-knowledge-graph-design.md`
**Approach:** Graph-First Rewrite, clean slate (no migration)

## Phase 1: Graph Core (Foundation)

Build the graph schema, store, and loader. No integration yet — just the data layer.

### Step 1.1: Create `src/lib/graph/schema.ts`
- Define `ProjectNode`, `SkillNode`, `SessionNode` types
- Define `Edge` types (Project→Skill, Skill→Skill, Session→Skill, Session→File)
- Define `Graph` type as `{nodes: Node[], edges: Edge[]}`
- Define helper types: `NodeType`, `EdgeType`, `AuditResult`, `SkillSource`
- **Verify:** `npm run build` passes with type definitions only

### Step 1.2: Create `src/lib/graph/store.ts`
- `loadGraph(projectDir: string): Graph` — read `.superskill/graph.json`
- `writeGraph(projectDir: string, graph: Graph): void` — atomic write (temp + rename)
- `findNode<T>(graph: Graph, type: string): T | undefined`
- `findNodes<T>(graph: Graph, type: string): T[]`
- `addNode(graph: Graph, node: Node): Graph`
- `addEdge(graph: Graph, edge: Edge): Graph`
- `updateNode(graph: Graph, id: string, patch: Partial<Node>): Graph`
- `pruneSessions(graph: Graph, keepLast: number): Graph` — keep last 50 SessionNodes
- `decayWeights(graph: Graph, decayRate: number, floor: number): Graph`
- All functions are pure (return new Graph, don't mutate)
- **Verify:** Unit tests for all store operations, `npm run build` passes

### Step 1.3: Create `src/lib/graph/loader.ts`
- `loadIndex(projectDir: string): IndexResult` — Phase 1: node IDs + edge weights only
- `loadNeighborhood(graph: Graph, skillIds: string[]): NeighborhoodResult` — Phase 2
- `loadContent(projectDir: string, skillIds: string[]): ContentResult` — Phase 3
- Each function returns only what's needed for its phase
- `loadIndex` should produce ~50 tokens of output
- **Verify:** Unit tests for 3-phase loading, `npm run build` passes

### Step 1.4: Create `src/lib/graph/router.ts`
- `matchTask(task: string, graph: Graph): string[]` — return matched skill IDs
- Uses trigger keywords from SkillNode metadata + edge weights for ranking
- Delegates to existing `trigger-matcher.ts` for keyword scoring
- Falls back to stack-based defaults when no matches
- **Verify:** Unit tests for task matching, `npm run build` passes

### Step 1.5: Create `src/lib/graph/learner.ts`
- `startSession(graph: Graph, intent: string): {graph: Graph, sessionId: string}`
- `recordActivation(graph: Graph, sessionId: string, skillId: string, files: string[]): Graph`
- `endSession(graph: Graph, sessionId: string, outcome: string, insights: string[]): Graph`
- Implements decay function: `w = w * 0.9 + 1.0 * 0.1` on activation, `w * 0.95` on skip
- Floor at 0.1
- **Verify:** Unit tests for session lifecycle + decay math, `npm run build` passes

**Phase 1 gate:** All graph modules compile, all unit tests pass, no integration with existing code yet.

---

## Phase 2: Skills.sh Client (External Data)

Build the skills.sh integration layer. No graph integration yet — just fetching and caching.

### Step 2.1: Create `src/lib/skills-sh/client.ts`
- `fetchSkillPage(owner: string, repo: string, skill: string): SkillPageData`
  - Fetches `https://skills.sh/{owner}/{repo}/{skill}`
  - Parses server-rendered HTML for: installs, stars, audits, SKILL.md content
  - Returns structured data or null on failure
- `searchSkills(query: string): SearchResult[]`
  - Uses `npx skills find` via `execFile`
  - Parses CLI output into structured results
- Timeout: 10s for page fetch, 30s for CLI
- **Verify:** Unit tests with mocked HTTP responses, `npm run build` passes

### Step 2.2: Create `src/lib/skills-sh/cli.ts`
- `findSkills(query: string): Promise<SearchResult[]>` — wrapper around `npx skills find`
- `installSkill(packageRef: string): Promise<void>` — wrapper around `npx skills add`
- Both use `execFile` (never `exec` with shell)
- **Verify:** Unit tests with mocked `execFile`, `npm run build` passes

### Step 2.3: Create `src/lib/skills-sh/audit-cache.ts`
- `getAudit(skillId: string): AuditData | null` — read from `~/.superskill/audits/`
- `setAudit(skillId: string, data: AuditData): void` — write to cache
- `isStale(data: AuditData): boolean` — stale after 24h
- `refreshAudit(skillId: string): Promise<AuditData>` — fetch from skills.sh, cache
- **Verify:** Unit tests with temp directories, `npm run build` passes

### Step 2.4: Create `src/lib/global-cache.ts`
- `getCachedSkill(owner: string, repo: string, skill: string): string | null`
- `cacheSkill(owner: string, repo: string, skill: string, content: string): void`
- `isSkillCached(owner: string, repo: string, skill: string): boolean`
- `getSkillMeta(owner: string, repo: string, skill: string): SkillMeta | null`
- Reads/writes from `~/.superskill/skills/{owner}/{repo}/{skill}/`
- **Verify:** Unit tests with temp directories, `npm run build` passes

**Phase 2 gate:** Skills.sh client works in isolation, all tests pass.

---

## Phase 3: Integration (Wire Graph to Commands)

Replace the old skill system with graph-driven commands.

### Step 3.1: Create `src/commands/skill/init.ts`
- `initProject(args, ctx)` — the `init` command
- Flow: detect stack → detect tool → scan native skills → query skills.sh → apply security gate → build graph → write `.superskill/graph.json` → append to AGENTS.md
- Uses: `stack-detector.ts`, `tool-detector.ts`, `skills-sh/client.ts`, `graph/schema.ts`, `graph/store.ts`
- **Verify:** Integration test that creates a temp project, runs init, checks graph.json

### Step 3.2: Rewrite `src/commands/skill/activate.ts`
- Replace current activation logic with graph-driven flow
- Uses: `graph/loader.ts` (3-phase load), `graph/router.ts` (task matching), `graph/learner.ts` (session tracking)
- Security gate: check audits via `audit-cache.ts`, run `security-scanner.ts` locally
- Budget: use `context-budget.ts` (simplified)
- **Verify:** Rewrite existing `activate-integration.test.ts` for new flow

### Step 3.3: Rewrite `src/commands/skill/index.ts`
- Thin dispatcher: route subcommands to init/activate
- Remove catalog/resolve/generate/install/list/validate/schema subcommands
- **Verify:** Unit test for dispatch

### Step 3.4: Update `src/core/registry.ts`
- Remove all `vault_skill` tool registrations
- Add new tools: `init`, `status`, `superskill`
- Remove `vault_` prefix from remaining tools
- Keep vault commands (read/write/search/task/session) with unprefixed names
- **Verify:** `npm run build` passes

### Step 3.5: Update `src/mcp-server.ts`
- Register new tool surface (8 tools, no prefixes)
- Remove old tool registrations
- Update tool descriptions with enforcement language
- **Verify:** `npm run build` passes

### Step 3.6: Update `src/cli.ts`
- Add `init` command
- Remove dead skill subcommands (catalog, resolve, generate, install, list, validate)
- Keep vault commands (read, write, search, task, session, etc.)
- **Verify:** `npm run build` passes

**Phase 3 gate:** New command surface works end-to-end, `npm run build` passes.

---

## Phase 4: Delete Old Code

Remove all files superseded by the graph. Fix all broken imports.

### Step 4.1: Delete obsolete lib modules
Delete:
```
src/lib/registry-loader.ts + test
src/lib/skill-scanner.ts + test
src/lib/skill-registry.ts
src/lib/skill-cache.ts + test
src/lib/skill-session.ts + test
src/lib/analytics.ts + test
src/lib/auto-profile.ts + test
src/lib/github-client.ts + test
registry/index.json
```
**Verify:** `npm run build` — fix any remaining imports that reference deleted modules

### Step 4.2: Delete obsolete command modules
Delete:
```
src/commands/skill/web-discovery.ts + test
src/commands/skill/catalog.ts + test
src/commands/skill/resolve.ts
src/commands/skill/generate.ts
src/commands/skill/manifest.ts
src/commands/skill/install.ts + test
src/commands/skill/list.ts + test
src/commands/skill/validate.ts
src/commands/skill/schema.ts
src/commands/skill/helpers.ts
```
**Verify:** `npm run build` — fix any remaining imports

### Step 4.3: Fix remaining consumers
Files that import deleted modules (from the dependency scan):
- `src/commands/onboard.ts` — update to use new graph init
- `src/setup/postinstall.ts` — remove registry prefetch, replace with global cache warm
- **Verify:** `npm run build` passes, `npm test` passes

### Step 4.4: Delete orphaned tests
Remove test files for deleted modules. Update test helpers if needed.
**Verify:** `npm test` — all remaining tests pass

**Phase 4 gate:** Clean build, all remaining tests pass, no references to deleted code.

---

## Phase 5: Polish & Behavioral Guidelines

### Step 5.1: Update `AGENTS.md`
- Add behavioral guidelines (think before coding, simplicity first, surgical changes, goal-driven)
- Update architecture section for new graph-based design
- Remove references to deleted modules

### Step 5.2: Update `src/lib/context-budget.ts`
- Simplify: graph drives the budget now, not tool detection
- Phase-driven budget (explore 10%, implement 15%, review 8%, ship 5%)

### Step 5.3: Create `status` command
- `src/commands/skill/status.ts` — show graph state
- Output: loaded skills with weights, recent sessions, audit status
- JSON output for machine consumption

### Step 5.4: Final validation
- `npm run build` — clean
- `npm test` — all pass
- `npm run lint` — clean
- Manual E2E: `npx superskill init` in a test project → verify `.superskill/graph.json` created

---

## Dependency Order

```
Phase 1 (graph core)     ← no dependencies, build first
Phase 2 (skills.sh)      ← no dependencies on Phase 1, can parallel
Phase 3 (integration)    ← depends on Phase 1 + Phase 2
Phase 4 (delete old)     ← depends on Phase 3 (new code replaces old)
Phase 5 (polish)         ← depends on Phase 4 (clean slate)
```

Phases 1 and 2 can be built in parallel.

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Skills.sh page scraping breaks | Cache aggressively, graceful fallback to cached data, CLI as backup |
| Skills.sh CLI not installed | `npx skills` auto-installs, timeout + error message |
| Graph.json corruption | Atomic writes (temp + rename), backup on read |
| Native skill bridge breaks user's setup | Opt-in only (`--bridge` flag), backup originals |
| Test regressions during Phase 4 | Delete incrementally, run tests after each file removal |
