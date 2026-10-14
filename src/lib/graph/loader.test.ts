import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile, utimes, symlink, truncate } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { catalogFile } from "../catalog.js";
import type { Graph, SkillNode, SessionNode } from "./schema.js";
import { loadIndex, loadNeighborhood, loadContent, formatSystemBrief } from "./loader.js";

const home = vi.hoisted(() => ({ path: undefined as string | undefined }));
const catalogOverride = vi.hoisted(() => ({ root: undefined as string | undefined, file: undefined as string | undefined }));
vi.mock("node:os", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:os")>();
  return { ...original, homedir: () => home.path ?? original.homedir() };
});
vi.mock("../catalog.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../catalog.js")>();
  return {
    ...original,
    catalogRoot: () => catalogOverride.root ?? original.catalogRoot(),
    catalogFile: (id: string) => id === "pipeline/lossless" && catalogOverride.file
      ? catalogOverride.file
      : original.catalogFile(id),
  };
});

function makeProjectNode() {
  return {
    type: "project" as const,
    id: "project" as const,
    stack: ["ts", "react"],
    tools: ["claude"],
    phase: "implement" as const,
    ts: 1000,
  };
}

function makeSkillNode(id: string, w: number) {
  return {
    type: "skill" as const,
    id,
    source: "routed" as const,
    audits: { gen: "pass" as const, socket: "pass" as const, snyk: "warn" as const },
    installs: 5000,
    stars: 200,
    w,
    ts: 1000,
  };
}

function makeSessionNode(id: string, ts: number, skills: string[]) {
  return {
    type: "session" as const,
    id,
    intent: "test session",
    skills,
    files: [],
    outcome: "success" as const,
    insights: ["pattern 1"],
    ts,
  };
}

function fencedSkillContent(): string {
  return [
    "# Exact source",
    "",
    "```sh",
    "set -e",
    "printf 'first\\n'",
    "printf 'second\\n'",
    "```",
    "",
    "```mermaid",
    "flowchart TD",
    "  A --> B",
    "  B --> C",
    "  C --> D",
    "```",
    "",
    "```json",
    "{",
    '  "steps": [',
    '    {"run": "echo first"},',
    '    {"run": "echo second"}',
    "  ]",
    "}",
    "```",
    "",
    "```markdown",
    "Nested fence example:",
    "```sh",
    "echo nested",
    "```",
    "End of nested example.",
    "```",
    "",
    "  trailing spaces  ",
    "",
    "",
  ].join("\r\n") + "\r\n";
}

describe("loadIndex", () => {
  it("returns project data from graph", () => {
    const graph: Graph = {
      nodes: [makeProjectNode()],
      edges: [],
    };
    const result = loadIndex(graph);
    expect(result.project.stack).toEqual(["ts", "react"]);
    expect(result.project.tools).toEqual(["claude"]);
    expect(result.project.phase).toBe("implement");
  });

  it("returns defaults when no project node exists", () => {
    const graph: Graph = { nodes: [], edges: [] };
    const result = loadIndex(graph);
    expect(result.project.stack).toEqual([]);
    expect(result.project.tools).toEqual([]);
    expect(result.project.phase).toBe("explore");
  });

  it("returns skill IDs, weights, and audits", () => {
    const graph: Graph = {
      nodes: [
        makeProjectNode(),
        makeSkillNode("owner/repo@skill-a", 0.8),
        makeSkillNode("owner/repo@skill-b", 0.5),
      ],
      edges: [],
    };
    const result = loadIndex(graph);
    expect(result.skills).toHaveLength(2);
    expect(result.skills[0].id).toBe("owner/repo@skill-a");
    expect(result.skills[0].w).toBe(0.8);
    expect(result.skills[0].audits.snyk).toBe("warn");
  });

  it("returns top co-activations sorted by weight", () => {
    const graph: Graph = {
      nodes: [makeSkillNode("a@x", 0.5), makeSkillNode("b@y", 0.3)],
      edges: [
        { type: "skill_skill", from: "a@x", to: "b@y", w: 0.7, co_activations: 10 },
        { type: "skill_skill", from: "a@x", to: "c@z", w: 0.9, co_activations: 20 },
        { type: "skill_skill", from: "b@y", to: "c@z", w: 0.3, co_activations: 2 },
      ],
    };
    const result = loadIndex(graph);
    expect(result.topCoActivations).toHaveLength(3);
    expect(result.topCoActivations[0].w).toBe(0.9);
  });

  it("limits top co-activations to 10", () => {
    const edges = Array.from({ length: 15 }, (_, i) => ({
      type: "skill_skill" as const,
      from: `a@x`,
      to: `b@${i}`,
      w: 1 - i * 0.05,
      co_activations: 10,
    }));
    const graph: Graph = { nodes: [], edges };
    const result = loadIndex(graph);
    expect(result.topCoActivations).toHaveLength(10);
  });
});

describe("loadNeighborhood", () => {
  it("returns matched skills with full metadata", () => {
    const graph: Graph = {
      nodes: [
        makeSkillNode("owner/repo@skill-a", 0.8),
        makeSkillNode("owner/repo@skill-b", 0.5),
      ],
      edges: [],
    };
    const result = loadNeighborhood(graph, ["owner/repo@skill-a"]);
    expect(result.matchedSkills).toHaveLength(1);
    expect(result.matchedSkills[0].id).toBe("owner/repo@skill-a");
    expect(result.matchedSkills[0].source).toBe("routed");
    expect(result.matchedSkills[0].installs).toBe(5000);
    expect(result.matchedSkills[0].stars).toBe(200);
  });

  it("returns co-activated skills sorted by weight", () => {
    const graph: Graph = {
      nodes: [
        makeSkillNode("a@x", 0.5),
        makeSkillNode("b@y", 0.3),
        makeSkillNode("c@z", 0.4),
      ],
      edges: [
        { type: "skill_skill", from: "a@x", to: "b@y", w: 0.7, co_activations: 10 },
        { type: "skill_skill", from: "a@x", to: "c@z", w: 0.9, co_activations: 20 },
      ],
    };
    const result = loadNeighborhood(graph, ["a@x"]);
    expect(result.coActivatedSkills).toHaveLength(2);
    expect(result.coActivatedSkills[0].id).toBe("c@z");
    expect(result.coActivatedSkills[0].w).toBe(0.9);
  });

  it("excludes matched skill IDs from co-activated results", () => {
    const graph: Graph = {
      nodes: [
        makeSkillNode("a@x", 0.5),
        makeSkillNode("b@y", 0.3),
      ],
      edges: [
        { type: "skill_skill", from: "a@x", to: "b@y", w: 0.7, co_activations: 10 },
      ],
    };
    const result = loadNeighborhood(graph, ["a@x", "b@y"]);
    expect(result.coActivatedSkills).toHaveLength(0);
  });

  it("returns recent sessions that used matched skills", () => {
    const graph: Graph = {
      nodes: [
        makeSkillNode("a@x", 0.5),
        makeSessionNode("s1", 3000, ["a@x", "other"]),
        makeSessionNode("s2", 2000, ["other"]),
        makeSessionNode("s3", 1000, ["a@x"]),
      ],
      edges: [],
    };
    const result = loadNeighborhood(graph, ["a@x"]);
    expect(result.recentSessions).toHaveLength(2);
    expect(result.recentSessions[0].id).toBe("s1");
    expect(result.recentSessions[1].id).toBe("s3");
  });

  it("limits recent sessions to 3", () => {
    const nodes = [
      makeSkillNode("a@x", 0.5),
      ...[1, 2, 3, 4, 5].map((i) =>
        makeSessionNode(`s${i}`, i * 1000, ["a@x"]),
      ),
    ];
    const graph: Graph = { nodes, edges: [] };
    const result = loadNeighborhood(graph, ["a@x"]);
    expect(result.recentSessions).toHaveLength(3);
  });

  it("returns empty results for no matches", () => {
    const graph: Graph = { nodes: [], edges: [] };
    const result = loadNeighborhood(graph, ["nonexistent"]);
    expect(result.matchedSkills).toHaveLength(0);
    expect(result.coActivatedSkills).toHaveLength(0);
    expect(result.recentSessions).toHaveLength(0);
  });

  it("preserves caller id order and dedups by id", () => {
    const graph: Graph = {
      nodes: [
        makeSkillNode("c@z", 0.4),
        makeSkillNode("a@x", 0.5),
        makeSkillNode("b@y", 0.3),
      ],
      edges: [],
    };
    const result = loadNeighborhood(graph, ["a@x", "c@z", "a@x", "missing/id", "b@y"]);
    expect(result.matchedSkills.map((s) => s.id)).toEqual(["a@x", "c@z", "b@y"]);
  });
});

describe("formatSystemBrief", () => {
  it("includes stack and review protocol", () => {
    const graph: Graph = {
      nodes: [
        makeProjectNode(),
        makeSkillNode("code/typescript", 0.8),
        makeSessionNode("s1", 3000, ["code/typescript"]),
      ],
      edges: [
        { type: "skill_skill", from: "code/typescript", to: "review/architect", w: 0.6, co_activations: 4 },
      ],
    };
    const neighborhood = loadNeighborhood(graph, ["code/typescript"]);
    const brief = formatSystemBrief(graph, neighborhood, "review", "review the auth diff");
    expect(brief).toContain("stack=[ts, react]");
    expect(brief).toContain("test session");
    expect(brief).toContain("project_context");
    expect(brief).toContain("Review/security protocol");
  });

  it("asks for a learning when no sessions exist", () => {
    const graph: Graph = { nodes: [makeProjectNode()], edges: [] };
    const brief = formatSystemBrief(graph, loadNeighborhood(graph, []), "implement", "add login");
    expect(brief).toContain("none");
    expect(brief).not.toContain("Review/security protocol");
  });
});

describe("loadContent", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `loader-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    home.path = undefined;
    await rm(testDir, { recursive: true, force: true });
  });

  it("preserves catalog skill source bytes, including multiline Mermaid", async () => {
    const source = await readFile(catalogFile("pipeline/delivery"), "utf-8");
    const result = await loadContent(testDir, ["pipeline/delivery"]);
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].id).toBe("pipeline/delivery");
    expect(result.skills[0].content).toBe(source);
    expect(result.skills[0].content).toContain("  Specs --> QA");
  });

  it("preserves fenced commands, Mermaid, JSON, nested fences, and whitespace in catalog skills", async () => {
    const root = join(testDir, "test-catalog");
    const file = join(root, "pipeline", "lossless.md");
    const source = fencedSkillContent();
    await mkdir(join(root, "pipeline"), { recursive: true });
    await writeFile(file, source, "utf-8");
    catalogOverride.root = root;
    catalogOverride.file = file;
    try {
      const result = await loadContent(testDir, ["pipeline/lossless"]);
      expect(result.skills).toHaveLength(1);
      expect(result.skills[0]?.content).toBe(source);
    } finally {
      catalogOverride.root = undefined;
      catalogOverride.file = undefined;
    }
  });

  it("reads SKILL.md from local skill-cache", async () => {
    const localCacheDir = join(testDir, ".superskill", "skill-cache", "owner", "repo", "my-skill");
    await mkdir(localCacheDir, { recursive: true });
    await writeFile(join(localCacheDir, "SKILL.md"), "# Local Content", "utf-8");

    const result = await loadContent(testDir, ["owner/repo@my-skill"]);
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].content).toContain("Local Content");
    expect(result.skills[0].stale).toBeUndefined();
    expect(result.warnings).toEqual([]);
  });

  it("serves stale skill-cache content with a stale marker and warning", async () => {
    const localCacheDir = join(testDir, ".superskill", "skill-cache", "owner", "repo", "old-skill");
    await mkdir(localCacheDir, { recursive: true });
    const file = join(localCacheDir, "SKILL.md");
    await writeFile(file, "# Old Content", "utf-8");
    const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    await utimes(file, old, old);

    const result = await loadContent(testDir, ["owner/repo@old-skill"]);
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].content).toContain("Old Content");
    expect(result.skills[0].stale).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("stale");
  });

  it("preserves requested order, skips missing entries, and dedups", async () => {
    for (const name of ["first", "second"]) {
      const dir = join(testDir, ".superskill", "skill-cache", "owner", "repo", name);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, "SKILL.md"), `# ${name}`, "utf-8");
    }

    const result = await loadContent(testDir, [
      "owner/repo@second",
      "owner/repo@missing",
      "owner/repo@first",
      "owner/repo@second",
    ]);
    expect(result.skills.map((s) => s.id)).toEqual([
      "owner/repo@second",
      "owner/repo@first",
    ]);
  });

  it("preserves fenced commands, Mermaid, JSON, nested fences, and whitespace in local cache", async () => {
    const localCacheDir = join(testDir, ".superskill", "skill-cache", "owner", "repo", "my-skill");
    await mkdir(localCacheDir, { recursive: true });
    const source = fencedSkillContent();
    await writeFile(join(localCacheDir, "SKILL.md"), source, "utf-8");
    const result = await loadContent(testDir, ["owner/repo@my-skill"]);
    expect(result.skills[0].content).toBe(source);
  });

  it("returns empty skills array for invalid skill ID format", async () => {
    const result = await loadContent(testDir, ["invalid-id"]);
    expect(result.skills).toHaveLength(0);
  });

  it("handles missing content gracefully", async () => {
    const result = await loadContent(testDir, ["owner/repo@nonexistent"]);
    expect(result.skills).toHaveLength(0);
  });

  it.each(["native/../../outside", "owner/repo@../../../../outside", "owner/../repo@outside", "owner/repo@outside@extra", "code/../../package"])("rejects untrusted id %s", async (id) => {
    const result = await loadContent(testDir, [id]);
    expect(result.skills).toHaveLength(0);
    expect(result.warnings.join(" ")).toMatch(/invalid.*id/i);
  });

  it.each(["native", "cache", "cache-root", "native-root"])("rejects %s symlinks outside their source root", async (kind) => {
    const outside = join(testDir, "outside");
    await mkdir(outside);
    await writeFile(join(outside, "SKILL.md"), "# Outside secret");
    const root = kind.startsWith("native") ? join(testDir, ".agents", "skills") : join(testDir, ".superskill", "skill-cache");
    await mkdir(join(root, "owner", "repo"), { recursive: true });
    if (kind.endsWith("root")) {
      await rm(root, { recursive: true });
      await symlink(outside, root);
      await mkdir(join(outside, "owner", "repo", "escape"), { recursive: true });
      await mkdir(join(outside, "escape"));
      await writeFile(join(outside, "owner", "repo", "escape", "SKILL.md"), "# Outside secret");
      await writeFile(join(outside, "escape", "SKILL.md"), "# Outside secret");
    } else {
      await symlink(outside, kind === "native" ? join(root, "escape") : join(root, "owner", "repo", "escape"));
    }
    const result = await loadContent(testDir, [kind.startsWith("native") ? "native/escape" : "owner/repo@escape"]);
    expect(result.skills).toEqual([]);
  });

  it("rejects oversized skill content before reading it", async () => {
    const root = join(testDir, ".superskill", "skill-cache", "owner", "repo", "huge");
    await mkdir(root, { recursive: true });
    await writeFile(join(root, "SKILL.md"), "# Huge");
    await truncate(join(root, "SKILL.md"), 64 * 1024 * 1024);
    const result = await loadContent(testDir, ["owner/repo@huge"]);
    expect(result.skills).toHaveLength(0);
    expect(result.warnings.join(" ")).toMatch(/size|large|limit/i);
  });

  it.each(["skill", "root"])("permits intended global cache %s symlinks", async (kind) => {
    home.path = testDir;
    const globalRoot = join(testDir, ".superskill", "skills");
    const globalSkill = join(globalRoot, "owner", "repo", "shared");
    const localRoot = join(testDir, ".superskill", "skill-cache");
    await mkdir(globalSkill, { recursive: true });
    await writeFile(join(globalSkill, "SKILL.md"), "# Trusted shared cache");
    if (kind === "root") await symlink(globalRoot, localRoot);
    else {
      await mkdir(join(localRoot, "owner", "repo"), { recursive: true });
      await symlink(globalSkill, join(localRoot, "owner", "repo", "shared"));
    }
    const result = await loadContent(testDir, ["owner/repo@shared"]);
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].id).toBe("owner/repo@shared");
    expect(result.skills[0].content).toBe("# Trusted shared cache");
  });

  it("does not trust a global cache root redirected to another source", async () => {
    home.path = testDir;
    const outside = join(testDir, "outside");
    await mkdir(join(outside, "owner", "repo", "shared"), { recursive: true });
    await writeFile(join(outside, "owner", "repo", "shared", "SKILL.md"), "# Outside");
    await mkdir(join(testDir, ".superskill"));
    await symlink(outside, join(testDir, ".superskill", "skills"));
    await symlink(outside, join(testDir, ".superskill", "skill-cache"));
    expect((await loadContent(testDir, ["owner/repo@shared"])).skills).toHaveLength(0);
  });

  it("bounds aggregate content and the number of requested ids", async () => {
    const ids: string[] = [];
    for (let index = 0; index < 9; index++) {
      const dir = join(testDir, ".superskill", "skill-cache", "owner", "repo", `large-${index}`);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, "SKILL.md"), "a".repeat(1024 * 1024));
      ids.push(`owner/repo@large-${index}`);
    }
    const result = await loadContent(testDir, ids);
    expect(result.skills).toHaveLength(8);
    expect(result.warnings.join(" ")).toMatch(/total size limit/);
    const capped = await loadContent(testDir, Array.from({ length: 129 }, (_, index) => `invalid-${index}`));
    expect(capped.warnings.join(" ")).toMatch(/request limit/);
    expect(capped.warnings).toHaveLength(129);
  });
});

describe("loadContent native skills", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "superskill-loader-native-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("loads a native skill by frontmatter name instead of hitting the catalog branch", async () => {
    const skillDir = join(dir, ".agents", "skills", "demo");
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, "SKILL.md"), "---\nname: demo\n---\n\n# Demo\n\nBody text.", "utf-8");
    const result = await loadContent(dir, ["native/demo"]);
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0]?.id).toBe("native/demo");
    expect(result.skills[0]?.content).toContain("Body text.");
  });

  it("preserves fenced commands, Mermaid, JSON, nested fences, and whitespace in native skills", async () => {
    const skillDir = join(dir, ".agents", "skills", "demo");
    const source = fencedSkillContent();
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, "SKILL.md"), source, "utf-8");
    const result = await loadContent(dir, ["native/demo"]);
    expect(result.skills[0]?.content).toBe(source);
  });

  it("finds native skills nested under marketplace directories", async () => {
    const skillDir = join(dir, ".agents", "skills", "market", "repo", "nested");
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, "SKILL.md"), "---\nname: nested\n---\n\nNested body.", "utf-8");
    const result = await loadContent(dir, ["native/nested"]);
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0]?.content).toContain("Nested body.");
  });

  it("returns no content for a missing native skill", async () => {
    const result = await loadContent(dir, ["native/absent"]);
    expect(result.skills).toHaveLength(0);
  });
});
