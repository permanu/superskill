import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  attachCodeBodies,
  buildVizModel,
  findImportCycles,
  resolveRuleRelated,
  RULE_BODY_MAX_CHARS,
  MERMAID_INIT,
  type VizModel,
} from "./viz-model.js";

function codeNode(id: string) {
  return { id, title: id.split("/").pop() ?? id, type: "code" };
}

describe("buildVizModel", () => {
  it("first view is the retrieval graph, not a duplicate of the tabs", () => {
    const model = buildVizModel({
      slug: "superskill",
      vault: {
        nodes: [{ id: "projects/s/context.md", title: "SuperSkill", type: "context" }],
        edges: [],
      },
      docs: [{ id: "projects/s/context.md", title: "SuperSkill", type: "context", body: "hello vault" }],
      code: {
        nodes: [
          { id: "src/commands/write.ts", title: "write.ts", type: "code" },
          { id: "src/lib/vault-fs.ts", title: "vault-fs.ts", type: "code" },
        ],
        edges: [{ from: "src/commands/write.ts", to: "src/lib/vault-fs.ts", type: "import" }],
      },
    });
    const root = model.graphs.root;
    const titles = root.nodes.map((n) => n.title);
    expect(titles).toEqual(
      expect.arrayContaining([
        "Agent task",
        "Router",
        "Packs / skills",
        "Rules engine",
        "Content loader",
        "Agent context",
        "FTS5 + edges",
        "Session / learn write-back",
        "Vault memory",
      ]),
    );
    const ids = root.nodes.map((n) => n.id);
    for (const artifact of ["diag:high", "diag:low", "diag:erd", "arch:impl", "arch:catalog", "arch:router"]) {
      expect(ids).not.toContain(artifact);
    }
    expect(root.nodes.find((n) => n.id === "arch:vault")?.open).toEqual({ kind: "graph", id: "vault" });
    expect(root.nodes.find((n) => n.id === "ret:rules")?.open).toEqual({ kind: "graph", id: "rules" });
    expect(root.edges).toEqual(
      expect.arrayContaining([
        { from: "ret:task", to: "ret:router", type: "task text" },
        { from: "ret:router", to: "ret:packs", type: "pack set" },
        { from: "ret:packs", to: "ret:loader", type: "top-k skills" },
        { from: "ret:rules", to: "ret:loader", type: "harness rules" },
        { from: "ret:loader", to: "ret:context", type: "brief + rules \u2264 budget" },
        { from: "ret:index", to: "ret:router", type: "search hits" },
        { from: "arch:vault", to: "ret:index", type: "rebuild" },
        { from: "ret:context", to: "ret:writeback", type: "outcome" },
        { from: "ret:writeback", to: "arch:vault", type: "markdown" },
      ]),
    );
    expect(root.edges).toHaveLength(9);
    for (const e of root.edges) expect(e.type.trim().length).toBeGreaterThan(0);
    expect(model.docs["view:root"].body).toContain("token");
    expect(model.graphs.vault.nodes[0].title).toBe("SuperSkill");
    expect(model.graphs.vault.nodes[0].open).toEqual({ kind: "doc", id: "projects/s/context.md" });
    expect(model.docs["projects/s/context.md"].body).toContain("hello vault");
    expect(model.docs["arch:index"].body).toContain("hello vault");
    expect(model.docs["arch:vault"].body).toContain("What is stored here");
    expect(model.graphs.impl.nodes.some((n) => n.title === "Commands")).toBe(true);
    expect(model.graphs.impl.nodes.some((n) => n.title === "Libraries")).toBe(true);
    expect(model.graphs["mod:src/commands"].nodes.some((n) => n.title === "write")).toBe(true);
    expect(model.docs["diag:high"].body).toContain("flowchart TB");
  });

  it("derives a C4-style diag:high with boundary, externals, and counts", () => {
    const build = () =>
      buildVizModel({
        slug: "s",
        vault: { nodes: [], edges: [] },
        docs: [],
        code: {
          nodes: [
            codeNode("src/main.ts"),
            codeNode("src/cli.ts"),
            codeNode("src/mcp-server.ts"),
            codeNode("src/app-context.ts"),
            codeNode("src/config.ts"),
            codeNode("src/commands/write.ts"),
            codeNode("src/lib/vault-fs.ts"),
            codeNode("src/lib/graph/router.ts"),
            codeNode("src/lib/worktree/activate.ts"),
            codeNode("src/lib/worktree/env.ts"),
            codeNode("src/lib/worktree/activate.test.ts"),
            codeNode("src/telemetry/recorder.ts"),
          ],
          edges: [
            { from: "src/main.ts", to: "src/cli.ts", type: "import" },
            { from: "src/main.ts", to: "src/lib/vault-fs.ts", type: "import" },
            { from: "src/commands/write.ts", to: "src/lib/vault-fs.ts", type: "import" },
            { from: "src/commands/write.ts", to: "src/telemetry/recorder.ts", type: "import" },
            { from: "src/lib/worktree/activate.ts", to: "src/lib/worktree/env.ts", type: "import" },
            { from: "src/lib/graph/router.ts", to: "src/app-context.ts", type: "import" },
          ],
        },
      });
    const hla = build().docs["diag:high"].body;
    expect(hla).toContain("flowchart TB");
    expect(hla).toContain(MERMAID_INIT);
    expect(hla).toContain("accTitle: Container diagram for SuperSkill");
    expect(hla).toContain("accDescr:");
    expect(hla).toContain('["SuperSkill (system)"]');
    expect(hla).toContain("Human operator");
    expect(hla).toContain("Coding agent (LLM)");
    expect(hla).toContain("skills.sh (audit source)");
    expect(hla).toContain("Git repo (code under analysis)");
    expect(hla).toContain("Entry (CLI + MCP)<br/>[Container]");
    expect(hla).toContain("Registry + Commands<br/>[Container]");
    expect(hla).toContain("Vault + Index + Skill graph<br/>[Container]");
    expect(hla).toContain("Telemetry<br/>[Container]");
    expect(hla).not.toContain("Installer<br/>[Container]");
    expect(hla).not.toContain("Rules engine + harness<br/>[Container]");
    expect(hla).not.toContain("skills.sh client —");
    for (const label of ["task", "tools", "audit data", "source files", "brief + rules", "notes + diagrams"]) {
      expect(hla).toContain(`-->|"${label}"|`);
    }
    expect(hla).toContain("| C:entry | C:vault | 1 import | 1 |");
    expect(hla).toContain("| C:registry | C:vault | 1 import | 1 |");
    expect(hla).toContain("| C:registry | C:telemetry | 1 import | 1 |");
    expect(hla).toContain("| C:vault | C:runtime | 1 import | 1 |");
    expect(hla).toContain("4 aggregated imports");
    expect(hla).toContain("### Ids");
    expect(hla).toContain("| mermaid | id |");
    expect(hla).toContain("| id | name | path / notes |");
    expect(hla).toContain("| from | to | label | count |");
    expect(hla).toMatch(/\| n\d+ \| C:entry \|/);
    expect(hla).toContain("3 files");
    expect(hla).not.toContain("1 files");
    expect(build().docs["diag:high"].body).toBe(hla);
  });

  it("labels modules by subsystem instead of raw paths", () => {
    const model = buildVizModel({
      slug: "s",
      vault: { nodes: [], edges: [] },
      docs: [],
      code: {
        nodes: [
          codeNode("src/lib/worktree/activate.ts"),
          codeNode("src/lib/worktree/env.ts"),
          codeNode("src/lib/codegraph/scan.ts"),
          codeNode("src/rules/harness/c.ts"),
          codeNode("src/telemetry/recorder.ts"),
        ],
        edges: [],
      },
    });
    const titles = model.graphs.impl.nodes.map((n) => n.title);
    expect(titles).toContain("worktree · lib");
    expect(titles).toContain("codegraph · lib");
    expect(titles).toContain("harness · rules");
    expect(titles).toContain("Telemetry");
    expect(model.graphs["mod:src/lib/worktree"].title).toBe("worktree · lib");
  });

  it("gives modules compound layer parents and counted import edges", () => {
    const model = buildVizModel({
      slug: "s",
      vault: { nodes: [], edges: [] },
      docs: [],
      code: {
        nodes: [
          codeNode("src/commands/write.ts"),
          codeNode("src/lib/vault-fs.ts"),
          codeNode("src/lib/graph/router.ts"),
          codeNode("src/telemetry/recorder.ts"),
        ],
        edges: [
          { from: "src/commands/write.ts", to: "src/lib/vault-fs.ts", type: "import" },
          { from: "src/commands/write.ts", to: "src/lib/graph/router.ts", type: "import" },
          { from: "src/commands/write.ts", to: "src/telemetry/recorder.ts", type: "import" },
        ],
      },
    });
    const impl = model.graphs.impl;
    expect(impl.nodes.find((n) => n.id === "layer:vault")?.title).toBe("Vault + Index + Skill graph");
    expect(impl.nodes.find((n) => n.id === "layer:registry")?.title).toBe("Registry + Commands");
    expect(impl.nodes.find((n) => n.id === "layer:telemetry")?.title).toBe("Telemetry");
    expect(impl.nodes.find((n) => n.id === "mod:src/lib")?.parent).toBe("layer:vault");
    expect(impl.nodes.find((n) => n.id === "mod:src/lib/graph")?.parent).toBe("layer:vault");
    expect(impl.nodes.find((n) => n.id === "mod:src/commands")?.parent).toBe("layer:registry");
    expect(impl.nodes.find((n) => n.id === "mod:src/telemetry")?.parent).toBe("layer:telemetry");
    const order = impl.nodes.map((n) => n.id);
    expect(order.indexOf("layer:registry")).toBeLessThan(order.indexOf("mod:src/commands"));
    const edge = impl.edges.find((e) => e.from === "mod:src/commands" && e.to === "mod:src/lib");
    expect(edge?.type).toBe("imports");
    expect(edge?.label).toBe("1 import");
    for (const e of impl.edges) expect(e.label).toMatch(/^[1-9]\d* imports?$/);
    expect(impl.edges).toHaveLength(3);
  });

  it("builds a component-style diag:low with fan-in/out, direction legend, and id tables", () => {
    const model = buildVizModel({
      slug: "s",
      vault: { nodes: [], edges: [] },
      docs: [],
      code: {
        nodes: [
          codeNode("src/commands/write.ts"),
          codeNode("src/lib/vault-fs.ts"),
          codeNode("src/lib/graph/router.ts"),
        ],
        edges: [
          { from: "src/commands/write.ts", to: "src/lib/vault-fs.ts", type: "import" },
          { from: "src/lib/graph/router.ts", to: "src/lib/vault-fs.ts", type: "import" },
          { from: "src/commands/write.ts", to: "src/lib/graph/router.ts", type: "import" },
        ],
      },
    });
    const low = model.docs["diag:low"].body;
    expect(low).toContain(MERMAID_INIT);
    expect(low).toContain("accTitle: Module dependency diagram for the SuperSkill implementation");
    expect(low).toContain("accDescr:");
    expect(low).toContain("A -->|imports ×N| B");
    expect(low).toContain("dependent → dependency");
    expect(low).toContain("in:");
    expect(low).toContain("out:");
    expect(low).toContain("| id | name | path / notes | fan-in | fan-out |");
    expect(low).toMatch(/\| mod:src\/lib \| Libraries \| module folder \| 2 \| 0 \|/);
    expect(low).toContain("### Ids");
    expect(low).toContain("| from | to | label | count |");
    expect(low).toContain("imports ×1");
    expect(low).toContain("No module-level import cycles detected.");
    expect(low).toContain("classDef cycle");
  });

  it("detects import cycles with Tarjan SCCs and flags them in diag:low", () => {
    expect(findImportCycles([])).toEqual([]);
    expect(findImportCycles([{ from: "a", to: "b" }])).toEqual([]);
    expect(findImportCycles([{ from: "a", to: "b" }, { from: "b", to: "a" }])).toEqual([["a", "b"]]);
    expect(findImportCycles([{ from: "a", to: "a" }])).toEqual([["a"]]);
    expect(
      findImportCycles([
        { from: "b", to: "c" },
        { from: "c", to: "a" },
        { from: "a", to: "b" },
        { from: "c", to: "d" },
      ]),
    ).toEqual([["a", "b", "c"]]);

    const model = buildVizModel({
      slug: "s",
      vault: { nodes: [], edges: [] },
      docs: [],
      code: {
        nodes: [codeNode("src/lib/codegraph/a.ts"), codeNode("src/lib/codegraph/extractors/b.ts")],
        edges: [
          { from: "src/lib/codegraph/a.ts", to: "src/lib/codegraph/extractors/b.ts", type: "import" },
          { from: "src/lib/codegraph/extractors/b.ts", to: "src/lib/codegraph/a.ts", type: "import" },
        ],
      },
    });
    const low = model.docs["diag:low"].body;
    expect(low).toContain(
      "⚠ cycle: mod:src/lib/codegraph → mod:src/lib/codegraph/extractors → mod:src/lib/codegraph",
    );
    expect(low).toMatch(/class n\d+,n\d+ cycle;/);
    expect(low).toContain("linkStyle");
    expect(low).toContain("Hygiene + Watchdog + Codegraph ⚠ 2");
    expect(low).toContain("Cycle members by layer: Hygiene + Watchdog + Codegraph 2");
  });

  it("publishes a two-level DFD with real token budgets", () => {
    const model = buildVizModel({
      slug: "s",
      vault: { nodes: [], edges: [] },
      docs: [],
      code: { nodes: [], edges: [] },
    });
    const flow = model.docs["diag:flow"];
    expect(flow.title).toBe("Dataflow");
    const blocks = flow.body
      .split("```mermaid")
      .slice(1)
      .map((s) => s.split("```")[0]);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toContain("accTitle: Level 0 data flow diagram for SuperSkill");
    expect(blocks[0]).toContain("accDescr:");
    expect(blocks[0]).toContain('(("0 SuperSkill"))');
    expect(blocks[0]).not.toContain("D1");
    expect(blocks[1]).toContain("accTitle: Level 1 data flow diagram for SuperSkill");
    expect(blocks[1]).toContain('(("1 Route task"))');
    expect(blocks[1]).toContain('(("2 Load brief"))');
    expect(blocks[1]).toContain('(("3 Write memory"))');
    expect(blocks[1]).toContain('(("4 Install & audit skills"))');
    expect(blocks[1]).toContain("D1 vault markdown");
    expect(blocks[1]).toContain("D2 FTS5 + edges index");
    expect(blocks[1]).toContain("D3 .superskill/graph.json");
    expect(blocks[1]).toContain("shape: datastore");
    for (const label of [
      "task text",
      "matched skills",
      "note markdown",
      "activation + outcome",
      "audit verdict",
      "skill content",
      "brief + rules ≤ 19,200 tokens (implement cap)",
    ]) {
      expect(blocks[1]).toContain(label);
    }
    expect(blocks[1]).not.toMatch(/^\s*n\d+\{/m);
    expect(blocks[0]).not.toMatch(/^\s*n\d+\{/m);
    for (const ext of ["Coding agent (LLM)", "Git repo", "Human operator", "skills.sh"]) {
      expect(blocks[0]).toContain(ext);
      expect(blocks[1]).toContain(ext);
    }
    expect(flow.body).toContain("### Ids");
    expect(flow.body).toContain("| from | to | label | count |");
    expect(flow.body).toContain(MERMAID_INIT);
    expect(flow.body).toContain("getPhaseBudget()");
    expect(flow.body).toContain("src/lib/context-budget.ts");
    expect(flow.body).toContain("19,200");
    expect(flow.body).toContain("INDEX ≈ 50");
    expect(flow.body).toContain("NEIGHBORHOOD ≈ 150");
    expect(flow.body).toContain("CONTENT 500–2,000");
    expect(flow.body).toContain("200–500 tokens");
    expect(flow.body).toContain("src/lib/graph/router.ts");
  });

  it("generates byte-identical docs for identical input", () => {
    const build = () =>
      buildVizModel({
        slug: "s",
        vault: { nodes: [], edges: [] },
        docs: [],
        code: {
          nodes: [codeNode("src/lib/vault-fs.ts"), codeNode("src/commands/write.ts")],
          edges: [{ from: "src/commands/write.ts", to: "src/lib/vault-fs.ts", type: "import" }],
        },
      });
    const a = build();
    const b = build();
    expect(b.docs["diag:high"].body).toBe(a.docs["diag:high"].body);
    expect(b.docs["diag:low"].body).toBe(a.docs["diag:low"].body);
    expect(b.docs["diag:flow"].body).toBe(a.docs["diag:flow"].body);
    expect(JSON.stringify(b.graphs.rules)).toBe(JSON.stringify(a.graphs.rules));
    const ruleId = Object.keys(a.docs).find((k) => k.startsWith("rule:"));
    expect(ruleId).toBeTruthy();
    expect(b.docs[ruleId!].body).toBe(a.docs[ruleId!].body);
  });

  it("connects architecture notes to their graphs and never leaves notes dangling", () => {
    const model = buildVizModel({
      slug: "s",
      vault: {
        nodes: [
          { id: "projects/s/watchdog/001.md", title: "Digest", type: "watchdog" },
          { id: "projects/s/architecture/high-level-architecture.md", title: "High-level architecture", type: "architecture" },
          { id: "projects/s/architecture/low-level-architecture.md", title: "Low-level architecture", type: "architecture" },
          { id: "projects/s/architecture/data-model-erd.md", title: "Data model (ERD)", type: "architecture" },
          { id: "projects/s/architecture/dataflow.md", title: "Dataflow", type: "architecture" },
        ],
        edges: [],
      },
      docs: [],
      code: { nodes: [], edges: [] },
    });
    const g = model.graphs.vault;
    const high = "projects/s/architecture/high-level-architecture.md";
    const low = "projects/s/architecture/low-level-architecture.md";
    const erd = "projects/s/architecture/data-model-erd.md";
    const flow = "projects/s/architecture/dataflow.md";
    expect(g.edges).toEqual(
      expect.arrayContaining([
        { from: high, to: "diag:high", type: "shows" },
        { from: low, to: "arch:impl", type: "shows" },
        { from: erd, to: "diag:erd", type: "shows" },
        { from: flow, to: "diag:flow", type: "shows" },
        { from: "projects/s/watchdog/001.md", to: "arch:vault", type: "stored in" },
      ]),
    );
    const impl = g.nodes.find((n) => n.id === "arch:impl");
    expect(impl?.open).toEqual({ kind: "graph", id: "impl" });
    for (const n of g.nodes) {
      expect(g.edges.some((e) => e.from === n.id || e.to === n.id)).toBe(true);
    }
  });

  it("keeps note links and anchors orphan notes to the vault", () => {
    const model = buildVizModel({
      slug: "s",
      vault: {
        nodes: [
          { id: "projects/s/a.md", title: "Auth", type: "adr" },
          { id: "projects/s/b.md", title: "Learn", type: "learning" },
          { id: "projects/s/c.md", title: "Digest", type: "watchdog" },
        ],
        edges: [{ from: "projects/s/a.md", to: "projects/s/b.md", type: "related" }],
      },
      docs: [],
      code: { nodes: [], edges: [] },
    });
    const g = model.graphs.vault;
    expect(g.edges).toContainEqual({ from: "projects/s/a.md", to: "projects/s/b.md", type: "related" });
    expect(g.edges).toContainEqual({ from: "projects/s/c.md", to: "arch:vault", type: "stored in" });
    expect(g.edges.length).toBe(2);
    expect(g.nodes.some((n) => n.id === "arch:vault")).toBe(true);
    for (const n of g.nodes) {
      expect(g.edges.some((e) => e.from === n.id || e.to === n.id)).toBe(true);
    }
  });

  it("attaches a tinted legend for the types actually present", () => {
    const model = buildVizModel({
      slug: "s",
      vault: {
        nodes: [
          { id: "projects/s/a.md", title: "Auth", type: "adr" },
          { id: "projects/s/c.md", title: "Digest", type: "weird_type" },
        ],
        edges: [],
      },
      docs: [],
      code: { nodes: [codeNode("src/lib/vault-fs.ts")], edges: [] },
    });
    expect(model.legend).toBeDefined();
    const types = model.legend?.types ?? [];
    expect(types.find((t) => t.type === "architecture")?.color).toBe("#7aa2f7");
    expect(types.some((t) => t.type === "module")).toBe(true);
    expect(types.some((t) => t.type === "adr")).toBe(true);
    expect(types.some((t) => t.type === "weird_type")).toBe(true);
    for (const t of types) {
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.color).toMatch(/^#[0-9a-f]{6}$/);
      const hex = t.color.slice(1);
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
      expect(new Set([r, g, b]).size).toBeGreaterThan(1);
    }
    const legacy: VizModel = { root: "root", graphs: {}, docs: {} };
    expect(legacy.legend).toBeUndefined();
  });
});

describe("attachCodeBodies", () => {
  it("keeps the head and truncates long files with a note", () => {
    const dir = mkdtempSync(join(tmpdir(), "viz-body-"));
    try {
      mkdirSync(join(dir, "src/lib"), { recursive: true });
      const big = Array.from({ length: 200 }, (_, i) => `export const v${i} = ${i};`).join("\n");
      writeFileSync(join(dir, "src/lib/big.ts"), big);
      const wide = Array.from({ length: 10 }, () => "x".repeat(400)).join("\n");
      writeFileSync(join(dir, "src/lib/wide.ts"), wide);
      const small = ["export const a = 1;", "export const b = 2;", "export const c = 3;"].join("\n");
      writeFileSync(join(dir, "src/lib/small.ts"), small);

      const model = buildVizModel({
        slug: "s",
        vault: { nodes: [], edges: [] },
        docs: [],
        code: {
          nodes: [codeNode("src/lib/big.ts"), codeNode("src/lib/wide.ts"), codeNode("src/lib/small.ts")],
          edges: [],
        },
      });
      attachCodeBodies(model, dir, (abs) => readFileSync(abs, "utf-8"));

      const bigBody = model.docs["src/lib/big.ts"].body;
      expect(bigBody).toContain("export const v0 = 0;");
      expect(bigBody).not.toContain("export const v199 = 199;");
      expect(bigBody).toContain("truncated: first 60 of 200 lines");
      expect(bigBody.split("\n").length).toBeLessThan(70);

      const wideBody = model.docs["src/lib/wide.ts"].body;
      expect(wideBody).toContain("truncated: first 5 of 10 lines");
      expect(wideBody.length).toBeLessThan(2300);

      const smallBody = model.docs["src/lib/small.ts"].body;
      expect(smallBody).toContain("export const c = 3;");
      expect(smallBody).not.toContain("truncated");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("rules library", () => {
  const emptyBuild = () =>
    buildVizModel({
      slug: "s",
      vault: { nodes: [], edges: [] },
      docs: [],
      code: { nodes: [], edges: [] },
    });

  it("nests languages → prefixes → rules with counts, related edges, and catalog wiring", () => {
    const model = emptyBuild();
    const root = model.graphs.rules;
    expect(root.title).toBe("Rules library");
    const langs = root.nodes.filter((n) => n.id.startsWith("rules:"));
    expect(langs.length).toBeGreaterThanOrEqual(8);
    for (const lang of langs) {
      expect(lang.type).toBe("rules");
      expect(lang.open?.kind).toBe("graph");
      expect(lang.title).toMatch(/·\s*\d+\s*rules?$/);
    }

    const rust = root.nodes.find((n) => n.id === "rules:rust");
    const rustCount = Number(rust?.title.match(/·\s*(\d+)\s*rules/)?.[1]);
    expect(rustCount).toBeGreaterThan(200);
    expect(model.graphs["rules:rust"].nodes.length).toBeGreaterThan(10);

    const prefixNode = model.graphs["rules:rust"].nodes[0];
    expect(prefixNode.id.startsWith("rules:rust/")).toBe(true);
    expect(prefixNode.open?.kind).toBe("graph");
    const prefixGraph = model.graphs[prefixNode.id];
    expect(prefixGraph.nodes.length).toBeGreaterThan(0);
    expect(prefixGraph.nodes.every((n) => n.id.startsWith("rule:") && n.type === "rule")).toBe(true);
    const prefixCount = Number(prefixNode.title.match(/·\s*(\d+)/)?.[1]);
    expect(prefixCount).toBe(prefixGraph.nodes.length);

    const ruleDoc = model.docs[prefixGraph.nodes[0].id];
    expect(ruleDoc?.type).toBe("rule");
    expect(ruleDoc?.body).toContain("- path: `catalog/rules/rust/");
    expect(ruleDoc?.body).toContain("- severity:");
    expect(ruleDoc?.body).toContain("bytes");
    expect(ruleDoc?.body).toContain("- triggers:");

    const anyRelated = Object.entries(model.graphs).some(
      ([id, g]) => id.startsWith("rules:") && g.edges.some((e) => e.type === "related"),
    );
    expect(anyRelated).toBe(true);
    const containerEdges = Object.entries(model.graphs)
      .filter(([id]) => /^rules:[^/]+$/.test(id))
      .flatMap(([, g]) => g.edges);
    expect(containerEdges.length).toBeGreaterThan(0);
    expect(containerEdges.every((e) => /links?$/.test(e.label ?? ""))).toBe(true);
    expect(root.edges.every((e) => /links?$/.test(e.label ?? ""))).toBe(true);

    const catalogGraph = model.graphs.catalog;
    const linkEdge = catalogGraph.edges.find((e) => e.from === "catalog:code/rust.md" && e.to === "rules:rust");
    expect(linkEdge?.type).toBe("rules");
    expect(catalogGraph.nodes.find((n) => n.id === "rules:rust")?.open).toEqual({ kind: "graph", id: "rules:rust" });

    expect(model.docs["view:rules"].body).toContain("task → pack → language → prefix → rule");
    expect(model.docs["view:rules"].body).toContain("graph resolve");
    expect(model.docs["ret:rules"].body).toContain("graph resolve / children / open");
  });

  it("caps embedded rule bodies and keeps related links resolvable", () => {
    const model = emptyBuild();
    const ruleDocs = Object.entries(model.docs).filter(([, d]) => d.type === "rule");
    expect(ruleDocs.length).toBeGreaterThan(2000);
    const truncated = ruleDocs.filter(([, d]) => d.body.includes("excerpt: code samples shortened"));
    expect(truncated.length).toBeGreaterThan(0);
    for (const [, d] of ruleDocs) {
      expect(d.body.length).toBeLessThanOrEqual(RULE_BODY_MAX_CHARS + 800);
    }

    const withRelated = ruleDocs.find(([, d]) => (d.related ?? []).length > 0);
    expect(withRelated).toBeTruthy();
    for (const rid of withRelated![1].related ?? []) {
      expect(model.docs[rid]?.type).toBe("rule");
    }

    expect(resolveRuleRelated(["a", "b", "a"], new Set(["a"]))).toEqual({ known: ["a"], skipped: 1 });
    expect(resolveRuleRelated([], new Set(["a"]))).toEqual({ known: [], skipped: 0 });
    expect(resolveRuleRelated([" z ", "z"], new Set(["z"]))).toEqual({ known: ["z"], skipped: 0 });
  });
});
