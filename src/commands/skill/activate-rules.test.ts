// SPDX-License-Identifier: Apache-2.0
import { fileURLToPath } from "node:url";
import { mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { activateSkills, resetRulesIndexCache } from "./activate.js";
import { _resetInstallDir, _setInstallDir } from "../../lib/skill-installer.js";
import { loadPrincipleContent, loadRuleContent } from "../../rules/content.js";
import { buildIndex } from "../../rules/index-builder.js";
import type { RulesIndex } from "../../rules/index-builder.js";
import { loadRules } from "../../rules/loader.js";
import type { ParsedRule } from "../../rules/loader.js";
import { buildPrincipleIndex, loadPrinciples } from "../../rules/principles.js";
import type { PrinciplesIndex } from "../../rules/principles.js";
import { estimateRuleTokens } from "../../rules/select.js";
import type { CommandContext } from "../../core/types.js";
import type { Graph } from "../../lib/graph/schema.js";

vi.mock("../../lib/tool-detector.js", () => ({
  detectTool: () => ({ tool: "unknown", contextWindow: 10_000 }),
}));

const FIXTURE_ROOT = fileURLToPath(
  new URL("../../rules/__fixtures__/integration/", import.meta.url),
);
const PRINCIPLES_FIXTURE_ROOT = fileURLToPath(
  new URL("../../rules/__fixtures__/principles/", import.meta.url),
);
const BUDGET_2000 = 2_000;

let fixtureIndex: RulesIndex;
let fixturePrinciplesIndex: PrinciplesIndex;

beforeAll(async () => {
  const { rules } = await loadRules(FIXTURE_ROOT);
  fixtureIndex = buildIndex(rules);
  const { principles } = await loadPrinciples(PRINCIPLES_FIXTURE_ROOT);
  fixturePrinciplesIndex = buildPrincipleIndex(principles);
});

function fixtureOptions() {
  return {
    rulesIndex: fixtureIndex,
    rulesRoot: FIXTURE_ROOT,
    principlesIndex: fixturePrinciplesIndex,
    principlesRoot: PRINCIPLES_FIXTURE_ROOT,
  };
}

function createMockCtx(projectDir: string): CommandContext {
  return {
    vaultFs: {} as any,
    vaultPath: projectDir,
    sessionRegistry: {} as any,
    config: {} as any,
    log: { debug() {}, info() {}, warn() {}, error() {} },
  };
}

function createGraph(stack: string[], skills: string[] = []): Graph {
  return {
    nodes: [
      {
        type: "project",
        id: "project",
        stack,
        tools: ["claude-code"],
        phase: "explore",
        ts: Date.now(),
      },
      ...skills.map((id) => ({
        type: "skill" as const,
        id,
        source: "routed" as const,
        audits: { gen: "pass" as const, socket: "pass" as const, snyk: "pass" as const },
        installs: 1000,
        stars: 100,
        w: 0.9,
        ts: Date.now(),
      })),
    ],
    edges: skills.map((id) => ({
      type: "project_skill" as const,
      from: "project",
      to: id,
      w: 0.9,
      activations: 0,
    })),
  };
}

function syntheticRule(id: string, bodyChars: number, keywords: string[]): ParsedRule {
  return {
    id,
    lang: "typescript",
    prefix: "perf",
    title: `Synthetic ${id}`,
    severity: "must",
    enforce: "review",
    status: "verified",
    triggers: { keywords, files: [], symbols: [] },
    sourcesCount: 1,
    body: "x".repeat(bodyChars),
    path: `typescript/${id}.md`,
  };
}

describe("activateSkills rule integration", () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = join(tmpdir(), `superskill-activate-rules-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(join(projectDir, ".superskill"), { recursive: true });
    _setInstallDir(join(projectDir, "installed-skills"));
    vi.spyOn(process, "cwd").mockReturnValue(projectDir);
  });

  afterEach(async () => {
    _resetInstallDir();
    vi.restoreAllMocks();
    await rm(projectDir, { recursive: true, force: true }).catch(() => {});
  });

  async function writeGraph(graph: Graph): Promise<void> {
    await writeFile(join(projectDir, ".superskill", "graph.json"), JSON.stringify(graph));
  }

  it("selects verified rules and returns a deterministic rules_plan", async () => {
    await writeGraph(createGraph(["typescript"]));
    const ctx = createMockCtx(projectDir);
    const options = fixtureOptions();

    const first = await activateSkills({ task: "parse json boundary" }, ctx, options);
    const second = await activateSkills({ task: "parse json boundary" }, ctx, options);

    expect(first.success).toBe(true);
    expect(first.rules_plan.selected.map((rule) => rule.id)).toEqual([
      "typescript-err-parse-boundary",
    ]);
    expect(first.rules_plan.selected[0]?.reason).toContain("keyword 'parse'");
    expect(first.rules_plan.explain[0]).toContain(
      "rule typescript-err-parse-boundary selected:",
    );
    expect(first.rules_plan.budget.allocated).toBe(BUDGET_2000);
    expect(first.rules_plan.budget.used).toBeGreaterThan(0);
    expect(first.rules_plan.dropped).toEqual([]);
    expect(first.content).toContain("## Rule typescript-err-parse-boundary");
    expect(first.content).toContain("External data is unknown until proven.");
    expect(JSON.stringify(first.rules_plan)).toBe(JSON.stringify(second.rules_plan));

    expect(first.skills_loaded).toEqual([]);
    expect(first.matched_skill_ids).toEqual([]);
    expect(first.total_tokens).toBe(first.usedTokens);
    expect(first.warnings).toEqual([]);
    expect(first.orchestration?.entry).toBe("superskill");
  });

  it("excludes draft rules from automatic selection", async () => {
    await writeGraph(createGraph(["typescript"]));

    const result = await activateSkills(
      { task: "async await race" },
      createMockCtx(projectDir),
      fixtureOptions(),
    );

    expect(result.success).toBe(true);
    expect(result.rules_plan.selected).toEqual([]);
    expect(result.content).not.toContain("Promise.allSettled");
  });

  it("selects rules from repo-relative file hints", async () => {
    await writeGraph(createGraph(["typescript"]));

    const result = await activateSkills(
      { task: "rename the trait method", files: ["src/lib.rs"] },
      createMockCtx(projectDir),
      fixtureOptions(),
    );

    expect(result.rules_plan.selected.map((rule) => rule.id)).toEqual([
      "rust-style-naming",
    ]);
    expect(result.content).toContain(
      "Name conversions as, to_, and into_ by what the caller gives up.",
    );
  });

  it("reports budget and oversized drops in the rules plan", async () => {
    const alpha = syntheticRule("typescript-perf-alpha", 4_200, ["perf", "hotloop"]);
    const beta = syntheticRule("typescript-perf-beta", 4_200, ["perf", "hotloop"]);
    const huge = syntheticRule("typescript-perf-huge-rule", 12_000, ["perf", "hotloop"]);
    const index = buildIndex([alpha, beta, huge]);
    await writeGraph(createGraph(["typescript"]));

    const result = await activateSkills(
      { task: "perf hotloop" },
      createMockCtx(projectDir),
      { ...fixtureOptions(), rulesIndex: index },
    );

    expect(result.rules_plan.selected.map((rule) => rule.id)).toEqual([
      "typescript-perf-alpha",
    ]);
    expect(result.rules_plan.dropped).toEqual([
      { id: "typescript-perf-beta", reason: "budget", tokens: estimateRuleTokens(beta) },
      {
        id: "typescript-perf-huge-rule",
        reason: "oversized",
        tokens: estimateRuleTokens(huge),
      },
    ]);
    expect(result.rules_plan.budget.allocated).toBe(BUDGET_2000);
    expect(result.rules_plan.budget.used).toBe(estimateRuleTokens(alpha));
    expect(result.warnings).toContainEqual(
      expect.stringContaining("rule content not found: typescript-perf-alpha"),
    );
  });

  it("orders system brief, orchestration, rules, then skills", async () => {
    const skillId = "owner/repo@order-skill";
    await writeGraph(createGraph(["typescript"], [skillId]));
    const cacheDir = join(projectDir, ".superskill", "skill-cache", "owner", "repo", "order-skill");
    await mkdir(cacheDir, { recursive: true });
    await writeFile(join(cacheDir, "SKILL.md"), "# Order skill\n\nSkill body marker.", "utf-8");

    const result = await activateSkills(
      { task: "parse json boundary", skill_id: skillId },
      createMockCtx(projectDir),
      fixtureOptions(),
    );

    const briefAt = result.content.indexOf("# System brief");
    const orchestrationAt = result.content.indexOf("## Orchestration");
    const ruleAt = result.content.indexOf("## Rule typescript-err-parse-boundary");
    const skillAt = result.content.indexOf("Skill body marker.");
    expect(briefAt).toBeGreaterThanOrEqual(0);
    expect(orchestrationAt).toBeGreaterThan(briefAt);
    expect(ruleAt).toBeGreaterThan(orchestrationAt);
    expect(skillAt).toBeGreaterThan(ruleAt);
    expect(result.skills_loaded).toEqual([{ id: skillId, source: "graph" }]);
    expect(result.matched_skill_ids).toEqual([skillId]);
  });

  it("includes selected principles between orchestration and rules", async () => {
    const skillId = "owner/repo@principle-order-skill";
    await writeGraph(createGraph(["typescript"], [skillId]));
    const cacheDir = join(projectDir, ".superskill", "skill-cache", "owner", "repo", "principle-order-skill");
    await mkdir(cacheDir, { recursive: true });
    await writeFile(join(cacheDir, "SKILL.md"), "# Principle order skill\n\nPrinciple order skill marker.", "utf-8");

    const first = await activateSkills(
      { task: "parse json boundary", skill_id: skillId },
      createMockCtx(projectDir),
      fixtureOptions(),
    );
    const second = await activateSkills(
      { task: "parse json boundary", skill_id: skillId },
      createMockCtx(projectDir),
      fixtureOptions(),
    );

    expect(first.principles_plan.selected.map((principle) => principle.id)).toEqual([
      "principle-parse-boundary",
    ]);
    expect(first.principles_plan.selected[0]?.reason).toContain("keyword 'parse'");
    expect(first.principles_plan.explain[0]).toContain(
      "principle principle-parse-boundary selected:",
    );
    expect(first.principles_plan.explain[0]).toContain("Apply when external data enters the program.");
    expect(first.principles_plan.budget.allocated).toBe(BUDGET_2000);
    expect(first.principles_plan.budget.used).toBeGreaterThan(0);
    expect(JSON.stringify(first.principles_plan)).toBe(JSON.stringify(second.principles_plan));

    const briefAt = first.content.indexOf("# System brief");
    const orchestrationAt = first.content.indexOf("## Orchestration");
    const principleAt = first.content.indexOf("## Principle principle-parse-boundary");
    const ruleAt = first.content.indexOf("## Rule typescript-err-parse-boundary");
    const skillAt = first.content.indexOf("Principle order skill marker.");
    expect(briefAt).toBeGreaterThanOrEqual(0);
    expect(orchestrationAt).toBeGreaterThan(briefAt);
    expect(principleAt).toBeGreaterThan(orchestrationAt);
    expect(ruleAt).toBeGreaterThan(principleAt);
    expect(skillAt).toBeGreaterThan(ruleAt);
  });

  it("excludes draft principles from automatic selection", async () => {
    await writeGraph(createGraph(["typescript"]));

    const result = await activateSkills(
      { task: "experiment spike" },
      createMockCtx(projectDir),
      fixtureOptions(),
    );

    expect(result.success).toBe(true);
    expect(result.principles_plan).toEqual({
      selected: [],
      explain: [],
      budget: { allocated: BUDGET_2000, used: 0 },
    });
    expect(result.content).not.toContain("DRAFT_SPIKE_MARKER");
  });

  it("packs principles through the shared budget and reports content drops", async () => {
    const principlesRoot = join(projectDir, "principles");
    await mkdir(principlesRoot, { recursive: true });
    await writeFile(
      join(principlesRoot, "heavy-parse.md"),
      `---\nid: principle-heavy-parse\ntitle: Heavy parse principle\napply_when: Apply when parsing heavy input.\ntriggers:\n  keywords: [heavyparse]\nenforce: review\nstatus: verified\n---\n\n${"x".repeat(12_000)}`,
      "utf-8",
    );
    const { principles } = await loadPrinciples(principlesRoot);
    const heavyIndex = buildPrincipleIndex(principles);
    await writeGraph(createGraph(["typescript"]));

    const result = await activateSkills(
      { task: "heavyparse the input" },
      createMockCtx(projectDir),
      { ...fixtureOptions(), principlesIndex: heavyIndex, principlesRoot },
    );

    expect(result.principles_plan.selected.map((principle) => principle.id)).toEqual([
      "principle-heavy-parse",
    ]);
    expect(result.principles_plan.budget.used).toBe(0);
    expect(result.content).not.toContain("## Principle principle-heavy-parse");
    expect(result.dropped).toContainEqual(
      expect.objectContaining({ id: "principle-heavy-parse" }),
    );
  });

  it("packs rules and skills through one budget and reports content drops", async () => {
    const skillId = "owner/repo@heavy-skill";
    await writeGraph(createGraph(["typescript"], [skillId]));
    const cacheDir = join(projectDir, ".superskill", "skill-cache", "owner", "repo", "heavy-skill");
    await mkdir(cacheDir, { recursive: true });
    await writeFile(
      join(cacheDir, "SKILL.md"),
      `# Heavy skill\n\n${"x".repeat(9_000)}`,
      "utf-8",
    );

    const result = await activateSkills(
      { task: "parse json boundary", skill_id: skillId },
      createMockCtx(projectDir),
      fixtureOptions(),
    );

    expect(result.success).toBe(true);
    expect(result.rules_plan.selected.map((rule) => rule.id)).toEqual([
      "typescript-err-parse-boundary",
    ]);
    expect(result.content).toContain("## Rule typescript-err-parse-boundary");
    expect(result.content).not.toContain("# Heavy skill");
    expect(result.skills_loaded).toEqual([]);
    expect(result.dropped).toContainEqual(
      expect.objectContaining({ id: skillId }),
    );
    expect(result.dropped.find((item) => item.id === skillId)?.reason).toContain("budget");
  });

  it("loads rule content without frontmatter and matches selector token estimates", async () => {
    const contents = await loadRuleContent(
      ["typescript-err-parse-boundary", "typescript-missing-rule"],
      FIXTURE_ROOT,
    );
    const rule = fixtureIndex.byId.get("typescript-err-parse-boundary");
    expect(rule).toBeDefined();
    const content = contents.get("typescript-err-parse-boundary");
    expect(content).toBeDefined();
    expect(content?.title).toBe(rule?.title);
    expect(content?.body).toContain("External data is unknown until proven.");
    expect(content?.body).not.toContain("id: typescript-err-parse-boundary");
    expect(content?.tokens).toBe(estimateRuleTokens(rule!));
    expect(contents.has("typescript-missing-rule")).toBe(false);
  });

  it("loads principle content without frontmatter and matches selector token estimates", async () => {
    const contents = await loadPrincipleContent(
      ["principle-parse-boundary", "principle-missing"],
      PRINCIPLES_FIXTURE_ROOT,
    );
    const principle = fixturePrinciplesIndex.byId.get("principle-parse-boundary");
    expect(principle).toBeDefined();
    const content = contents.get("principle-parse-boundary");
    expect(content).toBeDefined();
    expect(content?.title).toBe(principle?.title);
    expect(content?.body).toContain("Parse external input once at the boundary");
    expect(content?.body).not.toContain("id: principle-parse-boundary");
    expect(content?.tokens).toBe(estimateRuleTokens(principle!));
    expect(contents.has("principle-missing")).toBe(false);
  });

  it(
    "falls back to the catalog index with a resettable process cache",
    async () => {
      resetRulesIndexCache();
      await writeGraph(createGraph(["typescript"]));

      const result = await activateSkills({ task: "parse json boundary" }, createMockCtx(projectDir));

      expect(result.success).toBe(true);
      expect(Array.isArray(result.rules_plan.selected)).toBe(true);
      expect(result.rules_plan.budget.allocated).toBe(BUDGET_2000);
      resetRulesIndexCache();
    },
    30_000,
  );
});
