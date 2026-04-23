# SuperSkill Knowledge Graph — Design Spec

**Date:** 2026-04-23
**Status:** Approved
**Approach:** Graph-First Rewrite (Approach 1)

## Problem

Current skill routing is stateless and generic. Every session starts from scratch. The hardcoded registry (`registry/index.json`, 87 skills, 9 sources) failed to gain traction — skills.sh won that layer. The value of superskill is not the registry, it is the **intelligence layer on top**: knowing which skill to use, when, for this specific project, with minimal tokens.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture | Graph-First Rewrite | Replace 4-5 overlapping modules with unified graph |
| Skill source | skills.sh primary | skills.sh has network effects, audits, install data |
| Storage format | Dense JSON | LLMs natively reason over JSON, zero parsing overhead |
| Storage location | Per-project `.superskill/` | Graph is project-specific intelligence |
| Global cache | `~/.superskill/skills/` + `audits/` | Dedup across projects |
| Token strategy | Ruthless compression + lazy hydration | Store compressed, expand only what current task needs |
| Native skill handling | Coexist, don't compete | Scan native dirs on init, bridge opt-in |
| Migration | None — clean slate | 4 weekly downloads |

## Graph Schema

### Nodes

```
ProjectNode {
  id: "project"                    // singleton
  stack: ["ts","react"]            // from stack-detector
  tools: ["claude"]                // from tool-detector
  phase: "explore"                 // explore|implement|review|ship
  ts: 1745400000                   // last updated
}

SkillNode {
  id: "vercel-labs/agent-skills@react-best-practices"
  source: "routed"                 // "native" | "routed"
  audits: {gen:"pass",socket:"pass",snyk:"warn"}
  installs: 185000                 // from skills.sh
  stars: 15400                     // from skills.sh
  w: 0.85                          // learned weight 0-1
  ts: 1745400000
}

SessionNode {
  id: "s_1745400000_abc1"          // timestamp + 4 random hex
  intent: "add auth flow"          // compressed task description
  skills: ["..."]                  // skill IDs activated
  files: ["src/auth.ts"]           // files touched
  outcome: "success"               // success|partial|abandoned
  insights: ["JWT chosen over sessions"]  // 1-2 patterns per session
  ts: 1745400000
}
```

### Edges

```
Project→Skill     {w: 0.9, activations: 47}   // skill relevance to project
Skill→Skill       {w: 0.7, co_activations: 23} // co-activation frequency
Session→Skill     {role: "primary"}            // skills used in session
Session→File      {action: "modified"}         // files touched in session
```

### Storage

```
.superskill/
  graph.json              # {nodes: [...], edges: [...]} — the knowledge graph
  skill-cache/            # symlinks to ~/.superskill/skills/ (dedup)

~/.superskill/
  skills/                 # shared skill content (dedup across projects)
    {owner}/{repo}/{skill}/SKILL.md
    {owner}/{repo}/{skill}/meta.json   # {installs, stars, fetched_at}
  audits/                 # shared audit cache (dedup across projects)
    {owner}/{repo}/{skill}.json        # {gen, socket, snyk, fetched_at}
```

`graph.json` target: 200-500 tokens for a mature project.

## Loading Strategy (Lazy Hydration)

### 3-Phase Load

**Phase 1: INDEX** (~50 tokens, always loaded)
- Node IDs + edge weights from graph.json
- Enough to route: which skills are relevant to this task?

**Phase 2: NEIGHBORHOOD** (~100-200 tokens, loaded on match)
- Matched skill nodes with full audit data
- Co-activated skill IDs (high-weight edges)
- Recent session nodes that touched the same skills
- Enough to decide: is this skill safe? did it work before?

**Phase 3: CONTENT** (variable, loaded on activate)
- Actual SKILL.md from skill-cache/
- Only for 1-2 skills that passed Phase 2
- Ruthlessly compressed: strip examples, keep rules only

### Flow

```
superskill activate --task "add auth to Express API"
  1. Load graph.json INDEX (50 tokens)
  2. Match task → domains via trigger keywords against Project→Skill edges
     "auth" + "express" → backend-patterns, security, api-design
  3. Load NEIGHBORHOOD for matched skills (~150 tokens)
     Check audits: gen:pass, socket:pass, snyk:warn → proceed
     Check learned weight: w=0.85 → high confidence
     Check co-activations: security + backend-patterns often together
  4. Load CONTENT for top 1-2 skills (budget-controlled)
     Fetch from skill-cache/ or skills.sh if stale
     Apply ruthless compression: strip examples, keep rules only
  5. Return skill content + graph context to LLM
```

### Phase-Driven Budget

| Project Phase | Skill Budget | Graph Load | Rationale |
|---------------|-------------|------------|-----------|
| `explore` | 10% | INDEX only | User is looking around |
| `implement` | 15% | INDEX + NEIGHBORHOOD + CONTENT | Skills matter most |
| `review` | 8% | INDEX + NEIGHBORHOOD | Guidance, not content |
| `ship` | 5% | INDEX only | Minimal skill input |

Phase auto-detected from task description via trigger keywords, or explicitly set by LLM.

### Staleness

- `graph.json`: rewritten after every session
- `skill-cache/`: stale after 7 days — refetch from skills.sh
- Audit data: stale after 24 hours — recheck from skills.sh
- Offline: use cached data with `stale: true` flag

## Skills.sh Integration

### Access Paths

**CLI (`npx skills`)** — for discovery and installation
```
npx skills find "react testing"     → search results
npx skills add vercel-labs/agent-skills@react-best-practices -g -y
```
Shell out via `execFile` (never `exec` with shell).

**Page scraping (`skills.sh/{owner}/{repo}/{skill}`)** — for metadata and audits
Fetch skill page, parse server-rendered HTML for:
- Weekly install count
- GitHub stars
- Security audit results (Gen Agent Trust Hub, Socket, Snyk)
- SKILL.md content

Cache aggressively. Pages are server-rendered (no JS needed).

### Security Gate (3 Tiers)

**Tier 1: BLOCK** (skill never loaded)
- Any audit provider reports "Critical" or "High Risk"
- Prompt injection detected by local scanner
- Skill size > 50KB

**Tier 2: WARN** (loaded with caveat)
- Any audit provider reports "Medium Risk" or "Warn"
- Skill has < 100 installs
- Source repo has < 50 stars
- Not from verified organization
- LLM sees: `[WARN: medium risk from Snyk]`

**Tier 3: PASS** (loaded freely)
- All 3 audit providers pass
- 1K+ installs
- Verified org or 500+ stars

### Audit Data Flow

```
1. superskill init / superskill activate
2. Check graph.json for cached audit data
3. If stale (>24h) or missing:
   a. Fetch skills.sh/{owner}/{repo}/{skill} page
   b. Parse audit section: {gen:"pass", socket:"pass", snyk:"warn"}
   c. Update SkillNode.audits in graph.json
4. Run local security-scanner.ts on cached SKILL.md content
5. Apply security gate (block/warn/pass)
```

## Session Intelligence & Learning Loop

### Session Lifecycle

**Start:**
- Create SessionNode: {id, intent, skills:[], files:[], outcome:null}
- Load graph.json INDEX
- Auto-detect stack + tool, update ProjectNode if changed

**During (on each activate call):**
- Append activated skill IDs to SessionNode.skills
- Track files touched → SessionNode.files
- Update Project→Skill edge: `w = w * 0.9 + 1.0 * 0.1`
- Update Skill→Skill co-activation edges for skills activated together

**End:**
- Set SessionNode.outcome
- Prune: keep only last 50 SessionNodes
- Decay: reduce w by 0.05 for all Project→Skill edges not activated
- Write graph.json

### Decay Function

```
On activation:  w = w * 0.9 + 1.0 * 0.1    (boost toward 1.0)
On skip:        w = w * 0.95                 (gentle decay per session)
Floor:          w never drops below 0.1      (never fully forgets)
```

Exponential moving average. Skill activated every session stays near 1.0. Skill activated once then ignored for 10 sessions decays to ~0.6. Never-activated skill decays to 0.1 floor after ~40 sessions.

### Insight Capture

At session end, one LLM call: "what 1-2 patterns were established this session?" Result stored in `SessionNode.insights`. Costs ~50 tokens to generate, saves hundreds in future sessions.

### Token Budget (Mature Project, Implement Phase)

| What | Tokens | Loaded When |
|------|--------|-------------|
| Graph INDEX | ~50 | Every call |
| NEIGHBORHOOD (2-3 skills) | ~150 | On match |
| Skill CONTENT (1-2 skills) | ~500-2000 | On activate |
| Session insights (last 3) | ~100 | On activate |
| **Total SuperSkill overhead** | **~800-2300** | |
| **Remaining for user code/task** | **125,000-127,000** | |

Under 2% of 128K context window. Down from current ~15%.

## Enforcement (Native Skill Coexistence)

### Strategy: Coexist, Don't Compete

- **Native skills** (already in `~/.claude/skills/` etc.): superskill registers them in the graph as `source: "native"` with high initial weight. Does not re-activate them. Zero duplication.
- **Routed skills** (via superskill): fetched, compressed, injected on demand via MCP. Never touch native skill directories.
- **Graph tracks both**: learns from native and routed activations equally.

### Three Enforcement Layers

**Layer 1: Tool description** (always-on)
MCP tool description instructs the LLM to call `superskill` before any task requiring specialized knowledge. Present in every conversation.

**Layer 2: Project instruction file** (always-on)
On `init`, append to `AGENTS.md`/`CLAUDE.md`:
```
## SuperSkill
This project uses superskill for skill routing. Before creative work,
new features, debugging, or code review — call the `superskill` tool
with your task description.
```

**Layer 3: Native skill bridge** (opt-in, `--bridge` flag)
Replace native skill files with redirects to superskill. Original content backed up in `~/.superskill/skills/`. Most invasive but strongest enforcement.

## MCP Tool Surface

| Tool | Purpose |
|------|---------|
| `init` | Initialize `.superskill/` graph for current project |
| `status` | Show graph state: loaded skills, weights, recent sessions |
| `superskill` | Main activation — takes task, returns skill content |
| `read` | Read file or directory from vault |
| `write` | Write/append/prepend content to vault |
| `search` | Full-text search across vault |
| `task` | Task management (add/list/update/board) |
| `session` | Multi-agent session coordination |

8 tools. Down from 15. Single-word names, no prefixes.

## File Changes

### Deleted

```
src/lib/registry-loader.ts
src/lib/skill-scanner.ts
src/lib/skill-registry.ts
src/lib/skill-cache.ts
src/lib/skill-session.ts
src/lib/analytics.ts
src/lib/auto-profile.ts
src/lib/github-client.ts
src/commands/skill/web-discovery.ts
src/commands/skill/catalog.ts
src/commands/skill/resolve.ts
src/commands/skill/generate.ts
src/commands/skill/manifest.ts
src/commands/skill/install.ts
src/commands/skill/list.ts
src/commands/skill/validate.ts
src/commands/skill/schema.ts
src/commands/skill/helpers.ts
registry/index.json
```

### Created

```
src/lib/graph/
  schema.ts            # node/edge type definitions
  store.ts             # read/write graph.json, prune, decay
  loader.ts            # 3-phase loading (INDEX → NEIGHBORHOOD → CONTENT)
  router.ts            # task → skill matching using graph weights + triggers
  learner.ts           # session lifecycle, edge weight updates, insight capture

src/lib/skills-sh/
  client.ts            # fetch skill metadata + audit data from skills.sh pages
  cli.ts               # wrapper around npx skills find/add via execFile
  audit-cache.ts       # manages ~/.superskill/audits/

src/lib/global-cache.ts  # ~/.superskill/skills/ read/write/dedup

src/commands/skill/
  activate.ts          # rewritten: graph-driven activation
  init.ts              # new: project graph initialization
  index.ts             # rewritten: thin dispatcher
```

### Kept (Modified)

```
src/lib/security-scanner.ts    # kept as-is — local second pass
src/lib/trigger-matcher.ts     # kept — task→domain routing
src/lib/stack-detector.ts      # kept — feeds ProjectNode.stack
src/lib/tool-detector.ts       # kept — feeds ProjectNode.tools
src/lib/context-budget.ts      # simplified — graph drives budget
src/lib/token-estimator.ts     # kept as-is
src/lib/text-utils.ts          # kept as-is
src/lib/frontmatter.ts         # kept as-is
src/lib/vault-fs.ts            # kept as-is
src/lib/search-engine.ts       # kept as-is
src/lib/session-registry.ts    # kept as-is (separate concern)
src/lib/auto-number.ts         # kept as-is
src/lib/project-detector.ts    # kept as-is
src/config.ts                   # minor changes for .superskill/ path
src/core/types.ts               # add graph-related context fields
src/core/registry.ts            # update: replace deleted command handlers
src/cli.ts                      # add init command, remove dead commands
src/mcp-server.ts               # new tool definitions, drop vault_ prefixes
```

### Init Flow

```
superskill init (run once per project)

1. Detect stack → ["ts", "react", "express"]
2. Detect tool → ["claude"]
3. Scan native skill directory for this tool → register as source:"native"
4. Query skills.sh for skills matching stack keywords
5. For each candidate skill:
   a. Check global audit cache (or fetch from skills.sh)
   b. Apply security gate (block/warn/pass)
   c. Surviving skills → create SkillNodes with default weights
6. Create ProjectNode with stack + tools
7. Create initial Project→Skill edges with w = installs-normalized
8. Link to global ~/.superskill/skills/ where content already cached
9. Write .superskill/graph.json
10. Append to AGENTS.md/CLAUDE.md with superskill instructions
```

## Behavioral Guidelines

Baked into `AGENTS.md`:

1. **Think before coding** — state assumptions, surface tradeoffs, ask when uncertain
2. **Simplicity first** — minimum code that solves the problem, nothing speculative
3. **Surgical changes** — touch only what you must, match existing style
4. **Goal-driven execution** — define success criteria, loop until verified
