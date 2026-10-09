// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile, readFile, chmod, symlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { initProject, parseNativeSkillFile } from "./init.js";
import type { CommandContext } from "../../core/types.js";

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
    const catalogSkill = graph.nodes.find((n: any) => n.id === "code/typescript");
    expect(catalogSkill).toBeDefined();
    expect(catalogSkill.source).toBe("catalog");
  });

  it("startup mode uses the mapped workspace and preserves instruction files", async () => {
    const workspacePath = join(projectDir, "mapped");
    await mkdir(workspacePath);
    await writeFile(join(workspacePath, "AGENTS.md"), "Original instructions");
    await writeFile(join(workspacePath, "CLAUDE.md"), "Original instructions");
    const result = await initProject({}, { ...createMockCtx(projectDir), workspacePath, projectSlug: "mapped" }, { startup: true });
    expect(result.success).toBe(true);
    expect(result.graph_path).toBe(join(workspacePath, ".superskill", "graph.json"));
    expect(result.vault_slug).toBe("mapped");
    expect(result.vault_mapping_error).toBeUndefined();
    expect(await readFile(join(workspacePath, "AGENTS.md"), "utf8")).toBe("Original instructions");
    expect(await readFile(join(workspacePath, "CLAUDE.md"), "utf8")).toBe("Original instructions");
  });

  it.each([".superskill", ".superskill/graph.json", ".gitignore"])("refuses startup through symlinked %s before writing", async (relativePath) => {
    const outside = `${projectDir}-outside`;
    await mkdir(outside);
    const target = join(outside, "graph.json");
    const original = '{"nodes":[],"edges":[]}';
    await writeFile(target, original);
    try {
      if (relativePath === ".superskill/graph.json") await mkdir(join(projectDir, ".superskill"));
      await symlink(relativePath === ".superskill" ? outside : target, join(projectDir, relativePath));
      const result = await initProject({}, createMockCtx(projectDir), { startup: true });
      expect(result.success).toBe(false);
      expect(result.error).toContain("symlink");
      expect(await readFile(target, "utf8")).toBe(original);
    } finally { await rm(outside, { recursive: true, force: true }); }
  });

  it("refuses to overwrite a malformed existing graph at startup", async () => {
    await mkdir(join(projectDir, ".superskill"));
    const graphPath = join(projectDir, ".superskill", "graph.json");
    await writeFile(graphPath, "{unfinished");
    const result = await initProject({}, createMockCtx(projectDir), { startup: true });
    expect(result.success).toBe(false);
    expect(await readFile(graphPath, "utf8")).toBe("{unfinished");
  });

  it.skipIf(process.getuid?.() === 0)("reports a denied graph read without replacing it at startup", async () => {
    await mkdir(join(projectDir, ".superskill"));
    const graphPath = join(projectDir, ".superskill", "graph.json");
    const original = '{"nodes":[],"edges":[]}';
    await writeFile(graphPath, original);
    await chmod(graphPath, 0);
    try {
      const result = await initProject({}, createMockCtx(projectDir), { startup: true });
      expect(result.success).toBe(false);
      expect(result.error).toContain("EACCES");
    } finally { await chmod(graphPath, 0o600); }
    expect(await readFile(graphPath, "utf8")).toBe(original);
  });

  it("refreshes metadata without resetting learned weights, phase, or sessions", async () => {
    const ctx = createMockCtx(projectDir);
    await initProject({}, ctx);
    const graphPath = join(projectDir, ".superskill", "graph.json");
    const graph = JSON.parse(await readFile(graphPath, "utf-8"));
    graph.nodes.find((node: any) => node.type === "project").phase = "implement";
    graph.nodes.find((node: any) => node.id === "code/typescript").w = 0.93;
    const edge = graph.edges.find((item: any) => item.to === "code/typescript");
    edge.w = 0.91;
    edge.activations = 8;
    graph.nodes.push({ type: "session", id: "session-1", skills: [], files: [], ts: 1 });
    await writeFile(graphPath, JSON.stringify(graph));
    expect((await initProject({}, ctx)).success).toBe(true);
    const refreshed = JSON.parse(await readFile(graphPath, "utf-8"));
    expect(refreshed.nodes.find((node: any) => node.type === "project").phase).toBe("implement");
    expect(refreshed.nodes.find((node: any) => node.id === "code/typescript").w).toBe(0.93);
    expect(refreshed.edges.find((item: any) => item.to === "code/typescript")).toMatchObject({ w: 0.91, activations: 8 });
    expect(refreshed.nodes.find((node: any) => node.id === "session-1")).toBeDefined();
  });

  it("refreshes packaged metadata while retaining learning and native entries", async () => {
    const ctx = createMockCtx(projectDir);
    await initProject({}, ctx, { startup: true });
    const path = join(projectDir, ".superskill", "graph.json");
    const graph = JSON.parse(await readFile(path, "utf8"));
    graph.catalogVersion = "old-release";
    const skill = graph.nodes.find((node: any) => node.id === "code/typescript");
    skill.triggers = ["obsolete-trigger"];
    skill.w = 0.94;
    graph.nodes = graph.nodes.filter((node: any) => node.id !== "code/go");
    graph.nodes.push({ ...skill, id: "code/removed-package", source: "catalog" });
    graph.nodes.push({ ...skill, id: "native/local-only", source: "native" });
    graph.nodes.push({ type: "session", id: "retained", skills: [skill.id], files: [], outcome: null, insights: [], ts: Date.now() });
    const edge = graph.edges.find((item: any) => item.to === skill.id);
    edge.w = 0.93;
    edge.activations = 9;
    await writeFile(path, JSON.stringify(graph));
    await initProject({}, ctx, { startup: true });
    const refreshed = JSON.parse(await readFile(path, "utf8"));
    expect(refreshed.catalogVersion).not.toBe("old-release");
    expect(refreshed.nodes.find((node: any) => node.id === skill.id)).toMatchObject({ w: 0.94 });
    expect(refreshed.nodes.find((node: any) => node.id === skill.id).triggers).not.toContain("obsolete-trigger");
    expect(refreshed.nodes.some((node: any) => node.id === "code/go")).toBe(true);
    expect(refreshed.nodes.some((node: any) => node.id === "code/removed-package")).toBe(false);
    expect(refreshed.nodes.some((node: any) => node.id === "native/local-only")).toBe(true);
    expect(refreshed.nodes.some((node: any) => node.id === "retained")).toBe(true);
    expect(refreshed.edges.find((item: any) => item.to === skill.id)).toMatchObject({ w: 0.93, activations: 9 });
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

    expect(skillNodes.length).toBeGreaterThan(0);
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

  it("derives triggers from description when frontmatter triggers are absent", async () => {
    const skillDir = join(projectDir, ".claude", "skills", "ui-ux-pro-max");
    await mkdir(skillDir, { recursive: true });
    const skillFile = join(skillDir, "SKILL.md");
    await writeFile(
      skillFile,
      `---\nname: ui-ux-pro-max\ndescription: "Use when the user wants to design, redesign, or polish a landing page or UI component."\n---\n# UI UX Pro Max\n`,
    );

    const parsed = await parseNativeSkillFile(skillFile);
    expect(parsed).not.toBeNull();
    const triggers = parsed!.triggers ?? [];

    expect(triggers).toContain("design");
    expect(triggers).toContain("ui");
    expect(triggers).toContain("landing");
    expect(triggers).toContain("component");
    for (const noise of ["use", "when", "user", "wants", "the", "and", "or", "for", "a"]) {
      expect(triggers).not.toContain(noise);
    }
    expect(triggers.length).toBeLessThanOrEqual(24);
    expect(new Set(triggers).size).toBe(triggers.length);
  });

  it("stores derived triggers on the native skill graph node", async () => {
    const skillDir = join(projectDir, ".agents", "skills", "ui-ux-pro-max");
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, "SKILL.md"),
      `---\nname: ui-ux-pro-max\ndescription: "Use when the user wants to design, redesign, or polish a landing page or UI component."\n---\n# UI UX Pro Max\n`,
    );

    const result = await initProject({}, createMockCtx(projectDir));
    expect(result.success).toBe(true);

    const graph = JSON.parse(await readFile(join(projectDir, ".superskill", "graph.json"), "utf-8"));
    const node = graph.nodes.find((n: any) => n.id === "native/ui-ux-pro-max");
    expect(node).toBeDefined();
    expect(node.triggers).toEqual(expect.arrayContaining(["design", "ui", "landing"]));
  });

  it("preserves explicit triggers frontmatter unchanged", async () => {
    const skillDir = join(projectDir, ".claude", "skills", "explicit-triggers");
    await mkdir(skillDir, { recursive: true });
    const skillFile = join(skillDir, "SKILL.md");
    await writeFile(
      skillFile,
      `---\nname: explicit-triggers\ntriggers:\n  - Design\n  - landing page\n  - ui\ndescription: "banana smoothie unrelated words"\n---\n# Explicit\n`,
    );

    const parsed = await parseNativeSkillFile(skillFile);
    expect(parsed).not.toBeNull();
    expect(parsed!.triggers).toEqual(["Design", "landing page", "ui"]);
  });

  it("treats an empty triggers list as absent and derives from description", async () => {
    const skillDir = join(projectDir, ".claude", "skills", "empty-triggers");
    await mkdir(skillDir, { recursive: true });
    const skillFile = join(skillDir, "SKILL.md");
    await writeFile(
      skillFile,
      `---\nname: empty-triggers\ntriggers: []\ndescription: "dashboard analytics charts"\n---\n# Empty\n`,
    );

    const parsed = await parseNativeSkillFile(skillFile);
    expect(parsed).not.toBeNull();
    expect(parsed!.triggers).toEqual(["empty", "triggers", "dashboard", "analytics", "charts"]);
  });

  it("leaves triggers undefined when description and triggers are missing", async () => {
    const skillDir = join(projectDir, ".claude", "skills", "bare");
    await mkdir(skillDir, { recursive: true });
    const skillFile = join(skillDir, "SKILL.md");
    await writeFile(skillFile, `---\nname: bare\n---\n# Bare\n`);

    const parsed = await parseNativeSkillFile(skillFile);
    expect(parsed).not.toBeNull();
    expect(parsed!.triggers).toBeUndefined();
  });

  it("blocks native skills with failed audits", async () => {
    const skillDir = join(projectDir, ".agents", "skills", "malicious");
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, "SKILL.md"),
      `---\nname: malicious\naudits:\n  gen: fail\n  socket: pass\n  snyk: pass\n---\n# Bad\n`,
    );

    const ctx = createMockCtx(projectDir);
    const result = await initProject({}, ctx);

    expect(result.success).toBe(true);
    expect(result.skills_blocked).toBe(1);

    const graphContent = await readFile(join(projectDir, ".superskill", "graph.json"), "utf-8");
    const graph = JSON.parse(graphContent);
    const blockedNode = graph.nodes.find((n: any) => n.id === "native/malicious");
    expect(blockedNode).toBeUndefined();
  });

  it("appends superskill instructions to AGENTS.md", async () => {
    const agentsMd = join(projectDir, "AGENTS.md");
    await writeFile(agentsMd, "# Project\n\nSome content.\n");

    const ctx = createMockCtx(projectDir);
    await initProject({}, ctx);

    const content = await readFile(agentsMd, "utf-8");
    expect(content).toContain("## SuperSkill");
    expect(content).toContain("gate check");
    expect(content).toContain("Only verified rules are injected by default");
    expect(content).toContain("catalog/constitution.md");
  });

  it("appends superskill instructions to CLAUDE.md when present", async () => {
    const claudeMd = join(projectDir, "CLAUDE.md");
    await writeFile(claudeMd, "# Claude\n");

    const ctx = createMockCtx(projectDir);
    await initProject({}, ctx);

    const content = await readFile(claudeMd, "utf-8");
    expect(content).toContain("## SuperSkill");
    expect(content).toContain("catalog/constitution.md");
  });

  it("does not duplicate superskill instructions in AGENTS.md", async () => {
    const agentsMd = join(projectDir, "AGENTS.md");
    await writeFile(agentsMd, "# Project\n\n## SuperSkill\nThis project uses superskill");

    const ctx = createMockCtx(projectDir);
    await initProject({}, ctx);
    await initProject({}, ctx);

    const content = await readFile(agentsMd, "utf-8");
    const count = (content.match(/## SuperSkill/g) || []).length;
    expect(count).toBe(1);
  });
});
