// SPDX-License-Identifier: Apache-2.0

// Operations on .superskill/ use raw fs (not VaultFS) because .superskill/ is
// project-local, not inside the vault. VaultFS enforces vault-specific security policies.

import { readFile, writeFile, rename, mkdir, appendFile, open, unlink, lstat, link, readdir, type FileHandle } from "node:fs/promises";
import { constants, type Stats } from "node:fs";
import { join, dirname } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { GRAPH_SCHEMA_VERSION, GraphCorruptionError, validateGraph, edgeIdentity, normalizeEdge } from "./schema.js";
import type {
  Graph,
  Node,
  Edge,
  NodeType,
  SessionNode,
} from "./schema.js";

const GRAPH_FILE = ".superskill/graph.json";
const LOCK_STALE_MS = 60_000;
export const MAX_GRAPH_BYTES = 16 * 1024 * 1024;
const MAX_CORRUPT_BACKUPS = 5;
const BACKUP_NAME = /^graph\.json\.corrupt-\d+-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const BACKUP_OWNER = "superskill:graph-corruption:v1";
const execFileAsync = promisify(execFile);

function sameFile(a: Pick<Stats, "ino" | "dev">, b: Pick<Stats, "ino" | "dev">): boolean {
  return a.ino === b.ino && a.dev === b.dev;
}

function unchangedFile(a: Stats, b: Stats): boolean {
  return sameFile(a, b) && a.size === b.size && a.mtimeMs === b.mtimeMs && a.ctimeMs === b.ctimeMs;
}

async function assertGraphPaths(projectDir: string, create = false): Promise<boolean> {
  const dir = join(projectDir, ".superskill");
  let info: Stats;
  try {
    info = await lstat(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    if (!create) return false;
    try {
      await mkdir(dir, { mode: 0o700 });
    } catch (mkdirError) {
      if ((mkdirError as NodeJS.ErrnoException).code !== "EEXIST") throw mkdirError;
    }
    info = await lstat(dir);
  }
  if (info.isSymbolicLink()) throw new Error(`Refusing symlinked graph directory: ${dir}`);
  if (!info.isDirectory()) throw new Error(`Graph directory is not a directory: ${dir}`);
  try {
    const graph = await lstat(join(projectDir, GRAPH_FILE));
    if (graph.isSymbolicLink()) throw new Error("Refusing symlinked graph.json");
    if (!graph.isFile()) throw new Error("Graph path is not a regular file");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return true;
}

async function readBounded(path: string, limit: number, label: string): Promise<{ raw: Buffer; identity: Stats }> {
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const identity = await handle.stat();
    if (!identity.isFile()) throw new Error(`${label} is not a regular file`);
    if (identity.size > limit) throw new Error(`${label} exceeds ${limit} byte limit`);
    const chunks: Buffer[] = [];
    const buffer = Buffer.alloc(Math.min(64 * 1024, limit + 1));
    let total = 0;
    while (total <= limit) {
      const { bytesRead } = await handle.read(buffer, 0, Math.min(buffer.length, limit + 1 - total), null);
      if (bytesRead === 0) break;
      total += bytesRead;
      if (total > limit) throw new Error(`${label} exceeds ${limit} byte limit`);
      chunks.push(Buffer.from(buffer.subarray(0, bytesRead)));
    }
    return { raw: Buffer.concat(chunks, total), identity };
  } finally {
    try {
      await handle.close();
    } catch (error) {
      console.error("[graph-store] failed to close graph read handle:", (error as Error).message);
    }
  }
}

function decodeGraph(raw: Buffer): Graph {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.toString("utf8"));
  } catch (error) {
    throw new GraphCorruptionError("malformed JSON", { cause: error });
  }
  return validateGraph(parsed);
}

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
  await assertGraphPaths(projectDir, true);
  await ensureSuperskillGitignore(projectDir);
  return dir;
}

export async function loadGraph(projectDir: string): Promise<Graph> {
  if (!await assertGraphPaths(projectDir)) return createEmptyGraph();
  const path = join(projectDir, GRAPH_FILE);
  try {
    return decodeGraph((await readBounded(path, MAX_GRAPH_BYTES, "Graph")).raw);
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return createEmptyGraph();
    console.error("[graph-store] failed to load graph:", (err as Error).message);
    throw err;
  }
}

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ESRCH" && code !== "EPERM") console.error("[graph-store] unable to probe graph lock process:", (error as Error).message);
    return code !== "ESRCH";
  }
}

async function processStart(pid: number): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("/bin/ps", ["-o", "lstart=", "-p", String(pid)], { timeout: 1000, maxBuffer: 4096, env: { ...process.env, LC_ALL: "C", TZ: "UTC" } });
    return stdout.trim() || undefined;
  } catch (error) {
    console.error("[graph-store] unable to establish process start identity:", (error as Error).message);
    return undefined;
  }
}

let ownProcessStart: Promise<string | undefined> | undefined;

async function lockIsStale(raw: string, mtimeMs: number): Promise<boolean> {
  let body: { pid?: unknown; createdAt?: unknown; host?: unknown; processStart?: unknown } | null = null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") body = parsed;
  } catch {
    body = null;
  }
  if (body?.host !== undefined && body.host !== hostname()) return false;
  if (body && Number.isSafeInteger(body.pid) && (body.pid as number) > 0) {
    if (!processAlive(body.pid as number)) return true;
    if (body.host !== hostname() || typeof body.processStart !== "string" || !body.processStart) return false;
    const currentStart = body.pid === process.pid
      ? await (ownProcessStart ??= processStart(process.pid))
      : await processStart(body.pid as number);
    return currentStart !== undefined && currentStart !== body.processStart;
  }
  const baseline = typeof body?.createdAt === "number" && Number.isFinite(body.createdAt) ? Math.max(body.createdAt, mtimeMs) : mtimeMs;
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

async function removeStaleGraphLock(lockPath: string, assertDirectory: () => Promise<void>): Promise<boolean> {
  try {
    await assertDirectory();
    const before = await readBounded(lockPath, 16 * 1024, "Graph lock");
    if (!await lockIsStale(before.raw.toString("utf8"), before.identity.mtimeMs)) return false;
    const current = await readBounded(lockPath, 16 * 1024, "Graph lock");
    if (!sameFile(current.identity, before.identity) || !current.raw.equals(before.raw)) return false;
    await assertDirectory();
    if (!sameFile(await lstat(lockPath), before.identity)) return false;
    await unlink(lockPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return true;
    console.error("[graph-store] failed to remove stale graph lock:", (error as Error).message);
    return false;
  }
  console.error(`[graph-store] recovered stale graph lock: ${lockPath}`);
  return true;
}

async function withGraphLock<T>(projectDir: string, action: (assertOwned: () => Promise<void>) => Promise<T>, timeoutMs = 5000): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) throw new Error("Invalid graph lock timeout");
  const dir = join(projectDir, ".superskill");
  await assertGraphPaths(projectDir, true);
  const directoryIdentity = await lstat(dir);
  const assertDirectory = async () => {
    const current = await lstat(dir);
    if (current.isSymbolicLink()) throw new Error("Refusing symlinked graph directory");
    if (!current.isDirectory() || !sameFile(current, directoryIdentity)) throw new Error("Graph directory changed while locking");
  };
  const lockPath = join(dir, "graph.lock");
  const token = randomUUID();
  ownProcessStart ??= processStart(process.pid);
  const body = JSON.stringify({ pid: process.pid, host: hostname(), processStart: await ownProcessStart, createdAt: Date.now(), token });
  const deadline = Date.now() + timeoutMs;
  let handle: FileHandle | undefined;
  while (!handle) {
    await assertDirectory();
    try {
      handle = await open(lockPath, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (await removeStaleGraphLock(lockPath, assertDirectory)) continue;
      if (Date.now() >= deadline) throw new Error(`Timed out acquiring graph lock: ${lockPath}`);
      await new Promise((resolve) => setTimeout(resolve, Math.min(25, Math.max(1, deadline - Date.now()))));
    }
  }
  let identity: Stats;
  try {
    identity = await handle.stat();
    await handle.writeFile(body);
  } catch (error) {
    await discardFailedLock(handle, lockPath, assertDirectory);
    throw error;
  }
  try {
    await handle.close();
  } catch (error) {
    console.error("[graph-store] failed to close graph lock handle:", (error as Error).message);
  }
  const assertOwned = async () => {
    await assertDirectory();
    await assertGraphPaths(projectDir);
    const current = await readBounded(lockPath, 16 * 1024, "Graph lock");
    if (!sameFile(current.identity, identity) || lockToken(current.raw.toString("utf8")) !== token) throw new Error("Graph lock ownership lost");
  };
  let failed = false;
  try {
    await assertOwned();
    return await action(assertOwned);
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    try {
      await releaseGraphLock(lockPath, token, identity, assertDirectory);
    } catch (error) {
      console.error("[graph-store] failed to release graph lock:", (error as Error).message);
      if (!failed) throw error;
    }
  }
}

async function discardFailedLock(handle: FileHandle, lockPath: string, assertDirectory: () => Promise<void>): Promise<void> {
  let identity;
  try {
    identity = await handle.stat();
  } catch (error) {
    console.error("[graph-store] failed to identify an unwritten lock:", (error as Error).message);
    identity = undefined;
  }
  try {
    await handle.close();
  } catch (error) {
    console.error("[graph-store] failed to close a lock handle after a write failure:", (error as Error).message);
  }
  if (!identity) return;
  try {
    await assertDirectory();
    const current = await lstat(lockPath);
    if (sameFile(current, identity)) await unlink(lockPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("[graph-store] failed to clean an unwritten lock:", (error as Error).message);
    }
  }
}

async function releaseGraphLock(lockPath: string, token: string, identity: Stats, assertDirectory: () => Promise<void>): Promise<void> {
  try {
    await assertDirectory();
    const current = await readBounded(lockPath, 16 * 1024, "Graph lock");
    if (!sameFile(current.identity, identity) || lockToken(current.raw.toString("utf8")) !== token) return;
    await assertDirectory();
    if (sameFile(await lstat(lockPath), identity)) await unlink(lockPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
}

async function persistGraph(projectDir: string, graph: Graph, assertOwned: () => Promise<void>): Promise<Graph> {
  const targetPath = join(projectDir, GRAPH_FILE);
  const tmpPath = join(dirname(targetPath), `.graph-${randomUUID()}.tmp`);
  const persisted = validateGraph(graph);
  const raw = JSON.stringify(persisted, null, 2);
  if (Buffer.byteLength(raw) > MAX_GRAPH_BYTES) throw new Error(`Graph exceeds ${MAX_GRAPH_BYTES} byte limit`);
  await assertOwned();
  let handle: FileHandle | undefined;
  let identity: Stats | undefined;
  try {
    handle = await open(tmpPath, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    identity = await handle.stat();
    await handle.writeFile(raw, "utf8");
    await handle.close();
    handle = undefined;
    await assertOwned();
    await rename(tmpPath, targetPath);
    return persisted;
  } finally {
    if (handle) {
      try {
        await handle.close();
      } catch (error) {
        console.error("[graph-store] failed to close graph temporary file:", (error as Error).message);
      }
    }
    try {
      if (identity) {
        await assertOwned();
        if (sameFile(await lstat(tmpPath), identity)) await unlink(tmpPath);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("[graph-store] failed to clean graph temporary file:", (error as Error).message);
    }
  }
}

export async function writeGraph(projectDir: string, graph: Graph): Promise<void> {
  const validated = validateGraph(graph);
  await mutateGraph(projectDir, () => validated);
}

async function pruneCorruptBackups(projectDir: string, assertOwned: () => Promise<void>): Promise<void> {
  await assertOwned();
  const dir = join(projectDir, ".superskill");
  const owned: Array<{ name: string; createdAt: number; identity: Stats; metadataIdentity: Stats }> = [];
  for (const entry of await readdir(dir)) {
    if (!entry.endsWith(".meta") || !BACKUP_NAME.test(entry.slice(0, -5))) continue;
    try {
      const metadata = await readBounded(join(dir, entry), 4096, "Graph backup metadata");
      const body = JSON.parse(metadata.raw.toString("utf8"));
      if (body?.owner !== BACKUP_OWNER || body.name !== entry.slice(0, -5) || !Number.isFinite(body.createdAt)) continue;
      const backup = await readBounded(join(dir, body.name), MAX_GRAPH_BYTES, "Graph backup");
      if (!sameFile(backup.identity, body) || createHash("sha256").update(backup.raw).digest("hex") !== body.sha256) continue;
      owned.push({ name: body.name, createdAt: body.createdAt, identity: backup.identity, metadataIdentity: metadata.identity });
    } catch (error) {
      console.error("[graph-store] preserving unverifiable graph backup:", (error as Error).message);
    }
  }
  owned.sort((a, b) => b.createdAt - a.createdAt || b.name.localeCompare(a.name));
  for (const backup of owned.slice(MAX_CORRUPT_BACKUPS)) {
    try {
      await assertOwned();
      if (!unchangedFile(await lstat(join(dir, backup.name)), backup.identity) || !unchangedFile(await lstat(join(dir, `${backup.name}.meta`)), backup.metadataIdentity)) continue;
      await unlink(join(dir, backup.name));
      await unlink(join(dir, `${backup.name}.meta`));
    } catch (error) {
      console.error("[graph-store] failed to prune graph backup:", (error as Error).message);
    }
  }
}

async function quarantineCorruptGraph(projectDir: string, error: GraphCorruptionError, assertOwned: () => Promise<void>): Promise<void> {
  const path = join(projectDir, GRAPH_FILE);
  const createdAt = Date.now();
  const quarantine = `${path}.corrupt-${createdAt}-${randomUUID()}`;
  let linked = false;
  let metadataWritten = false;
  try {
    await assertOwned();
    const snapshot = await readBounded(path, MAX_GRAPH_BYTES, "Graph");
    try {
      decodeGraph(snapshot.raw);
      throw new Error("Graph changed before quarantine");
    } catch (currentError) {
      if (!(currentError instanceof GraphCorruptionError)) throw currentError;
    }
    await link(path, quarantine);
    linked = true;
    const current = await lstat(path);
    const backup = await lstat(quarantine);
    if (!sameFile(current, snapshot.identity) || !sameFile(backup, snapshot.identity) || current.size !== snapshot.identity.size || current.mtimeMs !== snapshot.identity.mtimeMs) throw new Error("Graph changed during quarantine");
    const metadata = { owner: BACKUP_OWNER, name: quarantine.slice(dirname(quarantine).length + 1), createdAt, ino: backup.ino, dev: backup.dev, sha256: createHash("sha256").update(snapshot.raw).digest("hex") };
    await writeFile(`${quarantine}.meta`, JSON.stringify(metadata), { flag: "wx", mode: 0o600 });
    metadataWritten = true;
    await assertOwned();
    await unlink(path);
    console.error(`[graph-store] quarantined corrupt graph to ${quarantine}: ${error.message}`);
  } catch (quarantineError) {
    console.error("[graph-store] failed to quarantine corrupt graph:", (quarantineError as Error).message);
    for (const cleanup of [...(metadataWritten ? [`${quarantine}.meta`] : []), ...(linked ? [quarantine] : [])]) {
      try {
        await assertOwned();
        await unlink(cleanup);
      } catch (cleanupError) {
        console.error("[graph-store] failed to clean incomplete graph backup:", (cleanupError as Error).message);
      }
    }
    throw error;
  }
  try {
    await pruneCorruptBackups(projectDir, assertOwned);
  } catch (cleanupError) {
    console.error("[graph-store] failed to prune graph backups:", (cleanupError as Error).message);
  }
}

export async function mutateGraph(
  projectDir: string,
  mutate: (graph: Graph) => Graph | Promise<Graph>,
  options: { timeoutMs?: number } = {},
): Promise<Graph> {
  return withGraphLock(projectDir, async (assertOwned) => {
    let graph: Graph;
    try {
      graph = await loadGraph(projectDir);
    } catch (error) {
      if (!(error instanceof GraphCorruptionError)) throw error;
      await quarantineCorruptGraph(projectDir, error, assertOwned);
      graph = createEmptyGraph();
    }
    const updated = await mutate(graph);
    return persistGraph(projectDir, updated, assertOwned);
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
  const normalized = normalizeEdge(edge);
  const edgeKey = edgeIdentity(normalized);
  const existing = graph.edges.findIndex((e) => edgeIdentity(e) === edgeKey);
  if (existing >= 0) {
    const edges = [...graph.edges];
    edges[existing] = normalized;
    return { ...graph, edges };
  }
  return { ...graph, edges: [...graph.edges, normalized] };
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
  if (!findNode(graph, type, id)) return graph;
  const nodes = graph.nodes.filter((n) => !(n.type === type && n.id === id));
  const edges = graph.edges.filter(e => {
    if (type === "project") return !(e.type === "project_skill" && e.from === id);
    if (type === "session") return !((e.type === "session_skill" || e.type === "session_file") && e.from === id);
    return !((e.type === "skill_skill" && (e.from === id || e.to === id)) ||
      ((e.type === "project_skill" || e.type === "session_skill") && e.to === id));
  });
  return { ...graph, nodes, edges };
}

export function pruneSessions(graph: Graph, keepLast: number): Graph {
  if (!Number.isSafeInteger(keepLast) || keepLast < 0) throw new Error("Invalid session retention limit");
  const sessions = findNodes<SessionNode>(graph, "session");
  const otherNodes = graph.nodes.filter((n) => n.type !== "session");
  const sorted = [...sessions].reverse().sort((a, b) => b.ts - a.ts);
  const kept = sorted.filter((session, index) => index < keepLast || session.insights.length > 0 || session.outcome === null);
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
  if (!Number.isFinite(decayRate) || decayRate < 0 || decayRate > 1 || !Number.isFinite(floor) || floor < 0 || floor > 1) throw new Error("Invalid graph weight decay parameters");
  const edges = graph.edges.map((e) => {
    if (e.type !== "project_skill" && e.type !== "skill_skill") return e;
    const current = Number.isFinite(e.w) ? Math.min(1, Math.max(0, e.w)) : floor;
    if (activatedIds.has(e.to) && (e.type === "project_skill" || activatedIds.has(e.from))) return current === e.w ? e : { ...e, w: current };
    const newW = Math.max(floor, current * (1 - decayRate));
    return { ...e, w: Math.round(newW * 10000) / 10000 };
  });
  return { ...graph, edges };
}
