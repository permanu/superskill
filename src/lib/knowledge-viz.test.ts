import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { KnowledgeIndex } from "./knowledge-index.js";
import { renderKnowledgeGraphHtml, renderObsidianCanvas, renderArchitectureDiagramsHtml } from "./knowledge-viz.js";
import { buildVizModel } from "./viz-model.js";

describe("renderKnowledgeGraphHtml", () => {
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

  it("embeds a drill-down model with human titles", () => {
    const model = buildVizModel({
      slug: "p",
      vault: index.graphDump(),
      docs: index.noteDocs(),
      code: { nodes: [], edges: [] },
    });
    const html = renderKnowledgeGraphHtml(model);
    expect(html).toContain("vis-network");
    expect(html).toContain("Vault memory");
    expect(html).toContain("Auth");
    expect(html).toContain("showGraph");
    expect(html).toContain("data-qa");
    expect(html).toContain('data-view="hla"');
    expect(html).toContain('data-view="erd"');
    expect(html).toContain('data-qa="nav"');
    expect(html).toContain("mermaid.min.js");
    expect(html).toContain("mermaid.render");
    expect(html).not.toContain("<script>alert");
    const diagrams = renderArchitectureDiagramsHtml(model);
    expect(diagrams).toContain("class=\"mermaid\"");
    expect(diagrams).toContain("flowchart");
    expect(diagrams).toContain("erDiagram");
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
