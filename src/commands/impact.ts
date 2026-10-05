// SPDX-License-Identifier: Apache-2.0

import { isAbsolute, relative, resolve } from "node:path";
import { moduleNodeId } from "../lib/codegraph/extractors/common.js";
import { CodeGraphQuery } from "../lib/codegraph/query.js";
import { scanRepo } from "../lib/codegraph/scan.js";
import { CodeGraphStore, edgeKey } from "../lib/codegraph/store.js";
import type { CodeEdge, CodeNode } from "../lib/codegraph/types.js";

export interface ImpactArgs {
  target: string;
  to?: string;
  root?: string;
}

export interface ImpactRelation {
  node: CodeNode;
  edge: CodeEdge;
}

export interface CallerRelation {
  symbol: CodeNode;
  caller: CodeNode | null;
  edge: CodeEdge;
}

export interface ImpactPath {
  from: string;
  to: string;
  nodeIds: string[];
  nodes: CodeNode[];
  edges: CodeEdge[];
}

export interface ImpactResult {
  root: string;
  query: string;
  kind: "file" | "symbol";
  node: CodeNode;
  matches: CodeNode[];
  definitions: CodeNode[];
  importers: ImpactRelation[];
  callers: CallerRelation[];
  path: ImpactPath | null;
}

interface TargetMatch {
  kind: "file" | "symbol";
  node: CodeNode;
  matches: CodeNode[];
}

function toPosix(path: string): string {
  return path.split("\\").join("/");
}

function normalizeSegments(path: string): string {
  const segments: string[] = [];
  for (const part of path.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      const last = segments[segments.length - 1];
      if (last !== undefined && last !== "..") segments.pop();
      else segments.push("..");
      continue;
    }
    segments.push(part);
  }
  return segments.join("/");
}

function normalizeTarget(rootAbs: string, input: string): string {
  let clean = toPosix(input.trim());
  if (clean.startsWith("file:")) clean = clean.slice("file:".length);
  if (isAbsolute(clean)) clean = toPosix(relative(rootAbs, clean));
  return normalizeSegments(clean);
}

function resolveTarget(store: CodeGraphStore, rootAbs: string, input: string): TargetMatch {
  const direct = store.getNode(input);
  if (direct) {
    return { kind: direct.kind === "module" ? "file" : "symbol", node: direct, matches: [direct] };
  }

  const rel = normalizeTarget(rootAbs, input);
  const module = store.getNode(moduleNodeId(rel));
  if (module) return { kind: "file", node: module, matches: [module] };

  const symbols = store
    .nodes()
    .filter((node) => node.name === input && node.kind !== "module" && node.kind !== "import-source");
  if (symbols.length > 0) return { kind: "symbol", node: symbols[0], matches: symbols };

  const modules = store.nodes().filter((node) => node.kind === "module" && node.name === input);
  if (modules.length > 0) return { kind: "file", node: modules[0], matches: modules };

  throw new Error(`impact: no file or symbol matches "${input}"`);
}

function compareCallers(a: CallerRelation, b: CallerRelation): number {
  const aCaller = a.caller?.id ?? "";
  const bCaller = b.caller?.id ?? "";
  if (aCaller !== bCaller) return aCaller < bCaller ? -1 : 1;
  if (a.symbol.id !== b.symbol.id) return a.symbol.id < b.symbol.id ? -1 : 1;
  const aKey = edgeKey(a.edge);
  const bKey = edgeKey(b.edge);
  return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
}

export async function impactCommand(args: ImpactArgs): Promise<ImpactResult> {
  if (!args.target?.trim()) throw new Error("impact: target required");
  const rootAbs = resolve(args.root ?? process.cwd());
  const { graph } = await scanRepo(rootAbs);
  const store = new CodeGraphStore(graph);
  const query = new CodeGraphQuery(store);

  const target = resolveTarget(store, rootAbs, args.target.trim());
  const targetFile = target.node.file;

  const definitions =
    target.kind === "file" ? query.defsInExtracted(targetFile) : target.matches;

  const importers: ImpactRelation[] = [];
  const seenImporters = new Set<string>();
  for (const entry of query.neighbors(moduleNodeId(targetFile), {
    direction: "in",
    kinds: ["imports"],
  })) {
    if (!entry.node || seenImporters.has(entry.node.id)) continue;
    seenImporters.add(entry.node.id);
    importers.push({ node: entry.node, edge: entry.edge });
  }

  const callerTargets = target.kind === "file" ? definitions : target.matches;
  const callers: CallerRelation[] = [];
  for (const symbol of callerTargets) {
    for (const entry of query.neighbors(symbol.id, { direction: "in", kinds: ["calls"] })) {
      callers.push({ symbol, caller: entry.node ?? null, edge: entry.edge });
    }
  }
  callers.sort(compareCallers);

  let path: ImpactPath | null = null;
  if (args.to?.trim()) {
    const toTarget = resolveTarget(store, rootAbs, args.to.trim());
    const nodeIds = query.shortestPath(target.node.id, toTarget.node.id, { direction: "both" });
    if (nodeIds) {
      const nodes = nodeIds
        .map((id) => store.getNode(id))
        .filter((node): node is CodeNode => node !== undefined);
      const edges: CodeEdge[] = [];
      for (let i = 1; i < nodeIds.length; i += 1) {
        const from = nodeIds[i - 1];
        const to = nodeIds[i];
        for (const edge of store.edges()) {
          if ((edge.from === from && edge.to === to) || (edge.from === to && edge.to === from)) {
            edges.push(edge);
          }
        }
      }
      path = { from: target.node.id, to: toTarget.node.id, nodeIds, nodes, edges };
    }
  }

  return {
    root: rootAbs,
    query: args.target.trim(),
    kind: target.kind,
    node: target.node,
    matches: target.matches,
    definitions,
    importers,
    callers,
    path,
  };
}
