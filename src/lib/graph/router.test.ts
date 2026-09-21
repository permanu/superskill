import { describe, it, expect } from "vitest";
import type { Graph } from "./schema.js";
import { matchTask, getPhaseForTask, rankSkills, alwaysOnSkillIds } from "./router.js";

function makeProjectNode(stack: string[] = ["ts", "react"]) {
  return {
    type: "project" as const,
    id: "project" as const,
    stack,
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

function makeGraph(skills: Array<{ id: string; w: number }>, edges: Array<{ to: string; w: number }>, stack?: string[]): Graph {
  return {
    nodes: [
      makeProjectNode(stack),
      ...skills.map((s) => makeSkillNode(s.id, s.w)),
    ],
    edges: edges.map((e) => ({
      type: "project_skill" as const,
      from: "project",
      to: e.to,
      w: e.w,
      activations: 10,
    })),
  };
}

describe("matchTask", () => {
  it("matches task keywords against skill IDs", () => {
    const graph = makeGraph(
      [
        { id: "owner/repo@react-best-practices", w: 0.5 },
        { id: "owner/repo@node-security", w: 0.3 },
      ],
      [
        { to: "owner/repo@react-best-practices", w: 0.5 },
        { to: "owner/repo@node-security", w: 0.3 },
      ],
    );
    const result = matchTask("fix React component rendering issue", graph);
    expect(result).toContain("owner/repo@react-best-practices");
  });

  it("ranks by combined keyword match + edge weight", () => {
    const graph = makeGraph(
      [
        { id: "owner/repo@react-hooks", w: 0.2 },
        { id: "owner/repo@react-testing", w: 0.9 },
      ],
      [
        { to: "owner/repo@react-hooks", w: 0.2 },
        { to: "owner/repo@react-testing", w: 0.9 },
      ],
    );
    const result = matchTask("add React testing", graph);
    expect(result[0]).toBe("owner/repo@react-testing");
  });

  it("returns empty array for empty task", () => {
    const graph = makeGraph(
      [{ id: "owner/repo@skill-a", w: 0.5 }],
      [{ to: "owner/repo@skill-a", w: 0.5 }],
    );
    expect(matchTask("", graph)).toEqual([]);
  });

  it("returns empty array for stopword-only task", () => {
    const graph = makeGraph(
      [{ id: "owner/repo@skill-a", w: 0.5 }],
      [{ to: "owner/repo@skill-a", w: 0.5 }],
    );
    expect(matchTask("the is a", graph)).toEqual([]);
  });

  it("limits results to top 3", () => {
    const graph = makeGraph(
      [
        { id: "owner/repo@react-a", w: 0.9 },
        { id: "owner/repo@react-b", w: 0.8 },
        { id: "owner/repo@react-c", w: 0.7 },
        { id: "owner/repo@react-d", w: 0.6 },
      ],
      [
        { to: "owner/repo@react-a", w: 0.9 },
        { to: "owner/repo@react-b", w: 0.8 },
        { to: "owner/repo@react-c", w: 0.7 },
        { to: "owner/repo@react-d", w: 0.6 },
      ],
    );
    const result = matchTask("React component", graph);
    expect(result).toHaveLength(3);
  });

  it("falls back to stack-based defaults when no keyword match", () => {
    const graph = makeGraph(
      [
        { id: "owner/repo@typescript-patterns", w: 0.8 },
        { id: "owner/repo@python-utils", w: 0.5 },
      ],
      [
        { to: "owner/repo@typescript-patterns", w: 0.8 },
        { to: "owner/repo@python-utils", w: 0.5 },
      ],
      ["typescript"],
    );
    const result = matchTask("do something completely unrelated", graph);
    expect(result).toContain("owner/repo@typescript-patterns");
    expect(result).not.toContain("owner/repo@python-utils");
  });

  it("returns empty array when no matches and no project node", () => {
    const graph: Graph = {
      nodes: [makeSkillNode("owner/repo@skill-a", 0.5)],
      edges: [],
    };
    const result = matchTask("do something", graph);
    expect(result).toEqual([]);
  });
});

describe("getPhaseForTask", () => {
  it("detects ship phase from deploy/release keywords", () => {
    expect(getPhaseForTask("deploy to production")).toBe("ship");
    expect(getPhaseForTask("release v2.0")).toBe("ship");
    expect(getPhaseForTask("ship the feature")).toBe("ship");
  });

  it("detects review phase from review/fix keywords", () => {
    expect(getPhaseForTask("review the auth code")).toBe("review");
    expect(getPhaseForTask("review this diff")).toBe("review");
    expect(getPhaseForTask("refactor the database layer")).toBe("review");
    expect(getPhaseForTask("fix a typo in the readme")).not.toBe("review");
    expect(getPhaseForTask("run the tests")).not.toBe("review");
    expect(getPhaseForTask("fix a security bug in cookies")).toBe("review");
  });

  it("detects implement phase from build/create keywords", () => {
    expect(getPhaseForTask("add user authentication")).toBe("implement");
    expect(getPhaseForTask("build a new dashboard")).toBe("implement");
    expect(getPhaseForTask("create API endpoints")).toBe("implement");
  });

  it("defaults to explore phase", () => {
    expect(getPhaseForTask("look around the codebase")).toBe("explore");
    expect(getPhaseForTask("what does this project do")).toBe("explore");
  });

  it("prioritizes ship > review > implement > explore", () => {
    expect(getPhaseForTask("deploy and review the release")).toBe("ship");
    expect(getPhaseForTask("review and fix tests before release")).toBe("ship");
    expect(getPhaseForTask("add feature then review")).toBe("review");
  });
});

describe("rankSkills", () => {
  it("sorts skill IDs by edge weight descending", () => {
    const graph = makeGraph(
      [
        { id: "skill-a", w: 0.3 },
        { id: "skill-b", w: 0.9 },
        { id: "skill-c", w: 0.6 },
      ],
      [
        { to: "skill-a", w: 0.3 },
        { to: "skill-b", w: 0.9 },
        { to: "skill-c", w: 0.6 },
      ],
    );
    const result = rankSkills(["skill-c", "skill-a", "skill-b"], graph);
    expect(result).toEqual(["skill-b", "skill-c", "skill-a"]);
  });

  it("uses default weight for skills without edges", () => {
    const graph = makeGraph(
      [{ id: "skill-a", w: 0.5 }],
      [{ to: "skill-a", w: 0.5 }],
    );
    const result = rankSkills(["skill-a", "skill-noedge"], graph);
    expect(result[0]).toBe("skill-a");
    expect(result[1]).toBe("skill-noedge");
  });

  it("does not mutate input array", () => {
    const graph = makeGraph(
      [
        { id: "skill-a", w: 0.3 },
        { id: "skill-b", w: 0.9 },
      ],
      [
        { to: "skill-a", w: 0.3 },
        { to: "skill-b", w: 0.9 },
      ],
    );
    const input = ["skill-a", "skill-b"];
    rankSkills(input, graph);
    expect(input).toEqual(["skill-a", "skill-b"]);
  });
});

describe("catalog routing", () => {
  function catalogGraph(): Graph {
    return {
      nodes: [
        makeProjectNode(["typescript"]),
        {
          ...makeSkillNode("code/typescript", 0.8),
          source: "catalog" as const,
          pack: "code" as const,
          langs: ["typescript"],
          triggers: ["typescript", "ts"],
        },
        {
          ...makeSkillNode("code/python", 0.8),
          source: "catalog" as const,
          pack: "code" as const,
          langs: ["python"],
          triggers: ["python"],
        },
        {
          ...makeSkillNode("security/index", 0.5),
          source: "catalog" as const,
          pack: "security" as const,
          always: true,
          triggers: ["security"],
        },
        {
          ...makeSkillNode("security/compliance", 0.5),
          source: "catalog" as const,
          pack: "security" as const,
          always: false,
          triggers: ["owasp", "pentest", "soc2"],
        },
        {
          ...makeSkillNode("review/architect", 0.7),
          source: "catalog" as const,
          pack: "review" as const,
          triggers: ["review", "diff"],
        },
      ],
      edges: [],
    };
  }

  it("does not load python on a typescript repo", () => {
    const result = matchTask("add a typescript helper", catalogGraph());
    expect(result).toContain("code/typescript");
    expect(result).not.toContain("code/python");
  });

  it("loads python when the task names python", () => {
    const result = matchTask("port this helper to python", catalogGraph());
    expect(result).toContain("code/python");
  });

  it("keeps compliance off during implement unless asked", () => {
    const result = matchTask("add a login form", catalogGraph());
    expect(result).not.toContain("security/compliance");
  });

  it("loads compliance for pentest/owasp tasks", () => {
    const result = matchTask("owasp pentest the auth flow", catalogGraph());
    expect(result).toContain("security/compliance");
  });

  it("always-on security index loads for implement tasks", () => {
    const always = alwaysOnSkillIds(catalogGraph(), "add a login form");
    expect(always).toContain("security/index");
    expect(always).not.toContain("security/compliance");
  });

  it("always-on optimizer algorithm pack loads", () => {
    const g = catalogGraph();
    g.nodes.push({
      ...makeSkillNode("optimizer/algorithm", 0.9),
      source: "catalog" as const,
      pack: "optimizer" as const,
      always: true,
      triggers: ["complexity"],
    });
    const always = alwaysOnSkillIds(g, "add a login form");
    expect(always).toContain("optimizer/algorithm");
  });

  it("always-on delivery pipeline is diagnostic not a forced waterfall", () => {
    const g = catalogGraph();
    g.nodes.push({
      ...makeSkillNode("pipeline/delivery", 0.9),
      source: "catalog" as const,
      pack: "pipeline" as const,
      always: true,
      triggers: ["pipeline"],
    });
    const always = alwaysOnSkillIds(g, "fix a typo in the readme");
    expect(always).toContain("pipeline/delivery");
  });

  it("loads review pack for review tasks", () => {
    const result = matchTask("review this diff", catalogGraph());
    expect(result).toContain("review/architect");
  });
});

