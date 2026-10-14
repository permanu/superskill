import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import type { Graph } from "./schema.js";
import { matchTask, getPhaseForTask, rankSkills, alwaysOnSkillIds, packsToLoad, routingStack } from "./router.js";
import { catalogFile, loadCatalog } from "../catalog.js";

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

async function currentCatalogGraph(): Promise<Graph> {
  const catalog = await loadCatalog();
  return {
    nodes: [
      makeProjectNode(["typescript"]),
      ...catalog.map(skill => ({
        ...makeSkillNode(skill.id, 0.5),
        source: "catalog" as const,
        pack: skill.pack,
        langs: skill.langs,
        triggers: skill.triggers,
        always: skill.always,
      })),
    ],
    edges: [],
  };
}

describe("matchTask", () => {
  it("tokenizes multiword and punctuated triggers like tasks and supports Unicode", () => {
    const graph: Graph = {
      nodes: [
        { ...makeSkillNode("native/english", 0.5), triggers: ["memory leak", "retry-queue"] },
        { ...makeSkillNode("native/unicode", 0.5), triggers: ["résumé", "数据库"] },
      ],
      edges: [],
    };
    expect(matchTask("investigate memory-leak", graph)).toContain("native/english");
    expect(matchTask("retry/queue", graph)).toContain("native/english");
    expect(matchTask("fix RE\u0301SUME\u0301", graph)).toContain("native/unicode");
    expect(matchTask("优化 数据库", graph)).toContain("native/unicode");
  });

  it("keeps stack defaults for empty and stopword-only prompts", () => {
    const graph = makeGraph([{ id: "native/typescript", w: 0.5 }], [], ["ts"]);
    expect(matchTask("", graph)).toEqual(["native/typescript"]);
    expect(matchTask("the is a", graph)).toEqual(["native/typescript"]);
  });

  it("handles JS aliases consistently with file routing", () => {
    const graph: Graph = { nodes: [{ ...makeSkillNode("code/typescript", 0.5), pack: "code", langs: ["typescript"], triggers: ["typescript"] }], edges: [] };
    for (const task of ["js", "javascript", "typescript", "ts"]) {
      expect(matchTask(task, graph, { phase: "implement" })).toEqual(["code/typescript"]);
    }
    expect(routingStack(["js"])).toEqual(routingStack([], ["file.js"]));
  });

  it("does not keep a stale trigger index after in-place edits", () => {
    const skill = { ...makeSkillNode("native/test", 0.5), triggers: ["first"] };
    const graph: Graph = { nodes: [skill], edges: [] };
    expect(matchTask("first", graph)).toEqual([skill.id]);
    skill.triggers[0] = "second";
    expect(matchTask("first", graph)).toEqual([]);
    expect(matchTask("second", graph)).toEqual([skill.id]);
  });

  it("ranks non-finite weights with safe finite defaults", () => {
    const graph = makeGraph([{ id: "native/react-bad", w: NaN }, { id: "native/react-good", w: 0.9 }], [{ to: "native/react-bad", w: Infinity }, { to: "native/react-good", w: 0.9 }]);
    expect(matchTask("react", graph)[0]).toBe("native/react-good");
    expect(rankSkills(["native/react-bad", "native/react-good"], graph)[0]).toBe("native/react-good");
  });
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

  it("detects review phase from defect/critique wording", () => {
    expect(getPhaseForTask("check for defects across the project")).toBe("review");
    expect(getPhaseForTask("critique the architecture")).toBe("review");
  });

  it("allows triggered pipeline skills in every phase", () => {
    for (const phase of ["explore", "implement", "review", "ship"] as const) {
      expect(packsToLoad("lazy yagni", phase).has("pipeline")).toBe(true);
    }
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

  it("uses the earliest matched keyword, then group priority", () => {
    expect(getPhaseForTask("deploy and review the release")).toBe("ship");
    expect(getPhaseForTask("review and fix tests before release")).toBe("review");
    expect(getPhaseForTask("add feature then review")).toBe("implement");
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

  it("keeps algorithm guidance off unrelated always-on tasks", () => {
    const g = catalogGraph();
    g.nodes.push({
      ...makeSkillNode("optimizer/algorithm", 0.9),
      source: "catalog" as const,
      pack: "optimizer" as const,
      always: true,
      triggers: ["complexity", "algorithm", "concurrency"],
    });
    const always = alwaysOnSkillIds(g, "add a login form");
    expect(always).not.toContain("optimizer/algorithm");
    expect(matchTask("implement a concurrency algorithm", g)).toContain("optimizer/algorithm");
  });

  it("keeps orchestration guidance off a README typo", () => {
    const g = catalogGraph();
    g.nodes.push({
      ...makeSkillNode("pipeline/delivery", 0.9),
      source: "catalog" as const,
      pack: "pipeline" as const,
      always: true,
      triggers: ["pipeline"],
    });
    const always = alwaysOnSkillIds(g, "fix a typo in README.md", { files: ["README.md"] });
    expect(always).not.toContain("pipeline/delivery");
  });

  it("loads review pack for review tasks", () => {
    const result = matchTask("review this diff", catalogGraph());
    expect(result).toContain("review/architect");
  });

  it("routes browser QA to UI review and reserves graph QA for generated notes", async () => {
    const graph = await currentCatalogGraph();
    const browser = matchTask("QA the UI browser e2e settings flow and click through it", graph, { files: ["src/app.tsx"] });
    expect(browser).toContain("ui/review");
    expect(browser).not.toContain("pipeline/qa");
    expect(browser).not.toContain("ui/foundations");
    expect(alwaysOnSkillIds(graph, "QA the UI browser e2e settings flow", { files: ["src/app.tsx"] })).not.toContain("ui/foundations");

    const graphNotes = matchTask("run graph viz to verify generated notes", graph);
    expect(graphNotes).toContain("pipeline/qa");
    expect(graphNotes).not.toContain("ui/review");
    expect(matchTask("verify generated graph notes", graph)).toContain("pipeline/qa");
    expect(matchTask("fix a graph traversal bug", graph)).not.toContain("pipeline/qa");
    expect(matchTask("explain Graphviz syntax", graph)).not.toContain("pipeline/qa");
    expect(matchTask("update the note renderer", graph, { files: ["src/lib/code-notes.ts"] })).toContain("pipeline/qa");
  });

  it("corrects stale broad graph QA triggers without requiring catalog reinitialization", () => {
    const graph = catalogGraph();
    graph.nodes.push(
      { ...makeSkillNode("pipeline/qa", 0.5), source: "catalog" as const, pack: "pipeline" as const, triggers: ["qa", "browser", "e2e", "click", "viz"] },
      { ...makeSkillNode("ui/review", 0.5), source: "catalog" as const, pack: "ui" as const, triggers: ["design", "review"] },
    );
    const result = matchTask("QA the browser e2e settings flow", graph);
    expect(result).toContain("ui/review");
    expect(result).not.toContain("pipeline/qa");
  });

  it("reduces optional always-on guidance for a real README typo", async () => {
    const graph = await currentCatalogGraph();
    const task = "fix a typo in README.md";
    const context = { phase: "implement" as const, files: ["README.md"] };
    const always = alwaysOnSkillIds(graph, task, context);
    expect(always).toEqual(expect.arrayContaining(["memory/graph", "pipeline/norms", "security/index"]));
    expect(always).not.toEqual(expect.arrayContaining([
      "optimizer/algorithm",
      "pipeline/systems",
      "pipeline/delivery",
      "ui/foundations",
    ]));
    expect(matchTask(task, graph, context)).not.toEqual(expect.arrayContaining([
      "optimizer/algorithm",
      "pipeline/systems",
      "pipeline/delivery",
      "ui/foundations",
    ]));

    const previousDefaults = ["memory/graph", "security/index", "pipeline/norms", "pipeline/systems", "pipeline/delivery", "optimizer/algorithm"];
    const tokenEstimate = async (ids: string[]) => {
      const contents = await Promise.all(ids.map(id => readFile(catalogFile(id), "utf8")));
      return Math.ceil(contents.join("\n").length / 3.5);
    };
    expect(await tokenEstimate(always)).toBeLessThan(await tokenEstimate(previousDefaults));
  });

  it.each([
    { task: "redesign the dashboard", files: ["src/components/Dashboard.tsx"], expected: "ui/foundations" },
    { task: "implement a concurrency algorithm", files: ["src/lib/queue/worker.ts"], expected: "optimizer/algorithm" },
    { task: "design a distributed service boundary", files: ["src/services/api.ts"], expected: "pipeline/systems" },
  ])("keeps optional guidance available for $task", async ({ task, files, expected }) => {
    const graph = await currentCatalogGraph();
    const context = { files, phase: "implement" as const };
    expect(alwaysOnSkillIds(graph, task, context)).toContain(expected);
    expect(matchTask(task, graph, context)).toContain(expected);
  });

  it("loads presentation guidance only when the user requests it", async () => {
    const graph = await currentCatalogGraph();
    expect(matchTask("write a concise review summary", graph, { phase: "review" })).toContain("optimizer/adhd");
    expect(matchTask("use optimizer/adhd for a terse response", graph, { phase: "review" })).toContain("optimizer/adhd");
    expect(matchTask("fix a typo in README.md", graph, { phase: "implement" })).not.toContain("optimizer/adhd");
  });

  it("loads systems guidance when the affected files reveal a service boundary", async () => {
    const graph = await currentCatalogGraph();
    expect(alwaysOnSkillIds(graph, "update the handler", { files: ["src/services/api.ts"] })).toContain("pipeline/systems");
  });

  it("honors an explicit skill request outside its phase-default pack", async () => {
    const graph = await currentCatalogGraph();
    expect(matchTask("load optimizer/algorithm", graph, { phase: "review" })).toContain("optimizer/algorithm");
  });

  it("detects UI work and loads the ui pack in every phase", () => {
    for (const phase of ["explore", "implement", "review", "ship"] as const) {
      expect(packsToLoad("make the landing page look better", phase).has("ui")).toBe(true);
    }
    expect(packsToLoad("fix the flaky retry queue worker", "implement").has("ui")).toBe(false);
    for (const task of ["run browser e2e tests", "click through the flow", "QA a visual page"]) {
      expect(packsToLoad(task, "review").has("ui")).toBe(true);
    }
    expect(packsToLoad("fix a typo", "implement", ["src/components/Button.tsx"]).has("ui")).toBe(true);
  });

  it("detects vibecoder UI phrasing across phases", () => {
    const tasks = [
      "redesign the settings screen",
      "the buttons look ugly",
      "add dark mode",
      "make the dashboard responsive on mobile",
      "polish the empty state",
      "fix the hover animation",
      "tweak the tailwind palette",
      "the nav sidebar overlaps the header",
      "match the figma screenshot",
      "improve accessibility and contrast",
    ];
    for (const task of tasks) {
      expect(packsToLoad(task, "explore").has("ui")).toBe(true);
    }
  });

  it("does not treat generic backend tasks as UI", () => {
    for (const task of ["add a retry queue worker", "migrate the postgres schema", "fix a memory leak in the parser"]) {
      expect(packsToLoad(task, "implement").has("ui")).toBe(false);
    }
  });

  it("selects ui guidance for look-and-feel tasks only", () => {
    const g = catalogGraph();
    g.nodes.push({
      ...makeSkillNode("ui/foundations", 0.6),
      source: "catalog" as const,
      pack: "ui" as const,
      triggers: ["ui", "design", "css", "layout", "landing", "page", "polish", "beautiful"],
    });
    expect(matchTask("make the landing page look better", g)).toContain("ui/foundations");
    expect(matchTask("fix the flaky retry queue worker", g)).not.toContain("ui/foundations");
  });

  it("always-on ui foundations ride along whenever UI work is detected", () => {
    const g = catalogGraph();
    g.nodes.push({
      ...makeSkillNode("ui/foundations", 0.6),
      source: "catalog" as const,
      pack: "ui" as const,
      always: true,
      triggers: ["ui", "design", "landing", "page"],
    });
    expect(alwaysOnSkillIds(g, "redesign the settings screen")).toContain("ui/foundations");
    expect(alwaysOnSkillIds(g, "fix the flaky retry queue worker")).not.toContain("ui/foundations");
  });
});



describe("shared phase classification", () => {
  it.each([
    ["inspect fixture staging", "review"],
    ["fix a typo", "implement"],
    ["understand conversion filenames", "explore"],
    ["debugging a parser", "implement"],
    ["verify the result", "review"],
    ["critique the architecture", "review"],
    ["patch an authz bug", "review"],
    ["shipping a release", "ship"],
  ])("classifies %s as %s", (task, phase) => {
    expect(getPhaseForTask(task)).toBe(phase);
  });
});

describe("file and lifecycle routing", () => {
  const graph: Graph = {
    nodes: [makeProjectNode(["typescript", "python"]), ...["typescript", "python", "go"].map(lang => ({ ...makeSkillNode(`code/${lang}`, 0.8), pack: "code" as const, langs: [lang], triggers: [lang] }))],
    edges: [],
  };

  it("focuses the code pack on the supplied file language", () => {
    expect(matchTask("update the handler", graph, { files: ["worker.py"] })).toEqual(["code/python"]);
    expect(matchTask("update the handler", graph, { files: ["service.go"] })).toEqual(["code/go"]);
  });

  it("applies phase filtering to unmatched stack defaults", () => {
    expect(matchTask("publish documentation", graph, { phase: "ship" })).toEqual([]);
    expect(matchTask("current changes", graph, { phase: "implement", files: ["worker.py"] })).toEqual(["code/python"]);
  });
});
