import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { KnowledgeIndex } from "./knowledge-index.js";
import {
  GENERATED_MARKER,
  renderArchitectureDiagramsHtml,
  renderKnowledgeGraphHtml,
  renderObsidianCanvas,
  writeKnowledgeGraphFiles,
} from "./knowledge-viz.js";
import { buildVizModel, type VizModel } from "./viz-model.js";

function modelFrom(index: KnowledgeIndex): VizModel {
  return buildVizModel({
    slug: "p",
    vault: index.graphDump(),
    docs: index.noteDocs(),
    code: { nodes: [], edges: [] },
  });
}

describe("knowledge viz renderers", () => {
  let dir: string;
  let index: KnowledgeIndex;

  beforeEach(async () => {
    dir = join(tmpdir(), `kv-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(dir, { recursive: true });
    index = KnowledgeIndex.open(join(dir, "index.sqlite"));
    index.upsert({
      path: "projects/p/a.md",
      type: "adr",
      title: "Auth",
      body: "auth",
      related: ["projects/p/b.md"],
    });
    index.upsert({
      path: "projects/p/b.md",
      type: "learning",
      title: "Learn",
      body: "learn",
      related: [],
    });
  });

  afterEach(() => {
    index.close();
    return rm(dir, { recursive: true, force: true });
  });

  it("loads cytoscape + elk from CDN and ships a readable fallback", () => {
    const html = renderKnowledgeGraphHtml(modelFrom(index));
    expect(html).toContain("cytoscape@3.34.3");
    expect(html).toContain("cytoscape-elk@2.3.0");
    expect(html).toContain("elk.bundled.js");
    expect(html).not.toContain("vis-network");
    expect(html).toContain("Graph libraries did not load");
    expect(html).toContain("Space Grotesk");
    expect(html).toContain("JetBrains Mono");
    expect(html).toContain("prefers-reduced-motion");
    expect(html).toContain('"rowOdd":"#1b2029"');
  });

  it("embeds the drill-down model and navigation", () => {
    const html = renderKnowledgeGraphHtml(modelFrom(index));
    expect(html).toContain("Vault memory");
    expect(html).toContain("Auth");
    expect(html).toContain("data-qa");
    expect(html).toContain('data-qa="nav"');
    expect(html).toContain('data-view="hla"');
    expect(html).toContain('data-view="erd"');
    expect(html).toContain('data-view="flow"');
    expect(html).toContain('data-view="rules"');
    expect(html).toContain('key === "r") go("rules")');
    expect(html).toContain(">Retrieval<");
    expect(html).toContain("mermaid.min.js");
    expect(html).toContain("mermaid.render");
    expect(html).toContain("extractMermaids");
    expect(html).toContain("stripMermaids");
    expect(html).not.toContain("<script>alert");
  });

  it("renders the retrieval graph with labeled edges, compound layers, and the inline icon", () => {
    const model = modelFrom(index);
    const html = renderKnowledgeGraphHtml(model);
    const rootTitles = model.graphs.root.nodes.map((n) => n.title);
    expect(rootTitles).toContain("Agent task");
    expect(rootTitles).toContain("Content loader");
    expect(rootTitles).toContain("Vault memory");
    expect(rootTitles).not.toContain("High-level architecture");
    expect(rootTitles).not.toContain("Modules");
    for (const label of ["task text", "pack set", "top-k skills", "search hits", "outcome", "markdown"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain("brief + rules \u2264 budget");
    expect(html).toContain("s-dim");
    expect(html).toContain("node.s-dim");
    expect(html).toContain("node.parent-node");
    expect(html).toContain("elk.hierarchyHandling");
    expect(html).toContain("rel=\"icon\"");
    expect(html).toContain("data:image/svg+xml;utf8,");
    expect(html).toContain("M256 30");
    expect(html).toContain('width="30"');
    expect(html).not.toContain("<img");
  });

  it("tunes ELK layout and edge styling for readability", () => {
    const html = renderKnowledgeGraphHtml(modelFrom(index));
    for (const token of [
      '"elk.edgeRouting": "ORTHOGONAL"',
      '"elk.layered.mergeEdges": true',
      '"elk.layered.crossingMinimization.strategy": "LAYER_SWEEP"',
      '"elk.layered.spacing.edgeNodeBetweenLayers": 24',
      '"elk.spacing.nodeNode": 40',
      '"elk.layered.spacing.nodeNodeBetweenLayers": 72',
      '"curve-style": "taxi"',
      '"taxi-direction": "rightward"',
      '"line-color": "data(ecolor)"',
      "edgeColorOf",
      "EDGE_COLORS",
      "denseLabels",
    ]) {
      expect(html).toContain(token);
    }
  });

  it("renders the Rules view with nesting, jump support, and the reading doc", () => {
    const model = modelFrom(index);
    const html = renderKnowledgeGraphHtml(model);
    expect(html).toContain("Rules library");
    expect(html).toContain("jumpToNode");
    expect(html).toContain("data-jump");
    expect(html).toContain("Related <span");
    expect(html).toContain("graph resolve");
    expect(model.graphs["rules:rust"]).toBeTruthy();
    expect(Object.keys(model.graphs).some((k) => k.startsWith("rules:rust/"))).toBe(true);
    expect(model.graphs.catalog.nodes.some((n) => n.id === "rules:rust")).toBe(true);
    const ruleDoc = Object.entries(model.docs).find(
      ([k, d]) => k.startsWith("rule:") && (d.related ?? []).length > 0,
    );
    expect(ruleDoc).toBeTruthy();
  });

  it("uses model.legend when present and built-in type colors when absent", () => {
    const model = modelFrom(index);
    const arch = model.legend?.types.find((entry) => entry.type === "architecture");
    expect(arch).toBeTruthy();
    const withLegend = renderKnowledgeGraphHtml(model);
    expect(withLegend).toContain('"architecture"');
    expect(withLegend).toContain(arch!.color);

    const bare = { ...model } as Record<string, unknown>;
    delete bare.legend;
    const base = renderKnowledgeGraphHtml(bare as unknown as VizModel);
    expect(base).toContain("#8ab4f8");

    const custom = Object.assign({}, model, {
      legend: { types: [{ type: "adr", label: "Decision record", color: "#ff00aa" }] },
    });
    const html = renderKnowledgeGraphHtml(custom as unknown as VizModel);
    expect(html).toContain('"label":"Decision record"');
    expect(html).toContain("#ff00aa");
  });

  it("keeps Mermaid on the diagrams page with the shared palette", () => {
    const model = modelFrom(index);
    model.docs["diag:low"] = {
      title: "Low-level architecture",
      type: "architecture",
      body: "```mermaid\nflowchart LR\n  A[Program] --> B[Vault]\n```\n",
    };
    const diagrams = renderArchitectureDiagramsHtml(model);
    expect(diagrams).toContain('class="mermaid"');
    expect(diagrams).toContain("flowchart");
    expect(diagrams).toContain("erDiagram");
    expect(diagrams).toContain("Space Grotesk");
    expect(diagrams).toContain("--accent: #e8b268");
    expect(diagrams).toContain('"rowOdd":"#1b2029"');
    expect(diagrams).toContain("knowledge-graph.html");
  });

  it("adds a two-level dataflow section and the inline icon to the diagrams page", () => {
    const model = modelFrom(index);
    expect(model.docs["diag:flow"]).toBeTruthy();
    const diagrams = renderArchitectureDiagramsHtml(model);
    expect(diagrams).toContain("Dataflow");
    expect(diagrams).toContain("task text");
    expect(diagrams).toContain("matched skills");
    expect(diagrams).toContain("skill content");
    expect(diagrams).toContain("skills.sh");
    expect(diagrams).toContain("0 SuperSkill");
    expect(diagrams).toContain("1 Route task");
    expect(diagrams).toContain("accTitle: Level 0 data flow diagram for SuperSkill");
    expect(diagrams).toContain("accTitle: Level 1 data flow diagram for SuperSkill");
    expect(diagrams).toContain("19,200");
    expect((diagrams.match(/class="mermaid"/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(diagrams).toContain("rel=\"icon\"");
    expect(diagrams).toContain("data:image/svg+xml;utf8,");
    expect(diagrams).toContain("M256 30");
    expect(diagrams).not.toContain("<img");
  });

  it("pins HLA, LLA, ERD, and dataflow on the Obsidian canvas", () => {
    const arch = [
      { file: "projects/p/architecture/high-level-architecture.md", color: "5" },
      { file: "projects/p/architecture/low-level-architecture.md", color: "1" },
      { file: "projects/p/architecture/data-model-erd.md", color: "4" },
      { file: "projects/p/architecture/dataflow.md", color: "6" },
    ];
    const canvas = JSON.parse(renderObsidianCanvas(index.graphDump(), arch));
    const files = canvas.nodes.map((n: { file: string }) => n.file);
    expect(files).toEqual(
      expect.arrayContaining([
        "projects/p/architecture/high-level-architecture.md",
        "projects/p/architecture/low-level-architecture.md",
        "projects/p/architecture/data-model-erd.md",
        "projects/p/architecture/dataflow.md",
        "projects/p/a.md",
        "projects/p/b.md",
      ]),
    );
    expect(canvas.edges.some((e: { fromNode: string; toNode: string }) =>
      e.fromNode.includes("high-level") && e.toNode.includes("low-level"),
    )).toBe(true);
  });
});

describe("writeKnowledgeGraphFiles marker guard", () => {
  const HLA = "projects/p/architecture/high-level-architecture.md";
  const LLA = "projects/p/architecture/low-level-architecture.md";
  const ERD = "projects/p/architecture/data-model-erd.md";
  const FLOW = "projects/p/architecture/dataflow.md";
  let vault: string;

  beforeEach(async () => {
    vault = join(tmpdir(), `kv-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(join(vault, "projects", "p"), { recursive: true });
    await writeFile(
      join(vault, "projects", "p", "context.md"),
      "---\ntype: context\n---\n\n# Demo\n\nhello from the vault\n",
      "utf-8",
    );
  });

  afterEach(() => rm(vault, { recursive: true, force: true }));

  it("writes missing architecture notes with the generated marker and related links", async () => {
    const result = writeKnowledgeGraphFiles(vault, "p");
    expect(result.kept).toEqual([]);
    for (const rel of [HLA, LLA, ERD, FLOW]) {
      const abs = join(vault, rel);
      expect(existsSync(abs)).toBe(true);
      const body = await readFile(abs, "utf-8");
      expect(body).toMatch(/^---\ntype: architecture\nrelated:\n(?:  - .+\n)+---\n\n<!-- superskill:generated -->/);
    }
    const high = await readFile(join(vault, HLA), "utf-8");
    expect(high).toContain("# High-level architecture");
    expect(high).toContain(LLA);
    expect(high).toContain(ERD);
    expect(high).toContain(FLOW);
    const low = await readFile(join(vault, LLA), "utf-8");
    expect(low).toContain("accTitle: Module dependency diagram for the SuperSkill implementation");
    expect(low).toContain("### Ids");
    expect(low).toContain("### Nodes");
    expect(low).toContain("### Edges");
    expect(low).toContain("```mermaid");
    expect(low).toContain(HLA);
    const flow = await readFile(join(vault, FLOW), "utf-8");
    expect(flow).toContain("# Dataflow");
    expect(flow).toContain("```mermaid");
    expect(flow).toContain("accTitle: Level 0 data flow diagram for SuperSkill");
    expect(flow).toContain("accTitle: Level 1 data flow diagram for SuperSkill");
    expect(flow).toContain(HLA);
    expect(flow).toContain(LLA);
    expect(flow).toContain(ERD);

    const idx = KnowledgeIndex.openForProject(vault, "p");
    expect(idx.outgoing(HLA)).toEqual(expect.arrayContaining([LLA, ERD, FLOW]));
    expect(idx.incoming(FLOW)).toEqual(expect.arrayContaining([HLA, LLA, ERD]));
    idx.close();
  });

  it("regenerates notes that carry the marker", async () => {
    writeKnowledgeGraphFiles(vault, "p");
    await writeFile(
      join(vault, HLA),
      `---\ntype: architecture\n---\n\n${GENERATED_MARKER}\n\n# stale heading\n\nold words\n`,
      "utf-8",
    );
    const result = writeKnowledgeGraphFiles(vault, "p");
    const body = await readFile(join(vault, HLA), "utf-8");
    expect(body).not.toContain("old words");
    expect(body).not.toContain("# stale heading");
    expect(body).toContain(GENERATED_MARKER);
    expect(body).toContain("related:");
    expect(body).toContain(LLA);
    expect(result.kept).toEqual([]);
  });

  it("preserves user-edited notes without the marker and reports them", async () => {
    const custom = "---\ntype: architecture\n---\n\n# My architecture notes\n\nDo not clobber.\n";
    await mkdir(join(vault, "projects", "p", "architecture"), { recursive: true });
    await writeFile(join(vault, HLA), custom, "utf-8");
    await writeFile(
      join(vault, ERD),
      `---\ntype: architecture\n---\n\n${GENERATED_MARKER}\n\nold erd\n`,
      "utf-8",
    );
    const result = writeKnowledgeGraphFiles(vault, "p");
    expect(await readFile(join(vault, HLA), "utf-8")).toBe(custom);
    expect(result.kept).toEqual([HLA]);
    const erd = await readFile(join(vault, ERD), "utf-8");
    expect(erd).not.toContain("old erd");
    expect(erd).toContain(GENERATED_MARKER);
    expect(existsSync(join(vault, LLA))).toBe(true);
    expect(existsSync(join(vault, FLOW))).toBe(true);
    expect(existsSync(join(vault, result.html))).toBe(true);
    expect(existsSync(join(vault, result.diagrams))).toBe(true);
    expect(existsSync(join(vault, result.canvas))).toBe(true);
  });
});
