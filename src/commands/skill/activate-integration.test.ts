// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { activateSkills } from "./activate.js";
import type { CommandContext } from "../../core/types.js";
import type { Graph } from "../../lib/graph/schema.js";

vi.mock("../../lib/skills-sh/cli.js", () => ({
  findSkills: async () => [],
}));

vi.mock("../../lib/skills-sh/audit-cache.js", () => ({
  getAudit: async () => null,
  isStale: () => true,
  refreshAudit: async () => null,
}));

function createMockCtx(projectDir: string): CommandContext {
  return {
    vaultFs: {} as any,
    vaultPath: projectDir,
    sessionRegistry: {} as any,
    config: {} as any,
    log: { debug() {}, info() {}, warn() {}, error() {} },
  };
}

function createTestGraph(skills: Array<{ id: string; w: number }>): Graph {
  return {
    nodes: [
      {
        type: "project",
        id: "project",
        stack: ["typescript", "react"],
        tools: ["claude-code"],
        phase: "explore",
        ts: Date.now(),
      },
      ...skills.map((s) => ({
        type: "skill" as const,
        id: s.id,
        source: "routed" as const,
        audits: { gen: "pass" as const, socket: "pass" as const, snyk: "pass" as const },
        installs: 1000,
        stars: 100,
        w: s.w,
        ts: Date.now(),
      })),
    ],
    edges: [
      ...skills.map((s) => ({
        type: "project_skill" as const,
        from: "project",
        to: s.id,
        w: s.w,
        activations: 0,
      })),
    ],
  };
}

describe("activateSkills (graph-driven)", () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = join(tmpdir(), `superskill-activate-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(projectDir, { recursive: true });
    await mkdir(join(projectDir, ".superskill"), { recursive: true });
    vi.spyOn(process, "cwd").mockReturnValue(projectDir);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(projectDir, { recursive: true, force: true }).catch(() => {});
  });

  it("returns error when graph is empty", async () => {
    const emptyGraph: Graph = { nodes: [], edges: [] };
    await writeFile(
      join(projectDir, ".superskill", "graph.json"),
      JSON.stringify(emptyGraph),
    );

    const ctx = createMockCtx(projectDir);
    const result = await activateSkills({ task: "add auth" }, ctx);

    expect(result.success).toBe(false);
    expect(result.error).toContain("not initialized");
  });

  it("returns no matches when graph has no matching skills", async () => {
    const graph = createTestGraph([{ id: "foo/bar@unrelated", w: 0.5 }]);
    await writeFile(
      join(projectDir, ".superskill", "graph.json"),
      JSON.stringify(graph),
    );

    const ctx = createMockCtx(projectDir);
    const result = await activateSkills({ task: "quantum computing optimization" }, ctx);

    expect(result.success).toBe(true);
    expect(result.skills_loaded).toEqual([]);
    expect(result.matched_skill_ids).toEqual([]);
  });

  it("matches skills by keyword against graph", async () => {
    const graph = createTestGraph([
      { id: "vercel-labs/agent-skills@react-best-practices", w: 0.9 },
      { id: "foo/bar@typescript-patterns", w: 0.7 },
    ]);
    await writeFile(
      join(projectDir, ".superskill", "graph.json"),
      JSON.stringify(graph),
    );

    const ctx = createMockCtx(projectDir);
    const result = await activateSkills({ task: "react component" }, ctx);

    expect(result.success).toBe(true);
    expect(result.matched_skill_ids.length).toBeGreaterThan(0);
  });

  it("loads skill by skill_id directly", async () => {
    const graph = createTestGraph([
      { id: "vercel-labs/agent-skills@react-best-practices", w: 0.9 },
    ]);
    await writeFile(
      join(projectDir, ".superskill", "graph.json"),
      JSON.stringify(graph),
    );

    const ctx = createMockCtx(projectDir);
    const result = await activateSkills({ skill_id: "vercel-labs/agent-skills@react-best-practices" }, ctx);

    expect(result.success).toBe(true);
    expect(result.matched_skill_ids).toContain("vercel-labs/agent-skills@react-best-practices");
  });

  it("records activation in graph", async () => {
    const graph = createTestGraph([
      { id: "vercel-labs/agent-skills@react-best-practices", w: 0.9 },
    ]);
    await writeFile(
      join(projectDir, ".superskill", "graph.json"),
      JSON.stringify(graph),
    );

    const ctx = createMockCtx(projectDir);
    await activateSkills({ task: "react component" }, ctx);

    const updatedRaw = await readFile(join(projectDir, ".superskill", "graph.json"), "utf-8");
    const updated = JSON.parse(updatedRaw);
    const sessionNodes = updated.nodes.filter((n: any) => n.type === "session");
    expect(sessionNodes.length).toBeGreaterThan(0);
  });

  it("blocks skills with failed audits", async () => {
    const graph: Graph = {
      nodes: [
        {
          type: "project",
          id: "project",
          stack: ["typescript"],
          tools: ["claude-code"],
          phase: "explore",
          ts: Date.now(),
        },
        {
          type: "skill",
          id: "evil/repo@malicious-skill",
          source: "routed",
          audits: { gen: "fail", socket: "pass", snyk: "pass" },
          installs: 100,
          stars: 10,
          w: 0.9,
          ts: Date.now(),
        },
      ],
      edges: [
        {
          type: "project_skill",
          from: "project",
          to: "evil/repo@malicious-skill",
          w: 0.9,
          activations: 0,
        },
      ],
    };
    await writeFile(
      join(projectDir, ".superskill", "graph.json"),
      JSON.stringify(graph),
    );

    const ctx = createMockCtx(projectDir);
    const result = await activateSkills({ skill_id: "evil/repo@malicious-skill" }, ctx);

    expect(result.success).toBe(false);
    expect(result.warnings).toContainEqual(expect.stringContaining("BLOCKED"));
  });
});
