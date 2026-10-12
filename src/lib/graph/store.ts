// SPDX-License-Identifier: Apache-2.0

// Operations on .superskill/ use raw fs (not VaultFS) because .superskill/ is
// project-local, not inside the vault. VaultFS enforces vault-specific security policies.

import { readFile, writeFile, rename, mkdir, appendFile, open, unlink, stat, type FileHandle } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { GRAPH_SCHEMA_VERSION } from "./schema.js";
import type {
  Graph,
  Node,
  Edge,
  NodeType,
  SessionNode,
} from "./schema.js";

const GRAPH_FILE = ".superskill/graph.json";
const LOCK_STALE_MS = 60_000;

export function createEmptyGraph(): Graph {
  return { version: GRAPH_SCHEMA_VERSION, nodes: [], edges: [] };
}

const GITIGNORE_ENTRY = ".superskill/";

/** Per-developer context. Never commit — each clone keeps its own trajectory. */
export async function ensureSuperskillGitignore(projectDir: string): Promise<void> {
  const gi = join(projectDir, ".gitignore");
  let current = "";
  try {
    current = await readFile(gi, "utf-8");
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw err;
  }
  const lines = current.split(/\r?\n/);
  const already = lines.some((l) => {
    const t = l.trim();
    return t === ".superskill/" || t === ".superskill" || t === "/.superskill/" || t === "/.superskill";
  });
  if (already) return;
  const prefix = current.length === 0 || current.endsWith("\n") ? "" : "\n";
  await appendFile(gi, `${prefix}# SuperSkill local context (per-developer; do not share)\n${GITIGNORE_ENTRY}\n`);
}

export async function ensureSuperskillDir(projectDir: string): Promise<string> {
  const dir = join(projectDir, ".superskill");
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await ensureSuperskillGitignore(projectDir);
  return dir;
}

function migrateGraph(parsed: Partial<Graph>): Graph {
  return {
    version: GRAPH_SCHEMA_VERSION,
    ...(typeof parsed.catalogVersion === "string" ? { catalogVersion: parsed.catalogVersion } : {}),
    nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
    edges: Array.isArray(parsed.edges) ? parsed.edges : [],
  };
}

export async function loadGraph(projectDir: string): Promise<Graph> {
  const path = join(projectDir, GRAPH_FILE);
  try {
    const raw = await readFile(path, "utf-8");
    const parsed = JSON.parse(raw) as Partial<Graph>;
    return migrateGraph(parsed);
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") {
      return createEmptyGraph();
    }
    console.error("[graph-store] failed to load graph:", (err as Error).message);
    return createEmptyGraph();
  }
}

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

function lockIsStale(raw: string, mtimeMs: number): boolean {
  let body: { pid?: unknown; createdAt?: unknown } | null = null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") body = parsed;
  } catch {
    body = null;
  }
  if (body && Number.isInteger(body.pid) && (body.pid as number) > 0) {
    return !processAlive(body.pid as number);
  }
  const baseline = typeof body?.createdAt === "number" ? body.createdAt : mtimeMs;
  return Date.now() - baseline > LOCK_STALE_MS;
}

function lockToken(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return typeof (parsed as { token?: unknown }).token === "string" ? (parsed as { token: string }).token : null;
  } catch {
    return null;
  }
}

async function removeStaleGraphLock(lockPath: string): Promise<boolean> {
  let raw: string;
  try {
    raw = await readFile(lockPath, "utf-8");
  } catch {
    return false;
  }
  let mtimeMs: number;
  try {
    mtimeMs = (await stat(lockPath)).mtimeMs;
  } catch {
    return false;
  }
  if (!lockIsStale(raw, mtimeMs)) return false;
  let before;
  try {
    before = await stat(lockPath);
  } catch {
    return false;
  }
  let current: string;
  try {
    current = await readFile(lockPath, "utf-8");
  } catch {
    return false;
  }
  if (current !== raw) return false;
  try {
    const after = await stat(lockPath);
    if (after.ino !== before.ino || after.dev !== before.dev) return false;
    await unlink(lockPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return true;
    console.error("[graph-store] failed to remove stale graph lock:", (error as Error).message);
    return false;
  }
  console.error(`[graph-store] recovered stale graph lock: ${lockPath}`);
  return true;
}

async function withGraphLock<T>(projectDir: string, action: () => Promise<T>, timeoutMs = 5000): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) throw new Error("Invalid graph lock timeout");
  const dir = join(projectDir, ".superskill");
  await mkdir(dir, { recursive: true });
  const lockPath = join(dir, "graph.lock");
  const token = randomUUID();
  const body = JSON.stringify({ pid: process.pid, createdAt: Date.now(), token });
  const deadline = Date.now() + timeoutMs;
  let handle: FileHandle | undefined;
  while (!handle) {
    try {
      handle = await open(lockPath, "wx", 0o600);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (await removeStaleGraphLock(lockPath)) continue;
      if (Date.now() >= deadline) throw new Error(`Timed out acquiring graph lock: ${lockPath}`);
      await new Promise((resolve) => setTimeout(resolve, Math.min(25, Math.max(1, deadline - Date.now()))));
    }
  }
  try {
    await handle.writeFile(body);
  } catch (error) {
    await discardFailedLock(handle, lockPath);
    throw error;
  }
  try {
    await handle.close();
  } catch (error) {
    console.error("[graph-store] failed to close graph lock handle:", (error as Error).message);
  }
  try {
    return await action();
  } finally {
    await releaseGraphLock(lockPath, token);
  }
}

async function discardFailedLock(handle: FileHandle, lockPath: string): Promise<void> {
  let identity;
  try {
    identity = await handle.stat();
  } catch {
    identity = undefined;
  }
  try {
    await handle.close();
  } catch (error) {
    console.error("[graph-store] failed to close a lock handle after a write failure:", (error as Error).message);
  }
  if (!identity) return;
  try {
    const current = await stat(lockPath);
    if (current.ino === identity.ino && current.dev === identity.dev) await unlink(lockPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("[graph-store] failed to clean an unwritten lock:", (error as Error).message);
    }
  }
}

async function releaseGraphLock(lockPath: string, token: string): Promise<void> {
  let raw: string;
  try {
    raw = await readFile(lockPath, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  if (lockToken(raw) !== token) return;
  await unlink(lockPath);
}

async function persistGraph(projectDir: string, graph: Graph): Promise<void> {
  const targetPath = join(projectDir, GRAPH_FILE);
  const tmpPath = join(dirname(targetPath), `.graph-${randomUUID()}.tmp`);
  const persisted: Graph = { ...graph, version: GRAPH_SCHEMA_VERSION };
  try {
    await writeFile(tmpPath, JSON.stringify(persisted, null, 2), { encoding: "utf-8", flag: "wx", mode: 0o600 });
    await rename(tmpPath, targetPath);
  } finally {
    try {
      await unlink(tmpPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}

export async function writeGraph(projectDir: string, graph: Graph): Promise<void> {
  await withGraphLock(projectDir, () => persistGraph(projectDir, graph));
}

async function quarantineCorruptGraph(projectDir: string, error: unknown): Promise<void> {
  const path = join(projectDir, GRAPH_FILE);
  const quarantine = `${path}.corrupt-${Date.now()}`;
  try {
    await rename(path, quarantine);
    console.error(`[graph-store] quarantined corrupt graph to ${quarantine}: ${error instanceof Error ? error.message : String(error)}`);
  } catch (renameError) {
    console.error("[graph-store] failed to quarantine corrupt graph:", (renameError as Error).message);
  }
}

export async function mutateGraph(
  projectDir: string,
  mutate: (graph: Graph) => Graph | Promise<Graph>,
  options: { timeoutMs?: number } = {},
): Promise<Graph> {
  return withGraphLock(projectDir, async () => {
    let graph: Graph;
    try {
      const parsed = JSON.parse(await readFile(join(projectDir, GRAPH_FILE), "utf-8")) as Partial<Graph>;
      if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
        throw new Error("Invalid graph structure");
      }
      graph = migrateGraph(parsed);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        graph = createEmptyGraph();
      } else {
        await quarantineCorruptGraph(projectDir, error);
        graph = createEmptyGraph();
      }
    }
    const updated = await mutate(graph);
    await persistGraph(projectDir, updated);
    return updated;
  }, options.timeoutMs);
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
  return { ...graph, nodes: [...otherNodes, ...kept], edges: keptEdges };
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
