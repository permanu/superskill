// SPDX-License-Identifier: Apache-2.0
import { readFile, writeFile, mkdir, unlink, open, rename, realpath, stat, type FileHandle } from "fs/promises";
import { hostname } from "os";
import { resolve, dirname, isAbsolute } from "path";
import { randomBytes } from "crypto";

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
  expired_at?: string;
  pid?: number;
  host?: string;
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
const LOCK_TIMEOUT_MS = 2000;
const LOCK_STALE_MS = 60 * 1000;

interface LockBody {
  pid?: unknown;
  createdAt?: unknown;
  timestamp?: unknown;
  token?: unknown;
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
  let body: LockBody | null = null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") body = parsed as LockBody;
  } catch {
    body = null;
  }
  if (body && Number.isInteger(body.pid) && (body.pid as number) > 0) {
    return !processAlive(body.pid as number);
  }
  const createdAt =
    typeof body?.createdAt === "number"
      ? body.createdAt
      : typeof body?.timestamp === "string"
        ? Date.parse(body.timestamp)
        : NaN;
  const baseline = Number.isFinite(createdAt) ? createdAt : mtimeMs;
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

async function canonicalPath(path: string): Promise<string> {
  try {
    return await realpath(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("[session-registry] Failed to resolve path:", (error as Error).message);
    }
    return resolve(path);
  }
}

/**
 * Manages the session registry for multi-agent coordination.
 * Uses exclusive lockfiles for safe concurrent access.
 */
export class SessionRegistryManager {
  private readonly registryPath: string;
  private readonly locksDir: string;

  constructor(vaultPath: string, private readonly ttlHours: number) {
    this.registryPath = resolve(vaultPath, "coordination/session-registry.json");
    this.locksDir = resolve(vaultPath, "coordination/locks");
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
  ): Promise<RegisterResult> {
    if (workspacePath !== undefined && (typeof workspacePath !== "string" || !isAbsolute(workspacePath))) {
      throw new Error("Session workspace_path must be an absolute path");
    }
    const sessionId = `${tool}-${randomBytes(4).toString("hex")}`;
    const now = new Date().toISOString();

    return await this.withLock(async () => {
      let canonicalWorkspace: string | undefined;
      if (workspacePath !== undefined) {
        try {
          canonicalWorkspace = await realpath(workspacePath);
          if (!(await stat(canonicalWorkspace)).isDirectory()) throw new Error("not a directory");
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
        ...(canonicalWorkspace !== undefined
          ? {
              workspace_path: canonicalWorkspace,
              lease_expires_at: new Date(Date.now() + LEASE_TTL_MS).toISOString(),
            }
          : {}),
      };

      const registry = await this.readRegistry();
      const expired = this.cleanStale(registry);
      const pruned = this.cleanOldCompleted(registry);

      const conflicts = this.collectConflicts(registry.sessions, filesTouched, sessionId);

      if (canonicalWorkspace !== undefined && !allowShared) {
        const holder = await this.findClaimHolder(registry, canonicalWorkspace, sessionId);
        if (holder) {
          if (expired || pruned) await this.writeRegistry(registry);
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
      await this.writeRegistry(registry);

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
  async heartbeat(sessionId: string, filesTouched?: string[]): Promise<HeartbeatResult> {
    return await this.withLock(async () => {
      const registry = await this.readRegistry();
      const session = registry.sessions.find((s) => s.id === sessionId);
      if (!session) return { found: false, conflicts: [] };
      const now = new Date();
      session.last_heartbeat = now.toISOString();
      if (session.status === "active" && session.workspace_path !== undefined) {
        session.lease_expires_at = new Date(now.getTime() + LEASE_TTL_MS).toISOString();
      }
      if (filesTouched !== undefined) session.files_touched = filesTouched;
      const conflicts = this.collectConflicts(registry.sessions, session.files_touched, session.id);
      await this.writeRegistry(registry);
      return { found: true, conflicts };
    });
  }

  /**
   * Mark a session as completed and release its workspace claim.
   */
  async complete(sessionId: string, summary?: string): Promise<CompleteResult> {
    return await this.withLock(async () => {
      const registry = await this.readRegistry();
      const session = registry.sessions.find((s) => s.id === sessionId);
      if (!session) return { found: false };
      session.status = "completed";
      session.completed_at = new Date().toISOString();
      if (summary) session.task_summary = summary;
      delete session.lease_expires_at;
      this.cleanOldCompleted(registry);
      await this.writeRegistry(registry);
      return { found: true };
    });
  }

  /**
   * List active sessions. Expires stale sessions and persists the change.
   */
  async listActive(project?: string | null): Promise<Session[]> {
    return await this.withLock(async () => {
      const registry = await this.readRegistry();
      const expired = this.cleanStale(registry);
      if (expired) {
        await this.writeRegistry(registry);
      }
      return registry.sessions.filter((s) => {
        if (s.status !== "active") return false;
        if (project) return s.project === project;
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

  /**
   * List expired sessions and active sessions whose heartbeat is older than 10 minutes.
   */
  async listInterrupted(): Promise<Session[]> {
    return await this.withLock(async () => {
      const registry = await this.readRegistry();
      const expired = this.cleanStale(registry);
      if (expired) await this.writeRegistry(registry);
      const cutoff = Date.now() - INTERRUPTED_HEARTBEAT_MS;
      return registry.sessions.filter((session) => {
        if (session.status === "expired") return true;
        if (session.status !== "active") return false;
        return new Date(session.last_heartbeat).getTime() < cutoff;
      });
    });
  }

  async acknowledgeWorkspaceRemoval(workspacePath: string): Promise<void> {
    await this.withLock(async () => {
      const registry = await this.readRegistry();
      const target = await canonicalPath(workspacePath);
      let changed = false;
      for (const session of registry.sessions) {
        if (session.status !== "completed" || session.workspace_path === undefined) continue;
        if ((await canonicalPath(session.workspace_path)) !== target) continue;
        delete session.workspace_path;
        changed = true;
      }
      if (changed) await this.writeRegistry(registry);
    });
  }

  private collectConflicts(sessions: Session[], filesTouched: string[], excludeId?: string): Conflict[] {
    if (filesTouched.length === 0) return [];
    const touchedSet = new Set(filesTouched);
    const conflicts: Conflict[] = [];
    for (const existing of sessions) {
      if (existing.status !== "active" || existing.id === excludeId) continue;
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

  private cleanOldCompleted(registry: SessionRegistry): boolean {
    const clearCutoff = Date.now() - 24 * 60 * 60 * 1000;
    const keepCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let changed = false;
    registry.sessions = registry.sessions.filter((s) => {
      if (s.status !== "completed") return true;
      const ts = s.completed_at ?? s.started_at;
      const time = new Date(ts).getTime();
      if (!isNaN(time) && time > clearCutoff) return true;
      if (s.workspace_path !== undefined) {
        delete s.workspace_path;
        changed = true;
      }
      const keep = !isNaN(time) && time > keepCutoff;
      if (!keep) changed = true;
      return keep;
    });
    return changed;
  }

  private cleanStale(registry: SessionRegistry): boolean {
    const cutoff = Date.now() - this.ttlHours * 60 * 60 * 1000;
    const now = Date.now();
    const host = hostname();
    let changed = false;
    for (const session of registry.sessions) {
      if (session.status !== "active") continue;
      const heartbeat = new Date(session.last_heartbeat).getTime();
      if (heartbeat >= cutoff) continue;
      if (this.hasLiveLocalProcess(session, heartbeat, host, now)) continue;
      session.status = "expired";
      session.expired_at = new Date(now).toISOString();
      changed = true;
    }
    return changed;
  }

  private hasLiveLocalProcess(session: Session, heartbeat: number, host: string, now: number): boolean {
    if (now - heartbeat >= INTERRUPTED_HEARTBEAT_MS) return false;
    if (session.host !== host) return false;
    if (typeof session.pid !== "number" || !Number.isInteger(session.pid) || session.pid <= 0) return false;
    try {
      process.kill(session.pid, 0);
      return true;
    } catch (error) {
      return (error as NodeJS.ErrnoException).code === "EPERM";
    }
  }

  private async readRegistry(): Promise<SessionRegistry> {
    let raw: string;
    try {
      raw = await readFile(this.registryPath, "utf-8");
    } catch (e: any) {
      if (e?.code !== "ENOENT") {
        console.error("[session-registry] Error reading registry:", e.message);
        throw e;
      }
      return { sessions: [] };
    }

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
    const ids = new Set<string>();
    for (const session of sessions) {
      if (!session || typeof session !== "object" ||
        typeof session.id !== "string" || ids.has(session.id) ||
        typeof session.tool !== "string" ||
        !["active", "completed", "expired"].includes(session.status) ||
        typeof session.started_at !== "string" || isNaN(Date.parse(session.started_at)) ||
        typeof session.last_heartbeat !== "string" || isNaN(Date.parse(session.last_heartbeat)) ||
        !Array.isArray(session.files_touched) || session.files_touched.some(file => typeof file !== "string") ||
        (session.workspace_path !== undefined && (typeof session.workspace_path !== "string" || !isAbsolute(session.workspace_path)))) {
        throw new Error("Invalid session registry entry; repair the existing registry before continuing");
      }
      ids.add(session.id);
    }
    return { sessions };
  }

  private async writeRegistry(registry: SessionRegistry): Promise<void> {
    await mkdir(dirname(this.registryPath), { recursive: true });
    const tmpPath = `${this.registryPath}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
    try {
      await writeFile(tmpPath, JSON.stringify(registry, null, 2), "utf-8");
      await rename(tmpPath, this.registryPath);
    } catch (e) {
      await unlink(tmpPath).catch(() => {});
      throw e;
    }
  }

  private async withLock<T>(fn: () => Promise<T>): Promise<T> {
    const lockPath = resolve(this.locksDir, "session-registry.lock");
    await mkdir(this.locksDir, { recursive: true });
    const token = randomBytes(16).toString("hex");
    const lockContent = JSON.stringify({
      pid: process.pid,
      createdAt: Date.now(),
      token,
      tool: "superskill",
    });
    const deadline = Date.now() + LOCK_TIMEOUT_MS;
    let fd: FileHandle | undefined;
    while (!fd) {
      try {
        fd = await open(lockPath, "wx", 0o600);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        if (await this.recoverStaleLock(lockPath)) continue;
        if (Date.now() >= deadline) {
          throw new Error(`Timed out acquiring session registry lock: ${lockPath}. Remove it only after confirming its owner is no longer running.`);
        }
        await new Promise((done) => setTimeout(done, Math.min(25, Math.max(1, deadline - Date.now()))));
      }
    }
    try {
      await fd.writeFile(lockContent, "utf-8");
    } catch (error) {
      await this.discardFailedLock(fd, lockPath);
      throw error;
    }
    try {
      return await fn();
    } finally {
      try {
        await fd.close();
      } catch (error) {
        console.error("[session-registry] Failed to close the registry lock handle:", (error as Error).message);
      } finally {
        await this.releaseLock(lockPath, token);
      }
    }
  }

  private async recoverStaleLock(lockPath: string): Promise<boolean> {
    let raw: string;
    try {
      raw = await readFile(lockPath, "utf-8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error("[session-registry] Failed to inspect lock:", (error as Error).message);
      }
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
      console.error("[session-registry] Failed to remove stale lock:", (error as Error).message);
      return false;
    }
    console.error(`[session-registry] Recovered stale registry lock: ${lockPath}`);
    return true;
  }

  private async discardFailedLock(fd: FileHandle, lockPath: string): Promise<void> {
    let identity;
    try {
      identity = await fd.stat();
    } catch {
      identity = undefined;
    }
    try {
      await fd.close();
    } catch (error) {
      console.error("[session-registry] Failed to close a lock handle after a write failure:", (error as Error).message);
    }
    if (!identity) return;
    try {
      const current = await stat(lockPath);
      if (current.ino === identity.ino && current.dev === identity.dev) await unlink(lockPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error("[session-registry] Failed to clean an unwritten lock:", (error as Error).message);
      }
    }
  }

  private async releaseLock(lockPath: string, token: string): Promise<void> {
    let raw: string;
    try {
      raw = await readFile(lockPath, "utf-8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      console.error("[session-registry] Failed to read lock ownership:", (error as Error).message);
      throw error;
    }
    if (lockToken(raw) !== token) return;
    await unlink(lockPath);
  }
}
