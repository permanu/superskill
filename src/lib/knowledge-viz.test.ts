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
    expect(html).toContain("mermaid.min.js");
    expect(html).toContain("mermaid.render");
    expect(html).not.toContain("<script>alert");
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

  it("pins HLA, LLA, and ERD on the Obsidian canvas", () => {
    const arch = [
      { file: "projects/p/architecture/high-level-architecture.md", color: "5" },
      { file: "projects/p/architecture/low-level-architecture.md", color: "1" },
      { file: "projects/p/architecture/data-model-erd.md", color: "4" },
    ];
    const canvas = JSON.parse(renderObsidianCanvas(index.graphDump(), arch));
    const files = canvas.nodes.map((n: { file: string }) => n.file);
    expect(files).toEqual(
      expect.arrayContaining([
        "projects/p/architecture/high-level-architecture.md",
        "projects/p/architecture/low-level-architecture.md",
        "projects/p/architecture/data-model-erd.md",
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

  it("writes missing architecture notes with the generated marker", async () => {
    const result = writeKnowledgeGraphFiles(vault, "p");
    expect(result.kept).toEqual([]);
    for (const rel of [HLA, LLA, ERD]) {
      const abs = join(vault, rel);
      expect(existsSync(abs)).toBe(true);
      const body = await readFile(abs, "utf-8");
      expect(body).toMatch(/^---\ntype: architecture\n---\n\n<!-- superskill:generated -->/);
    }
    expect(await readFile(join(vault, HLA), "utf-8")).toContain("# High-level architecture");
    expect(await readFile(join(vault, LLA), "utf-8")).toContain("```mermaid");
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
    expect(existsSync(join(vault, result.html))).toBe(true);
    expect(existsSync(join(vault, result.diagrams))).toBe(true);
    expect(existsSync(join(vault, result.canvas))).toBe(true);
  });
});
