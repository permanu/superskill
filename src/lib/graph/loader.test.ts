import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir, homedir } from "node:os";
import type { Graph, SkillNode, SessionNode } from "./schema.js";
import { loadIndex, loadNeighborhood, loadContent } from "./loader.js";

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
});

describe("loadContent", () => {
  let testDir: string;
  let skillCacheDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `loader-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
    skillCacheDir = join(homedir(), ".superskill", "skills", "owner", "repo", "my-skill");
    await mkdir(skillCacheDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
    await rm(skillCacheDir, { recursive: true, force: true });
  });

  it("reads SKILL.md from global cache and compresses long code blocks", async () => {
    const longBlock = Array.from({ length: 10 }, (_, i) => `line ${i + 1}`).join("\n");
    await writeFile(join(skillCacheDir, "SKILL.md"), `# My Skill\n\nSome rules here.\n\`\`\`js\n${longBlock}\n\`\`\`\n\nMore text.`, "utf-8");
    const result = await loadContent(testDir, ["owner/repo@my-skill"]);
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].id).toBe("owner/repo@my-skill");
    expect(result.skills[0].content).not.toContain("```");
    expect(result.skills[0].content).toContain("Some rules here.");
  });

  it("reads SKILL.md from local skill-cache first", async () => {
    const localCacheDir = join(testDir, ".superskill", "skill-cache", "owner", "repo", "my-skill");
    await mkdir(localCacheDir, { recursive: true });
    await writeFile(join(localCacheDir, "SKILL.md"), "# Local Content", "utf-8");
    await writeFile(join(skillCacheDir, "SKILL.md"), "# Global Content", "utf-8");

    const result = await loadContent(testDir, ["owner/repo@my-skill"]);
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].content).toContain("Local Content");
  });

  it("returns empty skills array for invalid skill ID format", async () => {
    const result = await loadContent(testDir, ["invalid-id"]);
    expect(result.skills).toHaveLength(0);
  });

  it("handles missing content gracefully", async () => {
    const result = await loadContent(testDir, ["owner/repo@nonexistent"]);
    expect(result.skills).toHaveLength(0);
  });
});
