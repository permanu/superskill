import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdir, writeFile as fspWriteFile, rm, readFile as fspReadFile, stat, utimes, realpath, symlink, readdir, rename, unlink } from "fs/promises";
import { tmpdir } from "os";
import { hostname } from "os";
import { join } from "path";
import { SessionRegistryManager, withCoordinationLock } from "./session-registry.js";
import { execFile, spawn } from "node:child_process";
import { once } from "node:events";
import { promisify } from "node:util";

describe("SessionRegistryManager", () => {
  let vaultRoot: string;
  let manager: SessionRegistryManager;

  beforeEach(async () => {
    vaultRoot = join(tmpdir(), `session-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(vaultRoot, { recursive: true });
    manager = new SessionRegistryManager(vaultRoot, 1);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(vaultRoot, { recursive: true, force: true });
  });

  it("writes private registry snapshots and a last-valid backup", async () => {
    const first = await manager.register("codex", "proj");
    const path = join(vaultRoot, "coordination/session-registry.json");
    const previous = await fspReadFile(path, "utf-8");
    await manager.register("opencode", "proj");
    expect((await stat(path)).mode & 0o777).toBe(0o600);
    expect((await stat(`${path}.bak`)).mode & 0o777).toBe(0o600);
    expect(await fspReadFile(`${path}.bak`, "utf-8")).toBe(previous);
    expect(JSON.parse(previous).sessions[0].id).toBe(first.session_id);
  });

  it("does not replace missing registry evidence with an empty state when a backup exists", async () => {
    await manager.register("codex", "proj");
    await manager.register("opencode", "proj");
    const path = join(vaultRoot, "coordination/session-registry.json");
    const backup = await fspReadFile(`${path}.bak`, "utf-8");
    await unlink(path);
    await expect(manager.register("codex", "proj")).rejects.toThrow(/backup.*repair|repair.*backup/i);
    expect(await fspReadFile(`${path}.bak`, "utf-8")).toBe(backup);
    await expect(stat(path)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects registry and coordination symlink escapes", async () => {
    const outside = join(vaultRoot, "outside");
    const isolated = join(vaultRoot, "isolated");
    await mkdir(outside);
    await mkdir(isolated);
    await symlink(outside, join(isolated, "coordination"));
    const unsafe = new SessionRegistryManager(isolated, 1);
    await expect(unsafe.register("codex", "proj")).rejects.toThrow(/symlink|unsafe/i);
    expect(await readdir(outside)).toEqual([]);
  });

  it("does not compare a foreign lock PID with local processes before its lease expires", async () => {
    const lockPath = join(vaultRoot, "coordination/locks/session-registry.lock");
    await mkdir(join(vaultRoot, "coordination/locks"), { recursive: true });
    const raw = JSON.stringify({ host: "another-machine", pid: 999999999, identity: "foreign", createdAt: Date.now() - 120_000, leaseExpiresAt: Date.now() + 60_000, token: "foreign" });
    await fspWriteFile(lockPath, raw);
    const contender = manager.register("codex", "proj");
    await new Promise(resolve => setTimeout(resolve, 80));
    const during = await fspReadFile(lockPath, "utf-8").catch(() => "missing");
    await unlink(lockPath).catch(() => {});
    await contender;
    expect(during).toBe(raw);
  });

  it("records a process identity and recovers a reused local PID", async () => {
    const lockPath = join(vaultRoot, "coordination/locks/session-registry.lock");
    await mkdir(join(vaultRoot, "coordination/locks"), { recursive: true });
    await fspWriteFile(lockPath, JSON.stringify({ host: hostname(), pid: process.pid, identity: "a different process start", createdAt: Date.now(), token: "reused" }));
    const result = await manager.register("codex", "proj");
    expect((await manager.get(result.session_id))?.process_identity).toEqual(expect.any(String));
  });

  it("does not steal a live lock when the contender uses a different timezone", async () => {
    const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 60000)"], { stdio: "ignore" });
    const closed = once(child, "close");
    const previousTZ = process.env.TZ;
    try {
      await once(child, "spawn");
      const { stdout } = await promisify(execFile)("ps", ["-p", String(child.pid), "-o", "lstart="], { env: { ...process.env, LC_ALL: "C", TZ: "UTC" }, timeout: 1000 });
      const lockPath = join(vaultRoot, "coordination/locks/session-registry.lock");
      await mkdir(join(vaultRoot, "coordination/locks"), { recursive: true });
      const raw = JSON.stringify({ host: hostname(), pid: child.pid, identity: stdout.trim(), createdAt: Date.now(), token: "live-owner" });
      await fspWriteFile(lockPath, raw);
      process.env.TZ = "Pacific/Honolulu";
      const contender = new SessionRegistryManager(vaultRoot, 1, { lockTimeoutMs: 100 });
      await expect(contender.listActive()).rejects.toThrow(/lock|timed out/i);
      expect(await fspReadFile(lockPath, "utf8")).toBe(raw);
    } finally {
      if (previousTZ === undefined) delete process.env.TZ;
      else process.env.TZ = previousTZ;
      child.kill();
      await closed;
    }
  });

  it("rejects oversized registries before parsing or modifying them", async () => {
    const path = join(vaultRoot, "coordination/session-registry.json");
    await mkdir(join(vaultRoot, "coordination"));
    const raw = " ".repeat(8 * 1024 * 1024 + 1);
    await fspWriteFile(path, raw);
    await expect(manager.register("codex", "proj")).rejects.toThrow(/limit|large/i);
    expect((await stat(path)).size).toBe(Buffer.byteLength(raw));
  });

  it("rejects secrets before publishing registry state or backups", async () => {
    const path = join(vaultRoot, "coordination/session-registry.json");
    await manager.register("codex", "proj");
    const original = await fspReadFile(path, "utf-8");
    await expect(manager.register("opencode", "proj", `OPENAI_API_KEY=sk-${"a".repeat(24)}`)).rejects.toMatchObject({ code: "SECRET_REJECTED" });
    expect(await fspReadFile(path, "utf-8")).toBe(original);
    await expect(stat(`${path}.bak`)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("retains private audit snapshots before discarding completed provenance", async () => {
    const workspace = join(await realpath(vaultRoot), "workspace");
    await mkdir(workspace);
    const registered = await manager.register("codex", "proj", "historical task", [], workspace);
    await manager.complete(registered.session_id);
    const path = join(vaultRoot, "coordination/session-registry.json");
    const registry = JSON.parse(await fspReadFile(path, "utf-8"));
    registry.sessions[0].completed_at = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    await fspWriteFile(path, JSON.stringify(registry));
    await manager.register("opencode", "proj");
    const history = join(vaultRoot, "coordination/session-history");
    const names = await readdir(history);
    expect(names).toHaveLength(1);
    expect(JSON.parse(await fspReadFile(join(history, names[0]), "utf-8"))).toMatchObject({ id: registered.session_id, workspace_path: workspace, task_summary: "historical task" });
    expect((await stat(join(history, names[0]))).mode & 0o777).toBe(0o600);
    expect(await manager.get(registered.session_id)).toBeNull();
  });

  it("scopes file conflicts to the actual project", async () => {
    await manager.register("codex", "other", "other task", ["src/index.ts"]);
    const current = await manager.register("opencode", "proj", "current task", ["src/index.ts"]);
    expect(current.conflicts).toEqual([]);
    expect((await manager.heartbeat(current.session_id, undefined, "proj")).conflicts).toEqual([]);
    await expect(manager.heartbeat(current.session_id, undefined, null)).rejects.toThrow(/different project/i);
    await expect(manager.complete(current.session_id, undefined, "other")).rejects.toThrow(/different project/i);
  });

  describe("register", () => {
    it("creates session with generated ID", async () => {
      const result = await manager.register("claude-code", "test-project");
      expect(result.session_id).toMatch(/^claude-code-[a-f0-9]{8}$/);
      expect(result.claim).toEqual({ granted: true });
    });

    it("records the registering process and a workspace lease", async () => {
      const workspace = join(await realpath(vaultRoot), "workspace");
      await mkdir(workspace);
      const result = await manager.register("opencode", "my-project", "Doing work", ["file1.ts"], workspace);
      const session = await manager.get(result.session_id);
      expect(session?.pid).toBe(process.pid);
      expect(session?.host).toBe(hostname());
      expect(session?.workspace_path).toBe(workspace);
      expect(new Date(session!.lease_expires_at!).getTime()).toBeGreaterThan(Date.now());
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

    it("expires stale sessions on register instead of deleting them", async () => {
      const oldManager = new SessionRegistryManager(vaultRoot, 0);
      const stale = await oldManager.register("claude-code", "proj", "Old session");
      const registryPath = join(vaultRoot, "coordination/session-registry.json");
      const registry = JSON.parse(await fspReadFile(registryPath, "utf-8"));
      const entry = registry.sessions.find((s: any) => s.id === stale.session_id);
      delete entry.pid;
      delete entry.host;
      await fspWriteFile(registryPath, JSON.stringify(registry));

      await new Promise(r => setTimeout(r, 10));

      const newManager = new SessionRegistryManager(vaultRoot, 0.000001);
      await newManager.register("opencode", "proj", "New session");

      const expired = await newManager.get(stale.session_id);
      expect(expired?.status).toBe("expired");
      expect(expired?.expired_at).toBeDefined();
      expect((await newManager.listActive()).map(s => s.id)).not.toContain(stale.session_id);
    });

    it("never expires a session with a live local pid and a fresh heartbeat", async () => {
      const oldManager = new SessionRegistryManager(vaultRoot, 0);
      const live = await oldManager.register("claude-code", "proj", "Still running");

      await new Promise(r => setTimeout(r, 10));

      const newManager = new SessionRegistryManager(vaultRoot, 0.000001);
      await newManager.register("opencode", "proj", "New session");

      expect((await newManager.get(live.session_id))?.status).toBe("active");
    });

    describe("workspace claims", () => {
      let workspace: string;

      beforeEach(async () => {
        workspace = join(await realpath(vaultRoot), "workspace");
        await mkdir(workspace);
      });

      it("refuses a second claim without allowShared and reports the holder", async () => {
        const first = await manager.register("claude-code", "proj", "First task", ["a.ts"], workspace);
        const second = await manager.register("opencode", "proj", "Second task", ["a.ts"], workspace);

        expect(first.claim).toEqual({ granted: true });
        expect(second.claim).toEqual({
          granted: false,
          holder: { session_id: first.session_id, tool: "claude-code", task_summary: "First task" },
        });
        expect(second.conflicts).toHaveLength(1);
        expect(second.conflicts[0].overlapping_files).toEqual(["a.ts"]);
        expect((await manager.listActive()).map(s => s.id)).toEqual([first.session_id]);
      });

      it("grants a shared claim when allowShared is true", async () => {
        const first = await manager.register("claude-code", "proj", "First task", [], workspace);
        const second = await manager.register("opencode", "proj", "Second task", [], workspace, true);

        expect(second.claim).toEqual({ granted: true });
        expect((await manager.listActive()).map(s => s.id)).toEqual([first.session_id, second.session_id]);
      });

      it("reclaims claims from expired leases", async () => {
        const first = await manager.register("claude-code", "proj", "First task", [], workspace);
        const registryPath = join(vaultRoot, "coordination/session-registry.json");
        const registry = JSON.parse(await fspReadFile(registryPath, "utf-8"));
        registry.sessions.find((s: any) => s.id === first.session_id).lease_expires_at =
          new Date(Date.now() - 1000).toISOString();
        await fspWriteFile(registryPath, JSON.stringify(registry));

        const second = await manager.register("opencode", "proj", "Second task", [], workspace);
        expect(second.claim).toEqual({ granted: true });
      });

      it("releases the claim when the holder completes", async () => {
        const first = await manager.register("claude-code", "proj", "First task", [], workspace);
        await manager.complete(first.session_id);

        const second = await manager.register("opencode", "proj", "Second task", [], workspace);
        expect(second.claim).toEqual({ granted: true });
        expect((await manager.get(first.session_id))?.lease_expires_at).toBeUndefined();
      });

      it("does not treat expired sessions as claim holders", async () => {
        const first = await manager.register("claude-code", "proj", "First task", [], workspace);
        const registryPath = join(vaultRoot, "coordination/session-registry.json");
        const registry = JSON.parse(await fspReadFile(registryPath, "utf-8"));
        const entry = registry.sessions.find((s: any) => s.id === first.session_id);
        entry.status = "expired";
        entry.expired_at = new Date().toISOString();
        await fspWriteFile(registryPath, JSON.stringify(registry));

        const second = await manager.register("opencode", "proj", "Second task", [], workspace);
        expect(second.claim).toEqual({ granted: true });
      });
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
      expect(result).toEqual({ found: true, conflicts: [] });
    });

    it("returns not found for a missing session", async () => {
      const result = await manager.heartbeat("nonexistent-id");
      expect(result).toEqual({ found: false, conflicts: [] });
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

    it("refreshes the workspace lease", async () => {
      const workspace = join(await realpath(vaultRoot), "workspace");
      await mkdir(workspace);
      const { session_id } = await manager.register("claude-code", "proj", null, [], workspace);
      const registryPath = join(vaultRoot, "coordination/session-registry.json");
      const registry = JSON.parse(await fspReadFile(registryPath, "utf-8"));
      registry.sessions[0].lease_expires_at = new Date(Date.now() - 1000).toISOString();
      await fspWriteFile(registryPath, JSON.stringify(registry));

      await manager.heartbeat(session_id);

      const session = await manager.get(session_id);
      expect(new Date(session!.lease_expires_at!).getTime()).toBeGreaterThan(Date.now());
    });

    it("replaces touched files and reports conflicts", async () => {
      const first = await manager.register("claude-code", "proj", "First", ["a.ts"]);
      const second = await manager.register("opencode", "proj", "Second", []);

      const result = await manager.heartbeat(second.session_id, ["a.ts", "b.ts"]);

      expect(result.found).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].session_id).toBe(first.session_id);
      expect(result.conflicts[0].overlapping_files).toEqual(["a.ts"]);
      expect((await manager.get(second.session_id))?.files_touched).toEqual(["a.ts", "b.ts"]);
    });
  });

  describe("complete", () => {
    it("reports whether the session was found", async () => {
      const { session_id } = await manager.register("claude-code", "proj");
      expect(await manager.complete(session_id)).toEqual({ found: true });
      expect(await manager.complete("nonexistent-id")).toEqual({ found: false });
    });

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

    it("removes completed sessions after seven days", async () => {
      const { session_id } = await manager.register("claude-code", "proj");
      await manager.complete(session_id);
      
      const registryPath = join(vaultRoot, "coordination/session-registry.json");
      let raw = await fspReadFile(registryPath, "utf-8");
      let parsed = JSON.parse(raw);
      
      const session = parsed.sessions.find((s: any) => s.id === session_id);
      session.completed_at = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      
      await fspWriteFile(registryPath, JSON.stringify(parsed));
      
      await manager.register("opencode", "proj");
      
      raw = await fspReadFile(registryPath, "utf-8");
      parsed = JSON.parse(raw);
      
      expect(parsed.sessions.find((s: any) => s.id === session_id)).toBeUndefined();
    });

    it("clears completed workspace provenance after a day without dropping the record", async () => {
      const workspace = join(await realpath(vaultRoot), "workspace");
      await mkdir(workspace);
      const { session_id } = await manager.register("codex", "proj", null, [], workspace);
      await manager.complete(session_id);

      const registryPath = join(vaultRoot, "coordination/session-registry.json");
      const parsed = JSON.parse(await fspReadFile(registryPath, "utf-8"));
      parsed.sessions.find((s: any) => s.id === session_id).completed_at =
        new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      await fspWriteFile(registryPath, JSON.stringify(parsed));

      await manager.register("opencode", "proj");

      const session = await manager.get(session_id);
      expect(session).not.toBeNull();
      expect(session?.workspace_path).toBeUndefined();
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

    it("expires stale sessions and persists the change", async () => {
      const staleManager = new SessionRegistryManager(vaultRoot, 0.000001);
      const { session_id } = await staleManager.register("claude-code", "proj");
      const registryPath = join(vaultRoot, "coordination/session-registry.json");
      const registry = JSON.parse(await fspReadFile(registryPath, "utf-8"));
      const entry = registry.sessions.find((s: any) => s.id === session_id);
      delete entry.pid;
      delete entry.host;
      await fspWriteFile(registryPath, JSON.stringify(registry));

      await new Promise(r => setTimeout(r, 20));

      const active = await staleManager.listActive();
      expect(active).toEqual([]);

      const raw = await fspReadFile(registryPath, "utf-8");
      const parsed = JSON.parse(raw);

      expect(parsed.sessions).toHaveLength(1);
      expect(parsed.sessions[0].status).toBe("expired");
      expect(parsed.sessions[0].expired_at).toBeDefined();
    });
  });

  describe("withLock", () => {
    it("serializes simultaneous stale-lock recovery across independent managers", async () => {
      const path = join(vaultRoot, "coordination/locks/session-registry.lock");
      await mkdir(join(vaultRoot, "coordination/locks"), { recursive: true });
      await fspWriteFile(path, JSON.stringify({ host: hostname(), pid: 999999999, identity: "dead", token: "stale", createdAt: Date.now() }));
      const results = await Promise.all(Array.from({ length: 8 }, () => new SessionRegistryManager(vaultRoot, 1).register("codex", "proj")));
      expect((await manager.listActive()).map(session => session.id).sort()).toEqual(results.map(result => result.session_id).sort());
    });

    it("recovers a foreign lock only after its conservative lease", async () => {
      const path = "coordination/locks/session-registry.lock";
      const lockPath = join(vaultRoot, path);
      await mkdir(join(vaultRoot, "coordination/locks"), { recursive: true });
      await fspWriteFile(lockPath, JSON.stringify({ host: "foreign-machine", pid: process.pid, identity: "remote", token: "expired", createdAt: Date.now() - 16 * 60_000, leaseExpiresAt: Date.now() - 1000 }));
      const kill = vi.spyOn(process, "kill");
      await withCoordinationLock(vaultRoot, path, async () => {});
      expect(kill).not.toHaveBeenCalled();
      await expect(stat(lockPath)).rejects.toMatchObject({ code: "ENOENT" });
    });

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

    it("recovers a stale lock left by a dead process", async () => {
      const lockPath = join(vaultRoot, "coordination/locks/session-registry.lock");
      await mkdir(join(vaultRoot, "coordination/locks"), { recursive: true });
      const content = JSON.stringify({ pid: 999999999, createdAt: Date.now() - 120_000, token: "abandoned" });
      await fspWriteFile(lockPath, content);

      const result = await manager.register("claude-code", "proj");

      expect(result.session_id).toBeDefined();
      await expect(stat(lockPath)).rejects.toThrow();
    });

    it("recovers an aged lock without an owner pid", async () => {
      const lockPath = join(vaultRoot, "coordination/locks/session-registry.lock");
      await mkdir(join(vaultRoot, "coordination/locks"), { recursive: true });
      await fspWriteFile(lockPath, JSON.stringify({ token: "legacy" }));
      const old = new Date(Date.now() - 120_000);
      await utimes(lockPath, old, old);

      const result = await manager.register("claude-code", "proj");

      expect(result.session_id).toBeDefined();
      await expect(stat(lockPath)).rejects.toThrow();
    });

    it("does not steal a lock owned by a live pid even when it is old", async () => {
      const lockPath = join(vaultRoot, "coordination/locks/session-registry.lock");
      await mkdir(join(vaultRoot, "coordination/locks"), { recursive: true });
      const content = JSON.stringify({ pid: process.pid, createdAt: Date.now() - 120_000, token: "live" });
      await fspWriteFile(lockPath, content);

      await expect(new SessionRegistryManager(vaultRoot, 1, { lockTimeoutMs: 100 }).register("claude-code", "proj")).rejects.toThrow(lockPath);
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
        const lock = JSON.parse(await fspReadFile(lockPath, "utf-8"));
        lock.createdAt = Date.now() - 120_000;
        await fspWriteFile(lockPath, JSON.stringify(lock));
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
      const content = JSON.stringify({ pid: process.pid, token: "new-owner" });
      await withCoordinationLock(vaultRoot, "coordination/locks/session-registry.lock", async () => {
        await unlink(lockPath);
        await fspWriteFile(lockPath, content);
      });
      expect(await fspReadFile(lockPath, "utf-8")).toBe(content);
    });

    it("does not release a replacement inode even if its token was copied", async () => {
      const lockPath = join(vaultRoot, "coordination/locks/session-registry.lock");
      let replacement = "";
      await withCoordinationLock(vaultRoot, "coordination/locks/session-registry.lock", async lock => {
        replacement = await fspReadFile(lockPath, "utf-8");
        await unlink(lockPath);
        await fspWriteFile(lockPath, replacement);
        await expect(lock.assertOwned()).rejects.toThrow(/ownership changed/i);
      });
      expect(await fspReadFile(lockPath, "utf-8")).toBe(replacement);
    });

    it("does not replace the operation failure with a release failure", async () => {
      const path = "coordination/locks/session-registry.lock";
      const lockPath = join(vaultRoot, path);
      const target = join(vaultRoot, "untouched");
      await fspWriteFile(target, "evidence");
      const original = new Error("original registry failure");
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      await expect(withCoordinationLock(vaultRoot, path, async () => {
        await unlink(lockPath);
        await symlink(target, lockPath);
        throw original;
      })).rejects.toBe(original);
      expect(log).toHaveBeenCalledWith(expect.stringContaining("release"), expect.any(String));
      expect(await fspReadFile(target, "utf-8")).toBe("evidence");
    });

    it("waits beyond the former two-second timeout for a live writer", async () => {
      let enter!: () => void;
      const entered = new Promise<void>(resolve => { enter = resolve; });
      const owner = withCoordinationLock(vaultRoot, "coordination/locks/session-registry.lock", async () => {
        enter();
        await new Promise(resolve => setTimeout(resolve, 2150));
      });
      await entered;
      const contender = manager.register("codex", "proj");
      await owner;
      expect((await contender).claim).toEqual({ granted: true });
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
    it.each([
      { name: "project object", fields: { project: { unsafe: true } } },
      { name: "project traversal", fields: { project: "../escape" } },
      { name: "task summary", fields: { task_summary: 42 } },
      { name: "completion date", fields: { completed_at: "not-a-date" } },
      { name: "lease date", fields: { lease_expires_at: "not-a-date" } },
      { name: "hostname", fields: { host: 42 } },
      { name: "pid", fields: { pid: -1 } },
      { name: "process identity", fields: { process_identity: [] } },
      { name: "workspace identity", fields: { workspace_identity: { head: "bad" } } },
      { name: "oversized file path", fields: { files_touched: ["x".repeat(4097)] } },
    ])("preserves entries with invalid optional fields: $name", async ({ fields }) => {
      await manager.register("codex", "proj");
      const path = join(vaultRoot, "coordination/session-registry.json");
      const registry = JSON.parse(await fspReadFile(path, "utf-8"));
      Object.assign(registry.sessions[0], fields);
      const raw = JSON.stringify(registry);
      await fspWriteFile(path, raw);
      await expect(manager.listForMaintenance()).rejects.toThrow(/invalid session registry/i);
      expect(await fspReadFile(path, "utf-8")).toBe(raw);
    });

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
    it("expires stale actives while keeping evidence and pruning completed provenance", async () => {
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
      const staleAt = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      for (const session of registry.sessions) {
        session.last_heartbeat = staleAt;
        delete session.pid;
        delete session.host;
        if (session.status === "completed") session.completed_at = staleAt;
      }
      await fspWriteFile(path, JSON.stringify(registry));
      const before = await fspReadFile(path, "utf-8");
      expect(await manager.listForMaintenance()).toHaveLength(3);
      expect(await fspReadFile(path, "utf-8")).toBe(before);

      const activeIds = (await manager.listActive()).map(s => s.id);
      expect(activeIds).not.toContain(active.session_id);
      expect(activeIds).not.toContain(ordinary.session_id);
      const expired = await manager.get(active.session_id);
      expect(expired?.status).toBe("expired");
      expect(expired?.expired_at).toBeDefined();
      expect(expired?.workspace_path).toBe(activePath);

      await manager.register("other", "proj");
      const finished = await manager.get(completed.session_id);
      expect(finished).not.toBeNull();
      expect(finished?.workspace_path).toBeUndefined();

      await manager.acknowledgeWorkspaceRemoval(completedPath);
      await manager.acknowledgeWorkspaceRemoval(activePath);
      expect((await manager.get(active.session_id))?.workspace_path).toBe(activePath);
    });

    it("compares canonical workspace paths when acknowledging removals", async () => {
      const target = join(await realpath(vaultRoot), "real");
      await mkdir(target);
      const alias = join(vaultRoot, "alias");
      await symlink(target, alias);
      const { session_id } = await manager.register("codex", "proj", null, [], alias);
      await manager.complete(session_id);
      expect((await manager.get(session_id))?.workspace_path).toBe(target);

      await manager.acknowledgeWorkspaceRemoval(alias);

      expect((await manager.get(session_id))?.workspace_path).toBeUndefined();
    });

    it("runs maintenance callbacks outside the registry lock", async () => {
      const workspace = join(vaultRoot, "workspace");
      await mkdir(workspace);
      const session = await manager.register("codex", "proj", null, [], workspace);
      await manager.complete(session.session_id);
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
      await Promise.all([registration, beat]);
      expect(registered).toBe(true);
      expect(heartbeat).toBe(true);
      release();
      expect(await maintenance).toBe("done");
    });

    it("holds the final maintenance lease through relocation and rejects a queued claim for the missing workspace", async () => {
      const workspace = join(await realpath(vaultRoot), "workspace");
      const archived = join(await realpath(vaultRoot), "archived");
      await mkdir(workspace);
      const owner = await manager.register("codex", "proj", null, [], workspace);
      await manager.complete(owner.session_id);
      let enter!: () => void;
      const entered = new Promise<void>(resolve => { enter = resolve; });
      let release!: () => void;
      const gate = new Promise<void>(resolve => { release = resolve; });
      const maintenance = manager.withMaintenanceLease(async sessions => {
        expect(sessions.map(session => session.id)).toEqual([owner.session_id]);
        enter();
        await gate;
        await rename(workspace, archived);
        return "relocated";
      });
      await entered;
      const contender = new SessionRegistryManager(vaultRoot, 1);
      let settled = false;
      const registration = contender.register("opencode", "proj", null, [], workspace).then(
        result => { settled = true; return { result }; },
        error => { settled = true; return { error }; },
      );
      let blocked: boolean;
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        blocked = !settled;
      } finally { release(); }
      expect(await maintenance).toBe("relocated");
      expect(blocked).toBe(true);
      expect(await registration).toMatchObject({ error: expect.objectContaining({ message: expect.stringContaining("existing directory") }) });
      expect((await manager.listForMaintenance()).map(session => session.id)).toEqual([owner.session_id]);
    });

    it("releases the final maintenance lease after callback errors and does not persist callback snapshot changes", async () => {
      const owner = await manager.register("codex", "proj");
      await expect(manager.withMaintenanceLease(async sessions => {
        sessions[0].task_summary = "not persisted";
        throw new Error("final proof refused");
      })).rejects.toThrow("final proof refused");
      expect((await manager.get(owner.session_id))?.task_summary).toBeNull();
      expect((await manager.register("opencode", "proj")).claim.granted).toBe(true);
    });

    it("rejects registration when its workspace no longer exists", async () => {
      const workspace = join(vaultRoot, "workspace");
      await mkdir(workspace);
      let enter!: () => void;
      const entered = new Promise<void>(resolve => { enter = resolve; });
      const maintenance = manager.withMaintenanceSessions(async () => {
        await rm(workspace, { recursive: true });
        enter();
      });
      await entered;
      await expect(manager.register("codex", "proj", null, [], workspace)).rejects.toThrow(/workspace_path/);
      await maintenance;
      expect(await manager.listForMaintenance()).toEqual([]);
    });

    it("fails closed for corrupt maintenance snapshots without modifying evidence", async () => {
      const dir = join(vaultRoot, "coordination");
      const path = join(dir, "session-registry.json");
      await mkdir(dir, { recursive: true });
      for (const raw of ["not json", JSON.stringify({ sessions: [{id:"unsafe",workspace_path:"/work/repo"}] })]) {
        await fspWriteFile(path, raw);
        await expect(manager.listForMaintenance()).rejects.toThrow(/registry/i);
        const callback = vi.fn();
        await expect(manager.withMaintenanceLease(callback)).rejects.toThrow(/registry/i);
        expect(callback).not.toHaveBeenCalled();
        expect(await fspReadFile(path, "utf-8")).toBe(raw);
      }
    });
  });

  describe("listInterrupted", () => {
    it("returns expired sessions and actives with an old heartbeat", async () => {
      const path = join(vaultRoot, "coordination/session-registry.json");
      const interrupted = await manager.register("claude-code", "proj", "Hung");
      const expired = await manager.register("opencode", "proj", "Crashed");
      const fresh = await manager.register("codex", "proj", "Fresh");
      const completed = await manager.register("cursor", "proj", "Done");
      await manager.complete(completed.session_id);
      const registry = JSON.parse(await fspReadFile(path, "utf-8"));
      for (const session of registry.sessions) {
        delete session.pid;
        delete session.host;
        if (session.id === interrupted.session_id) {
          session.last_heartbeat = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        }
        if (session.id === expired.session_id) {
          session.last_heartbeat = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
        }
      }
      await fspWriteFile(path, JSON.stringify(registry));

      const ids = (await manager.listInterrupted()).map(s => s.id);
      expect(ids).toContain(interrupted.session_id);
      expect(ids).toContain(expired.session_id);
      expect(ids).not.toContain(fresh.session_id);
      expect(ids).not.toContain(completed.session_id);
      expect((await manager.get(expired.session_id))?.status).toBe("expired");
    });
  });

});
