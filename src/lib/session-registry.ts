// SPDX-License-Identifier: Apache-2.0
import { readFile, writeFile, mkdir, unlink, open, rename, realpath, stat } from "fs/promises";
import { resolve, dirname, isAbsolute } from "path";
import { randomBytes } from "crypto";

export interface Session {
  id: string;
  tool: string;
  project: string | null;
  task_summary: string | null;
  files_touched: string[];
  started_at: string;
  last_heartbeat: string;
  completed_at: string | null;
  status: "active" | "completed";
  workspace_path?: string;
}

export interface SessionRegistry {
  sessions: Session[];
}

interface Conflict {
  session_id: string;
  tool: string;
  overlapping_files: string[];
  task_summary: string | null;
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
   * Register a new session. Returns session ID and any conflicts.
   */
  async register(
    tool: string,
    project: string | null,
    taskSummary: string | null = null,
    filesTouched: string[] = [],
    workspacePath?: string,
  ): Promise<{ session_id: string; conflicts: Conflict[] }> {
    if (workspacePath !== undefined && (typeof workspacePath !== "string" || !isAbsolute(workspacePath))) {
      throw new Error("Session workspace_path must be an absolute path");
    }
    const sessionId = `${tool}-${randomBytes(4).toString("hex")}`;
    const now = new Date().toISOString();

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
      ...(workspacePath !== undefined ? { workspace_path: workspacePath } : {}),
    };

    return await this.withLock(async () => {
      if (workspacePath !== undefined) {
        try {
          const canonical = await realpath(workspacePath);
          if (!(await stat(canonical)).isDirectory()) throw new Error("not a directory");
          session.workspace_path = canonical;
        } catch {
          throw new Error("Session workspace_path must still be an existing directory when registering");
        }
      }
      const registry = await this.readRegistry();
      this.cleanStale(registry);
      this.cleanOldCompleted(registry);

      // Detect conflicts (use Set for O(n+m) intersection)
      const conflicts: Conflict[] = [];
      if (filesTouched.length > 0) {
        const touchedSet = new Set(filesTouched);
        for (const existing of registry.sessions) {
          if (existing.status !== "active") continue;
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
      }

      registry.sessions.push(session);
      await this.writeRegistry(registry);

      return { session_id: sessionId, conflicts };
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
   * Update heartbeat for a session. Returns false if session not found.
   */
  async heartbeat(sessionId: string): Promise<boolean> {    return await this.withLock(async () => {
      const registry = await this.readRegistry();
      const session = registry.sessions.find((s) => s.id === sessionId);
      if (!session) return false;
      session.last_heartbeat = new Date().toISOString();
      await this.writeRegistry(registry);
      return true;
    });
  }

  /**
   * Mark a session as completed.
   */
  async complete(sessionId: string, summary?: string): Promise<void> {
    await this.withLock(async () => {
      const registry = await this.readRegistry();
      const session = registry.sessions.find((s) => s.id === sessionId);
      if (session) {
        session.status = "completed";
        session.completed_at = new Date().toISOString();
        if (summary) session.task_summary = summary;
      }
      this.cleanOldCompleted(registry);
      await this.writeRegistry(registry);
    });
  }

  /**
   * List active sessions. Deletes stale sessions and persists the change.
   */
  async listActive(project?: string | null): Promise<Session[]> {
    return await this.withLock(async () => {
      const registry = await this.readRegistry();
      const hadStale = this.cleanStale(registry);
      if (hadStale) {
        await this.writeRegistry(registry);
      }
      return registry.sessions.filter((s) => {
        if (s.status !== "active") return false;
        if (project) return s.project === project;
        return true;
      });
    });
  }

  async listForMaintenance(): Promise<Session[]> {
    return this.withMaintenanceSessions(async sessions => sessions);
  }

  async withMaintenanceSessions<T>(callback: (sessions: Session[]) => Promise<T>): Promise<T> {
    return this.withLock(async () => {
      const registry = await this.readRegistry();
      return callback(registry.sessions);
    });
  }

  async acknowledgeWorkspaceRemoval(workspacePath: string): Promise<void> {
    await this.withLock(async () => {
      const registry = await this.readRegistry();
      let changed = false;
      for (const session of registry.sessions) {
        if (session.status !== "completed" || session.workspace_path !== workspacePath) continue;
        delete session.workspace_path;
        changed = true;
      }
      if (changed) await this.writeRegistry(registry);
    });
  }

  private cleanOldCompleted(registry: SessionRegistry): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    registry.sessions = registry.sessions.filter((s) => {
      if (s.status !== "completed" || s.workspace_path !== undefined) return true;
      const ts = s.completed_at ?? s.started_at;
      if (typeof ts !== "string") return false;
      const time = new Date(ts).getTime();
      return !isNaN(time) && time > cutoff;
    });
  }

  private cleanStale(registry: SessionRegistry): boolean {
    const cutoff = Date.now() - this.ttlHours * 60 * 60 * 1000;
    const before = registry.sessions.length;
    registry.sessions = registry.sessions.filter(
      (session) =>
        !(
          session.status === "active" &&
          session.workspace_path === undefined &&
          new Date(session.last_heartbeat).getTime() < cutoff
        )
    );
    return registry.sessions.length < before;
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
        !["active", "completed"].includes(session.status) ||
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
      token,
      tool: "superskill",
      timestamp: new Date().toISOString(),
    });
    const deadline = Date.now() + 2000;
    let fd;
    while (!fd) {
      try {
        fd = await open(lockPath, "wx", 0o600);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        if (Date.now() >= deadline) {
          throw new Error(`Timed out acquiring session registry lock: ${lockPath}. Remove it only after confirming its owner is no longer running.`);
        }
        await new Promise((resolve) => setTimeout(resolve, Math.min(25, deadline - Date.now())));
      }
    }
    try {
      await fd.writeFile(lockContent, "utf-8");
      return await fn();
    } finally {
      await fd.close();
      await this.releaseLock(lockPath, token);
    }
  }

  private async releaseLock(lockPath: string, token: string): Promise<void> {
    let lockData: { token?: unknown };
    try {
      lockData = JSON.parse(await readFile(lockPath, "utf-8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      console.error("[session-registry] Failed to read lock ownership:", (error as Error).message);
      throw error;
    }
    if (lockData?.token !== token) return;
    await unlink(lockPath);
  }
}
