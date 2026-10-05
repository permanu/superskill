// SPDX-License-Identifier: Apache-2.0

import {
  LANGUAGES,
  type CodeEdge,
  type CodeEdgeKind,
  type CodeGraph,
  type CodeNode,
  type CodeNodeKind,
  type Confidence,
  type GraphStats,
  type LanguageId,
  type SerializedGraph,
} from "./types.js";

const NODE_KINDS: CodeNodeKind[] = [
  "module",
  "class",
  "function",
  "method",
  "interface",
  "type",
  "const",
  "import-source",
];

const EDGE_KINDS: CodeEdgeKind[] = ["defines", "imports", "exports", "references", "calls"];

const CONFIDENCES: Confidence[] = ["EXTRACTED", "INFERRED"];

export function edgeKey(edge: Pick<CodeEdge, "from" | "to" | "kind" | "confidence">): string {
  return `${edge.from}\u0000${edge.to}\u0000${edge.kind}\u0000${edge.confidence}`;
}

function compareEdges(a: CodeEdge, b: CodeEdge): number {
  if (a.from !== b.from) return a.from < b.from ? -1 : 1;
  if (a.to !== b.to) return a.to < b.to ? -1 : 1;
  if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1;
  if (a.confidence !== b.confidence) return a.confidence < b.confidence ? -1 : 1;
  if (a.file !== b.file) return a.file < b.file ? -1 : 1;
  return a.span.startLine - b.span.startLine;
}

export class CodeGraphStore {
  root = "";
  private readonly nodeMap = new Map<string, CodeNode>();
  private readonly edgeMap = new Map<string, CodeEdge>();
  private readonly languageSet = new Set<LanguageId>();

  constructor(graph?: CodeGraph) {
    if (graph) this.addGraph(graph);
  }

  addNode(node: CodeNode): boolean {
    if (this.nodeMap.has(node.id)) return false;
    this.nodeMap.set(node.id, node);
    if (node.language !== "external") this.languageSet.add(node.language);
    return true;
  }

  addEdge(edge: CodeEdge): boolean {
    const key = edgeKey(edge);
    if (this.edgeMap.has(key)) return false;
    this.edgeMap.set(key, edge);
    return true;
  }

  addGraph(graph: CodeGraph): this {
    if (graph.root && !this.root) this.root = graph.root;
    for (const language of graph.languages) this.languageSet.add(language);
    for (const node of graph.nodes) this.addNode(node);
    for (const edge of graph.edges) this.addEdge(edge);
    return this;
  }

  getNode(id: string): CodeNode | undefined {
    return this.nodeMap.get(id);
  }

  hasNode(id: string): boolean {
    return this.nodeMap.has(id);
  }

  nodeCount(): number {
    return this.nodeMap.size;
  }

  edgeCount(): number {
    return this.edgeMap.size;
  }

  nodes(): CodeNode[] {
    return [...this.nodeMap.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }

  edges(): CodeEdge[] {
    return [...this.edgeMap.values()].sort(compareEdges);
  }

  languages(): LanguageId[] {
    return LANGUAGES.filter((language) => this.languageSet.has(language));
  }

  stats(extras: { parseErrors?: number; filesSkipped?: number } = {}): GraphStats {
    const nodesByKind = Object.fromEntries(NODE_KINDS.map((kind) => [kind, 0])) as Record<CodeNodeKind, number>;
    const edgesByKind = Object.fromEntries(EDGE_KINDS.map((kind) => [kind, 0])) as Record<CodeEdgeKind, number>;
    const edgesByConfidence = Object.fromEntries(CONFIDENCES.map((c) => [c, 0])) as Record<Confidence, number>;
    let files = 0;
    for (const node of this.nodeMap.values()) {
      nodesByKind[node.kind] += 1;
      if (node.kind === "module") files += 1;
    }
    for (const edge of this.edgeMap.values()) {
      edgesByKind[edge.kind] += 1;
      edgesByConfidence[edge.confidence] += 1;
    }
    return {
      files,
      nodes: this.nodeMap.size,
      edges: this.edgeMap.size,
      nodesByKind,
      edgesByKind,
      edgesByConfidence,
      parseErrors: extras.parseErrors ?? 0,
      filesSkipped: extras.filesSkipped ?? 0,
    };
  }

  toGraph(): CodeGraph {
    return {
      root: this.root,
      languages: this.languages(),
      nodes: this.nodes(),
      edges: this.edges(),
    };
  }

  toJSON(): SerializedGraph {
    return { version: 1, ...this.toGraph() };
  }

  static fromJSON(input: SerializedGraph | string | CodeGraph): CodeGraphStore {
    const graph: CodeGraph = typeof input === "string" ? (JSON.parse(input) as SerializedGraph) : input;
    return new CodeGraphStore(graph);
  }
}

export function mergeGraphs(...inputs: Array<CodeGraphStore | CodeGraph | SerializedGraph>): CodeGraphStore {
  const merged = new CodeGraphStore();
  for (const input of inputs) {
    if (input instanceof CodeGraphStore) {
      merged.addGraph(input.toGraph());
    } else {
      merged.addGraph(input);
    }
  }
  return merged;
}
