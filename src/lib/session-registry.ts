// SPDX-License-Identifier: Apache-2.0
import { mkdir, unlink, open, rename, realpath, stat, lstat, type FileHandle } from "fs/promises";
import { constants, type Stats } from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import { hostname } from "os";
import { resolve, dirname, isAbsolute, join } from "path";
import { randomBytes } from "crypto";
import { VaultFS, assertSafeVaultContent } from "./vault-fs.js";
import type { CleanupWorkspaceIdentity } from "./worktree/cleanup.js";

export type SessionStatus = "active" | "completed" | "expired";

export interface Session {
  id: string;
  tool: string;
  project: string | null;
  task_summary: string | null;
  files_touched: string[];
  started_at: string;
  last_heartbeat: string;
  completed_at: string | null;
  status: SessionStatus;
  workspace_path?: string;
  workspace_identity?: CleanupWorkspaceIdentity;
  expired_at?: string;
  pid?: number;
  host?: string;
  process_identity?: string;
  lease_expires_at?: string;
}

export interface SessionRegistry {
  sessions: Session[];
}

export interface Conflict {
  session_id: string;
  tool: string;
  overlapping_files: string[];
  task_summary: string | null;
}

export type ClaimResult =
  | { granted: true }
  | {
      granted: false;
      holder: { session_id: string; tool: string; task_summary: string | null };
    };

export interface RegisterResult {
  session_id: string;
  conflicts: Conflict[];
  claim: ClaimResult;
}

export interface HeartbeatResult {
  found: boolean;
  conflicts: Conflict[];
}

export interface CompleteResult {
  found: boolean;
}

const LEASE_TTL_MS = 15 * 60 * 1000;
const INTERRUPTED_HEARTBEAT_MS = 10 * 60 * 1000;
const LOCK_TIMEOUT_MS = 10_000;
const LOCK_STALE_MS = 60 * 1000;
const REGISTRY_MAX_BYTES = 8 * 1024 * 1024;
const REGISTRY_MAX_SESSIONS = 20_000;
const execFileAsync = promisify(execFile);
let ownIdentity: Promise<string | undefined> | undefined;

interface LockBody {
  pid?: unknown;
  createdAt?: unknown;
  timestamp?: unknown;
  token?: unknown;
  host?: unknown;
  identity?: unknown;
  leaseExpiresAt?: unknown;
}

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

function validPid(pid: unknown): pid is number {
  return typeof pid === "number" && Number.isSafeInteger(pid) && pid > 0 && pid <= 2_147_483_647;
}

async function processIdentity(pid: number): Promise<string | undefined> {
  const inspect = async () => {
    try {
      const { stdout } = await execFileAsync("ps", ["-p", String(pid), "-o", "lstart="], { timeout: 1000, maxBuffer: 1024, env: { ...process.env, LC_ALL: "C", TZ: "UTC" } });
      return stdout.trim() || undefined;
    } catch (error) {
      if ((error as { code?: unknown }).code !== 1) {
        console.error("[session-registry] Could not inspect process identity:", (error as Error).message);
      }
      return undefined;
    }
  };
  if (pid !== process.pid) return inspect();
  ownIdentity ??= inspect();
  return ownIdentity;
}

async function lockIsStale(raw: string, mtimeMs: number): Promise<boolean> {
  let body: LockBody | null = null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") body = parsed as LockBody;
  } catch {
    body = null;
  }
  const createdAt =
    typeof body?.createdAt === "number"
      ? body.createdAt
      : typeof body?.timestamp === "string"
        ? Date.parse(body.timestamp)
        : NaN;
  const baseline = Number.isFinite(createdAt) ? createdAt : mtimeMs;
  if (typeof body?.host === "string" && body.host !== hostname()) {
    const lease = typeof body.leaseExpiresAt === "number" && Number.isFinite(body.leaseExpiresAt)
      ? Math.max(body.leaseExpiresAt, baseline + LEASE_TTL_MS)
      : baseline + LEASE_TTL_MS;
    return Date.now() > lease;
  }
  if (body && validPid(body.pid)) {
    if (processAlive(body.pid)) {
      if (body.host !== hostname() || typeof body.identity !== "string") return false;
      const identity = await processIdentity(body.pid);
      return identity !== undefined && identity !== body.identity;
    }
    if (body.host === hostname()) return true;
  }
  return Date.now() - baseline > LOCK_STALE_MS;
}

function lockToken(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return typeof (parsed as LockBody).token === "string" ? ((parsed as LockBody).token as string) : null;
  } catch {
    return null;
  }
}

export async function coordinationPath(vaultPath: string, path: string, createParents = false): Promise<string> {
  const vaultFs = new VaultFS(vaultPath);
  const root = await realpath(vaultPath);
  try { await vaultFs.verifyNoSymlinkEscape(path); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  const segments = path.split("/");
  if (segments.some(segment => !segment || segment === "." || segment === "..")) throw new Error(`Unsafe coordination path: ${path}`);
  let current = root;
  for (const [index, segment] of segments.entries()) {
    current = join(current, segment);
    let info;
    try {
      info = await lstat(current);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      if (!createParents || index === segments.length - 1) continue;
      try { await mkdir(current, { mode: 0o700 }); }
      catch (mkdirError) { if ((mkdirError as NodeJS.ErrnoException).code !== "EEXIST") throw mkdirError; }
      info = await lstat(current);
    }
    if (info.isSymbolicLink()) throw new Error(`Unsafe coordination symlink: ${path}`);
    if (index < segments.length - 1 && !info.isDirectory()) throw new Error(`Unsafe coordination directory: ${path}`);
  }
  return current;
}

async function readCoordinationSnapshot(vaultPath: string, path: string, maxBytes: number): Promise<{ raw: string; identity: Stats } | null> {
  const abs = await coordinationPath(vaultPath, path);
  let handle: FileHandle;
  try { handle = await open(abs, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
  try {
    const identity = await handle.stat();
    if (!identity.isFile()) throw Object.assign(new Error(`Coordination file is not a regular file: ${path}`), { code: identity.isDirectory() ? "EISDIR" : "EINVAL" });
    if (identity.size > maxBytes) throw new Error(`Coordination file exceeds ${maxBytes} byte limit: ${path}`);
    const bytes = Buffer.alloc(Math.min(maxBytes + 1, identity.size + 1));
    let offset = 0;
    while (offset < bytes.length) {
      const { bytesRead } = await handle.read(bytes, offset, bytes.length - offset, offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    if (offset > maxBytes || (await handle.stat()).size > maxBytes) throw new Error(`Coordination file exceeds ${maxBytes} byte limit: ${path}`);
    if (await coordinationPath(vaultPath, path) !== abs) throw new Error(`Coordination path changed while reading: ${path}`);
    const current = await lstat(abs);
    if (current.dev !== identity.dev || current.ino !== identity.ino || current.size !== offset || current.mtimeMs !== identity.mtimeMs || current.ctimeMs !== identity.ctimeMs) throw Object.assign(new Error(`Coordination file changed while reading: ${path}`), { code: "COORDINATION_CHANGED" });
    return { raw: bytes.subarray(0, offset).toString("utf-8"), identity };
  } finally {
    await handle.close();
  }
}

export async function readCoordinationFile(vaultPath: string, path: string, maxBytes: number): Promise<string | null> {
  return (await readCoordinationSnapshot(vaultPath, path, maxBytes))?.raw ?? null;
}

async function readLockSnapshot(vaultPath: string, path: string): Promise<{ raw: string; identity: Stats } | null> {
  try { return await readCoordinationSnapshot(vaultPath, path, 16 * 1024); }
  catch (error) {
    if (["ENOENT", "COORDINATION_CHANGED"].includes((error as NodeJS.ErrnoException).code ?? "")) return null;
    throw error;
  }
}

async function recoverCoordinationLock(vaultPath: string, path: string, snapshot: { raw: string; identity: Stats }): Promise<boolean> {
  const gatePath = `${path}.recovery`;
  const gate = await coordinationPath(vaultPath, gatePath);
  const token = randomBytes(16).toString("hex");
  let handle: FileHandle;
  try { handle = await open(gate, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "EEXIST") return false; throw error; }
  let identity: Stats | undefined;
  let failed = false;
  let written = false;
  try {
    identity = await handle.stat();
    await handle.writeFile(JSON.stringify({ host: hostname(), pid: process.pid, identity: await processIdentity(process.pid), token, createdAt: Date.now() }));
    written = true;
    const current = await readLockSnapshot(vaultPath, path);
    if (!current || current.raw !== snapshot.raw || current.identity.dev !== snapshot.identity.dev || current.identity.ino !== snapshot.identity.ino || !await lockIsStale(current.raw, current.identity.mtimeMs)) return false;
    await unlink(await coordinationPath(vaultPath, path));
    console.error(`[session-registry] Recovered stale coordination lock: ${resolve(vaultPath, path)}`);
    return true;
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    try { await handle.close(); }
    catch (error) { console.error("[session-registry] Failed to close recovery gate:", (error as Error).message); }
    try {
      const current = await readLockSnapshot(vaultPath, gatePath);
      if (identity && current && current.identity.dev === identity.dev && current.identity.ino === identity.ino && (!written || lockToken(current.raw) === token)) await unlink(gate);
    } catch (error) {
      console.error("[session-registry] Failed to release recovery gate:", (error as Error).message);
      if (!failed) throw error;
    }
  }
}

export interface CoordinationLock {
  assertOwned(): Promise<void>;
}

export async function writeCoordinationFile(vaultPath: string, path: string, content: string, lock: CoordinationLock): Promise<void> {
  assertSafeVaultContent(content);
  const abs = await coordinationPath(vaultPath, path, true);
  const tempPath = `${path}.${process.pid}.${randomBytes(16).toString("hex")}.tmp`;
  const temp = await coordinationPath(vaultPath, tempPath);
  let created = false;
  try {
    const handle = await open(temp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    created = true;
    try { await handle.writeFile(content, "utf-8"); await handle.sync(); }
    finally { await handle.close(); }
    if (await coordinationPath(vaultPath, path) !== abs || await coordinationPath(vaultPath, tempPath) !== temp) throw new Error(`Coordination path changed while writing: ${path}`);
    await lock.assertOwned();
    await rename(temp, abs);
    const directory = await open(dirname(abs), constants.O_RDONLY | constants.O_NOFOLLOW);
    try { await directory.sync(); }
    finally { await directory.close(); }
  } finally {
    if (created) {
      try { if (await coordinationPath(vaultPath, tempPath) === temp) await unlink(temp); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("[session-registry] Could not clean temporary file:", (error as Error).message); }
    }
  }
}

export async function withCoordinationLock<T>(vaultPath: string, path: string, callback: (lock: CoordinationLock) => Promise<T>, timeoutMs = LOCK_TIMEOUT_MS): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0 || timeoutMs > 60_000) throw new Error("Coordination lock timeout must be between 0 and 60000 milliseconds");
  const token = randomBytes(16).toString("hex");
  const identity = await processIdentity(process.pid);
  const deadline = Date.now() + timeoutMs;
  let handle: FileHandle;
  let abs: string;
  let attempted = false;
  for (;;) {
    if (attempted && Date.now() >= deadline) throw new Error(`Timed out acquiring coordination lock: ${resolve(vaultPath, path)}. Remove it only after confirming its owner is no longer running.`);
    attempted = true;
    abs = await coordinationPath(vaultPath, path, true);
    try { handle = await open(abs, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600); break; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const snapshot = await readLockSnapshot(vaultPath, path);
      if (!snapshot) continue;
      if (await lockIsStale(snapshot.raw, snapshot.identity.mtimeMs)) {
        if (await recoverCoordinationLock(vaultPath, path, snapshot)) continue;
      }
      if (Date.now() >= deadline) throw new Error(`Timed out acquiring coordination lock: ${abs}. Remove it only after confirming its owner is no longer running.`);
      await new Promise(done => setTimeout(done, Math.min(25, Math.max(1, deadline - Date.now()))));
    }
  }
  let fileIdentity: Stats | undefined;
  const owned = async (requireToken = true) => {
    const current = await readLockSnapshot(vaultPath, path);
    return fileIdentity !== undefined && current !== null && current.identity.dev === fileIdentity.dev && current.identity.ino === fileIdentity.ino && (!requireToken || lockToken(current.raw) === token);
  };
  let failed = false;
  let written = false;
  try {
    fileIdentity = await handle.stat();
    await handle.writeFile(JSON.stringify({ pid: process.pid, host: hostname(), identity, createdAt: Date.now(), leaseExpiresAt: Date.now() + LEASE_TTL_MS, token }), "utf-8");
    written = true;
    await handle.sync();
    return await callback({ assertOwned: async () => { if (!await owned()) throw new Error(`Coordination lock ownership changed: ${abs}`); } });
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    try { await handle.close(); }
    catch (error) { console.error("[session-registry] Failed to close coordination lock:", (error as Error).message); }
    try { if (await owned(written)) await unlink(abs); }
    catch (error) {
      console.error("[session-registry] Failed to release coordination lock:", (error as Error).message);
      if (!failed) throw error;
    }
  }
}

export function validateSessionTool(tool: string): void {
  if (typeof tool !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(tool)) throw new Error("Invalid session tool name; use 1-64 alphanumeric, hyphen or underscore characters");
}

export function validateSessionFiles(files: string[]): void {
  if (!Array.isArray(files) || files.length > 2000 || files.some(file => typeof file !== "string" || file.length > 4096 || /[\x00-\x1f\x7f]/.test(file))) throw new Error("Invalid session files; provide at most 2000 bounded file paths without control characters");
}

async function canonicalPath(path: string): Promise<string> {
  try {
    return await realpath(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("[session-registry] Failed to resolve path:", (error as Error).message);
      throw error;
    }
    return resolve(path);
  }
}

/**
 * Manages the session registry for multi-agent coordination.
 * Uses exclusive lockfiles for safe concurrent access.
 */
export class SessionRegistryManager {
  private readonly registryPath = "coordination/session-registry.json";

  constructor(private readonly vaultPath: string, private readonly ttlHours: number, private readonly options: { lockTimeoutMs?: number } = {}) {
    if (!Number.isFinite(ttlHours) || ttlHours < 0 || ttlHours > 168) throw new Error("Session TTL must be between 0 and 168 hours");
  }

  /**
   * Register a new session. Returns session ID, any file conflicts, and the workspace claim.
   */
  async register(
    tool: string,
    project: string | null,
    taskSummary: string | null = null,
    filesTouched: string[] = [],
    workspacePath?: string,
    allowShared = false,
    workspaceIdentity?: CleanupWorkspaceIdentity,
  ): Promise<RegisterResult> {
    validateSessionTool(tool);
    validateSessionFiles(filesTouched);
    if (workspaceIdentity !== undefined && !validWorkspaceIdentity(workspaceIdentity)) throw new Error("Invalid session workspace identity");
    if (project !== null && (typeof project !== "string" || project.length > 128 || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(project) || project.includes(".."))) throw new Error("Invalid session project");
    if (taskSummary !== null && (typeof taskSummary !== "string" || taskSummary.length > 32_768)) throw new Error("Invalid session task summary");
    if (workspacePath !== undefined && (typeof workspacePath !== "string" || !isAbsolute(workspacePath))) {
      throw new Error("Session workspace_path must be an absolute path");
    }
    const sessionId = `${tool}-${randomBytes(4).toString("hex")}`;
    const identity = await processIdentity(process.pid);

    return await this.withLock(async (lock) => {
      const now = new Date().toISOString();
      let canonicalWorkspace: string | undefined;
      if (workspacePath !== undefined) {
        try {
          canonicalWorkspace = await realpath(workspacePath);
          const info = await stat(canonicalWorkspace);
          if (!info.isDirectory()) throw new Error("not a directory");
          if (workspaceIdentity && (workspaceIdentity.rootDev !== info.dev || workspaceIdentity.rootIno !== info.ino || workspaceIdentity.rootBirthtimeMs !== info.birthtimeMs)) throw new Error("directory identity changed");
        } catch {
          throw new Error("Session workspace_path must still be an existing directory when registering");
        }
      }

      const session: Session = {
        id: sessionId,
        tool,
        project,
        task_summary: taskSummary,
        files_touched: filesTouched,
        started_at: now,
        last_heartbeat: now,
        completed_at: null,
        status: "active",
        pid: process.pid,
        host: hostname(),
        ...(identity !== undefined ? { process_identity: identity } : {}),
        ...(canonicalWorkspace !== undefined
          ? {
              workspace_path: canonicalWorkspace,
              ...(workspaceIdentity !== undefined ? { workspace_identity: workspaceIdentity } : {}),
              lease_expires_at: new Date(Date.now() + LEASE_TTL_MS).toISOString(),
            }
          : {}),
      };

      const registry = await this.readRegistry();
      const expired = await this.cleanStale(registry);
      const pruned = await this.cleanOldCompleted(registry, lock);

      const conflicts = this.collectConflicts(registry.sessions, filesTouched, sessionId, project);

      if (canonicalWorkspace !== undefined && !allowShared) {
        const holder = await this.findClaimHolder(registry, canonicalWorkspace, sessionId);
        if (holder) {
          if (expired || pruned) await this.writeRegistry(registry, lock);
          return {
            session_id: sessionId,
            conflicts,
            claim: {
              granted: false,
              holder: { session_id: holder.id, tool: holder.tool, task_summary: holder.task_summary },
            },
          };
        }
      }

      registry.sessions.push(session);
      await this.writeRegistry(registry, lock);

      return { session_id: sessionId, conflicts, claim: { granted: true } };
    });
  }

  /**
   * Look up a session by id without modifying the registry.
   */
  async get(sessionId: string): Promise<Session | null> {
    return await this.withLock(async () => {
      const registry = await this.readRegistry();
      return registry.sessions.find((s) => s.id === sessionId) ?? null;
    });
  }

  /**
   * Update heartbeat for a session. Returns whether the session exists and any file overlaps.
   */
  async heartbeat(sessionId: string, filesTouched?: string[], project?: string | null): Promise<HeartbeatResult> {
    if (filesTouched !== undefined) validateSessionFiles(filesTouched);
    return await this.withLock(async (lock) => {
      const registry = await this.readRegistry();
      const session = registry.sessions.find((s) => s.id === sessionId);
      if (!session) return { found: false, conflicts: [] };
      this.assertProject(session, project);
      if (session.status !== "active") return { found: false, conflicts: [] };
      const now = new Date();
      session.last_heartbeat = now.toISOString();
      if (session.status === "active" && session.workspace_path !== undefined) {
        session.lease_expires_at = new Date(now.getTime() + LEASE_TTL_MS).toISOString();
      }
      if (filesTouched !== undefined) session.files_touched = filesTouched;
      const conflicts = this.collectConflicts(registry.sessions, session.files_touched, session.id, session.project);
      await this.writeRegistry(registry, lock);
      return { found: true, conflicts };
    });
  }

  /**
   * Mark a session as completed and release its workspace claim.
   */
  async complete(sessionId: string, summary?: string, project?: string | null, workspaceIdentity?: CleanupWorkspaceIdentity): Promise<CompleteResult> {
    if (summary !== undefined && (typeof summary !== "string" || summary.length > 32_768)) throw new Error("Invalid session task summary");
    if (workspaceIdentity !== undefined && !validWorkspaceIdentity(workspaceIdentity)) throw new Error("Invalid session workspace identity");
    return await this.withLock(async (lock) => {
      const registry = await this.readRegistry();
      const session = registry.sessions.find((s) => s.id === sessionId);
      if (!session) return { found: false };
      this.assertProject(session, project);
      const originalIdentity = session.workspace_identity;
      delete session.workspace_identity;
      if (workspaceIdentity && originalIdentity && Object.keys(originalIdentity).filter(key => key !== "head").every(key => originalIdentity[key as keyof CleanupWorkspaceIdentity] === workspaceIdentity[key as keyof CleanupWorkspaceIdentity])) session.workspace_identity = workspaceIdentity;
      session.status = "completed";
      session.completed_at = new Date().toISOString();
      if (summary) session.task_summary = summary;
      delete session.lease_expires_at;
      await this.cleanOldCompleted(registry, lock);
      await this.writeRegistry(registry, lock);
      return { found: true };
    });
  }

  /**
   * List active sessions. Expires stale sessions and persists the change.
   */
  async listActive(project?: string | null): Promise<Session[]> {
    return await this.withLock(async (lock) => {
      const registry = await this.readRegistry();
      const expired = await this.cleanStale(registry);
      if (expired) {
        await this.writeRegistry(registry, lock);
      }
      return registry.sessions.filter((s) => {
        if (s.status !== "active") return false;
        if (project !== undefined) return s.project === project;
        return true;
      });
    });
  }

  /**
   * Read a session snapshot for maintenance work that must run outside the registry lock.
   */
  async listForMaintenance(): Promise<Session[]> {
    return this.withLock(async () => {
      const registry = await this.readRegistry();
      return registry.sessions;
    });
  }

  async withMaintenanceSessions<T>(callback: (sessions: Session[]) => Promise<T>): Promise<T> {
    const sessions = await this.listForMaintenance();
    return callback(sessions);
  }

  async withMaintenanceLease<T>(callback: (sessions: Session[]) => Promise<T>): Promise<T> {
    return this.withLock(async lock => {
      const registry = await this.readRegistry();
      await lock.assertOwned();
      return callback(registry.sessions);
    });
  }

  /**
   * List expired sessions and active sessions whose heartbeat is older than 10 minutes.
   */
  async listInterrupted(project?: string | null): Promise<Session[]> {
    return await this.withLock(async (lock) => {
      const registry = await this.readRegistry();
      const expired = await this.cleanStale(registry);
      if (expired) await this.writeRegistry(registry, lock);
      const cutoff = Date.now() - INTERRUPTED_HEARTBEAT_MS;
      return registry.sessions.filter((session) => {
        if (project !== undefined && session.project !== project) return false;
        if (session.status === "expired") return true;
        if (session.status !== "active") return false;
        return new Date(session.last_heartbeat).getTime() < cutoff;
      });
    });
  }

  async acknowledgeWorkspaceRemoval(workspacePath: string): Promise<void> {
    await this.withLock(async (lock) => {
      const registry = await this.readRegistry();
      const target = await canonicalPath(workspacePath);
      let changed = false;
      for (const session of registry.sessions) {
        if (session.status !== "completed" || session.workspace_path === undefined) continue;
        if ((await canonicalPath(session.workspace_path)) !== target) continue;
        delete session.workspace_path;
        changed = true;
      }
      if (changed) await this.writeRegistry(registry, lock);
    });
  }

  private assertProject(session: Session, project: string | null | undefined): void {
    if (project !== undefined && session.project !== null && session.project !== project) throw new Error("Session belongs to a different project");
  }

  private collectConflicts(sessions: Session[], filesTouched: string[], excludeId?: string, project?: string | null): Conflict[] {
    if (filesTouched.length === 0) return [];
    const touchedSet = new Set(filesTouched);
    const conflicts: Conflict[] = [];
    for (const existing of sessions) {
      if (existing.status !== "active" || existing.id === excludeId) continue;
      if (project !== undefined && existing.project !== project) continue;
      const overlap = existing.files_touched.filter((f) => touchedSet.has(f));
      if (overlap.length > 0) {
        conflicts.push({
          session_id: existing.id,
          tool: existing.tool,
          overlapping_files: overlap,
          task_summary: existing.task_summary,
        });
      }
    }
    return conflicts;
  }

  private async findClaimHolder(
    registry: SessionRegistry,
    workspace: string,
    candidateId: string,
  ): Promise<Session | undefined> {
    const now = Date.now();
    for (const session of registry.sessions) {
      if (session.status !== "active" || session.id === candidateId || session.workspace_path === undefined) continue;
      const lease = session.lease_expires_at === undefined ? NaN : Date.parse(session.lease_expires_at);
      if (!Number.isFinite(lease) || lease <= now) continue;
      if ((await canonicalPath(session.workspace_path)) === workspace) return session;
    }
    return undefined;
  }

  private async cleanOldCompleted(registry: SessionRegistry, lock: CoordinationLock): Promise<boolean> {
    const clearCutoff = Date.now() - 24 * 60 * 60 * 1000;
    const keepCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let changed = false;
    const retained: Session[] = [];
    for (const s of registry.sessions) {
      if (s.status !== "completed") { retained.push(s); continue; }
      const ts = s.completed_at ?? s.started_at;
      const time = new Date(ts).getTime();
      if (!isNaN(time) && time > clearCutoff) { retained.push(s); continue; }
      const keep = !isNaN(time) && time > keepCutoff;
      if (s.workspace_path !== undefined || !keep) {
        await writeCoordinationFile(this.vaultPath, `coordination/session-history/${s.id}-${randomBytes(8).toString("hex")}.json`, `${JSON.stringify(s, null, 2)}\n`, lock);
      }
      if (s.workspace_path !== undefined) {
        delete s.workspace_path;
        changed = true;
      }
      if (!keep) changed = true;
      else retained.push(s);
    }
    registry.sessions = retained;
    return changed;
  }

  private async cleanStale(registry: SessionRegistry): Promise<boolean> {
    const cutoff = Date.now() - this.ttlHours * 60 * 60 * 1000;
    const now = Date.now();
    const host = hostname();
    let changed = false;
    for (const session of registry.sessions) {
      if (session.status !== "active") continue;
      const heartbeat = new Date(session.last_heartbeat).getTime();
      if (heartbeat >= cutoff) continue;
      if (await this.hasLiveLocalProcess(session, heartbeat, host, now)) continue;
      session.status = "expired";
      session.expired_at = new Date(now).toISOString();
      changed = true;
    }
    return changed;
  }

  private async hasLiveLocalProcess(session: Session, heartbeat: number, host: string, now: number): Promise<boolean> {
    if (now - heartbeat >= INTERRUPTED_HEARTBEAT_MS) return false;
    if (session.host !== host) return false;
    if (!validPid(session.pid) || !processAlive(session.pid)) return false;
    if (session.process_identity === undefined) return true;
    const identity = await processIdentity(session.pid);
    return identity === undefined || identity === session.process_identity;
  }

  private async readRegistry(): Promise<SessionRegistry> {
    const raw = await readCoordinationFile(this.vaultPath, this.registryPath, REGISTRY_MAX_BYTES);
    if (raw === null) {
      if (await readCoordinationFile(this.vaultPath, `${this.registryPath}.bak`, REGISTRY_MAX_BYTES) !== null) throw new Error("Session registry is missing but a backup exists; repair the registry from its backup before continuing");
      return { sessions: [] };
    }
    return this.parseRegistry(raw);
  }

  private parseRegistry(raw: string): SessionRegistry {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("Invalid session registry JSON; repair the existing registry before continuing");
    }
    if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as SessionRegistry).sessions)) {
      throw new Error("Invalid session registry: missing sessions array; repair before continuing");
    }
    const sessions = (parsed as SessionRegistry).sessions;
    if (sessions.length > REGISTRY_MAX_SESSIONS) throw new Error("Session registry exceeds session count limit");
    const ids = new Set<string>();
    for (const session of sessions) {
      if (!session || typeof session !== "object" ||
        typeof session.id !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(session.id) || ids.has(session.id) ||
        typeof session.tool !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(session.tool) ||
        (session.project != null && (typeof session.project !== "string" || session.project.length > 128 || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(session.project) || session.project.includes(".."))) ||
        (session.task_summary != null && (typeof session.task_summary !== "string" || session.task_summary.length > 32_768)) ||
        !["active", "completed", "expired"].includes(session.status) ||
        typeof session.started_at !== "string" || session.started_at.length > 64 || isNaN(Date.parse(session.started_at)) ||
        typeof session.last_heartbeat !== "string" || session.last_heartbeat.length > 64 || isNaN(Date.parse(session.last_heartbeat)) ||
        [session.completed_at, session.expired_at, session.lease_expires_at].some(value => value != null && (typeof value !== "string" || value.length > 64 || isNaN(Date.parse(value)))) ||
        (session.pid !== undefined && !validPid(session.pid)) ||
        (session.host !== undefined && (typeof session.host !== "string" || session.host.length === 0 || session.host.length > 255 || /[\x00-\x1f\x7f]/.test(session.host))) ||
        (session.process_identity !== undefined && (typeof session.process_identity !== "string" || session.process_identity.length === 0 || session.process_identity.length > 1024)) ||
        (session.workspace_identity !== undefined && !validWorkspaceIdentity(session.workspace_identity)) ||
        !Array.isArray(session.files_touched) || session.files_touched.length > 2000 || session.files_touched.some(file => typeof file !== "string" || file.length > 4096 || /[\x00-\x1f\x7f]/.test(file)) ||
        (session.workspace_path !== undefined && (typeof session.workspace_path !== "string" || session.workspace_path.length > 4096 || /[\x00-\x1f\x7f]/.test(session.workspace_path) || !isAbsolute(session.workspace_path)))) {
        throw new Error("Invalid session registry entry; repair the existing registry before continuing");
      }
      ids.add(session.id);
      session.project ??= null;
      session.task_summary ??= null;
      session.completed_at ??= null;
    }
    return { sessions };
  }

  private async writeRegistry(registry: SessionRegistry, lock: CoordinationLock): Promise<void> {
    const content = JSON.stringify(registry, null, 2);
    if (Buffer.byteLength(content) > REGISTRY_MAX_BYTES) throw new Error("Session registry exceeds byte limit");
    this.parseRegistry(content);
    assertSafeVaultContent(content);
    const current = await readCoordinationFile(this.vaultPath, this.registryPath, REGISTRY_MAX_BYTES);
    if (current !== null) {
      this.parseRegistry(current);
      await writeCoordinationFile(this.vaultPath, `${this.registryPath}.bak`, current, lock);
    }
    await writeCoordinationFile(this.vaultPath, this.registryPath, content, lock);
  }

  private async withLock<T>(fn: (lock: CoordinationLock) => Promise<T>): Promise<T> {
    return withCoordinationLock(this.vaultPath, "coordination/locks/session-registry.lock", fn, this.options.lockTimeoutMs);
  }
}

function validWorkspaceIdentity(value: CleanupWorkspaceIdentity): boolean {
  return value !== null && typeof value === "object" &&
    typeof value.head === "string" && /^[a-f0-9]{40,64}$/.test(value.head) &&
    typeof value.gitDir === "string" && value.gitDir.length <= 4096 && isAbsolute(value.gitDir) && !/[\x00-\x1f\x7f]/.test(value.gitDir) &&
    [value.gitDirDev, value.gitDirIno, value.rootDev, value.rootIno].every(item => Number.isSafeInteger(item) && item >= 0) &&
    [value.gitDirBirthtimeMs, value.rootBirthtimeMs].every(item => Number.isFinite(item) && item >= 0);
}
