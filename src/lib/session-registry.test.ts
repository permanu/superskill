import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile as fspWriteFile, rm, readFile as fspReadFile, readdir, stat, utimes, realpath } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { SessionRegistryManager } from "./session-registry.js";

describe("SessionRegistryManager", () => {
  let vaultRoot: string;
  let manager: SessionRegistryManager;

  beforeEach(async () => {
    vaultRoot = join(tmpdir(), `session-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(vaultRoot, { recursive: true });
    manager = new SessionRegistryManager(vaultRoot, 1);
  });

  afterEach(async () => {
    await rm(vaultRoot, { recursive: true, force: true });
  });

  describe("register", () => {
    it("creates session with generated ID", async () => {
      const result = await manager.register("claude-code", "test-project");
      expect(result.session_id).toMatch(/^claude-code-[a-f0-9]{8}$/);
    });

    it("creates session with all fields", async () => {
      const result = await manager.register("opencode", "my-project", "Doing work", ["file1.ts", "file2.ts"]);
      expect(result.session_id).toMatch(/^opencode-/);
    });

    it("detects file conflicts", async () => {
      await manager.register("claude-code", "proj", "Task 1", ["a.ts", "b.ts"]);
      const result = await manager.register("opencode", "proj", "Task 2", ["b.ts", "c.ts"]);
      
      expect(result.conflicts.length).toBe(1);
      expect(result.conflicts[0].overlapping_files).toContain("b.ts");
    });

    it("returns empty conflicts when no overlap", async () => {
      await manager.register("claude-code", "proj", "Task 1", ["a.ts"]);
      const result = await manager.register("opencode", "proj", "Task 2", ["b.ts"]);
      
      expect(result.conflicts).toEqual([]);
    });

    it("returns empty conflicts when first session has no files", async () => {
      await manager.register("claude-code", "proj", "Task 1", []);
      const result = await manager.register("opencode", "proj", "Task 2", ["b.ts"]);
      
      expect(result.conflicts).toEqual([]);
    });

    it("cleans stale sessions on register", async () => {
      const oldManager = new SessionRegistryManager(vaultRoot, 0);
      await oldManager.register("claude-code", "proj", "Old session");
      
      await new Promise(r => setTimeout(r, 10));
      
      const newManager = new SessionRegistryManager(vaultRoot, 0.000001);
      await newManager.register("opencode", "proj", "New session");
      
      const active = await newManager.listActive();
      expect(active.every(s => s.status === "active")).toBe(true);
    });

    it("persists session to registry file", async () => {
      await manager.register("claude-code", "test-project");
      
      const registryPath = join(vaultRoot, "coordination/session-registry.json");
      const raw = await fspReadFile(registryPath, "utf-8");
      const parsed = JSON.parse(raw);
      
      expect(parsed.sessions.length).toBe(1);
      expect(parsed.sessions[0].tool).toBe("claude-code");
    });
  });

  describe("heartbeat", () => {
    it("updates heartbeat timestamp", async () => {
      const { session_id } = await manager.register("claude-code", "proj");
      await new Promise(r => setTimeout(r, 10));
      
      const result = await manager.heartbeat(session_id);
      expect(result).toBe(true);
    });

    it("returns false for missing session", async () => {
      const result = await manager.heartbeat("nonexistent-id");
      expect(result).toBe(false);
    });

    it("persists heartbeat to file", async () => {
      const { session_id } = await manager.register("claude-code", "proj");
      await manager.heartbeat(session_id);
      
      const registryPath = join(vaultRoot, "coordination/session-registry.json");
      const raw = await fspReadFile(registryPath, "utf-8");
      const parsed = JSON.parse(raw);
      
      const session = parsed.sessions.find((s: any) => s.id === session_id);
      expect(session.last_heartbeat).toBeDefined();
    });
  });

  describe("complete", () => {
    it("marks session as completed", async () => {
      const { session_id } = await manager.register("claude-code", "proj");
      await manager.complete(session_id);
      
      const registryPath = join(vaultRoot, "coordination/session-registry.json");
      const raw = await fspReadFile(registryPath, "utf-8");
      const parsed = JSON.parse(raw);
      
      const session = parsed.sessions.find((s: any) => s.id === session_id);
      expect(session.status).toBe("completed");
      expect(session.completed_at).toBeDefined();
    });

    it("updates task summary when provided", async () => {
      const { session_id } = await manager.register("claude-code", "proj", "Old summary");
      await manager.complete(session_id, "New summary");
      
      const registryPath = join(vaultRoot, "coordination/session-registry.json");
      const raw = await fspReadFile(registryPath, "utf-8");
      const parsed = JSON.parse(raw);
      
      const session = parsed.sessions.find((s: any) => s.id === session_id);
      expect(session.task_summary).toBe("New summary");
    });

    it("removes old completed sessions", async () => {
      const { session_id } = await manager.register("claude-code", "proj");
      await manager.complete(session_id);
      
      const registryPath = join(vaultRoot, "coordination/session-registry.json");
      let raw = await fspReadFile(registryPath, "utf-8");
      let parsed = JSON.parse(raw);
      
      const session = parsed.sessions.find((s: any) => s.id === session_id);
      session.completed_at = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      
      await fspWriteFile(registryPath, JSON.stringify(parsed));
      
      await manager.register("opencode", "proj");
      
      raw = await fspReadFile(registryPath, "utf-8");
      parsed = JSON.parse(raw);
      
      expect(parsed.sessions.find((s: any) => s.id === session_id)).toBeUndefined();
    });
  });

  describe("listActive", () => {
    it("returns only active sessions", async () => {
      const { session_id } = await manager.register("claude-code", "proj");
      await manager.register("opencode", "proj2");
      await manager.complete(session_id);
      
      const active = await manager.listActive();
      expect(active.length).toBe(1);
      expect(active[0].tool).toBe("opencode");
    });

    it("returns empty array when no active sessions", async () => {
      expect(await manager.listActive()).toEqual([]);
    });

    it("deletes stale sessions and persists the change", async () => {
      const staleManager = new SessionRegistryManager(vaultRoot, 0.000001);
      await staleManager.register("claude-code", "proj");

      await new Promise(r => setTimeout(r, 20));

      const active = await staleManager.listActive();
      expect(active).toEqual([]);

      const registryPath = join(vaultRoot, "coordination/session-registry.json");
      const raw = await fspReadFile(registryPath, "utf-8");
      const parsed = JSON.parse(raw);

      expect(parsed.sessions).toEqual([]);
    });
  });

  describe("withLock", () => {
    it("prevents concurrent access", async () => {
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        promises.push(manager.register(`tool-${i}`, "proj"));
      }
      
      const results = await Promise.all(promises);
      
      expect(results.every(r => r.session_id)).toBe(true);
      
      const registryPath = join(vaultRoot, "coordination/session-registry.json");
      const raw = await fspReadFile(registryPath, "utf-8");
      const parsed = JSON.parse(raw);
      
      expect(parsed.sessions.length).toBe(5);
    });

    it("leaves abandoned locks intact and reports the recovery path", async () => {
      const lockPath = join(vaultRoot, "coordination/locks/session-registry.lock");
      await mkdir(join(vaultRoot, "coordination/locks"), { recursive: true });
      const content = JSON.stringify({ pid: 999999999, token: "abandoned" });
      await fspWriteFile(lockPath, content);
      await expect(manager.register("claude-code", "proj")).rejects.toThrow(lockPath);
      expect(await fspReadFile(lockPath, "utf-8")).toBe(content);
    });

    it("does not steal an old live lock from another promise in the same process", async () => {
      const lockPath = join(vaultRoot, "coordination/locks/session-registry.lock");
      const withLock = (manager as unknown as { withLock<T>(fn: () => Promise<T>): Promise<T> }).withLock.bind(manager);
      let release!: () => void;
      let entered!: () => void;
      const held = new Promise<void>((resolve) => { release = resolve; });
      const started = new Promise<void>((resolve) => { entered = resolve; });
      const owner = withLock(async () => {
        const old = new Date(Date.now() - 60_000);
        await utimes(lockPath, old, old);
        entered();
        await held;
      });
      await started;
      let secondEntered = false;
      const contender = withLock(async () => { secondEntered = true; });
      await new Promise((resolve) => setTimeout(resolve, 150));
      const stolen = secondEntered;
      release();
      await Promise.all([owner, contender]);
      expect(stolen).toBe(false);
      expect(secondEntered).toBe(true);
    });

    it("does not release another acquisition with the same PID and different token", async () => {
      const lockPath = join(vaultRoot, "coordination/locks/session-registry.lock");
      await mkdir(join(vaultRoot, "coordination/locks"), { recursive: true });
      const content = JSON.stringify({ pid: process.pid, token: "new-owner" });
      await fspWriteFile(lockPath, content);
      const releaseLock = (manager as unknown as { releaseLock(path: string, token: string): Promise<void> }).releaseLock.bind(manager);
      await releaseLock(lockPath, "old-owner");
      expect(await fspReadFile(lockPath, "utf-8")).toBe(content);
    });

    it("allows sequential acquisitions and releases the lock", async () => {
      const first = await manager.register("claude-code", "proj");
      const second = await manager.register("opencode", "proj");
      expect(first.session_id).toBeDefined();
      expect(second.session_id).toBeDefined();

      const lockPath = join(vaultRoot, "coordination/locks/session-registry.lock");
      await expect(stat(lockPath)).rejects.toThrow();
    });
  });

  describe("readRegistry validation", () => {
    it("fails closed when the registry cannot be read", async () => {
      const registryPath = join(vaultRoot, "coordination/session-registry.json");
      await mkdir(registryPath, { recursive: true });
      await expect(manager.get("missing")).rejects.toMatchObject({ code: "EISDIR" });
      expect((await stat(registryPath)).isDirectory()).toBe(true);
    });

    it("rejects malformed session entries without dropping evidence", async () => {
      const registryPath = join(vaultRoot, "coordination/session-registry.json");
      await mkdir(join(vaultRoot, "coordination"), { recursive: true });
      
      const now = new Date().toISOString();
      const malformedData = {
        sessions: [
          { id: "valid-1", tool: "test", status: "active", started_at: now, last_heartbeat: now, files_touched: [] },
          { id: 123, tool: "bad" },
          null,
          "string not object",
          { id: "valid-2", tool: "test", status: "active", started_at: "bad-date", last_heartbeat: "2024-01-01T00:00:00Z", files_touched: [] },
        ]
      };
      
      await fspWriteFile(registryPath, JSON.stringify(malformedData));
      
      await expect(manager.listActive()).rejects.toThrow(/session registry/i);
      expect(JSON.parse(await fspReadFile(registryPath, "utf-8"))).toEqual(malformedData);
    });

    it("handles non-array sessions field", async () => {
      const registryPath = join(vaultRoot, "coordination/session-registry.json");
      await mkdir(join(vaultRoot, "coordination"), { recursive: true });
      await fspWriteFile(registryPath, JSON.stringify({ sessions: "not-an-array" }));
      
      await expect(manager.listActive()).rejects.toThrow(/session registry/i);
    });

    it("handles missing sessions field", async () => {
      const registryPath = join(vaultRoot, "coordination/session-registry.json");
      await mkdir(join(vaultRoot, "coordination"), { recursive: true });
      await fspWriteFile(registryPath, JSON.stringify({}));
      
      await expect(manager.listActive()).rejects.toThrow(/session registry/i);
    });

    it("preserves corrupt registry bytes and requires explicit repair", async () => {
      const registryPath = join(vaultRoot, "coordination/session-registry.json");
      await mkdir(join(vaultRoot, "coordination"), { recursive: true });
      const raw = "{ this is not json";
      await fspWriteFile(registryPath, raw);
      await expect(manager.listActive()).rejects.toThrow(/session registry/i);
      await expect(manager.register("claude-code", "proj")).rejects.toThrow(/session registry/i);
      expect(await fspReadFile(registryPath, "utf-8")).toBe(raw);
    });

    it("never removes malformed active workspace evidence before maintenance", async () => {
      const workspace = join(vaultRoot, "workspace");
      await mkdir(workspace);
      const completed = await manager.register("codex", "proj", null, [], workspace);
      await manager.complete(completed.session_id);
      const path = join(vaultRoot, "coordination/session-registry.json");
      const registry = JSON.parse(await fspReadFile(path, "utf-8"));
      registry.sessions.push({ ...registry.sessions[0], id: "active-malformed", status: "active", completed_at: null, files_touched: null });
      const raw = JSON.stringify(registry);
      await fspWriteFile(path, raw);
      for (const operation of [
        () => manager.register("other", "proj"),
        () => manager.heartbeat(completed.session_id),
        () => manager.complete(completed.session_id),
        () => manager.listActive(),
        () => manager.get(completed.session_id),
        () => manager.acknowledgeWorkspaceRemoval(workspace),
      ]) {
        await expect(operation()).rejects.toThrow(/session registry/i);
        expect(await fspReadFile(path, "utf-8")).toBe(raw);
      }
      await expect(manager.listForMaintenance()).rejects.toThrow(/session registry/i);
    });
  });
  describe("workspace maintenance provenance", () => {
    it("retains workspace active and completed sessions across expiry", async () => {
      const activePath = join(await realpath(vaultRoot), "active");
      const completedPath = join(await realpath(vaultRoot), "completed");
      await mkdir(activePath);
      await mkdir(completedPath);
      const active = await manager.register("codex", "proj", null, [], activePath);
      const completed = await manager.register("codex", "proj", null, [], completedPath);
      const ordinary = await manager.register("codex", "proj");
      await manager.complete(completed.session_id);
      const path = join(vaultRoot, "coordination/session-registry.json");
      const registry = JSON.parse(await fspReadFile(path, "utf-8"));
      for (const session of registry.sessions) {
        session.last_heartbeat = "2000-01-01T00:00:00.000Z";
        if (session.status === "completed") session.completed_at = session.last_heartbeat;
      }
      await fspWriteFile(path, JSON.stringify(registry));
      const before = await fspReadFile(path, "utf-8");
      expect(await manager.listForMaintenance()).toHaveLength(3);
      expect(await fspReadFile(path, "utf-8")).toBe(before);
      expect((await manager.listActive()).map(s => s.id)).toContain(active.session_id);
      expect((await manager.listActive()).map(s => s.id)).not.toContain(ordinary.session_id);
      await manager.register("other", "proj");
      expect((await manager.get(completed.session_id))?.workspace_path).toBe(completedPath);
      await manager.acknowledgeWorkspaceRemoval(completedPath);
      await manager.acknowledgeWorkspaceRemoval(activePath);
      expect((await manager.get(active.session_id))?.workspace_path).toBe(activePath);
      await manager.register("other", "proj");
      expect(await manager.get(completed.session_id)).toBeNull();
    });

    it("holds the registry lock until maintenance finishes", async () => {
      const workspace = join(vaultRoot, "workspace");
      await mkdir(workspace);
      const session = await manager.register("codex", "proj", null, [], workspace);
      let enter!: () => void;
      const entered = new Promise<void>(resolve => { enter = resolve; });
      let release!: () => void;
      const gate = new Promise<void>(resolve => { release = resolve; });
      const maintenance = manager.withMaintenanceSessions(async sessions => {
        expect(sessions).toHaveLength(1);
        enter();
        await gate;
        return "done";
      });
      await entered;
      let registered = false;
      let heartbeat = false;
      const other = new SessionRegistryManager(vaultRoot, 1);
      const registration = other.register("other", "proj").then(() => { registered = true; });
      const beat = other.heartbeat(session.session_id).then(() => { heartbeat = true; });
      await new Promise(resolve => setTimeout(resolve, 70));
      expect(registered).toBe(false);
      expect(heartbeat).toBe(false);
      release();
      expect(await maintenance).toBe("done");
      await Promise.all([registration, beat]);
      expect(registered && heartbeat).toBe(true);
    });

    it("rejects registration when maintenance removed its previously existing workspace", async () => {
      const workspace = join(vaultRoot, "workspace");
      await mkdir(workspace);
      let enter!: () => void;
      const entered = new Promise<void>(resolve => { enter = resolve; });
      let release!: () => void;
      const gate = new Promise<void>(resolve => { release = resolve; });
      const maintenance = manager.withMaintenanceSessions(async () => {
        enter();
        await gate;
        await rm(workspace, { recursive: true });
      });
      await entered;
      const registration = manager.register("codex", "proj", null, [], workspace);
      const rejected = expect(registration).rejects.toThrow(/workspace_path/);
      release();
      await maintenance;
      await rejected;
      expect(await manager.listForMaintenance()).toEqual([]);
    });

    it("fails closed for corrupt maintenance snapshots without modifying evidence", async () => {
      const dir = join(vaultRoot, "coordination");
      const path = join(dir, "session-registry.json");
      await mkdir(dir, { recursive: true });
      for (const raw of ["not json", JSON.stringify({ sessions: [{id:"unsafe",workspace_path:"/work/repo"}] })]) {
        await fspWriteFile(path, raw);
        await expect(manager.listForMaintenance()).rejects.toThrow(/registry/i);
        expect(await fspReadFile(path, "utf-8")).toBe(raw);
      }
    });
  });

});


