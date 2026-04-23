import { describe, it, expect } from "vitest";
import type { Graph, SessionNode, ProjectSkillEdge, SkillSkillEdge } from "./schema.js";
import {
  boostWeight,
  normalizeInstalls,
  normalizeStars,
  startSession,
  recordActivation,
  endSession,
} from "./learner.js";

function makeProjectNode() {
  return {
    type: "project" as const,
    id: "project" as const,
    stack: ["ts"],
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
    audits: { gen: "pass" as const, socket: "pass" as const, snyk: "pass" as const },
    installs: 1000,
    stars: 100,
    w,
    ts: 1000,
  };
}

function makeBaseGraph(skillId: string, edgeW: number): Graph {
  return {
    nodes: [makeProjectNode(), makeSkillNode(skillId, edgeW)],
    edges: [
      {
        type: "project_skill",
        from: "project",
        to: skillId,
        w: edgeW,
        activations: 10,
      },
    ],
  };
}

describe("boostWeight", () => {
  it("boosts weight toward 1.0 using EMA", () => {
    expect(boostWeight(0.5)).toBeCloseTo(0.55);
    expect(boostWeight(1.0)).toBe(1.0);
    expect(boostWeight(0.0)).toBeCloseTo(0.1);
    expect(boostWeight(0.9)).toBeCloseTo(0.91);
  });

  it("converges to 1.0 with repeated boosts", () => {
    let w = 0.1;
    for (let i = 0; i < 50; i++) {
      w = boostWeight(w);
    }
    expect(w).toBeCloseTo(1.0, 2);
  });
});

describe("normalizeStars", () => {
  it("maps 0 stars to 0", () => {
    expect(normalizeStars(0)).toBe(0);
  });

  it("maps negative stars to 0", () => {
    expect(normalizeStars(-100)).toBe(0);
  });

  it("maps high star counts to near 1", () => {
    expect(normalizeStars(1_000_000)).toBeCloseTo(1.0, 1);
    expect(normalizeStars(165_000)).toBeGreaterThan(0.8);
  });

  it("produces values in 0-1 range", () => {
    for (const stars of [1, 10, 100, 1000, 10000, 100000]) {
      const result = normalizeStars(stars);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    }
  });

  it("is monotonically increasing", () => {
    const a = normalizeStars(100);
    const b = normalizeStars(1000);
    const c = normalizeStars(10000);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });
});

describe("normalizeInstalls", () => {
  it("maps 0 installs to 0", () => {
    expect(normalizeInstalls(0)).toBe(0);
  });

  it("maps negative installs to 0", () => {
    expect(normalizeInstalls(-100)).toBe(0);
  });

  it("maps high install counts to near 1", () => {
    expect(normalizeInstalls(1000000)).toBeCloseTo(1.0, 1);
  });

  it("produces values in 0-1 range", () => {
    for (const installs of [1, 10, 100, 1000, 10000, 100000]) {
      const result = normalizeInstalls(installs);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    }
  });

  it("is monotonically increasing", () => {
    const a = normalizeInstalls(100);
    const b = normalizeInstalls(1000);
    const c = normalizeInstalls(10000);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });
});

describe("startSession", () => {
  it("creates a new session node in the graph", () => {
    const graph = makeBaseGraph("skill-a", 0.5);
    const { graph: updated, sessionId } = startSession(graph, "test intent");
    expect(sessionId).toMatch(/^s_\d+_[a-f0-9]{4}$/);
    const session = updated.nodes.find((n) => n.type === "session") as SessionNode;
    expect(session).toBeDefined();
    expect(session.intent).toBe("test intent");
    expect(session.skills).toEqual([]);
    expect(session.outcome).toBeNull();
    expect(session.insights).toEqual([]);
  });

  it("does not mutate the original graph", () => {
    const graph = makeBaseGraph("skill-a", 0.5);
    startSession(graph, "test intent");
    expect(graph.nodes).toHaveLength(2);
  });

  it("generates unique session IDs", () => {
    const graph = makeBaseGraph("skill-a", 0.5);
    const { sessionId: id1 } = startSession(graph, "intent 1");
    const { sessionId: id2 } = startSession(graph, "intent 2");
    expect(id1).not.toBe(id2);
  });
});

describe("recordActivation", () => {
  it("adds skill to session and creates session_skill edge", () => {
    const graph = makeBaseGraph("skill-a", 0.5);
    const { graph: g1, sessionId } = startSession(graph, "test");
    const updated = recordActivation(g1, sessionId, "skill-a", ["src/auth.ts"]);

    const session = updated.nodes.find(
      (n) => n.type === "session" && n.id === sessionId,
    ) as SessionNode;
    expect(session.skills).toContain("skill-a");
    expect(session.files).toContain("src/auth.ts");

    const skillEdge = updated.edges.find(
      (e) => e.type === "session_skill" && e.from === sessionId,
    ) as { type: "session_skill"; from: string; to: string; role: "primary" | "secondary" } | undefined;
    expect(skillEdge).toBeDefined();
    expect(skillEdge!.to).toBe("skill-a");
    expect(skillEdge!.role).toBe("primary");
  });

  it("creates session_file edges for touched files", () => {
    const graph = makeBaseGraph("skill-a", 0.5);
    const { graph: g1, sessionId } = startSession(graph, "test");
    const updated = recordActivation(g1, sessionId, "skill-a", ["src/a.ts", "src/b.ts"]);

    const fileEdges = updated.edges.filter(
      (e) => e.type === "session_file" && e.from === sessionId,
    );
    expect(fileEdges).toHaveLength(2);
  });

  it("boosts project_skill edge weight on activation", () => {
    const graph = makeBaseGraph("skill-a", 0.5);
    const { graph: g1, sessionId } = startSession(graph, "test");
    const updated = recordActivation(g1, sessionId, "skill-a", []);

    const edge = updated.edges.find(
      (e) => e.type === "project_skill" && e.to === "skill-a",
    ) as ProjectSkillEdge;
    expect(edge.w).toBeCloseTo(0.55);
    expect(edge.activations).toBe(11);
  });

  it("creates skill_skill co-activation edge for second skill", () => {
    const graph: Graph = {
      nodes: [
        makeProjectNode(),
        makeSkillNode("skill-a", 0.5),
        makeSkillNode("skill-b", 0.3),
      ],
      edges: [
        { type: "project_skill", from: "project", to: "skill-a", w: 0.5, activations: 10 },
        { type: "project_skill", from: "project", to: "skill-b", w: 0.3, activations: 5 },
      ],
    };
    const { graph: g1, sessionId } = startSession(graph, "test");
    const g2 = recordActivation(g1, sessionId, "skill-a", []);
    const updated = recordActivation(g2, sessionId, "skill-b", []);

    const coEdge = updated.edges.find(
      (e) => e.type === "skill_skill",
    ) as SkillSkillEdge | undefined;
    expect(coEdge).toBeDefined();
    expect(coEdge!.co_activations).toBe(1);
    expect(coEdge!.w).toBe(0.1);
  });

  it("second activation uses secondary role", () => {
    const graph = makeBaseGraph("skill-a", 0.5);
    const { graph: g1, sessionId } = startSession(graph, "test");
    const g2 = recordActivation(g1, sessionId, "skill-a", []);

    const graph2: Graph = {
      nodes: [...g2.nodes, makeSkillNode("skill-b", 0.3)],
      edges: [...g2.edges, { type: "project_skill", from: "project", to: "skill-b", w: 0.3, activations: 5 }],
    };
    const updated = recordActivation(graph2, sessionId, "skill-b", []);

    const skillEdge = updated.edges.find(
      (e) => e.type === "session_skill" && e.from === sessionId && e.to === "skill-b",
    ) as { type: "session_skill"; from: string; to: string; role: "primary" | "secondary" } | undefined;
    expect(skillEdge!.role).toBe("secondary");
  });

  it("does not duplicate skill in session skills list", () => {
    const graph = makeBaseGraph("skill-a", 0.5);
    const { graph: g1, sessionId } = startSession(graph, "test");
    const g2 = recordActivation(g1, sessionId, "skill-a", ["file.ts"]);
    const updated = recordActivation(g2, sessionId, "skill-a", ["other.ts"]);

    const session = updated.nodes.find(
      (n) => n.type === "session" && n.id === sessionId,
    ) as SessionNode;
    expect(session.skills.filter((s) => s === "skill-a")).toHaveLength(1);
    expect(session.files).toHaveLength(2);
  });

  it("returns unchanged graph when session not found", () => {
    const graph = makeBaseGraph("skill-a", 0.5);
    const updated = recordActivation(graph, "nonexistent", "skill-a", []);
    expect(updated.nodes).toHaveLength(2);
  });
});

describe("endSession", () => {
  it("sets outcome and insights on session", () => {
    const graph = makeBaseGraph("skill-a", 0.5);
    const { graph: g1, sessionId } = startSession(graph, "test");
    const g2 = recordActivation(g1, sessionId, "skill-a", []);
    const updated = endSession(g2, sessionId, "success", ["pattern 1"]);

    const session = updated.nodes.find(
      (n) => n.type === "session" && n.id === sessionId,
    ) as SessionNode;
    expect(session.outcome).toBe("success");
    expect(session.insights).toEqual(["pattern 1"]);
  });

  it("decays project_skill edges not activated in session", () => {
    const graph: Graph = {
      nodes: [
        makeProjectNode(),
        makeSkillNode("skill-a", 0.8),
        makeSkillNode("skill-b", 0.6),
      ],
      edges: [
        { type: "project_skill", from: "project", to: "skill-a", w: 0.8, activations: 10 },
        { type: "project_skill", from: "project", to: "skill-b", w: 0.6, activations: 5 },
      ],
    };
    const { graph: g1, sessionId } = startSession(graph, "test");
    const g2 = recordActivation(g1, sessionId, "skill-a", []);
    const updated = endSession(g2, sessionId, "success", []);

    const edgeA = updated.edges.find(
      (e) => e.type === "project_skill" && e.to === "skill-a",
    ) as ProjectSkillEdge;
    const edgeB = updated.edges.find(
      (e) => e.type === "project_skill" && e.to === "skill-b",
    ) as ProjectSkillEdge;
    expect(edgeA.w).toBeCloseTo(0.82);
    expect(edgeB.w).toBeCloseTo(0.57);
  });

  it("prunes old sessions keeping last 50", () => {
    const graph = makeBaseGraph("skill-a", 0.5);
    let current = graph;
    const sessionIds: string[] = [];

    for (let i = 0; i < 55; i++) {
      const { graph: g, sessionId } = startSession(current, `session ${i}`);
      current = endSession(g, sessionId, "success", []);
      sessionIds.push(sessionId);
    }

    const sessions = current.nodes.filter((n) => n.type === "session");
    expect(sessions).toHaveLength(50);
  });

  it("returns unchanged graph when session not found", () => {
    const graph = makeBaseGraph("skill-a", 0.5);
    const updated = endSession(graph, "nonexistent", "success", []);
    expect(updated.nodes).toHaveLength(2);
  });
});
