import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { scanRepo } from "./codegraph/scan.js";
import { buildProjectVizModel, attachProjectSources } from "./project-viz-model.js";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

async function project(files: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), "project-viz-"));
  roots.push(root);
  for (const [path, content] of Object.entries(files)) {
    await mkdir(join(root, path, ".."), { recursive: true });
    await writeFile(join(root, path), content);
  }
  const scan = await scanRepo(root);
  const model = buildProjectVizModel({ slug: "sample-app", scan, vault: { nodes: [], edges: [] }, docs: [] });
  await attachProjectSources(model, root);
  return { root, model, scan };
}

describe("project-derived visualization", { timeout: 15_000 }, () => {
  it("traverses directories to files and symbols outside src without invented components", async () => {
    const { model } = await project({
      "web/main.ts": 'import { greet } from "../shared/greet"; export function start() { return greet(); }',
      "shared/greet.ts": 'export function greet() { return "hello"; }',
    });
    expect(model.graphs.root.title).toBe("sample-app");
    const web = model.graphs.root.nodes.find(node => node.title === "web");
    expect(web?.open?.id).toBe("dir:web/");
    const file = model.graphs[web!.open!.id].nodes.find(node => node.title === "main.ts")!;
    expect(file.id).toBe("code:web/main.ts");
    expect(model.graphs[file.open!.id].nodes.some(node => node.title === "start")).toBe(true);
    expect(model.sources?.["web/main.ts"].text).toContain('return greet()');
    for (const id of ["diag:high", "diag:low", "diag:erd", "diag:flow"]) {
      expect(model.docs[id].body).not.toContain("SuperSkill");
      expect(model.docs[id].body).not.toContain("FTS5");
    }
    expect(model.docs["diag:high"].body).toContain("web");
    expect(model.docs["diag:low"].body).toContain("shared");
    expect(model.docs["diag:flow"].body).toContain("greet");
  });

  it("supports Python and exposes actual data declarations rather than a canned database schema", async () => {
    const { model } = await project({
      "service/app.py": 'from service.models import Record\n\ndef run():\n    return Record()\n',
      "service/models.py": 'class Record:\n    def value(self):\n        return 42\n',
    });
    expect(model.graphs["dir:service/"].nodes.map(node => node.title)).toEqual(["app.py", "models.py"]);
    expect(model.docs["diag:erd"].body).toContain("Record");
    expect(model.docs["diag:erd"].body).not.toContain("NOTE ||--o{");
    expect(model.docs["code:service/models.py"].source?.language).toBe("python");
  });

  it("retains complete source and exact symbol spans instead of only the first 60 lines", async () => {
    const body = Array.from({ length: 80 }, (_, i) => `export const value${i} = ${i};`).join("\n");
    const { model } = await project({ "main.ts": body });
    expect(model.sources?.["main.ts"].text).toBe(body);
    const symbol = model.graphs["file:main.ts"].nodes.find(node => node.title === "value79")!;
    expect(model.docs[symbol.id].source).toMatchObject({ path: "main.ts", startLine: 80, endLine: 80 });
    expect(model.docs[symbol.id].body).not.toContain(body);
  });

  it("omits secret-bearing source snapshots from generated vault artifacts", async () => {
    const { model } = await project({ "main.ts": 'export const api_key = "abcdefghijklmnopqrstuvwx";' });
    expect(model.docs["code:main.ts"]).toBeDefined();
    expect(model.sources?.["main.ts"]).toBeUndefined();
    expect(JSON.stringify(model).includes("abcdefghijklmnopqrstuvwx")).toBe(false);
  });

  it("does not copy secret-like examples from knowledge documents into the exported model", async () => {
    const { scan } = await project({});
    const model = buildProjectVizModel({ slug: "sample-app", scan, vault: { nodes: [{ id: "memo", title: "Memo", type: "note" }], edges: [] }, docs: [{ id: "memo", title: "Memo", type: "note", body: 'api_key = "abcdefghijklmnopqrstuvwx"' }] });
    expect(JSON.stringify(model).includes("abcdefghijklmnopqrstuvwx")).toBe(false);
  });

  it("keeps all generated graph targets reachable and source bodies out of metadata", async () => {
    const { model } = await project({ "main.ts": "export interface Person { name: string }" });
    for (const graph of Object.values(model.graphs)) {
      for (const node of graph.nodes) {
        if (node.open?.kind === "graph") expect(model.graphs[node.open.id], node.id).toBeDefined();
      }
    }
    expect(model.navigation?.map(item => item.id)).toEqual(expect.arrayContaining(["hla", "lla", "erd", "flow", "vault", "catalog"]));
    expect(JSON.stringify(model.graphs)).not.toContain("name: string");
  });

  it("reports empty analysis without inventing an architecture", async () => {
    const { model } = await project({ "README.md": "# Only documentation" });
    expect(model.graphs.root.nodes).toHaveLength(0);
    expect(model.docs["diag:high"].body).toContain("No supported source files");
    expect(model.docs["diag:flow"].body).toContain("No call relationships");
  });

  it("keeps call relationships visible when sampling a large graph", async () => {
    const files = Object.fromEntries(Array.from({ length: 70 }, (_, i) => [`service/file${i}.ts`, `export function run${i}() { return helper${i}(); }\nfunction helper${i}() { return 1; }\nrun${i}();`]));
    const { model } = await project(files);
    expect(model.docs["diag:flow"].body).toContain("calls (inferred)");
    expect(model.docs["diag:flow"].body).toContain("Showing 24");
  });

  it("produces the same diagrams regardless of scanner input order", async () => {
    const { model, scan } = await project({ "b/main.ts": "export const z = 1;", "a/main.ts": "export const a = 1;" });
    const other = buildProjectVizModel({ slug: "sample-app", scan: { ...scan, graph: { ...scan.graph, nodes: [...scan.graph.nodes].reverse(), edges: [...scan.graph.edges].reverse() } }, vault: { nodes: [], edges: [] }, docs: [] });
    expect(other.graphs).toEqual(model.graphs);
    for (const id of ["diag:high", "diag:low", "diag:erd", "diag:flow"]) expect(other.docs[id]).toEqual(model.docs[id]);
  });
});
