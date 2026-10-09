import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, writeFile, rm, access, realpath, readFile, symlink, lstat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { cleanupCompletedWorktrees } from "./cleanup.js";

const exec = promisify(execFile);
const env = { ...process.env, GIT_AUTHOR_NAME: "Test", GIT_AUTHOR_EMAIL: "test@example.com", GIT_COMMITTER_NAME: "Test", GIT_COMMITTER_EMAIL: "test@example.com", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };
const git = async (cwd: string, args: string[]) => (await exec("git", args, { cwd, env, timeout: 10000 })).stdout.trim();
const present = async (path: string) => access(path).then(() => true, () => false);
const completed = (path: string) => [{ id: "done", status: "completed", workspace_path: path }];

describe("completed worktree cleanup", () => {
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
  afterEach(async () => { vi.unstubAllEnvs(); await rm(base, { recursive: true, force: true }); });

  it("removes only a completed merged worktree and is idempotent", async () => {
    await writeFile(join(tree, "note.txt"), "done\n");
    await git(tree, ["commit", "-qam", "done"]);
    await git(repo, ["merge", "--ff-only", "task"]);
    const result = await cleanupCompletedWorktrees(repo, completed(tree));
    expect(result.removed).toEqual([tree]);
    expect(await present(tree)).toBe(false);
    expect(await git(repo, ["rev-parse", "--verify", "refs/heads/task"])).toBeTruthy();
    expect((await cleanupCompletedWorktrees(repo, completed(tree))).removed).toEqual([]);
  });

  it("archives ignored SuperSkill metadata before removing a merged worktree", async () => {
    await writeFile(join(repo, ".git", "info", "exclude"), ".superskill/\n");
    await mkdir(join(tree, ".superskill"));
    await writeFile(join(tree, ".superskill", "graph.json"), '{"learned":true}');
    const outside = join(base, "outside.txt");
    await writeFile(outside, "untouched");
    await symlink(outside, join(tree, ".superskill", "cache-link"));
    const result = await cleanupCompletedWorktrees(repo, completed(tree));
    expect(result.removed).toEqual([tree]);
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

  it.each([false, true])("preserves metadata when removal fails and recreated metadata is %s", async (recreated) => {
    await writeFile(join(repo, ".git", "info", "exclude"), ".superskill/\n");
    await mkdir(join(tree, ".superskill"));
    await writeFile(join(tree, ".superskill", "graph.json"), "retained");
    const realGit = (await exec("which", ["git"])).stdout.trim();
    const bin = join(base, "bin");
    await mkdir(bin);
    await writeFile(join(bin, "git"), `#!${process.execPath}
const { execFileSync } = require("node:child_process");
const { writeFileSync, mkdirSync } = require("node:fs");
const args = process.argv.slice(2);
if (args[0] === "worktree" && args[1] === "remove") {
  writeFileSync(${JSON.stringify(join(tree, "new.txt"))}, "concurrent edit");
  if (${recreated}) {
    mkdirSync(${JSON.stringify(join(tree, ".superskill"))});
    writeFileSync(${JSON.stringify(join(tree, ".superskill", "new.json"))}, "new metadata");
  }
}
try { process.stdout.write(execFileSync(${JSON.stringify(realGit)}, args, { env: process.env })); }
catch (error) { process.stderr.write(error.stderr || "failed"); process.exit(error.status || 1); }
`, { mode: 0o700 });
    vi.stubEnv("PATH", `${bin}:${process.env.PATH}`);
    const result = await cleanupCompletedWorktrees(repo, completed(tree));
    expect(result.removed).toEqual([]);
    expect(result.errors.length).toBeGreaterThan(0);
    if (recreated) {
      expect(result.archives).toHaveLength(1);
      expect(await readFile(join(result.archives![0].path, "graph.json"), "utf-8")).toBe("retained");
      expect(await readFile(join(tree, ".superskill", "new.json"), "utf-8")).toBe("new metadata");
      expect(result.errors.some((error) => error.reason.includes("Metadata preserved at"))).toBe(true);
    } else {
      expect(result.archives ?? []).toEqual([]);
      expect(await readFile(join(tree, ".superskill", "graph.json"), "utf-8")).toBe("retained");
    }
    expect(await readFile(join(tree, "new.txt"), "utf-8")).toBe("concurrent edit");
  }, 15000);

  it("accepts an exact full-tree squash match", async () => {
    await writeFile(join(tree, "note.txt"), "squashed\n");
    await git(tree, ["commit", "-qam", "task change"]);
    await writeFile(join(repo, "note.txt"), "squashed\n");
    await git(repo, ["commit", "-qam", "different squash commit"]);
    expect((await cleanupCompletedWorktrees(repo, completed(tree))).removed).toEqual([tree]);
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
    expect(current.kept.find((item) => item.path === tree)?.reason).toContain("switch to main");
    expect((await cleanupCompletedWorktrees(repo, completed(repo))).removed).toEqual([]);
    expect((await cleanupCompletedWorktrees(repo, [])).removed).toEqual([]);
    expect((await cleanupCompletedWorktrees(repo, completed(tree), { currentSessionId: "done" })).removed).toEqual([]);
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
    expect(results.flatMap((result) => result.removed)).toEqual([tree]);
    const lockPath = join(repo, ".git", "superskill-worktree-cleanup.lock");
    await writeFile(lockPath, "different-owner");
    const result = await cleanupCompletedWorktrees(repo, []);
    expect(result.errors.some((error) => error.reason.includes("locked"))).toBe(true);
    expect(await present(lockPath)).toBe(true);
  });

  it("keeps submodule worktrees", async () => {
    await git(tree, ["update-index", "--add", "--cacheinfo", `160000,${await git(repo, ["rev-parse", "HEAD"])},module`]);
    await git(tree, ["commit", "-qm", "submodule"]);
    await git(repo, ["merge", "--ff-only", "task"]);
    const result = await cleanupCompletedWorktrees(repo, completed(tree));
    expect(result.removed).toEqual([]);
    expect(result.kept.find((item) => item.path === tree)?.reason).toContain("submodule");
  });

  it("keeps candidates when local main is missing", async () => {
    await git(repo, ["branch", "-m", "main", "trunk"]);
    const result = await cleanupCompletedWorktrees(repo, completed(tree));
    expect(result.removed).toEqual([]);
    expect(result.kept.find((item) => item.path === tree)?.reason).toContain("main");
  });
});
