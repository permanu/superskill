import { readFile, realpath } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import type { CodeEdge, CodeNode, ScanResult } from "./codegraph/types.js";
import { buildVizModel, mermaidFlowchart, type VizDoc, type VizEdge, type VizGraph, type VizModel, type VizNode } from "./viz-model.js";
import { scanForSecrets } from "./secret-scanner.js";

const DIAGRAM_LIMIT = 24;
const SOURCE_LIMIT = 1_000_000;
const compare = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;
const codeId = (path: string): string => `code:${path}`;
const dirId = (path: string): string => path === "." ? "root" : `dir:${path}/`;
const symbolId = (node: CodeNode): string => `symbol:${node.id}`;

function diagram(title: string, graph: VizGraph, description: string, empty: string): VizDoc {
  const adjacent = new Map(graph.nodes.map(node => [node.id, new Set<string>()]));
  for (const edge of graph.edges) {
    adjacent.get(edge.from)?.add(edge.to);
    adjacent.get(edge.to)?.add(edge.from);
  }
  const ranked = graph.nodes.slice().sort((a, b) => (adjacent.get(b.id)?.size ?? 0) - (adjacent.get(a.id)?.size ?? 0) || compare(a.id, b.id));
  const selected = new Set<string>();
  for (const seed of ranked) {
    const queue = [seed.id];
    while (queue.length && selected.size < DIAGRAM_LIMIT) {
      const id = queue.shift()!;
      if (selected.has(id) || !adjacent.has(id)) continue;
      selected.add(id);
      queue.push(...[...adjacent.get(id)!].sort(compare));
    }
    if (selected.size >= DIAGRAM_LIMIT) break;
  }
  const nodes = graph.nodes.filter(node => selected.has(node.id)).sort((a, b) => compare(a.id, b.id));
  const ids = new Set(nodes.map(node => node.id));
  const edges = graph.edges.filter(edge => ids.has(edge.from) && ids.has(edge.to)).sort((a, b) => compare(a.from, b.from) || compare(a.to, b.to) || compare(a.type, b.type)).slice(0, 80);
  const summary = graph.nodes.length > nodes.length || graph.edges.length > edges.length ? `\n\nShowing ${nodes.length} of ${graph.nodes.length} nodes and ${edges.length} of ${graph.edges.length} relationships, prioritizing connected neighborhoods. Scroll to explore the diagram; use the project graph for the rest.` : "";
  const body = nodes.length
    ? `${description}${summary}\n\n\`\`\`mermaid\n${mermaidFlowchart({ title, subtitle: description, nodes, edges })}\n\`\`\``
    : `${description}\n\n${empty}`;
  return { title, type: "architecture", body };
}

function aggregate(edges: VizEdge[], owner: Map<string, string>): VizEdge[] {
  const counts = new Map<string, { from: string; to: string; count: number }>();
  for (const edge of edges) {
    const from = owner.get(edge.from);
    const to = owner.get(edge.to);
    if (!from || !to || from === to) continue;
    const key = JSON.stringify([from, to]);
    const value = counts.get(key) ?? { from, to, count: 0 };
    value.count++;
    counts.set(key, value);
  }
  return [...counts.values()].sort((a, b) => compare(a.from, b.from) || compare(a.to, b.to))
    .map(edge => ({ from: edge.from, to: edge.to, type: "imports", label: `${edge.count} import${edge.count === 1 ? "" : "s"}` }));
}

export function buildProjectVizModel(opts: {
  slug: string;
  scan: ScanResult;
  vault: { nodes: Array<{ id: string; title: string; type: string }>; edges: VizEdge[] };
  docs: Array<{ id: string; title: string; type: string; body: string }>;
}): VizModel {
  const model = buildVizModel({ ...opts, code: { nodes: [], edges: [] } });
  const catalog = model.graphs.catalog;
  for (const pack of catalog.nodes.filter(node => node.type === "pack")) {
    const children = new Set(catalog.edges.filter(edge => edge.from === pack.id).map(edge => edge.to));
    for (const edge of catalog.edges) if (children.has(edge.from)) children.add(edge.to);
    model.graphs[pack.id] = { title: pack.title, subtitle: "Select a playbook to read it, or open a rules group.", nodes: catalog.nodes.filter(node => children.has(node.id)), edges: catalog.edges.filter(edge => children.has(edge.from) && children.has(edge.to)) };
    pack.open = { kind: "graph", id: pack.id };
  }
  model.graphs.catalog = { ...catalog, nodes: catalog.nodes.filter(node => node.type === "pack"), edges: [] };
  const { graph, stats } = opts.scan;
  const files = graph.nodes.filter(node => node.kind === "module").sort((a, b) => compare(a.file, b.file));
  const byId = new Map(graph.nodes.map(node => [node.id, node]));
  const symbolsByFile = new Map<string, CodeNode[]>();
  const edgesByFile = new Map<string, CodeEdge[]>();
  for (const node of graph.nodes) {
    if (node.kind === "module" || node.kind === "import-source") continue;
    const symbols = symbolsByFile.get(node.file) ?? [];
    symbols.push(node);
    symbolsByFile.set(node.file, symbols);
  }
  for (const edge of graph.edges) {
    const file = byId.get(edge.from)?.file;
    if (!file || file !== byId.get(edge.to)?.file) continue;
    const edges = edgesByFile.get(file) ?? [];
    edges.push(edge);
    edgesByFile.set(file, edges);
  }
  const knownFiles = new Set(files.map(node => node.file));
  const fileImports: VizEdge[] = graph.edges.filter(edge => edge.kind === "imports")
    .flatMap(edge => {
      const from = byId.get(edge.from)?.file;
      const to = byId.get(edge.to);
      return from && to?.kind === "module" && knownFiles.has(from) && knownFiles.has(to.file)
        ? [{ from: codeId(from), to: codeId(to.file), type: "imports", label: `imports (${edge.confidence.toLowerCase()})` }] : [];
    }).sort((a, b) => compare(a.from, b.from) || compare(a.to, b.to));
  const paths = new Set<string>(["."]);
  for (const file of files) {
    let path = dirname(file.file);
    while (path !== ".") { paths.add(path); path = dirname(path); }
  }
  const notice = `${files.length} files · ${graph.languages.join(", ") || "no supported languages"}. ${stats.parseErrors} files with parse errors; ${stats.filesSkipped} skipped.`;
  const directories = [...paths].sort(compare);
  const fileNodes = new Map<string, VizNode>();
  for (const file of files) {
    const id = codeId(file.file);
    const symbols = (symbolsByFile.get(file.file) ?? []).sort((a, b) => a.span.startLine - b.span.startLine || compare(a.id, b.id));
    const node: VizNode = { id, title: file.file.split("/").pop()!, type: "code", ...(symbols.length ? { open: { kind: "graph" as const, id: `file:${file.file}` } } : {}) };
    fileNodes.set(file.file, node);
    model.docs[id] = { title: file.file, type: "code", body: `${symbols.length} declarations. Source is shown only when selected.`, source: { path: file.file, language: file.language } };
    const nodes: VizNode[] = [{ ...node, open: { kind: "doc", id } }];
    const map = new Map<string, string>([[file.id, id]]);
    for (const symbol of symbols) {
      const sid = symbolId(symbol);
      map.set(symbol.id, sid);
      nodes.push({ id: sid, title: symbol.name, type: symbol.kind });
      model.docs[sid] = { title: symbol.name, type: symbol.kind, body: `${symbol.kind}${symbol.exported ? " · exported" : ""}\n\n${symbol.file}:${symbol.span.startLine}–${symbol.span.endLine}`, source: { path: symbol.file, language: symbol.language, ...symbol.span } };
    }
    const edges: VizEdge[] = (edgesByFile.get(file.file) ?? []).flatMap(edge => {
      const from = map.get(edge.from);
      const to = map.get(edge.to);
      return from && to ? [{ from, to, type: edge.kind, label: `${edge.kind} (${edge.confidence.toLowerCase()})` }] : [];
    }).sort((a, b) => compare(a.from, b.from) || compare(a.to, b.to) || compare(a.type, b.type));
    if (symbols.length) model.graphs[`file:${file.file}`] = { title: file.file, subtitle: "Select a declaration to read its source. Select the file node for the complete file.", nodes, edges };
  }
  for (const path of directories) {
    const childDirs = directories.filter(child => child !== "." && dirname(child) === path);
    const nodes: VizNode[] = childDirs.map(child => ({ id: dirId(child), title: child.split("/").pop()!, type: "module", open: { kind: "graph", id: dirId(child) } }));
    nodes.push(...files.filter(file => dirname(file.file) === path).map(file => fileNodes.get(file.file)!));
    const owner = new Map<string, string>();
    for (const file of files) {
      const child = childDirs.find(dir => file.file.startsWith(`${dir}/`));
      if (child) owner.set(codeId(file.file), dirId(child));
      else if (dirname(file.file) === path) owner.set(codeId(file.file), codeId(file.file));
    }
    model.graphs[dirId(path)] = { title: path === "." ? opts.slug : path, subtitle: path === "." ? notice : "Open a directory to descend. Select a file to read source or explore its declarations.", nodes, edges: aggregate(fileImports, owner) };
    model.docs[dirId(path)] = { title: path === "." ? opts.slug : path, type: "module", body: `${nodes.length} immediate children. Relationships are aggregated from parsed imports; directory boundaries are structural, not inferred architectural responsibilities.` };
  }
  const modules: VizNode[] = directories.filter(path => path !== ".").map(path => ({ id: dirId(path), title: path, type: "module", open: { kind: "graph", id: dirId(path) } }));
  modules.push(...files.filter(file => dirname(file.file) === ".").map(file => fileNodes.get(file.file)!));
  const moduleOwner = new Map(files.map(file => [codeId(file.file), dirname(file.file) === "." ? codeId(file.file) : dirId(dirname(file.file))]));
  model.graphs.impl = { title: "Module dependencies", subtitle: "Directories and root files, connected by observed imports. Open a directory to inspect its files.", nodes: modules, edges: aggregate(fileImports, moduleOwner) };
  const types = graph.nodes.filter(node => ["class", "interface", "type"].includes(node.kind)).sort((a, b) => compare(a.id, b.id));
  const calls = graph.edges.filter(edge => edge.kind === "calls");
  const callable = new Set(calls.flatMap(edge => [edge.from, edge.to]));
  const callNodes = graph.nodes.filter(node => callable.has(node.id) && node.kind !== "import-source").sort((a, b) => compare(a.id, b.id));
  function symbolGraph(nodes: CodeNode[], kinds: string[]): VizGraph {
    const ids = new Set(nodes.map(node => node.id));
    return { title: "", subtitle: "", nodes: nodes.map(node => ({ id: symbolId(node), title: `${node.name} · ${node.file}:${node.span.startLine}`, type: node.kind })), edges: graph.edges.filter(edge => kinds.includes(edge.kind) && ids.has(edge.from) && ids.has(edge.to)).map(edge => ({ from: `symbol:${edge.from}`, to: `symbol:${edge.to}`, type: edge.kind, label: `${edge.kind} (${edge.confidence.toLowerCase()})` })) };
  }
  model.docs["diag:high"] = diagram("High-level architecture", model.graphs.root, `Project structure for ${opts.slug}. Top-level directories and files, connected by observed imports. ${notice}`, "No supported source files were found in this project.");
  model.docs["diag:low"] = diagram("Module dependencies", model.graphs.impl, "Import direction is consumer → dependency. This is structural analysis of the scanned source.", "No supported modules were found.");
  model.docs["diag:erd"] = diagram("Data types", symbolGraph(types, ["references", "defines"]), "Classes, interfaces and type declarations found in source. These are code types, not a claimed database schema.", "No data type declarations were extracted. Database ERDs are not inferred from absent schema evidence.");
  model.docs["diag:flow"] = diagram("Call flow", symbolGraph(callNodes, ["calls"]), "Static call relationships. Extracted and inferred edges are labeled; this does not establish runtime execution order.", "No call relationships were extracted from the supported source files.");
  model.docs["view:root"] = { title: opts.slug, type: "context", body: `${notice}\n\nOpen directories to descend through the project. File selection shows the source snapshot; declarations provide smaller spans. The graph is deterministic and requires no model calls.\n\nAgent traversal: \`graph children code\` returns metadata; \`graph open code:<path>\` retrieves one file with a bounded default response.` };
  model.navigation = [
    { id: "graph", label: "Source", graph: "root", section: "graph" },
    { id: "hla", label: "Structure overview", doc: "diag:high", section: "hla" },
    { id: "modules", label: "Explore dependencies", graph: "impl", section: "hla" },
    { id: "lla", label: "Dependency diagram", doc: "diag:low", section: "hla" },
    { id: "erd", label: "Data types", doc: "diag:erd", section: "hla" },
    { id: "flow", label: "Call relationships", doc: "diag:flow", section: "hla" },
    { id: "vault", label: "Project notes", graph: "vault", section: "vault" },
    { id: "catalog", label: "Playbooks", graph: "catalog", section: "vault" },
    { id: "rules", label: "Rules", graph: "rules", section: "vault" },
  ];
  model.sources = {};
  for (const doc of Object.values(model.docs)) {
    if (scanForSecrets(doc.body).length) doc.body = "Content omitted from this visualization because it contains a secret-like pattern. Read the original document locally.";
  }
  return model;
}

export async function attachProjectSources(model: VizModel, root: string): Promise<void> {
  const base = await realpath(root);
  const paths = [...new Set(Object.values(model.docs).flatMap(doc => doc.source ? [doc.source.path] : []))].sort(compare);
  model.sources = {};
  for (const path of paths) {
    try {
      const abs = await realpath(resolve(base, path));
      const rel = relative(base, abs);
      if (rel === ".." || rel.startsWith(`..${sep}`) || resolve(base, path) === base) throw new Error("source path escapes project");
      const buffer = await readFile(abs);
      const text = buffer.subarray(0, SOURCE_LIMIT).toString("utf8");
      if (scanForSecrets(text).length) {
        for (const doc of Object.values(model.docs)) {
          if (doc.source?.path === path) doc.source.unavailableReason = "Source snapshot omitted because it contains potential secrets. Inspect the local file directly.";
        }
        continue;
      }
      model.sources[path] = { text, bytes: buffer.length, truncated: buffer.length > SOURCE_LIMIT };
    } catch (error) {
      console.error(`[project-viz] unable to read ${path}:`, (error as NodeJS.ErrnoException).code ?? String(error));
    }
  }
}
