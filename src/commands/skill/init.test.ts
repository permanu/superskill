// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { initProject } from "./init.js";
import type { CommandContext } from "../../core/types.js";

const mockFindSkills = vi.fn();
const mockRefreshAudit = vi.fn();

vi.mock("../../lib/skills-sh/cli.js", () => ({
  findSkills: (...args: unknown[]) => mockFindSkills(...args),
}));

vi.mock("../../lib/skills-sh/audit-cache.js", () => ({
  getAudit: async () => null,
  isStale: () => true,
  refreshAuditWithMeta: (...args: unknown[]) => mockRefreshAudit(...args),
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
    vi.spyOn(process, "cwd").mockReturnValue(projectDir);
    mockFindSkills.mockResolvedValue([]);
    mockRefreshAudit.mockResolvedValue(null);
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

  it("scans native skills from skill directories", async () => {
    const skillDir = join(projectDir, ".claude", "skills", "test-skill");
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, "SKILL.md"), `---\nname: test-skill\ndescription: A test skill\n---\n# Test Skill\n`);

    const ctx = createMockCtx(projectDir);
    const result = await initProject({}, ctx);

    expect(result.success).toBe(true);
    expect(result.native_skills_found).toBeGreaterThanOrEqual(1);

    const graphContent = await readFile(join(projectDir, ".superskill", "graph.json"), "utf-8");
    const graph = JSON.parse(graphContent);
    const testSkillNode = graph.nodes.find((n: any) => n.type === "skill" && n.id === "native/test-skill");
    expect(testSkillNode).toBeDefined();
    expect(testSkillNode.w).toBe(0.8);
  });

  it("blocks routed skills with failed audits", async () => {
    mockFindSkills.mockResolvedValueOnce([
      { id: "evil/repo@malicious", name: "malicious", source: "evil/repo", description: "bad" },
    ]);

    mockRefreshAudit.mockResolvedValueOnce({
      audit: {
        gen: "fail",
        socket: "pass",
        snyk: "pass",
      },
      page: {
        installs: 100,
        stars: 50,
      },
    });

    const ctx = createMockCtx(projectDir);
    const result = await initProject({}, ctx);

    expect(result.success).toBe(true);
    expect(result.skills_blocked).toBe(1);

    const graphContent = await readFile(join(projectDir, ".superskill", "graph.json"), "utf-8");
    const graph = JSON.parse(graphContent);
    const blockedNode = graph.nodes.find((n: any) => n.id === "evil/repo@malicious");
    expect(blockedNode).toBeUndefined();
  });

  it("appends superskill instructions to AGENTS.md", async () => {
    const agentsMd = join(projectDir, "AGENTS.md");
    await writeFile(agentsMd, "# Project\n\nSome content.\n");

    const ctx = createMockCtx(projectDir);
    await initProject({}, ctx);

    const content = await readFile(agentsMd, "utf-8");
    expect(content).toContain("## SuperSkill");
  });

  it("does not duplicate superskill instructions in AGENTS.md", async () => {
    const agentsMd = join(projectDir, "AGENTS.md");
    await writeFile(agentsMd, "# Project\n\n## SuperSkill\nThis project uses superskill");

    const ctx = createMockCtx(projectDir);
    await initProject({}, ctx);

    const content = await readFile(agentsMd, "utf-8");
    const count = (content.match(/## SuperSkill/g) || []).length;
    expect(count).toBe(1);
  });
});
