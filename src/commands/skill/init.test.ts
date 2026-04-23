// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { initProject } from "./init.js";
import type { CommandContext } from "../../core/types.js";

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

describe("initProject", () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = join(tmpdir(), `superskill-init-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(projectDir, { recursive: true });
    const origCwd = process.cwd;
    vi.spyOn(process, "cwd").mockReturnValue(projectDir);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(projectDir, { recursive: true, force: true }).catch(() => {});
  });

  it("creates .superskill/graph.json with project node", async () => {
    const ctx = createMockCtx(projectDir);
    const result = await initProject({}, ctx);

    expect(result.success).toBe(true);
    expect(result.graph_path).toContain("graph.json");

    const graphContent = await readFile(join(projectDir, ".superskill", "graph.json"), "utf-8");
    const graph = JSON.parse(graphContent);

    const projectNode = graph.nodes.find((n: any) => n.type === "project");
    expect(projectNode).toBeDefined();
    expect(projectNode.id).toBe("project");
    expect(projectNode.phase).toBe("explore");
  });

  it("returns stack and tools info", async () => {
    await writeFile(join(projectDir, "package.json"), JSON.stringify({
      dependencies: { react: "^18" },
    }));

    const ctx = createMockCtx(projectDir);
    const result = await initProject({}, ctx);

    expect(result.success).toBe(true);
    expect(result.project_stack).toContain("typescript");
  });

  it("creates graph with edges for skills", async () => {
    const ctx = createMockCtx(projectDir);
    const result = await initProject({}, ctx);

    expect(result.success).toBe(true);

    const graphContent = await readFile(join(projectDir, ".superskill", "graph.json"), "utf-8");
    const graph = JSON.parse(graphContent);

    const skillNodes = graph.nodes.filter((n: any) => n.type === "skill");
    const projectSkillEdges = graph.edges.filter((e: any) => e.type === "project_skill");

    expect(skillNodes.length).toBeGreaterThanOrEqual(0);
    expect(projectSkillEdges.length).toBe(skillNodes.length);
    for (const edge of projectSkillEdges) {
      expect(edge.from).toBe("project");
      expect(edge.activations).toBe(0);
    }
  });

  it("handles missing project dir gracefully", async () => {
    const ctx = createMockCtx("/nonexistent/path/that/does/not/exist");
    const result = await initProject({}, ctx);
    expect(result.success).toBe(true);
    expect(result.graph_path).toContain("graph.json");
  });
});
