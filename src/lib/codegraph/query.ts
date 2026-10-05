// SPDX-License-Identifier: Apache-2.0

import type { CodeEdge, CodeEdgeKind, CodeNode, Confidence } from "./types.js";
import { moduleNodeId } from "./extractors/common.js";
import { CodeGraphStore } from "./store.js";

export interface QueryOptions {
  kinds?: CodeEdgeKind[];
  confidence?: Confidence;
  maxDepth?: number;
}

export interface NeighborOptions extends QueryOptions {
  direction?: "out" | "in" | "both";
}

export interface PathOptions extends QueryOptions {
  direction?: "out" | "both";
}

export interface NeighborEntry {
  edge: CodeEdge;
  node: CodeNode | undefined;
  direction: "out" | "in";
}

export class CodeGraphQuery {
  constructor(readonly store: CodeGraphStore) {}

  findNodes(idOrName: string): CodeNode[] {
    const direct = this.store.getNode(idOrName);
    if (direct) return [direct];
    return this.store
      .nodes()
      .filter((node) => node.name === idOrName)
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }

  findNode(idOrName: string): CodeNode | null {
    return this.findNodes(idOrName)[0] ?? null;
  }

  neighbors(id: string, options: NeighborOptions = {}): NeighborEntry[] {
    const direction = options.direction ?? "out";
    const entries: NeighborEntry[] = [];
    for (const edge of this.store.edges()) {
      if (!matchesEdge(edge, options)) continue;
      if ((direction === "out" || direction === "both") && edge.from === id) {
        entries.push({ edge, node: this.store.getNode(edge.to), direction: "out" });
      }
      if ((direction === "in" || direction === "both") && edge.to === id) {
        entries.push({ edge, node: this.store.getNode(edge.from), direction: "in" });
      }
    }
    return entries.sort(compareNeighbors);
  }

  neighborsExtracted(id: string, options: NeighborOptions = {}): NeighborEntry[] {
    return this.neighbors(id, { ...options, confidence: "EXTRACTED" });
  }

  importersOf(file: string, options: QueryOptions = {}): CodeNode[] {
    const target = moduleNodeId(file);
    const seen = new Set<string>();
    const importers: CodeNode[] = [];
    for (const edge of this.store.edges()) {
      if (edge.kind !== "imports" || edge.to !== target) continue;
      if (!matchesEdge(edge, options)) continue;
      if (seen.has(edge.from)) continue;
      seen.add(edge.from);
      const node = this.store.getNode(edge.from);
      if (node) importers.push(node);
    }
    return importers.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }

  importersOfExtracted(file: string, options: QueryOptions = {}): CodeNode[] {
    return this.importersOf(file, { ...options, confidence: "EXTRACTED" });
  }

  defsIn(file: string, options: QueryOptions = {}): CodeNode[] {
    const defs: CodeNode[] = [];
    for (const edge of this.store.edges()) {
      if (edge.kind !== "defines") continue;
      if (!matchesEdge(edge, options)) continue;
      const node = this.store.getNode(edge.to);
      if (node && node.file === file && node.kind !== "module") defs.push(node);
    }
    return defs.sort((a, b) => a.span.startLine - b.span.startLine || (a.id < b.id ? -1 : 1));
  }

  defsInExtracted(file: string, options: QueryOptions = {}): CodeNode[] {
    return this.defsIn(file, { ...options, confidence: "EXTRACTED" });
  }

  externalImportsOf(file: string, options: QueryOptions = {}): CodeNode[] {
    const nodes: CodeNode[] = [];
    for (const edge of this.store.edges()) {
      if (edge.kind !== "imports" || edge.file !== file) continue;
      if (!matchesEdge(edge, options)) continue;
      const node = this.store.getNode(edge.to);
      if (node?.kind === "import-source") nodes.push(node);
    }
    return nodes.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }

  shortestPath(fromIdOrName: string, toIdOrName: string, options: PathOptions = {}): string[] | null {
    const from = this.findNode(fromIdOrName);
    const to = this.findNode(toIdOrName);
    if (!from || !to) return null;
    if (from.id === to.id) return [from.id];
    const undirected = options.direction === "both";
    const maxDepth = options.maxDepth ?? Number.POSITIVE_INFINITY;
    const visited = new Set<string>([from.id]);
    let frontier: string[] = [from.id];
    const parents = new Map<string, string>();
    let depth = 0;
    while (frontier.length > 0 && depth < maxDepth) {
      depth += 1;
      const next: string[] = [];
      for (const current of frontier) {
        for (const entry of this.neighbors(current, {
          ...options,
          direction: undirected ? "both" : "out",
        })) {
          const candidate = entry.direction === "out" ? entry.edge.to : entry.edge.from;
          if (visited.has(candidate)) continue;
          visited.add(candidate);
          parents.set(candidate, current);
          if (candidate === to.id) {
            return reconstructPath(parents, from.id, to.id);
          }
          next.push(candidate);
        }
      }
      frontier = next;
    }
    return null;
  }

  shortestPathExtracted(fromIdOrName: string, toIdOrName: string, options: PathOptions = {}): string[] | null {
    return this.shortestPath(fromIdOrName, toIdOrName, { ...options, confidence: "EXTRACTED" });
  }
}

function matchesEdge(edge: CodeEdge, options: QueryOptions): boolean {
  if (options.confidence && edge.confidence !== options.confidence) return false;
  if (options.kinds && options.kinds.length > 0 && !options.kinds.includes(edge.kind)) return false;
  return true;
}

function compareNeighbors(a: NeighborEntry, b: NeighborEntry): number {
  const aId = a.node?.id ?? "";
  const bId = b.node?.id ?? "";
  if (aId !== bId) return aId < bId ? -1 : 1;
  if (a.edge.kind !== b.edge.kind) return a.edge.kind < b.edge.kind ? -1 : 1;
  return a.edge.confidence < b.edge.confidence ? -1 : a.edge.confidence > b.edge.confidence ? 1 : 0;
}

function reconstructPath(parents: Map<string, string>, from: string, to: string): string[] {
  const path = [to];
  let current = to;
  while (current !== from) {
    const parent = parents.get(current);
    if (parent === undefined) break;
    path.push(parent);
    current = parent;
  }
  return path.reverse();
}
