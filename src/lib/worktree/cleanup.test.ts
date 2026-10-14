import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, writeFile, rm, access, realpath, readFile, symlink, lstat, readdir, utimes, unlink } from "node:fs/promises";
import { join } from "node:path";
import { hostname, tmpdir } from "node:os";
import { captureCleanupWorkspaceIdentity, cleanupCompletedWorktrees as cleanup, type CleanupOptions, type CleanupSession } from "./cleanup.js";
import { SessionRegistryManager } from "../session-registry.js";

const exec = promisify(execFile);
const env = { ...process.env, GIT_AUTHOR_NAME: "Test", GIT_AUTHOR_EMAIL: "test@example.com", GIT_COMMITTER_NAME: "Test", GIT_COMMITTER_EMAIL: "test@example.com", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };
const git = async (cwd: string, args: string[]) => (await exec("git", args, { cwd, env, timeout: 10000 })).stdout.trim();
const present = async (path: string) => access(path).then(() => true, () => false);
const completed = (path: string) => [{
  id: "done",
  status: "completed",
  workspace_path: path,
  completed_at: new Date(Date.now() - 120_000).toISOString(),
}];

async function cleanupCompletedWorktrees(cwd: string, sessions: CleanupSession[], options: CleanupOptions = {}) {
  const bound = await Promise.all(sessions.map(async (session) => {
    if (session.status !== "completed" || !session.workspace_path || session.workspace_identity) return session;
    try { return { ...session, workspace_identity: await captureCleanupWorkspaceIdentity(session.workspace_path) }; }
    catch { return session; }
  }));
  return cleanup(cwd, bound, { readSessions: async () => bound, withSessionLease: callback => callback(bound), ...options });
}

describe("completed worktree cleanup", { timeout: 20000 }, () => {
  let base: string;
  let repo: string;
  let tree: string;
  beforeEach(async () => {
    base = await realpath(await mkdtemp(join(tmpdir(), "superskill-cleanup-")));
    repo = join(base, "repo");
    tree = join(base, "task");
    await mkdir(repo);
    await git(repo, ["init", "-q", "-b", "main"]);
    await writeFile(join(repo, "note.txt"), "base\n");
    await writeFile(join(repo, ".gitignore"), "*.log\n");
    await git(repo, ["add", "."]);
    await git(repo, ["commit", "-qm", "base"]);
    await git(repo, ["worktree", "add", "-qb", "task", tree]);
  });
  afterEach(async () => { vi.useRealTimers(); vi.unstubAllEnvs(); await rm(base, { recursive: true, force: true }); });

  it("quarantines only a completed merged worktree and is idempotent without deleting it", async () => {
    await writeFile(join(tree, "note.txt"), "done\n");
    await git(tree, ["commit", "-qam", "done"]);
    await git(repo, ["merge", "--ff-only", "task"]);
    const result = await cleanupCompletedWorktrees(repo, completed(tree));
    expect(result.removed).toEqual([]);
    expect(result.quarantined?.map((entry) => entry.worktree)).toEqual([tree]);
    expect(await present(tree)).toBe(false);
    expect(await readFile(join(result.quarantined![0].path, "note.txt"), "utf-8")).toBe("done\n");
    expect(await git(repo, ["worktree", "list", "--porcelain"])).toContain(result.quarantined![0].path);
    expect(await git(repo, ["worktree", "list", "--porcelain"])).toContain("locked SuperSkill recovery manifest");
    expect(await git(repo, ["rev-parse", "--verify", "refs/heads/task"])).toBeTruthy();
    expect((await cleanupCompletedWorktrees(repo, completed(tree))).removed).toEqual([]);
  });

  it("never deletes an ignored file created after the last status proof", async () => {
    const realGit = (await exec("which", ["git"])).stdout.trim();
    const bin = join(base, "bin");
    await mkdir(bin);
    await writeFile(join(bin, "git"), `#!${process.execPath}
const { execFileSync } = require("node:child_process");
const { writeFileSync } = require("node:fs");
const args = process.argv.slice(2);
if (args[0] === "worktree" && ["remove", "move"].includes(args[1])) {
  writeFileSync(${JSON.stringify(join(tree, "raced.log"))}, "irreplaceable ignored work");
}
try { process.stdout.write(execFileSync(${JSON.stringify(realGit)}, args, { env: process.env })); }
catch (error) { process.stderr.write(error.stderr || "failed"); process.exit(error.status || 1); }
`, { mode: 0o700 });
    vi.stubEnv("PATH", `${bin}:${process.env.PATH}`);
    const result = await cleanupCompletedWorktrees(repo, completed(tree));
    expect(result.removed).toEqual([]);
    expect(result.quarantined).toHaveLength(1);
    expect(await readFile(join(result.quarantined![0].path, "raced.log"), "utf-8")).toBe("irreplaceable ignored work");
  }, 15000);

  it("preserves ignored SuperSkill metadata with the entire quarantined worktree", async () => {
    await writeFile(join(repo, ".git", "info", "exclude"), ".superskill/\n");
    await mkdir(join(tree, ".superskill"));
    await writeFile(join(tree, ".superskill", "graph.json"), '{"learned":true}');
    const outside = join(base, "outside.txt");
    await writeFile(outside, "untouched");
    await symlink(outside, join(tree, ".superskill", "cache-link"));
    const result = await cleanupCompletedWorktrees(repo, completed(tree));
    expect(result.removed).toEqual([]);
    expect(result.quarantined).toHaveLength(1);
    expect(result.archives).toHaveLength(1);
    const archive = result.archives![0];
    expect(archive.worktree).toBe(tree);
    expect(archive.path.startsWith(join(repo, ".git", "superskill", "worktree-archives") + "/")).toBe(true);
    expect(await readFile(join(archive.path, "graph.json"), "utf-8")).toBe('{"learned":true}');
    expect((await lstat(join(archive.path, "cache-link"))).isSymbolicLink()).toBe(true);
    expect(await readFile(outside, "utf-8")).toBe("untouched");
  });

  it("keeps unrelated ignored files even when metadata is archivable", async () => {
    await writeFile(join(repo, ".git", "info", "exclude"), ".superskill/\n");
    await mkdir(join(tree, ".superskill"));
    await writeFile(join(tree, ".superskill", "graph.json"), "{}");
    await writeFile(join(tree, "user.log"), "keep");
    const result = await cleanupCompletedWorktrees(repo, completed(tree));
    expect(result.removed).toEqual([]);
    expect(result.archives ?? []).toEqual([]);
    expect(await present(join(tree, ".superskill", "graph.json"))).toBe(true);
  });

  it("keeps graph initialization changes to a tracked gitignore", async () => {
    await writeFile(join(tree, ".gitignore"), "*.log\n.superskill/\n");
    await mkdir(join(tree, ".superskill"));
    await writeFile(join(tree, ".superskill", "graph.json"), "{}");
    const result = await cleanupCompletedWorktrees(repo, completed(tree));
    expect(result.removed).toEqual([]);
    expect(result.archives ?? []).toEqual([]);
    expect(await present(join(tree, ".superskill", "graph.json"))).toBe(true);
  });

  it("refuses symlink metadata roots and archive directories", async () => {
    await writeFile(join(repo, ".git", "info", "exclude"), ".superskill\n");
    const outside = join(base, "outside");
    await mkdir(outside);
    await symlink(outside, join(tree, ".superskill"));
    expect((await cleanupCompletedWorktrees(repo, completed(tree))).removed).toEqual([]);
    await rm(join(tree, ".superskill"));
    await mkdir(join(tree, ".superskill"));
    await writeFile(join(tree, ".superskill", "graph.json"), "{}");
    await symlink(outside, join(repo, ".git", "superskill"));
    expect((await cleanupCompletedWorktrees(repo, completed(tree))).removed).toEqual([]);
    expect(await present(join(tree, ".superskill", "graph.json"))).toBe(true);
  });

  it.each(["before", "after", "rename-only"])("journals recovery before moving and preserves work when move fails at %s", async (phase) => {
    await writeFile(join(repo, ".git", "info", "exclude"), ".superskill/\n");
    await mkdir(join(tree, ".superskill"));
    await writeFile(join(tree, ".superskill", "graph.json"), "retained");
    const realGit = (await exec("which", ["git"])).stdout.trim();
    const bin = join(base, "bin");
    await mkdir(bin);
    await writeFile(join(bin, "git"), `#!${process.execPath}
const { execFileSync } = require("node:child_process");
const { writeFileSync, readFileSync, readdirSync, renameSync } = require("node:fs");
const args = process.argv.slice(2);
if (args[0] === "worktree" && args[1] === "move") {
  const dir = ${JSON.stringify(join(repo, ".git", "superskill", "worktree-archives"))};
  const record = JSON.parse(readFileSync(dir + "/" + readdirSync(dir)[0] + "/recovery.json", "utf8"));
  if (record.worktree !== ${JSON.stringify(tree)} || record.path !== args[4] || record.state !== "prepared") process.exit(3);
  execFileSync(${JSON.stringify(realGit)}, ["rev-parse", "--verify", record.rescueRef]);
  writeFileSync(${JSON.stringify(join(tree, "new.txt"))}, "concurrent edit");
  if (${JSON.stringify(phase)} === "after") execFileSync(${JSON.stringify(realGit)}, args);
  if (${JSON.stringify(phase)} === "rename-only") renameSync(args[3], args[4]);
  process.stderr.write("injected interrupted move");
  process.exit(1);
}
try { process.stdout.write(execFileSync(${JSON.stringify(realGit)}, args, { env: process.env })); }
catch (error) { process.stderr.write(error.stderr || "failed"); process.exit(error.status || 1); }
`, { mode: 0o700 });
    vi.stubEnv("PATH", `${bin}:${process.env.PATH}`);
    const result = await cleanupCompletedWorktrees(repo, completed(tree));
    expect(result.removed).toEqual([]);
    expect(result.errors.length).toBeGreaterThan(0);
    const recovery = result.recoveries![0];
    const preserved = phase === "before" ? tree : recovery.path;
    expect(await readFile(join(preserved, ".superskill", "graph.json"), "utf-8")).toBe("retained");
    expect(await readFile(join(preserved, "new.txt"), "utf-8")).toBe("concurrent edit");
    expect(result.errors.some((error) => error.reason.includes(recovery.manifest))).toBe(true);
    expect(await git(repo, ["rev-parse", recovery.rescueRef])).toBe(recovery.head);
    vi.unstubAllEnvs();
    expect((await cleanup(repo, [], { dryRun: true })).recoveries).toEqual([recovery]);
    if (phase === "rename-only") {
      await git(repo, ["worktree", "repair", recovery.path]);
      expect(await git(repo, ["worktree", "list", "--porcelain"])).toContain(recovery.path);
      expect(await git(recovery.path, ["rev-parse", "HEAD"])).toBe(recovery.head);
    }
  }, 15000);

  it("accepts an exact full-tree squash match", async () => {
    await writeFile(join(tree, "note.txt"), "squashed\n");
    await git(tree, ["commit", "-qam", "task change"]);
    await writeFile(join(repo, "note.txt"), "squashed\n");
    await git(repo, ["commit", "-qam", "different squash commit"]);
    expect((await cleanupCompletedWorktrees(repo, completed(tree))).quarantined?.map((entry) => entry.worktree)).toEqual([tree]);
  });

  it("keeps clean unmerged content even if a remote-tracking ref contains it", async () => {
    await writeFile(join(tree, "note.txt"), "unmerged\n");
    await git(tree, ["commit", "-qam", "unmerged"]);
    await git(repo, ["update-ref", "refs/remotes/origin/task", await git(tree, ["rev-parse", "HEAD"])]);
    const result = await cleanupCompletedWorktrees(repo, completed(tree));
    expect(result.removed).toEqual([]);
    expect(result.kept.find((item) => item.path === tree)?.reason).toContain("not merged");
  });

  it.each(["tracked", "untracked", "ignored"])("keeps %s content", async (kind) => {
    await writeFile(join(tree, kind === "tracked" ? "note.txt" : kind === "ignored" ? "build.log" : "new.txt"), "keep me\n");
    expect((await cleanupCompletedWorktrees(repo, completed(tree))).removed).toEqual([]);
    expect(await present(tree)).toBe(true);
  });

  it("keeps active, current, primary and unknown-ownership worktrees", async () => {
    expect((await cleanupCompletedWorktrees(repo, [...completed(tree), { id: "active", status: "active", workspace_path: tree }])).removed).toEqual([]);
    const current = await cleanupCompletedWorktrees(tree, completed(tree));
    expect(current.kept.find((item) => item.path === tree)?.reason).toContain("switch to the primary checkout");
    expect((await cleanupCompletedWorktrees(repo, completed(repo))).removed).toEqual([]);
    expect((await cleanupCompletedWorktrees(repo, [])).removed).toEqual([]);
    expect((await cleanupCompletedWorktrees(repo, completed(tree), { currentSessionId: "done" })).removed).toEqual([]);
    const currentSession = await cleanupCompletedWorktrees(repo, completed(tree), { currentSessionId: "done" });
    expect(currentSession.kept.find((item) => item.path === tree)?.reason).toContain("active or current session");
  });

  it("keeps worktrees whose owning session completed less than a minute ago", async () => {
    await writeFile(join(tree, "note.txt"), "done\n");
    await git(tree, ["commit", "-qam", "done"]);
    await git(repo, ["merge", "--ff-only", "task"]);
    const recent = [{ id: "done", status: "completed", workspace_path: tree, completed_at: new Date().toISOString() }];

    const result = await cleanupCompletedWorktrees(repo, recent);

    expect(result.removed).toEqual([]);
    expect(result.kept.find((item) => item.path === tree)?.reason).toContain("less than 60s");
  });

  it("keeps worktrees whose owning session process is still running on this host", async () => {
    await writeFile(join(tree, "note.txt"), "done\n");
    await git(tree, ["commit", "-qam", "done"]);
    await git(repo, ["merge", "--ff-only", "task"]);
    const live = [{ ...completed(tree)[0], pid: process.pid, host: hostname() }];

    const result = await cleanupCompletedWorktrees(repo, live);

    expect(result.removed).toEqual([]);
    expect(result.kept.find((item) => item.path === tree)?.reason).toContain("still running");
  });

  it("keeps worktrees without a recorded completion time", async () => {
    await writeFile(join(tree, "note.txt"), "done\n");
    await git(tree, ["commit", "-qam", "done"]);
    await git(repo, ["merge", "--ff-only", "task"]);

    const result = await cleanupCompletedWorktrees(repo, [{ id: "done", status: "completed", workspace_path: tree }]);

    expect(result.removed).toEqual([]);
    expect(result.kept.find((item) => item.path === tree)?.reason).toContain("less than 60s");
  });

  it("protects main when it is checked out in a linked worktree", async () => {
    await git(repo, ["branch", "-m", "main", "primary"]);
    await git(repo, ["branch", "main"]);
    await git(tree, ["checkout", "-q", "main"]);
    const result = await cleanupCompletedWorktrees(repo, completed(tree));
    expect(result.removed).toEqual([]);
    expect(result.kept.find((item) => item.path === tree)?.reason).toContain("main");
  });

  it("keeps locked and operation-in-progress worktrees", async () => {
    await git(repo, ["worktree", "lock", tree]);
    expect((await cleanupCompletedWorktrees(repo, completed(tree))).removed).toEqual([]);
    await git(repo, ["worktree", "unlock", tree]);
    const gitDir = await git(tree, ["rev-parse", "--absolute-git-dir"]);
    await writeFile(join(gitDir, "MERGE_HEAD"), await git(repo, ["rev-parse", "HEAD"]));
    expect((await cleanupCompletedWorktrees(repo, completed(tree))).removed).toEqual([]);
  });

  it.each(["--assume-unchanged", "--skip-worktree"])("keeps hidden tracked changes with %s", async (flag) => {
    await git(tree, ["update-index", flag, "note.txt"]);
    await writeFile(join(tree, "note.txt"), "unrecorded contents\n");
    expect((await cleanupCompletedWorktrees(repo, completed(tree))).removed).toEqual([]);
    expect(await present(tree)).toBe(true);
  });

  it("keeps prunable records and ignores provenance from a different repository", async () => {
    await rm(tree, { recursive: true });
    const result = await cleanupCompletedWorktrees(repo, completed(tree));
    expect(result.removed).toEqual([]);
    expect(result.kept.find((item) => item.path === tree)?.reason).toContain("prunable");
    expect((await cleanupCompletedWorktrees(repo, completed(join(base, "unrelated")))).removed).toEqual([]);
  });

  it("serializes concurrent cleanup and does not steal abandoned locks", async () => {
    const results = await Promise.all([cleanupCompletedWorktrees(repo, completed(tree)), cleanupCompletedWorktrees(repo, completed(tree))]);
    expect(results.flatMap((result) => result.quarantined?.map((entry) => entry.worktree) ?? [])).toEqual([tree]);
    const lockPath = join(repo, ".git", "superskill-worktree-cleanup.lock");
    await writeFile(lockPath, "different-owner");
    const result = await cleanupCompletedWorktrees(repo, []);
    expect(result.errors.some((error) => error.reason.includes("locked"))).toBe(true);
    expect(await present(lockPath)).toBe(true);
  });

  it("recovers a stale cleanup lock left by a dead process", async () => {
    await writeFile(join(tree, "note.txt"), "done\n");
    await git(tree, ["commit", "-qam", "done"]);
    await git(repo, ["merge", "--ff-only", "task"]);
    const lockPath = join(repo, ".git", "superskill-worktree-cleanup.lock");
    await writeFile(lockPath, JSON.stringify({ pid: 999999999, host: hostname(), createdAt: Date.now() - 120_000, token: "abandoned" }));

    const result = await cleanupCompletedWorktrees(repo, completed(tree));

    expect(result.quarantined?.map((entry) => entry.worktree)).toEqual([tree]);
    expect(await present(lockPath)).toBe(false);
  });

  it("does not steal a cleanup lock owned by a live pid even when it is old", async () => {
    const lockPath = join(repo, ".git", "superskill-worktree-cleanup.lock");
    const content = JSON.stringify({ pid: process.pid, createdAt: Date.now() - 120_000, token: "live" });
    await writeFile(lockPath, content);

    const result = await cleanupCompletedWorktrees(repo, []);

    expect(result.errors.some((error) => error.reason.includes("locked"))).toBe(true);
    expect(await readFile(lockPath, "utf-8")).toBe(content);
  });

  it("keeps submodule worktrees", async () => {
    await git(tree, ["update-index", "--add", "--cacheinfo", `160000,${await git(repo, ["rev-parse", "HEAD"])},module`]);
    await git(tree, ["commit", "-qm", "submodule"]);
    await git(repo, ["merge", "--ff-only", "task"]);
    const result = await cleanupCompletedWorktrees(repo, completed(tree));
    expect(result.removed).toEqual([]);
    expect(result.kept.find((item) => item.path === tree)?.reason).toContain("submodule");
  });

  it("supports a unique local trunk default and fails closed when default refs are ambiguous", async () => {
    await git(repo, ["branch", "-m", "main", "trunk"]);
    await git(repo, ["branch", "master"]);
    const ambiguous = await cleanupCompletedWorktrees(repo, completed(tree));
    expect(ambiguous.quarantined).toEqual([]);
    expect(ambiguous.errors[0].reason).toContain("ambiguous");
    await git(repo, ["config", "superskill.defaultBranch", "trunk"]);
    expect((await cleanupCompletedWorktrees(repo, completed(tree))).quarantined).toHaveLength(1);
  });

  it("refuses path-only provenance and stale HEAD or administration identities", async () => {
    expect((await cleanup(repo, completed(tree))).kept.find((entry) => entry.path === tree)?.reason).toContain("identity");
    const identity = await captureCleanupWorkspaceIdentity(tree);
    const sessions = [{ ...completed(tree)[0], workspace_identity: identity }];
    await git(tree, ["commit", "--allow-empty", "-qm", "reused checkout"]);
    await git(repo, ["merge", "--ff-only", "task"]);
    expect((await cleanup(repo, sessions, { readSessions: async () => sessions })).quarantined).toEqual([]);
    const reused = [{ ...completed(tree)[0], workspace_identity: await captureCleanupWorkspaceIdentity(tree) }];
    await git(repo, ["worktree", "remove", tree]);
    await git(repo, ["worktree", "add", tree, "task"]);
    expect((await cleanup(repo, reused, { readSessions: async () => reused })).kept.find((entry) => entry.path === tree)?.reason).toContain("identity");
  });

  it("requires a fresh session snapshot and honors active claims acquired during proof", async () => {
    const sessions = [{ ...completed(tree)[0], workspace_identity: await captureCleanupWorkspaceIdentity(tree) }];
    const absent = await cleanup(repo, sessions);
    expect(absent.kept.find((entry) => entry.path === tree)?.reason).toContain("lease");
    const refreshed = vi.fn(async () => [...sessions, { id: "new-owner", status: "active", workspace_path: tree }]);
    const result = await cleanup(repo, sessions, { readSessions: refreshed, withSessionLease: callback => callback(sessions) });
    expect(refreshed).toHaveBeenCalledOnce();
    expect(result.quarantined).toEqual([]);
    expect(result.errors[0].reason).toContain("active or current");
    expect(await present(tree)).toBe(true);
  });

  it("refuses relocation when a live reread is available without a final session lease", async () => {
    const sessions = [{ ...completed(tree)[0], workspace_identity: await captureCleanupWorkspaceIdentity(tree) }];
    const result = await cleanup(repo, sessions, { readSessions: async () => sessions });
    expect(result.quarantined).toEqual([]);
    expect(result.kept.find(entry => entry.path === tree)?.reason).toContain("lease");
    expect(await present(tree)).toBe(true);
  });

  it("uses the leased session snapshot when a claim arrives after the broad reread", async () => {
    const sessions = [{ ...completed(tree)[0], workspace_identity: await captureCleanupWorkspaceIdentity(tree) }];
    let leased = false;
    const result = await cleanup(repo, sessions, {
      readSessions: async () => sessions,
      withSessionLease: callback => {
        leased = true;
        return callback([...sessions, { id: "late-owner", status: "active", workspace_path: tree }]);
      },
    });
    expect(leased).toBe(true);
    expect(result.quarantined).toEqual([]);
    expect(result.errors[0].reason).toContain("active or current session");
    expect(await present(tree)).toBe(true);
  });

  it("serializes a registration injected immediately before Git move until the relocated workspace is missing", async () => {
    const vault = join(base, "vault");
    await mkdir(vault);
    const registry = new SessionRegistryManager(vault, 1);
    const identity = await captureCleanupWorkspaceIdentity(tree);
    const startedAt = new Date(identity.gitDirBirthtimeMs).toISOString();
    const completedAt = Math.max(Date.now(), identity.gitDirBirthtimeMs + 1000);
    const sessions = [{ ...completed(tree)[0], tool: "codex", project: null, files_touched: [], started_at: startedAt, last_heartbeat: new Date(completedAt).toISOString(), completed_at: new Date(completedAt).toISOString(), workspace_identity: identity }];
    await mkdir(join(vault, "coordination"));
    await writeFile(join(vault, "coordination", "session-registry.json"), JSON.stringify({ sessions }));
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(completedAt + 120_000);
    const realGit = (await exec("which", ["git"])).stdout.trim();
    const bin = join(base, "bin");
    const ready = join(base, "before-move");
    const proceed = join(base, "proceed");
    const trace = join(base, "lease-phases.jsonl");
    const registryLock = join(vault, "coordination", "locks", "session-registry.lock");
    await mkdir(bin);
    await writeFile(join(bin, "git"), `#!${process.execPath}
const { execFileSync } = require("node:child_process");
const { writeFileSync, existsSync } = require("node:fs");
const args = process.argv.slice(2);
if (args[0] === "status" || args[0] === "worktree" && ["move", "lock"].includes(args[1])) {
  writeFileSync(${JSON.stringify(trace)}, JSON.stringify({ phase: args[0] === "status" ? "assessment" : args[1], locked: existsSync(${JSON.stringify(registryLock)}) }) + "\\n", { flag: "a" });
}
const run = () => {
  try { process.stdout.write(execFileSync(${JSON.stringify(realGit)}, args, { env: process.env })); }
  catch (error) { process.stderr.write(error.stderr || "failed"); process.exit(error.status || 1); }
};
if (args[0] === "worktree" && args[1] === "move") {
  writeFileSync(${JSON.stringify(ready)}, "ready");
  const deadline = setTimeout(() => process.exit(9), 4000);
  const interval = setInterval(() => {
    if (!existsSync(${JSON.stringify(proceed)})) return;
    clearInterval(interval);
    clearTimeout(deadline);
    run();
  }, 10);
} else run();
`, { mode: 0o700 });
    vi.stubEnv("PATH", `${bin}:${process.env.PATH}`);
    const maintenance = cleanup(repo, sessions, {
      readSessions: () => registry.listForMaintenance(),
      withSessionLease: callback => registry.withMaintenanceLease(callback),
    });
    let registration: Promise<{ granted?: boolean; error?: string }> | undefined;
    let settled = false;
    let lockedAtMove = false;
    let blockedAtMove = false;
    try {
      for (let attempt = 0; attempt < 1000 && !await present(ready); attempt++) await new Promise(resolve => setTimeout(resolve, 10));
      expect(await present(ready)).toBe(true);
      const contender = new SessionRegistryManager(vault, 1);
      registration = contender.register("opencode", null, null, [], tree).then(
        result => { settled = true; return { granted: result.claim.granted }; },
        error => { settled = true; return { error: (error as Error).message }; },
      );
      await new Promise(resolve => setTimeout(resolve, 150));
      lockedAtMove = await present(registryLock);
      blockedAtMove = !settled;
    } finally { await writeFile(proceed, "go"); }
    const result = await maintenance;
    const claim = await registration;
    expect(claim).toMatchObject({ error: expect.stringContaining("existing directory") });
    expect(lockedAtMove).toBe(true);
    expect(blockedAtMove).toBe(true);
    expect(result.quarantined, JSON.stringify(result)).toHaveLength(1);
    expect((await registry.listForMaintenance()).map(session => session.id)).toEqual(["done"]);
    expect(await readFile(join(result.quarantined![0].path, "note.txt"), "utf-8")).toBe("base\n");
    const phases = (await readFile(trace, "utf-8")).trim().split("\n").map(line => JSON.parse(line));
    expect(phases).toEqual([
      { phase: "assessment", locked: false },
      { phase: "assessment", locked: false },
      { phase: "move", locked: true },
      { phase: "lock", locked: true },
    ]);
  }, 20000);

  it("holds foreign-host completed sessions for grace and bounds expired session pins", async () => {
    const foreign = [{ ...completed(tree)[0], host: "another-machine", pid: process.pid }];
    expect((await cleanupCompletedWorktrees(repo, foreign)).kept.find((entry) => entry.path === tree)?.reason).toContain("another host");
    const expired = { id: "expired", status: "expired", workspace_path: tree, expired_at: new Date().toISOString() };
    expect((await cleanupCompletedWorktrees(repo, [...completed(tree), expired])).kept.find((entry) => entry.path === tree)?.reason).toContain("grace");
    expired.expired_at = new Date(Date.now() - 31 * 60_000).toISOString();
    expect((await cleanupCompletedWorktrees(repo, [...completed(tree), expired])).quarantined).toHaveLength(1);
  });

  it("uses symbolic remote default branches and creates rescue refs for detached squash HEADs", async () => {
    await git(repo, ["branch", "-m", "main", "master"]);
    await git(repo, ["update-ref", "refs/remotes/origin/master", await git(repo, ["rev-parse", "HEAD"])]);
    await git(repo, ["symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/master"]);
    await git(tree, ["checkout", "--detach", "-q"]);
    await git(tree, ["commit", "--allow-empty", "-qm", "detached identical tree"]);
    const head = await git(tree, ["rev-parse", "HEAD"]);
    const result = await cleanupCompletedWorktrees(repo, completed(tree));
    expect(result.quarantined).toHaveLength(1);
    expect(await git(repo, ["rev-parse", result.quarantined![0].rescueRef])).toBe(head);
  });

  it("leaves preview calls nonmutating even with a stale lock", async () => {
    const lock = join(repo, ".git", "superskill-worktree-cleanup.lock");
    const raw = JSON.stringify({ pid: 999999999, host: hostname(), token: "dead" });
    await writeFile(lock, raw);
    const before = await readdir(join(repo, ".git"));
    const result = await cleanupCompletedWorktrees(repo, completed(tree), { dryRun: true });
    expect(result.quarantined).toEqual([]);
    expect(result.kept.find((entry) => entry.path === tree)?.reason).toContain("dry run");
    expect(await readdir(join(repo, ".git"))).toEqual(before);
    expect(await readFile(lock, "utf-8")).toBe(raw);
  });

  it("never age-steals malformed or foreign locks and does not release a replacement owner", async () => {
    const lock = join(repo, ".git", "superskill-worktree-cleanup.lock");
    await writeFile(lock, "partial write");
    await utimes(lock, 0, 0);
    expect((await cleanup(repo, [])).errors[0].reason).toContain("locked");
    await writeFile(lock, JSON.stringify({ pid: 999999999, host: "foreign", token: "foreign" }));
    expect((await cleanup(repo, [])).errors[0].reason).toContain("locked");
    await unlink(lock);
    const replacement = JSON.stringify({ pid: process.pid, host: hostname(), token: "replacement" });
    const result = await cleanupCompletedWorktrees(repo, completed(tree), { readSessions: async () => {
      await unlink(lock);
      await writeFile(lock, replacement);
      return completed(tree);
    } });
    expect(result.quarantined).toEqual([]);
    expect(await readFile(lock, "utf-8")).toBe(replacement);
  });
});
