import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type {
  Graph,
  ProjectNode,
  SkillNode,
  SessionNode,
  ProjectSkillEdge,
  SkillSkillEdge,
  SessionSkillEdge,
  SessionFileEdge,
} from "./schema.js";
import {
  createEmptyGraph,
  loadGraph,
  writeGraph,
  ensureSuperskillDir,
  findNode,
  findNodes,
  addNode,
  addEdge,
  updateNode,
  removeNode,
  pruneSessions,
  decayWeights,
} from "./store.js";

function makeProjectNode(overrides?: Partial<ProjectNode>): ProjectNode {
  return {
    type: "project",
    id: "project",
    stack: ["ts", "react"],
    tools: ["claude"],
    phase: "explore",
    ts: 1000,
    ...overrides,
  };
}

function makeSkillNode(id: string, overrides?: Partial<SkillNode>): SkillNode {
  return {
    type: "skill",
    id,
    source: "routed",
    audits: { gen: "pass", socket: "pass", snyk: "pass" },
    installs: 1000,
    stars: 100,
    w: 0.5,
    ts: 1000,
    ...overrides,
  };
}

function makeSessionNode(id: string, ts: number, overrides?: Partial<SessionNode>): SessionNode {
  return {
    type: "session",
    id,
    intent: "test session",
    skills: [],
    files: [],
    outcome: null,
    insights: [],
    ts,
    ...overrides,
  };
}

describe("createEmptyGraph", () => {
  it("returns empty graph with no nodes or edges", () => {
    const graph = createEmptyGraph();
    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
  });
});

describe("loadGraph", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `graph-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("returns empty graph when file does not exist", async () => {
    const graph = await loadGraph(testDir);
    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
  });

  it("loads graph from existing file", async () => {
    const graph: Graph = {
      nodes: [makeProjectNode()],
      edges: [],
    };
    await writeGraph(testDir, graph);
    const loaded = await loadGraph(testDir);
    expect(loaded.nodes).toHaveLength(1);
    expect(loaded.nodes[0].type).toBe("project");
  });
});

describe("writeGraph", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `graph-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("creates .superskill directory and writes graph.json", async () => {
    const graph = createEmptyGraph();
    await writeGraph(testDir, graph);
    const raw = await readFile(join(testDir, ".superskill", "graph.json"), "utf-8");
    expect(JSON.parse(raw)).toEqual(graph);
  });

  it("overwrites existing graph.json", async () => {
    const g1: Graph = { nodes: [makeProjectNode()], edges: [] };
    const g2: Graph = { nodes: [makeProjectNode({ phase: "implement" })], edges: [] };
    await writeGraph(testDir, g1);
    await writeGraph(testDir, g2);
    const loaded = await loadGraph(testDir);
    expect((loaded.nodes[0] as ProjectNode).phase).toBe("implement");
  });
});

describe("ensureSuperskillDir", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `graph-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("creates .superskill directory if missing", async () => {
    const dir = await ensureSuperskillDir(testDir);
    expect(dir).toBe(join(testDir, ".superskill"));
  });

  it("returns existing .superskill directory", async () => {
    await mkdir(join(testDir, ".superskill"), { recursive: true });
    const dir = await ensureSuperskillDir(testDir);
    expect(dir).toBe(join(testDir, ".superskill"));
  });
});

describe("findNode", () => {
  it("finds node by type and id", () => {
    const graph: Graph = {
      nodes: [makeProjectNode(), makeSkillNode("skill-a")],
      edges: [],
    };
    const result = findNode<SkillNode>(graph, "skill", "skill-a");
    expect(result).toBeDefined();
    expect(result!.id).toBe("skill-a");
  });

  it("returns undefined when node not found", () => {
    const graph: Graph = { nodes: [makeProjectNode()], edges: [] };
    const result = findNode<SkillNode>(graph, "skill", "nonexistent");
    expect(result).toBeUndefined();
  });
});

describe("findNodes", () => {
  it("finds all nodes of a given type", () => {
    const graph: Graph = {
      nodes: [
        makeProjectNode(),
        makeSkillNode("skill-a"),
        makeSkillNode("skill-b"),
        makeSessionNode("s1", 1000),
      ],
      edges: [],
    };
    const skills = findNodes<SkillNode>(graph, "skill");
    expect(skills).toHaveLength(2);
  });

  it("returns empty array when no nodes of type exist", () => {
    const graph: Graph = { nodes: [makeProjectNode()], edges: [] };
    const sessions = findNodes<SessionNode>(graph, "session");
    expect(sessions).toEqual([]);
  });
});

describe("addNode", () => {
  it("adds a new node to the graph", () => {
    const graph = createEmptyGraph();
    const updated = addNode(graph, makeSkillNode("skill-a"));
    expect(updated.nodes).toHaveLength(1);
    expect(updated.nodes[0].id).toBe("skill-a");
  });

  it("does not mutate the original graph", () => {
    const graph = createEmptyGraph();
    addNode(graph, makeSkillNode("skill-a"));
    expect(graph.nodes).toHaveLength(0);
  });

  it("replaces existing node with same type and id", () => {
    const graph: Graph = {
      nodes: [makeSkillNode("skill-a", { w: 0.3 })],
      edges: [],
    };
    const updated = addNode(graph, makeSkillNode("skill-a", { w: 0.9 }));
    expect(updated.nodes).toHaveLength(1);
    expect((updated.nodes[0] as SkillNode).w).toBe(0.9);
  });
});

describe("addEdge", () => {
  it("adds a new edge to the graph", () => {
    const graph = createEmptyGraph();
    const edge: ProjectSkillEdge = {
      type: "project_skill",
      from: "project",
      to: "skill-a",
      w: 0.5,
      activations: 1,
    };
    const updated = addEdge(graph, edge);
    expect(updated.edges).toHaveLength(1);
  });

  it("does not mutate the original graph", () => {
    const graph = createEmptyGraph();
    const edge: ProjectSkillEdge = {
      type: "project_skill",
      from: "project",
      to: "skill-a",
      w: 0.5,
      activations: 1,
    };
    addEdge(graph, edge);
    expect(graph.edges).toHaveLength(0);
  });

  it("replaces existing edge with same key", () => {
    const edge1: ProjectSkillEdge = {
      type: "project_skill",
      from: "project",
      to: "skill-a",
      w: 0.3,
      activations: 1,
    };
    const edge2: ProjectSkillEdge = {
      type: "project_skill",
      from: "project",
      to: "skill-a",
      w: 0.9,
      activations: 5,
    };
    const graph: Graph = { nodes: [], edges: [edge1] };
    const updated = addEdge(graph, edge2);
    expect(updated.edges).toHaveLength(1);
    expect((updated.edges[0] as ProjectSkillEdge).w).toBe(0.9);
  });
});

describe("updateNode", () => {
  it("updates a node by type and id", () => {
    const graph: Graph = {
      nodes: [makeProjectNode({ phase: "explore" })],
      edges: [],
    };
    const updated = updateNode(graph, "project", "project", { phase: "implement" });
    expect((updated.nodes[0] as ProjectNode).phase).toBe("implement");
  });

  it("returns unchanged graph when node not found", () => {
    const graph: Graph = { nodes: [makeProjectNode()], edges: [] };
    const updated = updateNode(graph, "skill", "nonexistent", { w: 0.9 });
    expect(updated).toBe(graph);
  });

  it("does not mutate the original graph", () => {
    const graph: Graph = {
      nodes: [makeProjectNode({ phase: "explore" })],
      edges: [],
    };
    updateNode(graph, "project", "project", { phase: "implement" });
    expect((graph.nodes[0] as ProjectNode).phase).toBe("explore");
  });
});

describe("removeNode", () => {
  it("removes a node by type and id", () => {
    const graph: Graph = {
      nodes: [makeProjectNode(), makeSkillNode("skill-a")],
      edges: [],
    };
    const updated = removeNode(graph, "skill", "skill-a");
    expect(updated.nodes).toHaveLength(1);
    expect(updated.nodes[0].type).toBe("project");
  });

  it("removes edges connected to the removed node", () => {
    const edge: ProjectSkillEdge = {
      type: "project_skill",
      from: "project",
      to: "skill-a",
      w: 0.5,
      activations: 1,
    };
    const graph: Graph = {
      nodes: [makeProjectNode(), makeSkillNode("skill-a")],
      edges: [edge],
    };
    const updated = removeNode(graph, "skill", "skill-a");
    expect(updated.edges).toHaveLength(0);
  });

  it("returns unchanged graph when node not found", () => {
    const graph: Graph = { nodes: [makeProjectNode()], edges: [] };
    const updated = removeNode(graph, "skill", "nonexistent");
    expect(updated.nodes).toHaveLength(1);
  });
});

describe("pruneSessions", () => {
  it("keeps only the last N sessions sorted by timestamp", () => {
    const graph: Graph = {
      nodes: [
        makeProjectNode(),
        makeSessionNode("s1", 1000),
        makeSessionNode("s2", 3000),
        makeSessionNode("s3", 2000),
      ],
      edges: [],
    };
    const updated = pruneSessions(graph, 2);
    const sessions = updated.nodes.filter((n) => n.type === "session");
    expect(sessions).toHaveLength(2);
    expect((sessions[0] as SessionNode).id).toBe("s2");
    expect((sessions[1] as SessionNode).id).toBe("s3");
  });

  it("removes edges belonging to pruned sessions", () => {
    const edge1: SessionSkillEdge = {
      type: "session_skill",
      from: "s1",
      to: "skill-a",
      role: "primary",
    };
    const edge2: SessionSkillEdge = {
      type: "session_skill",
      from: "s2",
      to: "skill-b",
      role: "primary",
    };
    const graph: Graph = {
      nodes: [
        makeSessionNode("s1", 1000),
        makeSessionNode("s2", 2000),
      ],
      edges: [edge1, edge2],
    };
    const updated = pruneSessions(graph, 1);
    expect(updated.edges).toHaveLength(1);
    expect((updated.edges[0] as SessionSkillEdge).from).toBe("s2");
  });

  it("preserves non-session edges", () => {
    const projectEdge: ProjectSkillEdge = {
      type: "project_skill",
      from: "project",
      to: "skill-a",
      w: 0.5,
      activations: 1,
    };
    const graph: Graph = {
      nodes: [
        makeSessionNode("s1", 1000),
        makeSessionNode("s2", 2000),
      ],
      edges: [projectEdge],
    };
    const updated = pruneSessions(graph, 1);
    expect(updated.edges).toHaveLength(1);
    expect(updated.edges[0].type).toBe("project_skill");
  });
});

describe("decayWeights", () => {
  it("decays project_skill edges not in activated set", () => {
    const edge1: ProjectSkillEdge = {
      type: "project_skill",
      from: "project",
      to: "skill-a",
      w: 0.8,
      activations: 10,
    };
    const edge2: ProjectSkillEdge = {
      type: "project_skill",
      from: "project",
      to: "skill-b",
      w: 0.6,
      activations: 5,
    };
    const graph: Graph = { nodes: [], edges: [edge1, edge2] };
    const updated = decayWeights(graph, new Set(["skill-a"]), 0.05, 0.1);

    const e1 = updated.edges.find((e) => e.type === "project_skill" && e.to === "skill-a") as ProjectSkillEdge;
    const e2 = updated.edges.find((e) => e.type === "project_skill" && e.to === "skill-b") as ProjectSkillEdge;
    expect(e1.w).toBe(0.8);
    expect(e2.w).toBeCloseTo(0.57);
  });

  it("respects the floor value", () => {
    const edge: ProjectSkillEdge = {
      type: "project_skill",
      from: "project",
      to: "skill-a",
      w: 0.11,
      activations: 1,
    };
    const graph: Graph = { nodes: [], edges: [edge] };
    const updated = decayWeights(graph, new Set<string>(), 0.5, 0.1);
    const e = updated.edges[0] as ProjectSkillEdge;
    expect(e.w).toBe(0.1);
  });

  it("does not affect non-project_skill edges", () => {
    const skillEdge: SkillSkillEdge = {
      type: "skill_skill",
      from: "skill-a",
      to: "skill-b",
      w: 0.7,
      co_activations: 5,
    };
    const graph: Graph = { nodes: [], edges: [skillEdge] };
    const updated = decayWeights(graph, new Set<string>(), 0.05, 0.1);
    expect((updated.edges[0] as SkillSkillEdge).w).toBe(0.7);
  });

  it("does not mutate the original graph", () => {
    const edge: ProjectSkillEdge = {
      type: "project_skill",
      from: "project",
      to: "skill-a",
      w: 0.8,
      activations: 10,
    };
    const graph: Graph = { nodes: [], edges: [edge] };
    decayWeights(graph, new Set<string>(), 0.05, 0.1);
    expect((graph.edges[0] as ProjectSkillEdge).w).toBe(0.8);
  });
});
