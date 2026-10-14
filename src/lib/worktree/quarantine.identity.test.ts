import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { purgeQuarantine, quarantinePaths, restoreQuarantine } from "./quarantine.js";

const execFileAsync = promisify(execFile);
const gitEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: "Test",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "Test",
  GIT_COMMITTER_EMAIL: "test@example.com",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_OPTIONAL_LOCKS: "0",
  GIT_TERMINAL_PROMPT: "0",
};

async function git(cwd: string, args: string[]): Promise<string> {
  return (await execFileAsync("git", args, { cwd, env: gitEnv, timeout: 10_000 })).stdout.trim();
}

async function commit(repo: string): Promise<void> {
  await writeFile(join(repo, "README.md"), "tracked\n");
  await git(repo, ["add", "README.md"]);
  await git(repo, ["commit", "-qm", "initial"]);
}

describe("local quarantine instance identity", () => {
  let base: string;
  let repo: string;

  beforeEach(async () => {
    base = await realpath(await mkdtemp(join(tmpdir(), "quarantine-instance-")));
    repo = join(base, "repo-a");
    await mkdir(repo);
    await git(repo, ["init", "-q", "-b", "main"]);
  });

  afterEach(async () => {
    await rm(base, { recursive: true, force: true });
  });

  async function quarantine(root = repo) {
    const cache = join(root, "node_modules");
    await mkdir(cache);
    await writeFile(join(cache, "payload"), "belongs to original A instance\n");
    const result = await quarantinePaths(repo, [cache], { worktreeRoot: root, journalId: "instance" });
    expect(result.moved).toHaveLength(1);
    return { result, cache, payload: join(result.moved[0].to, "payload") };
  }

  it.each([
    ["different repository", "restore"],
    ["different repository", "purge"],
    ["same-repository recreation", "restore"],
    ["same-repository recreation", "purge"],
  ])("preserves quarantined data after %s at the same registered path (%s)", async (replacement, action) => {
    await commit(repo);
    const worktree = join(base, "reused-worktree");
    await git(repo, ["worktree", "add", "-qb", "original", worktree]);
    const { result, cache, payload } = await quarantine(worktree);

    if (replacement === "different repository") {
      await rename(worktree, join(base, "original-a-worktree"));
      const other = join(base, "repo-b");
      await mkdir(other);
      await git(other, ["init", "-q", "-b", "main"]);
      await commit(other);
      await git(other, ["worktree", "add", "-qb", "replacement", worktree]);
      expect(await git(repo, ["worktree", "list", "--porcelain"])).toContain(`worktree ${worktree}`);
    } else {
      await git(repo, ["worktree", "remove", worktree]);
      await git(repo, ["worktree", "add", "-qb", "replacement", worktree]);
    }

    if (action === "restore") {
      const restored = await restoreQuarantine(repo, result.journalId, { worktreeRoot: repo });
      expect(restored.restored).toEqual([]);
      expect(restored.skipped.some((entry) => entry.reason.includes("manual review"))).toBe(true);
    } else {
      const purged = await purgeQuarantine({ worktreeRoot: repo, repoRoot: repo, journalId: result.journalId, olderThanDays: 0, apply: true });
      expect(purged.purged).toEqual([]);
      expect(purged.skipped.some((entry) => entry.reason.includes("manual review"))).toBe(true);
    }
    expect(existsSync(cache)).toBe(false);
    expect(await readFile(payload, "utf-8")).toBe("belongs to original A instance\n");
  });

  it("rejects a replacement root even when the original Git admin directory survives", async () => {
    await commit(repo);
    const worktree = join(base, "reused-worktree");
    await git(repo, ["worktree", "add", "-qb", "original", worktree]);
    const { result, cache, payload } = await quarantine(worktree);
    await rename(worktree, join(base, "original-root"));
    await mkdir(worktree);
    await cp(join(base, "original-root", ".git"), join(worktree, ".git"));
    expect(await git(worktree, ["rev-parse", "--git-common-dir"])).toBe(join(repo, ".git"));
    expect((await restoreQuarantine(repo, result.journalId, { worktreeRoot: repo })).restored).toEqual([]);
    expect(existsSync(cache)).toBe(false);
    expect(existsSync(payload)).toBe(true);
  });

  it("rejects a replacement Git admin directory while the root survives", async () => {
    await commit(repo);
    const worktree = join(base, "reused-worktree");
    await git(repo, ["worktree", "add", "-qb", "original", worktree]);
    const { result, payload } = await quarantine(worktree);
    const admin = await git(worktree, ["rev-parse", "--absolute-git-dir"]);
    await rename(admin, join(base, "original-admin"));
    await cp(join(base, "original-admin"), admin, { recursive: true });
    expect((await restoreQuarantine(repo, result.journalId, { worktreeRoot: repo })).restored).toEqual([]);
    expect((await purgeQuarantine({ worktreeRoot: repo, repoRoot: repo, olderThanDays: 0, apply: true })).purged).toEqual([]);
    expect(existsSync(payload)).toBe(true);
  });

  it("rejects a recreated common Git directory even when root and admin inodes survive", async () => {
    await commit(repo);
    const worktree = join(base, "reused-worktree");
    await git(repo, ["worktree", "add", "-qb", "original", worktree]);
    const { result, payload } = await quarantine(worktree);
    const manifest = JSON.parse(await readFile(join(result.quarantineDir, "manifest.json"), "utf-8"));
    const common = join(repo, ".git");
    const saved = join(base, "original-common");
    await rename(common, saved);
    await cp(saved, common, { recursive: true });
    await rm(join(common, "worktrees"), { recursive: true });
    await rename(join(saved, "worktrees"), join(common, "worktrees"));
    expect((await stat(worktree, { bigint: true })).ino.toString()).toBe(manifest.localIdentity.root.ino);
    expect((await stat(manifest.localIdentity.gitDir.path, { bigint: true })).ino.toString()).toBe(manifest.localIdentity.gitDir.ino);
    expect((await stat(common, { bigint: true })).ino.toString()).not.toBe(manifest.localIdentity.commonDir.ino);
    expect((await restoreQuarantine(repo, result.journalId, { worktreeRoot: repo })).restored).toEqual([]);
    expect((await purgeQuarantine({ worktreeRoot: repo, repoRoot: repo, olderThanDays: 0, apply: true })).purged).toEqual([]);
    expect(existsSync(payload)).toBe(true);
  });

  it("records filesystem and Git directory proof without needing HEAD", async () => {
    const { result, cache } = await quarantine();
    await expect(git(repo, ["rev-parse", "--verify", "HEAD"])).rejects.toThrow();
    const manifest = JSON.parse(await readFile(join(result.quarantineDir, "manifest.json"), "utf-8"));
    expect(manifest.localIdentity).toMatchObject({
      v: 1,
      root: { path: repo, dev: expect.any(String), ino: expect.any(String), birthtimeNs: expect.any(String) },
      gitDir: { path: join(repo, ".git") },
      commonDir: { path: join(repo, ".git") },
    });
    expect((await restoreQuarantine(repo, result.journalId, { worktreeRoot: repo })).restored).toEqual([cache]);
  });

  it("accepts history changes in the same filesystem and Git instance", async () => {
    const { result, cache } = await quarantine();
    await commit(repo);
    expect((await restoreQuarantine(repo, result.journalId, { worktreeRoot: repo })).restored).toEqual([cache]);
  });

  it("retains legacy local manifests without instance proof for manual review", async () => {
    const { result, cache, payload } = await quarantine();
    const path = join(result.quarantineDir, "manifest.json");
    const manifest = JSON.parse(await readFile(path, "utf-8"));
    delete manifest.localIdentity;
    await writeFile(path, JSON.stringify(manifest));
    const restore = await restoreQuarantine(repo, result.journalId, { worktreeRoot: repo });
    const purge = await purgeQuarantine({ worktreeRoot: repo, repoRoot: repo, olderThanDays: 0, apply: true });
    expect(restore.restored).toEqual([]);
    expect(purge.purged).toEqual([]);
    expect(restore.skipped.some((entry) => entry.reason.includes("manual review"))).toBe(true);
    expect(purge.skipped.some((entry) => entry.reason.includes("manual review"))).toBe(true);
    expect(existsSync(cache)).toBe(false);
    expect(existsSync(payload)).toBe(true);
  });

  it("preserves legacy global cache scope without worktree instance proof", async () => {
    const cacheRoot = join(base, "global-cache");
    const cache = join(cacheRoot, "repo", "go-build");
    await mkdir(cache, { recursive: true });
    await writeFile(join(cache, "payload"), "global cache\n");
    const result = await quarantinePaths(repo, [cache], { cacheRoot, journalId: "global" });
    const path = join(result.quarantineDir, "manifest.json");
    const manifest = JSON.parse(await readFile(path, "utf-8"));
    delete manifest.localIdentity;
    delete manifest.sourceRoot;
    delete manifest.scope;
    await writeFile(path, JSON.stringify(manifest));
    await rename(repo, join(base, "old-repo"));
    await mkdir(repo);
    await git(repo, ["init", "-q", "-b", "main"]);
    expect((await restoreQuarantine(repo, result.journalId, { cacheRoot })).restored).toEqual([cache]);
  });
});
