// SPDX-License-Identifier: AGPL-3.0-or-later OR Commercial
// ── Types ─────────────────────────────────────────────

export interface SkillDomain {
  id: string;
  name: string;
  description: string;
}

export interface CatalogSkill {
  id: string;           // "repo/skill-name"
  name: string;
  repo: SkillRepo;
  domains: string[];
  description: string;
  source: string;       // URL or local path to SKILL.md
  tags?: string[];
}

export type SkillRepo =
  | "ecc"
  | "superpowers"
  | "gstack"
  | "anthropics"
  | "design-skillstack"
  | "taste-skill"
  | "bencium"
  | "frontend-design-pro"
  | "ui-ux-pro-max";

export interface Collision {
  domain: SkillDomain;
  skills: CatalogSkill[];
}

export interface ProfileResolution {
  domain_id: string;
  chosen_skill_id: string;
}

export interface SkillProfile {
  name: string;
  description: string;
  resolutions: ProfileResolution[];
}

// ── Domains ──────────────────────────────────────────

export const DOMAINS: SkillDomain[] = [
  // Colliding domains (2+ repos)
  { id: "tdd", name: "Test-Driven Development", description: "TDD workflow and testing patterns" },
  { id: "planning", name: "Planning", description: "Implementation planning and review" },
  { id: "code-review", name: "Code Review", description: "Reviewing and receiving code feedback" },
  { id: "debugging", name: "Debugging", description: "Systematic debugging and investigation" },
  { id: "verification", name: "Verification", description: "Pre-completion verification checks" },
  { id: "brainstorming", name: "Brainstorming", description: "Ideation and exploratory thinking" },
  { id: "agent-orchestration", name: "Agent Orchestration", description: "Multi-agent loops and pipelines" },
  { id: "security", name: "Security", description: "Security review, scanning, guardrails" },
  { id: "shipping", name: "Shipping", description: "Deployment and release workflow" },
  { id: "frontend-design", name: "Frontend Design", description: "UI/UX design and component systems" },
  // Non-colliding domains (single-repo)
  { id: "git-workflow", name: "Git Workflow", description: "Branching, worktrees, merge workflow" },
  { id: "go", name: "Go", description: "Go idioms, patterns, testing, review" },
  { id: "python", name: "Python", description: "Python idioms, patterns, testing, review" },
  { id: "django", name: "Django", description: "Django framework patterns and security" },
  { id: "spring-boot", name: "Spring Boot", description: "Spring Boot patterns and testing" },
  { id: "swift", name: "Swift", description: "Swift/iOS/SwiftUI patterns" },
  { id: "cpp", name: "C++", description: "C++ patterns and testing" },
  { id: "java", name: "Java", description: "Java patterns and standards" },
  { id: "database", name: "Database", description: "Database patterns and migrations" },
  { id: "docker", name: "Docker", description: "Docker and Compose patterns" },
  { id: "api-design", name: "API Design", description: "REST API design patterns" },
  { id: "frontend-patterns", name: "Frontend Patterns", description: "React/Next.js patterns" },
  { id: "backend-patterns", name: "Backend Patterns", description: "Node/Express patterns" },
  { id: "coding-standards", name: "Coding Standards", description: "Universal coding standards" },
  { id: "content-business", name: "Content & Business", description: "Writing, marketing, investor materials" },
  { id: "3d-animation", name: "3D Animation", description: "WebGL, Three.js, animation workflows" },
  { id: "agent-engineering", name: "Agent Engineering", description: "Agent harness, eval, cost optimization" },
  { id: "meta", name: "Meta/Tooling", description: "Skill management, compaction, learning" },
];

// ── Domain Priority ───────────────────────────────────
// Determines which output layer a skill lands in during generation.
// Skills in collision domains are always "core" (resolved via profile).
// Non-colliding skills are bucketed here.

export const DOMAIN_PRIORITY: Record<string, 'core' | 'extended' | 'reference'> = {
  // Core — always loaded, any model
  tdd: 'core', planning: 'core', 'code-review': 'core',
  debugging: 'core', verification: 'core', brainstorming: 'core',
  'agent-orchestration': 'core', security: 'core', shipping: 'core',
  'frontend-design': 'core', 'git-workflow': 'core',
  // Extended — medium+ context models
  go: 'extended', python: 'extended', django: 'extended',
  'spring-boot': 'extended', swift: 'extended', cpp: 'extended',
  java: 'extended', database: 'extended', docker: 'extended',
  'api-design': 'extended', 'frontend-patterns': 'extended',
  'backend-patterns': 'extended', 'coding-standards': 'extended',
  // Reference — large context models only
  'content-business': 'reference', '3d-animation': 'reference',
  'agent-engineering': 'reference', meta: 'reference',
};

// ── Catalog ──────────────────────────────────────────

const GH_ECC = "https://raw.githubusercontent.com/affaan-m/everything-claude-code/main";
const GH_SP = "https://raw.githubusercontent.com/obra/superpowers/main";
const GH_GSTACK = "https://raw.githubusercontent.com/garrytan/gstack/main";
const GH_ANTHRO = "https://raw.githubusercontent.com/anthropics/skills/main";
const GH_DESIGN = "https://raw.githubusercontent.com/freshtechbro/claudedesignskills/main";
const GH_TASTE = "https://raw.githubusercontent.com/Leonxlnx/taste-skill/main";
const GH_BENCIUM = "https://raw.githubusercontent.com/bencium/bencium-claude-code-design-skill/main";

export const CATALOG: CatalogSkill[] = [
  // ── ECC: Workflow skills (collision risk) ──────────
  { id: "ecc/tdd-workflow", name: "TDD Workflow", repo: "ecc", domains: ["tdd"], description: "Full TDD red-green-refactor loop with 80%+ coverage", source: `${GH_ECC}/skills/tdd-workflow/SKILL.md` },
  { id: "ecc/golang-testing", name: "Go Testing", repo: "ecc", domains: ["tdd", "go"], description: "Go table-driven tests, benchmarks, fuzzing, TDD", source: `${GH_ECC}/skills/golang-testing/SKILL.md` },
  { id: "ecc/python-testing", name: "Python Testing", repo: "ecc", domains: ["tdd", "python"], description: "Python pytest, fixtures, mocking, parametrize", source: `${GH_ECC}/skills/python-testing/SKILL.md` },
  { id: "ecc/e2e-testing", name: "E2E Testing", repo: "ecc", domains: ["tdd"], description: "Playwright E2E patterns and CI/CD integration", source: `${GH_ECC}/skills/e2e-testing/SKILL.md` },
  { id: "ecc/plan", name: "/plan", repo: "ecc", domains: ["planning"], description: "Implementation planning slash command", source: `${GH_ECC}/commands/plan.md` },
  { id: "ecc/go-review", name: "Go Review", repo: "ecc", domains: ["code-review", "go"], description: "Go code review for idioms and concurrency", source: `${GH_ECC}/commands/go-review.md` },
  { id: "ecc/python-review", name: "Python Review", repo: "ecc", domains: ["code-review", "python"], description: "Python PEP 8, type hints, security review", source: `${GH_ECC}/skills/python-review/SKILL.md` },
  { id: "ecc/verification-loop", name: "Verification Loop", repo: "ecc", domains: ["verification"], description: "Build/types/lint/test verification gates", source: `${GH_ECC}/skills/verification-loop/SKILL.md` },
  { id: "ecc/autonomous-loops", name: "Autonomous Loops", repo: "ecc", domains: ["agent-orchestration"], description: "Autonomous agent execution patterns", source: `${GH_ECC}/skills/autonomous-loops/SKILL.md` },
  { id: "ecc/ralphinho-rfc-pipeline", name: "RFC Pipeline", repo: "ecc", domains: ["agent-orchestration"], description: "RFC-driven multi-agent DAG execution", source: `${GH_ECC}/skills/ralphinho-rfc-pipeline/SKILL.md` },
  { id: "ecc/security-review", name: "Security Review", repo: "ecc", domains: ["security"], description: "Auth, input validation, secrets, OWASP checklist", source: `${GH_ECC}/skills/security-review/SKILL.md` },
  { id: "ecc/security-scan", name: "Security Scan", repo: "ecc", domains: ["security"], description: "AgentShield config scanning for Claude Code", source: `${GH_ECC}/skills/security-scan/SKILL.md` },
  { id: "ecc/deployment-patterns", name: "Deployment Patterns", repo: "ecc", domains: ["shipping"], description: "CI/CD, Docker, health checks, rollbacks", source: `${GH_ECC}/skills/deployment-patterns/SKILL.md` },

  // ── ECC: Language/framework skills (low collision) ──
  { id: "ecc/golang-patterns", name: "Go Patterns", repo: "ecc", domains: ["go"], description: "Idiomatic Go patterns and conventions", source: `${GH_ECC}/skills/golang-patterns/SKILL.md` },
  { id: "ecc/python-patterns", name: "Python Patterns", repo: "ecc", domains: ["python"], description: "Pythonic idioms and PEP 8 standards", source: `${GH_ECC}/skills/python-patterns/SKILL.md` },
  { id: "ecc/django-patterns", name: "Django Patterns", repo: "ecc", domains: ["django"], description: "Django architecture, DRF, ORM patterns", source: `${GH_ECC}/skills/django-patterns/SKILL.md` },
  { id: "ecc/django-security", name: "Django Security", repo: "ecc", domains: ["django", "security"], description: "Django CSRF, XSS, SQL injection prevention", source: `${GH_ECC}/skills/django-security/SKILL.md` },
  { id: "ecc/django-tdd", name: "Django TDD", repo: "ecc", domains: ["django", "tdd"], description: "Django testing with pytest-django", source: `${GH_ECC}/skills/django-tdd/SKILL.md` },
  { id: "ecc/django-verification", name: "Django Verification", repo: "ecc", domains: ["django", "verification"], description: "Django verification loop", source: `${GH_ECC}/skills/django-verification/SKILL.md` },
  { id: "ecc/springboot-patterns", name: "Spring Boot Patterns", repo: "ecc", domains: ["spring-boot"], description: "Spring Boot architecture and caching", source: `${GH_ECC}/skills/springboot-patterns/SKILL.md` },
  { id: "ecc/springboot-security", name: "Spring Boot Security", repo: "ecc", domains: ["spring-boot", "security"], description: "Spring Security authn/authz", source: `${GH_ECC}/skills/springboot-security/SKILL.md` },
  { id: "ecc/springboot-tdd", name: "Spring Boot TDD", repo: "ecc", domains: ["spring-boot", "tdd"], description: "Spring Boot JUnit 5, Mockito, Testcontainers", source: `${GH_ECC}/skills/springboot-tdd/SKILL.md` },
  { id: "ecc/springboot-verification", name: "Spring Boot Verification", repo: "ecc", domains: ["spring-boot", "verification"], description: "Spring Boot verification loop", source: `${GH_ECC}/skills/springboot-verification/SKILL.md` },
  { id: "ecc/swiftui-patterns", name: "SwiftUI Patterns", repo: "ecc", domains: ["swift"], description: "SwiftUI state management, navigation, performance", source: `${GH_ECC}/skills/swiftui-patterns/SKILL.md` },
  { id: "ecc/swift-concurrency", name: "Swift Concurrency", repo: "ecc", domains: ["swift"], description: "Swift 6.2 concurrency model", source: `${GH_ECC}/skills/swift-concurrency-6-2/SKILL.md` },
  { id: "ecc/swift-actor-persistence", name: "Swift Actor Persistence", repo: "ecc", domains: ["swift"], description: "Thread-safe data persistence with actors", source: `${GH_ECC}/skills/swift-actor-persistence/SKILL.md` },
  { id: "ecc/swift-protocol-di", name: "Swift Protocol DI", repo: "ecc", domains: ["swift"], description: "Protocol-based dependency injection for testing", source: `${GH_ECC}/skills/swift-protocol-di-testing/SKILL.md` },
  { id: "ecc/cpp-coding-standards", name: "C++ Standards", repo: "ecc", domains: ["cpp"], description: "C++ Core Guidelines enforcement", source: `${GH_ECC}/skills/cpp-coding-standards/SKILL.md` },
  { id: "ecc/cpp-testing", name: "C++ Testing", repo: "ecc", domains: ["cpp", "tdd"], description: "GoogleTest/CTest patterns", source: `${GH_ECC}/skills/cpp-testing/SKILL.md` },
  { id: "ecc/java-coding-standards", name: "Java Standards", repo: "ecc", domains: ["java"], description: "Java Spring Boot coding standards", source: `${GH_ECC}/skills/java-coding-standards/SKILL.md` },
  { id: "ecc/jpa-patterns", name: "JPA Patterns", repo: "ecc", domains: ["java", "database"], description: "JPA/Hibernate entity and query patterns", source: `${GH_ECC}/skills/jpa-patterns/SKILL.md` },

  // ── ECC: Infrastructure skills ─────────────────────
  { id: "ecc/api-design", name: "API Design", repo: "ecc", domains: ["api-design"], description: "REST API patterns, pagination, versioning", source: `${GH_ECC}/skills/api-design/SKILL.md` },
  { id: "ecc/backend-patterns", name: "Backend Patterns", repo: "ecc", domains: ["backend-patterns"], description: "Node/Express/Next.js server patterns", source: `${GH_ECC}/skills/backend-patterns/SKILL.md` },
  { id: "ecc/frontend-patterns", name: "Frontend Patterns", repo: "ecc", domains: ["frontend-patterns"], description: "React/Next.js state and performance", source: `${GH_ECC}/skills/frontend-patterns/SKILL.md` },
  { id: "ecc/coding-standards", name: "Coding Standards", repo: "ecc", domains: ["coding-standards"], description: "Universal TS/JS/React standards", source: `${GH_ECC}/skills/coding-standards/SKILL.md` },
  { id: "ecc/docker-patterns", name: "Docker Patterns", repo: "ecc", domains: ["docker"], description: "Docker Compose, container security, networking", source: `${GH_ECC}/skills/docker-patterns/SKILL.md` },
  { id: "ecc/postgres-patterns", name: "Postgres Patterns", repo: "ecc", domains: ["database"], description: "PostgreSQL query optimization and schema design", source: `${GH_ECC}/skills/postgres-patterns/SKILL.md` },
  { id: "ecc/database-migrations", name: "Database Migrations", repo: "ecc", domains: ["database"], description: "Zero-downtime schema migrations", source: `${GH_ECC}/skills/database-migrations/SKILL.md` },
  { id: "ecc/clickhouse", name: "ClickHouse", repo: "ecc", domains: ["database"], description: "ClickHouse analytics patterns", source: `${GH_ECC}/skills/clickhouse-io/SKILL.md` },

  // ── ECC: Content & business ────────────────────────
  { id: "ecc/article-writing", name: "Article Writing", repo: "ecc", domains: ["content-business"], description: "Long-form content in distinctive voice", source: `${GH_ECC}/skills/article-writing/SKILL.md` },
  { id: "ecc/content-engine", name: "Content Engine", repo: "ecc", domains: ["content-business"], description: "Multi-platform content systems", source: `${GH_ECC}/skills/content-engine/SKILL.md` },
  { id: "ecc/investor-materials", name: "Investor Materials", repo: "ecc", domains: ["content-business"], description: "Pitch decks, memos, financial models", source: `${GH_ECC}/skills/investor-materials/SKILL.md` },
  { id: "ecc/investor-outreach", name: "Investor Outreach", repo: "ecc", domains: ["content-business"], description: "Cold emails, intros, follow-ups", source: `${GH_ECC}/skills/investor-outreach/SKILL.md` },
  { id: "ecc/market-research", name: "Market Research", repo: "ecc", domains: ["content-business"], description: "Competitive analysis and due diligence", source: `${GH_ECC}/skills/market-research/SKILL.md` },
  { id: "ecc/frontend-slides", name: "Frontend Slides", repo: "ecc", domains: ["content-business"], description: "Animation-rich HTML presentations", source: `${GH_ECC}/skills/frontend-slides/SKILL.md` },

  // ── ECC: Agent engineering ─────────────────────────
  { id: "ecc/agentic-engineering", name: "Agentic Engineering", repo: "ecc", domains: ["agent-engineering"], description: "Eval-first agent execution", source: `${GH_ECC}/skills/agentic-engineering/SKILL.md` },
  { id: "ecc/agent-harness", name: "Agent Harness", repo: "ecc", domains: ["agent-engineering"], description: "Agent action space design", source: `${GH_ECC}/skills/agent-harness-construction/SKILL.md` },
  { id: "ecc/eval-harness", name: "Eval Harness", repo: "ecc", domains: ["agent-engineering"], description: "Eval-driven development framework", source: `${GH_ECC}/skills/eval-harness/SKILL.md` },
  { id: "ecc/cost-aware-llm", name: "Cost-Aware LLM", repo: "ecc", domains: ["agent-engineering"], description: "LLM cost optimization and routing", source: `${GH_ECC}/skills/cost-aware-llm-pipeline/SKILL.md` },
  { id: "ecc/continuous-agent-loop", name: "Continuous Agent Loop", repo: "ecc", domains: ["agent-orchestration"], description: "Quality gates and recovery controls", source: `${GH_ECC}/skills/continuous-agent-loop/SKILL.md` },

  // ── ECC: Meta skills ───────────────────────────────
  { id: "ecc/strategic-compact", name: "Strategic Compact", repo: "ecc", domains: ["meta"], description: "Manual context compaction at logical intervals", source: `${GH_ECC}/skills/strategic-compact/SKILL.md` },
  { id: "ecc/continuous-learning", name: "Continuous Learning", repo: "ecc", domains: ["meta"], description: "Extract reusable patterns from sessions", source: `${GH_ECC}/skills/continuous-learning/SKILL.md` },
  { id: "ecc/continuous-learning-v2", name: "Continuous Learning v2", repo: "ecc", domains: ["meta"], description: "Instinct-based learning with confidence scoring", source: `${GH_ECC}/skills/continuous-learning-v2/SKILL.md` },
  { id: "ecc/search-first", name: "Search First", repo: "ecc", domains: ["meta"], description: "Research-before-coding workflow", source: `${GH_ECC}/skills/search-first/SKILL.md` },

  // ── Superpowers ────────────────────────────────────
  { id: "superpowers/test-driven-development", name: "Test-Driven Development", repo: "superpowers", domains: ["tdd"], description: "Superpowers TDD methodology", source: `${GH_SP}/skills/test-driven-development/SKILL.md` },
  { id: "superpowers/writing-plans", name: "Writing Plans", repo: "superpowers", domains: ["planning"], description: "Multi-step implementation planning", source: `${GH_SP}/skills/writing-plans/SKILL.md` },
  { id: "superpowers/executing-plans", name: "Executing Plans", repo: "superpowers", domains: ["planning"], description: "Plan execution with review checkpoints", source: `${GH_SP}/skills/executing-plans/SKILL.md` },
  { id: "superpowers/requesting-code-review", name: "Requesting Code Review", repo: "superpowers", domains: ["code-review"], description: "How to request reviews effectively", source: `${GH_SP}/skills/requesting-code-review/SKILL.md` },
  { id: "superpowers/receiving-code-review", name: "Receiving Code Review", repo: "superpowers", domains: ["code-review"], description: "Technical rigor when receiving feedback", source: `${GH_SP}/skills/receiving-code-review/SKILL.md` },
  { id: "superpowers/systematic-debugging", name: "Systematic Debugging", repo: "superpowers", domains: ["debugging"], description: "Step-by-step debugging methodology", source: `${GH_SP}/skills/systematic-debugging/SKILL.md` },
  { id: "superpowers/verification-before-completion", name: "Verification Before Completion", repo: "superpowers", domains: ["verification"], description: "Evidence before assertions", source: `${GH_SP}/skills/verification-before-completion/SKILL.md` },
  { id: "superpowers/brainstorming", name: "Brainstorming", repo: "superpowers", domains: ["brainstorming"], description: "Structured brainstorming before creative work", source: `${GH_SP}/skills/brainstorming/SKILL.md` },
  { id: "superpowers/dispatching-parallel-agents", name: "Dispatching Parallel Agents", repo: "superpowers", domains: ["agent-orchestration"], description: "Fan-out/fan-in agent dispatch", source: `${GH_SP}/skills/dispatching-parallel-agents/SKILL.md` },
  { id: "superpowers/subagent-driven-development", name: "Subagent-Driven Development", repo: "superpowers", domains: ["agent-orchestration"], description: "Independent task execution via subagents", source: `${GH_SP}/skills/subagent-driven-development/SKILL.md` },
  { id: "superpowers/using-git-worktrees", name: "Git Worktrees", repo: "superpowers", domains: ["git-workflow"], description: "Isolated git worktree workflow", source: `${GH_SP}/skills/using-git-worktrees/SKILL.md` },
  { id: "superpowers/finishing-branch", name: "Finishing a Branch", repo: "superpowers", domains: ["git-workflow"], description: "Branch cleanup, merge, PR options", source: `${GH_SP}/skills/finishing-a-development-branch/SKILL.md` },
  { id: "superpowers/using-superpowers", name: "Using Superpowers", repo: "superpowers", domains: ["meta"], description: "How to find and invoke skills", source: `${GH_SP}/skills/using-superpowers/SKILL.md` },
  { id: "superpowers/writing-skills", name: "Writing Skills", repo: "superpowers", domains: ["meta"], description: "How to author and deploy skills", source: `${GH_SP}/skills/writing-skills/SKILL.md` },

  // ── gstack ─────────────────────────────────────────
  { id: "gstack/plan-review", name: "/plan + Review", repo: "gstack", domains: ["planning"], description: "CEO/eng/design plan review workflow", source: `${GH_GSTACK}/plan-ceo-review/SKILL.md` },
  { id: "gstack/review", name: "/review", repo: "gstack", domains: ["code-review"], description: "Code review slash command", source: `${GH_GSTACK}/review/SKILL.md` },
  { id: "gstack/investigate", name: "/investigate", repo: "gstack", domains: ["debugging"], description: "Investigation workflow for bugs", source: `${GH_GSTACK}/investigate/SKILL.md` },
  { id: "gstack/office-hours", name: "/office-hours", repo: "gstack", domains: ["brainstorming"], description: "Collaborative brainstorming sessions", source: `${GH_GSTACK}/office-hours/SKILL.md` },
  { id: "gstack/guard", name: "/guard", repo: "gstack", domains: ["security"], description: "Security guardrail enforcement", source: `${GH_GSTACK}/guard/SKILL.md` },
  { id: "gstack/ship", name: "/ship", repo: "gstack", domains: ["shipping"], description: "Ship-it workflow", source: `${GH_GSTACK}/ship/SKILL.md` },
  { id: "gstack/qa", name: "/qa", repo: "gstack", domains: ["tdd"], description: "QA testing workflow", source: `${GH_GSTACK}/qa/SKILL.md` },
  { id: "gstack/browse", name: "/browse", repo: "gstack", domains: ["meta"], description: "Browser-based exploration", source: `${GH_GSTACK}/browse/SKILL.md` },

  // ── anthropics/skills ──────────────────────────────
  { id: "anthropics/frontend-design", name: "Frontend Design", repo: "anthropics", domains: ["frontend-design"], description: "Anthropic official frontend design skill", source: `${GH_ANTHRO}/skills/frontend-design/SKILL.md` },
  { id: "anthropics/claude-api", name: "Claude API", repo: "anthropics", domains: ["agent-engineering"], description: "Build apps with Claude API/SDK", source: `${GH_ANTHRO}/claude-api/SKILL.md` },

  // ── Design repos ───────────────────────────────────
  { id: "taste-skill/taste", name: "Design Taste", repo: "taste-skill", domains: ["frontend-design"], description: "High-agency anti-slop design engineering", source: `${GH_TASTE}/SKILL.md` },
  { id: "bencium/ux-designer", name: "Bencium UX Designer", repo: "bencium", domains: ["frontend-design"], description: "WCAG 2.1 AA systematic UX methodology", source: `${GH_BENCIUM}/skills/bencium-controlled-ux-designer/SKILL.md` },
  { id: "frontend-design-pro/fdp", name: "Frontend Design Pro", repo: "frontend-design-pro", domains: ["frontend-design"], description: "11 aesthetics + real photo matching", source: "https://raw.githubusercontent.com/claudekit/frontend-design-pro-demo/main/skills/frontend-design-pro/SKILL.md" },
  { id: "ui-ux-pro-max/uupm", name: "UI/UX Pro Max", repo: "ui-ux-pro-max", domains: ["frontend-design"], description: "Cross-platform UI/UX intelligence", source: "https://raw.githubusercontent.com/nextlevelbuilder/ui-ux-pro-max-skill/main/skills/ui-ux-pro-max/SKILL.md" },

  // ── Design Skillstack (3D/animation) ───────────────
  { id: "design-skillstack/threejs", name: "Three.js WebGL", repo: "design-skillstack", domains: ["3d-animation"], description: "Three.js 3D web development", source: `${GH_DESIGN}/plugins/bundles/core-3d-animation/skills/threejs-webgl/SKILL.md` },
  { id: "design-skillstack/gsap", name: "GSAP ScrollTrigger", repo: "design-skillstack", domains: ["3d-animation"], description: "GSAP animation and scroll triggers", source: `${GH_DESIGN}/plugins/bundles/core-3d-animation/skills/gsap-scrolltrigger/SKILL.md` },
  { id: "design-skillstack/r3f", name: "React Three Fiber", repo: "design-skillstack", domains: ["3d-animation"], description: "Declarative 3D with React", source: `${GH_DESIGN}/.claude/skills/react-three-fiber/SKILL.md` },
  { id: "design-skillstack/framer-motion", name: "Framer Motion", repo: "design-skillstack", domains: ["3d-animation"], description: "React animation library", source: `${GH_DESIGN}/plugins/bundles/core-3d-animation/skills/motion-framer/SKILL.md` },
  { id: "design-skillstack/babylonjs", name: "Babylon.js", repo: "design-skillstack", domains: ["3d-animation"], description: "Babylon.js 3D engine", source: `${GH_DESIGN}/plugins/bundles/core-3d-animation/skills/babylonjs-engine/SKILL.md` },
];

// ── Collision Detection ──────────────────────────────

export function detectCollisions(): Collision[] {
  const domainMap = new Map<string, CatalogSkill[]>();

  for (const skill of CATALOG) {
    for (const domainId of skill.domains) {
      const list = domainMap.get(domainId) ?? [];
      list.push(skill);
      domainMap.set(domainId, list);
    }
  }

  const collisions: Collision[] = [];
  for (const [domainId, skills] of domainMap) {
    // Collision = 2+ skills from DIFFERENT repos in the same domain
    const repos = new Set(skills.map((s) => s.repo));
    if (repos.size < 2) continue;

    const domain = DOMAINS.find((d) => d.id === domainId);
    if (!domain) continue;

    // Dedupe by skill ID
    const unique = [...new Map(skills.map((s) => [s.id, s])).values()];
    collisions.push({ domain, skills: unique });
  }

  return collisions;
}

// ── Catalog Search ───────────────────────────────────

export function searchCatalog(query: {
  domain?: string;
  repo?: string;
  text?: string;
}): CatalogSkill[] {
  let results = [...CATALOG];

  if (query.domain) {
    results = results.filter((s) => s.domains.includes(query.domain!));
  }
  if (query.repo) {
    results = results.filter((s) => s.repo === query.repo);
  }
  if (query.text) {
    const lower = query.text.toLowerCase();
    results = results.filter(
      (s) =>
        s.name.toLowerCase().includes(lower) ||
        s.description.toLowerCase().includes(lower) ||
        s.id.toLowerCase().includes(lower),
    );
  }

  return results;
}

// ── Built-in Profiles ────────────────────────────────

export const BUILT_IN_PROFILES: SkillProfile[] = [
  {
    name: "ecc-first",
    description: "ECC wins all collisions, Superpowers fills unique gaps (debugging, brainstorming, git)",
    resolutions: [
      { domain_id: "tdd", chosen_skill_id: "ecc/tdd-workflow" },
      { domain_id: "planning", chosen_skill_id: "ecc/plan" },
      { domain_id: "code-review", chosen_skill_id: "ecc/go-review" },
      { domain_id: "verification", chosen_skill_id: "ecc/verification-loop" },
      { domain_id: "agent-orchestration", chosen_skill_id: "ecc/autonomous-loops" },
      { domain_id: "security", chosen_skill_id: "ecc/security-review" },
      { domain_id: "shipping", chosen_skill_id: "ecc/deployment-patterns" },
      { domain_id: "debugging", chosen_skill_id: "superpowers/systematic-debugging" },
      { domain_id: "brainstorming", chosen_skill_id: "superpowers/brainstorming" },
      { domain_id: "frontend-design", chosen_skill_id: "anthropics/frontend-design" },
    ],
  },
  {
    name: "superpowers-first",
    description: "Superpowers methodology wins, ECC for language-specific and security",
    resolutions: [
      { domain_id: "tdd", chosen_skill_id: "superpowers/test-driven-development" },
      { domain_id: "planning", chosen_skill_id: "superpowers/writing-plans" },
      { domain_id: "code-review", chosen_skill_id: "superpowers/requesting-code-review" },
      { domain_id: "debugging", chosen_skill_id: "superpowers/systematic-debugging" },
      { domain_id: "verification", chosen_skill_id: "superpowers/verification-before-completion" },
      { domain_id: "brainstorming", chosen_skill_id: "superpowers/brainstorming" },
      { domain_id: "agent-orchestration", chosen_skill_id: "superpowers/dispatching-parallel-agents" },
      { domain_id: "security", chosen_skill_id: "ecc/security-review" },
      { domain_id: "shipping", chosen_skill_id: "ecc/deployment-patterns" },
      { domain_id: "frontend-design", chosen_skill_id: "taste-skill/taste" },
    ],
  },
  {
    name: "minimal",
    description: "Smallest token footprint — one skill per colliding domain, no extras",
    resolutions: [
      { domain_id: "tdd", chosen_skill_id: "superpowers/test-driven-development" },
      { domain_id: "planning", chosen_skill_id: "superpowers/writing-plans" },
      { domain_id: "code-review", chosen_skill_id: "superpowers/requesting-code-review" },
      { domain_id: "debugging", chosen_skill_id: "superpowers/systematic-debugging" },
      { domain_id: "verification", chosen_skill_id: "superpowers/verification-before-completion" },
      { domain_id: "brainstorming", chosen_skill_id: "superpowers/brainstorming" },
      { domain_id: "agent-orchestration", chosen_skill_id: "superpowers/dispatching-parallel-agents" },
      { domain_id: "security", chosen_skill_id: "ecc/security-review" },
      { domain_id: "shipping", chosen_skill_id: "gstack/ship" },
      { domain_id: "frontend-design", chosen_skill_id: "taste-skill/taste" },
    ],
  },
];

export function getProfile(name: string): SkillProfile | undefined {
  return BUILT_IN_PROFILES.find((p) => p.name === name);
}
