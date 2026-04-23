// SPDX-License-Identifier: AGPL-3.0-or-later

// Operations on .superskill/ use raw fs (not VaultFS) because .superskill/ is
// project-local, not inside the vault. VaultFS enforces vault-specific security policies.

import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import type {
  Graph,
  Node,
  Edge,
  NodeType,
  SessionNode,
} from "./schema.js";

const GRAPH_FILE = ".superskill/graph.json";

export function createEmptyGraph(): Graph {
  return { nodes: [], edges: [] };
}

export async function ensureSuperskillDir(projectDir: string): Promise<string> {
  const dir = join(projectDir, ".superskill");
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  return dir;
}

export async function loadGraph(projectDir: string): Promise<Graph> {
  const path = join(projectDir, GRAPH_FILE);
  try {
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw) as Graph;
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") {
      return createEmptyGraph();
    }
    console.error("[graph-store] failed to load graph:", (err as Error).message);
    return createEmptyGraph();
  }
}

export async function writeGraph(projectDir: string, graph: Graph): Promise<void> {
  const targetPath = join(projectDir, GRAPH_FILE);
  const dir = dirname(targetPath);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  const tmpPath = join(
    tmpdir(),
    `graph-${randomUUID()}.json`,
  );
  try {
    await writeFile(tmpPath, JSON.stringify(graph, null, 2), "utf-8");
    await rename(tmpPath, targetPath);
  } catch (err) {
    console.error("[graph-store] failed to write graph:", (err as Error).message);
    throw err;
  }
}

export function findNode<T extends Node>(
  graph: Graph,
  type: NodeType,
  id: string,
): T | undefined {
  return graph.nodes.find(
    (n) => n.type === type && n.id === id,
  ) as T | undefined;
}

export function findNodes<T extends Node>(
  graph: Graph,
  type: NodeType,
): T[] {
  return graph.nodes.filter((n) => n.type === type) as T[];
}

export function addNode(graph: Graph, node: Node): Graph {
  const existing = graph.nodes.findIndex(
    (n) => n.type === node.type && n.id === node.id,
  );
  if (existing >= 0) {
    const nodes = [...graph.nodes];
    nodes[existing] = node;
    return { ...graph, nodes };
  }
  return { ...graph, nodes: [...graph.nodes, node] };
}

export function addEdge(graph: Graph, edge: Edge): Graph {
  const key = (e: Edge) => `${e.type}:${e.from}:${e.to}`;
  const edgeKey = key(edge);
  const existing = graph.edges.findIndex((e) => key(e) === edgeKey);
  if (existing >= 0) {
    const edges = [...graph.edges];
    edges[existing] = edge;
    return { ...graph, edges };
  }
  return { ...graph, edges: [...graph.edges, edge] };
}

export function updateNode(
  graph: Graph,
  type: NodeType,
  id: string,
  patch: Partial<Node>,
): Graph {
  const idx = graph.nodes.findIndex((n) => n.type === type && n.id === id);
  if (idx < 0) return graph;
  const nodes = [...graph.nodes];
  nodes[idx] = { ...nodes[idx], ...patch } as Node;
  return { ...graph, nodes };
}

export function removeNode(graph: Graph, type: NodeType, id: string): Graph {
  const nodes = graph.nodes.filter((n) => !(n.type === type && n.id === id));
  const edges = graph.edges.filter(
    (e) => !(e.from === id || e.to === id),
  );
  return { ...graph, nodes, edges };
}

export function pruneSessions(graph: Graph, keepLast: number): Graph {
  const sessions = findNodes<SessionNode>(graph, "session");
  const otherNodes = graph.nodes.filter((n) => n.type !== "session");
  const sorted = [...sessions].sort((a, b) => b.ts - a.ts);
  const kept = sorted.slice(0, keepLast);
  const keptIds = new Set(kept.map((s) => s.id));
  const keptEdges = graph.edges.filter((e) => {
    if (e.type === "session_skill" || e.type === "session_file") {
      return keptIds.has(e.from);
    }
    return true;
  });
  return { nodes: [...otherNodes, ...kept], edges: keptEdges };
}

export function decayWeights(
  graph: Graph,
  activatedIds: Set<string>,
  decayRate: number,
  floor: number,
): Graph {
  const edges = graph.edges.map((e) => {
    if (e.type !== "project_skill") return e;
    if (activatedIds.has(e.to)) return e;
    const newW = Math.max(floor, e.w * (1 - decayRate));
    return { ...e, w: Math.round(newW * 10000) / 10000 };
  });
  return { ...graph, edges };
}
