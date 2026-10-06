import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { attachCodeBodies, buildVizModel, type VizModel } from "./viz-model.js";

function codeNode(id: string) {
  return { id, title: id.split("/").pop() ?? id, type: "code" };
}

describe("buildVizModel", () => {
  it("top graph is our architecture, not a file hairball", () => {
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
    const titles = model.graphs.root.nodes.map((n) => n.title);
    expect(titles).toContain("Vault memory");
    expect(titles).toContain("Low-level architecture");
    expect(titles).toContain("High-level architecture");
    expect(titles).toContain("Data model (ERD)");
    expect(model.graphs.root.edges.length).toBeGreaterThanOrEqual(5);
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

  it("derives diag:high from the module graph with curated layers and counts", () => {
    const model = buildVizModel({
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
    const hla = model.docs["diag:high"].body;
    expect(hla).toContain("flowchart TB");
    expect(hla).toContain("Entry (CLI + MCP)<br/>3 files");
    expect(hla).toContain("Runtime<br/>2 files");
    expect(hla).toContain("Registry + Commands<br/>1 file");
    expect(hla).toContain("Vault + Index + Skill graph<br/>2 files");
    expect(hla).toContain("Worktrees + Toolchains<br/>2 files");
    expect(hla).toContain("Telemetry<br/>1 file");
    expect(hla).not.toContain("Installer");
    expect(hla).not.toContain("Rules engine");
    expect(hla).not.toContain("skills.sh");
    expect(hla).not.toContain("Orchestrator");
    expect(hla).not.toContain("Specialists");
    expect(hla).toContain("hla_entry --> hla_vault");
    expect(hla).toContain("hla_vault --> hla_runtime");
    expect(hla).not.toContain("hla_entry --> hla_entry");
    expect(hla).not.toContain("hla_worktree --> hla_worktree");
    expect((hla.match(/-->/g) ?? []).length).toBe(4);
    expect(hla).toContain("4 aggregated imports");
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

  it("connects architecture notes to their graphs and never leaves notes dangling", () => {
    const model = buildVizModel({
      slug: "s",
      vault: {
        nodes: [
          { id: "projects/s/watchdog/001.md", title: "Digest", type: "watchdog" },
          { id: "projects/s/architecture/high-level-architecture.md", title: "High-level architecture", type: "architecture" },
          { id: "projects/s/architecture/low-level-architecture.md", title: "Low-level architecture", type: "architecture" },
          { id: "projects/s/architecture/data-model-erd.md", title: "Data model (ERD)", type: "architecture" },
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
    expect(g.edges).toEqual(
      expect.arrayContaining([
        { from: high, to: "diag:high", type: "shows" },
        { from: low, to: "arch:impl", type: "shows" },
        { from: erd, to: "diag:erd", type: "shows" },
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
