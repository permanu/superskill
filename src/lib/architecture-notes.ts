// SPDX-License-Identifier: Apache-2.0

import { dirname } from "node:path";
import type { CodeNode, ScanResult } from "./codegraph/types.js";
import { markdownText } from "./code-notes.js";
import { scanForSecrets } from "./secret-scanner.js";

const DIAGRAM_LIMIT = 24;
const DIAGRAM_EDGE_LIMIT = 80;
const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const codeId = (path: string): string => `code:${path}`;
const dirId = (path: string): string => (path === "." ? "root" : `dir:${path}/`);
const symbolId = (node: CodeNode): string => `symbol:${node.id}`;

const MERMAID_INIT =
  '%%{init: {"flowchart": {"curve": "linear", "nodeSpacing": 40, "rankSpacing": 60, "useMaxWidth": false}}}%%';

interface ArchNode {
  id: string;
  title: string;
  type: string;
}

interface ArchEdge {
  from: string;
  to: string;
  type: string;
  label?: string;
}

interface ArchGraph {
  title: string;
  subtitle: string;
  nodes: ArchNode[];
  edges: ArchEdge[];
}

interface DiagramEdge {
  from: string;
  to: string;
  label: string;
  count: number;
}

export interface ArchitectureNote {
  id: string;
  title: string;
  body: string;
}

export interface ArchitectureNotesResult {
  notes: ArchitectureNote[];
  nodes: number;
  edges: number;
}

function sequentialIds(ids: string[]): Map<string, string> {
  const map = new Map<string, string>();
  [...new Set(ids)].sort().forEach((id, i) => map.set(id, `n${i + 1}`));
  return map;
}

function cleanMermaidText(s: string): string {
  return s.replace(/[\x00-\x1f\x7f-\x9f"[\]|<>#`]/g, " ").replace(/\s+/g, " ").trim();
}

function sortEdges(edges: DiagramEdge[]): DiagramEdge[] {
  return [...edges].sort(
    (a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to) || a.label.localeCompare(b.label),
  );
}

function mermaidFlowchart(g: ArchGraph): string {
  const ids = sequentialIds(g.nodes.map((n) => n.id));
  const lines = [
    MERMAID_INIT,
    "flowchart LR",
    `  accTitle: ${cleanMermaidText(g.title || "Dependency diagram")}`,
    `  accDescr: ${cleanMermaidText(g.subtitle || `${g.nodes.length} nodes and ${g.edges.length} edges`)}`,
  ];
  if (g.edges.length === 0) {
    for (const n of [...g.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
      lines.push(`  ${ids.get(n.id) ?? n.id}["${cleanMermaidText(n.title)}"]`);
    }
  } else {
    const connected = new Set(g.edges.flatMap((edge) => [edge.from, edge.to]));
    for (const node of [...g.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
      if (!connected.has(node.id)) lines.push(`  ${ids.get(node.id) ?? node.id}["${cleanMermaidText(node.title)}"]`);
    }
    const edges = sortEdges(
      g.edges.map((e) => ({ from: e.from, to: e.to, label: e.label ?? e.type, count: 0 })),
    );
    for (const e of edges) {
      const a = g.nodes.find((n) => n.id === e.from)?.title ?? e.from;
      const b = g.nodes.find((n) => n.id === e.to)?.title ?? e.to;
      lines.push(
        `  ${ids.get(e.from) ?? e.from}["${cleanMermaidText(a)}"] -->|"${cleanMermaidText(e.label)}"| ${ids.get(e.to) ?? e.to}["${cleanMermaidText(b)}"]`,
      );
    }
  }
  return lines.join("\n");
}

function diagram(title: string, graph: ArchGraph, description: string, empty: string): { title: string; body: string } {
  const adjacent = new Map(graph.nodes.map((node) => [node.id, new Set<string>()]));
  for (const edge of graph.edges) {
    adjacent.get(edge.from)?.add(edge.to);
    adjacent.get(edge.to)?.add(edge.from);
  }
  const ranked = graph.nodes
    .slice()
    .sort((a, b) => (adjacent.get(b.id)?.size ?? 0) - (adjacent.get(a.id)?.size ?? 0) || compare(a.id, b.id));
  const selected = new Set<string>();
  for (const seed of ranked) {
    const queue = [seed.id];
    while (queue.length && selected.size < DIAGRAM_LIMIT) {
      const id = queue.shift();
      if (id === undefined || selected.has(id) || !adjacent.has(id)) continue;
      selected.add(id);
      queue.push(...[...(adjacent.get(id) ?? [])].sort(compare));
    }
    if (selected.size >= DIAGRAM_LIMIT) break;
  }
  const nodes = graph.nodes.filter((node) => selected.has(node.id)).sort((a, b) => compare(a.id, b.id));
  const ids = new Set(nodes.map((node) => node.id));
  const edges = graph.edges
    .filter((edge) => ids.has(edge.from) && ids.has(edge.to))
    .sort((a, b) => compare(a.from, b.from) || compare(a.to, b.to) || compare(a.type, b.type))
    .slice(0, DIAGRAM_EDGE_LIMIT);
  const summary =
    graph.nodes.length > nodes.length || graph.edges.length > edges.length
      ? `\n\nShowing ${nodes.length} of ${graph.nodes.length} nodes and ${edges.length} of ${graph.edges.length} relationships, prioritizing connected neighborhoods. Scroll to explore the diagram; use the project graph for the rest.`
      : "";
  const body = nodes.length
    ? `${description}${summary}\n\n\`\`\`mermaid\n${mermaidFlowchart({ title, subtitle: description, nodes, edges })}\n\`\`\``
    : `${description}\n\n${empty}`;
  return { title, body };
}

function aggregate(edges: ArchEdge[], owner: Map<string, string>): ArchEdge[] {
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
  return [...counts.values()]
    .sort((a, b) => compare(a.from, b.from) || compare(a.to, b.to))
    .map((edge) => ({ from: edge.from, to: edge.to, type: "imports", label: `${edge.count} import${edge.count === 1 ? "" : "s"}` }));
}

function guardedBody(body: string): string {
  return scanForSecrets(body).length
    ? "Content omitted because it contains a secret-like pattern. Read the original document locally."
    : body;
}

export function buildArchitectureNotes(opts: { slug: string; scan: ScanResult }): ArchitectureNotesResult {
  const { graph, stats } = opts.scan;
  const files = graph.nodes.filter((node) => node.kind === "module").sort((a, b) => compare(a.file, b.file));
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const knownFiles = new Set(files.map((node) => node.file));
  const fileImports: ArchEdge[] = graph.edges
    .filter((edge) => edge.kind === "imports")
    .flatMap((edge) => {
      const from = byId.get(edge.from)?.file;
      const to = byId.get(edge.to);
      return from && to?.kind === "module" && knownFiles.has(from) && knownFiles.has(to.file)
        ? [{ from: codeId(from), to: codeId(to.file), type: "imports", label: `imports (${edge.confidence.toLowerCase()})` }]
        : [];
    })
    .sort((a, b) => compare(a.from, b.from) || compare(a.to, b.to));

  const paths = new Set<string>(["."]);
  for (const file of files) {
    let path = dirname(file.file);
    while (path !== ".") {
      paths.add(path);
      path = dirname(path);
    }
  }
  const notice = `${files.length} files · ${graph.languages.join(", ") || "no supported languages"}. ${stats.parseErrors} files with parse errors; ${stats.filesSkipped} skipped.`;
  const directories = [...paths].sort(compare);

  const fileNodes = new Map<string, ArchNode>();
  for (const file of files) {
    fileNodes.set(file.file, { id: codeId(file.file), title: file.file.split("/").pop() ?? file.file, type: "code" });
  }
  const nodeFor = (file: string): ArchNode =>
    fileNodes.get(file) ?? { id: codeId(file), title: file.split("/").pop() ?? file, type: "code" };

  let rootGraph: ArchGraph = { title: opts.slug, subtitle: notice, nodes: [], edges: [] };
  for (const path of directories) {
    const childDirs = directories.filter((child) => child !== "." && dirname(child) === path);
    const nodes: ArchNode[] = childDirs.map((child) => ({
      id: dirId(child),
      title: child.split("/").pop() ?? child,
      type: "module",
    }));
    nodes.push(...files.filter((file) => dirname(file.file) === path).map((file) => nodeFor(file.file)));
    const owner = new Map<string, string>();
    for (const file of files) {
      const child = childDirs.find((dir) => file.file.startsWith(`${dir}/`));
      if (child) owner.set(codeId(file.file), dirId(child));
      else if (dirname(file.file) === path) owner.set(codeId(file.file), codeId(file.file));
    }
    const built: ArchGraph = {
      title: path === "." ? opts.slug : path,
      subtitle: path === "." ? notice : "Open a directory to descend. Select a file to read source or explore its declarations.",
      nodes,
      edges: aggregate(fileImports, owner),
    };
    if (path === ".") rootGraph = built;
  }

  const modules: ArchNode[] = directories
    .filter((path) => path !== ".")
    .map((path) => ({ id: dirId(path), title: path, type: "module" }));
  modules.push(...files.filter((file) => dirname(file.file) === ".").map((file) => nodeFor(file.file)));
  const moduleOwner = new Map(
    files.map((file) => [
      codeId(file.file),
      dirname(file.file) === "." ? codeId(file.file) : dirId(dirname(file.file)),
    ]),
  );
  const implGraph: ArchGraph = {
    title: "Module dependencies",
    subtitle: "Directories and root files, connected by observed imports. Open a directory to inspect its files.",
    nodes: modules,
    edges: aggregate(fileImports, moduleOwner),
  };

  const types = graph.nodes.filter((node) => ["class", "interface", "type"].includes(node.kind)).sort((a, b) => compare(a.id, b.id));
  const calls = graph.edges.filter((edge) => edge.kind === "calls");
  const callable = new Set(calls.flatMap((edge) => [edge.from, edge.to]));
  const callNodes = graph.nodes
    .filter((node) => callable.has(node.id) && node.kind !== "import-source")
    .sort((a, b) => compare(a.id, b.id));

  function symbolGraph(nodes: CodeNode[], kinds: string[]): ArchGraph {
    const ids = new Set(nodes.map((node) => node.id));
    return {
      title: "",
      subtitle: "",
      nodes: nodes.map((node) => ({
        id: symbolId(node),
        title: `${node.name} · ${node.file}:${node.span.startLine}`,
        type: node.kind,
      })),
      edges: graph.edges
        .filter((edge) => kinds.includes(edge.kind) && ids.has(edge.from) && ids.has(edge.to))
        .map((edge) => ({ from: `symbol:${edge.from}`, to: `symbol:${edge.to}`, type: edge.kind, label: `${edge.kind} (${edge.confidence.toLowerCase()})` })),
    };
  }

  const notes: ArchitectureNote[] = [
    {
      id: "diag:high",
      ...diagram(
        "High-level architecture",
        rootGraph,
        `Project structure for ${markdownText(opts.slug)}. Top-level directories and files, connected by observed imports. ${notice}`,
        "No supported source files were found in this project.",
      ),
    },
    {
      id: "diag:low",
      ...diagram(
        "Module dependencies",
        implGraph,
        "Import direction is consumer → dependency. This is structural analysis of the scanned source.",
        "No supported modules were found.",
      ),
    },
    {
      id: "diag:erd",
      ...diagram(
        "Data types",
        symbolGraph(types, ["references", "defines"]),
        "Classes, interfaces and type declarations found in source. These are code types, not a claimed database schema.",
        "No data type declarations were extracted. Database ERDs are not inferred from absent schema evidence.",
      ),
    },
    {
      id: "diag:flow",
      ...diagram(
        "Call flow",
        symbolGraph(callNodes, ["calls"]),
        "Static call relationships. Extracted and inferred edges are labeled; this does not establish runtime execution order.",
        "No call relationships were extracted from the supported source files.",
      ),
    },
  ].map((note) => ({ ...note, body: guardedBody(note.body) }));

  return { notes, nodes: rootGraph.nodes.length, edges: rootGraph.edges.length };
}
