import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import {
  NEVER_TOUCH_RULES,
  auditWorktreeSafety,
  hashFile,
  isPathInside,
  listWorktrees,
} from "./safety.js";

const execFileAsync = promisify(execFile);

const GIT_ENV: NodeJS.ProcessEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: "Test",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "Test",
  GIT_COMMITTER_EMAIL: "test@example.com",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
};

async function run(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd, env: GIT_ENV, timeout: 15000 });
  return stdout;
}

describe("worktree safety", () => {
  let base: string;
  let repo: string;

  beforeEach(async () => {
    base = await mkdtemp(join(tmpdir(), "worktree-safety-"));
    repo = join(base, "repo");
    await mkdir(repo);
    await run(repo, ["init", "-q", "-b", "main"]);
    await writeFile(join(repo, "README.md"), "hello\n");
    await writeFile(join(repo, ".gitignore"), "*.log\n");
    await run(repo, ["add", "."]);
    await run(repo, ["commit", "-q", "-m", "init"]);
  });

  afterEach(async () => {
    await rm(base, { recursive: true, force: true });
  });

  describe("listWorktrees", () => {
    it("returns the main worktree record", async () => {
      const worktrees = await listWorktrees(repo);
      expect(worktrees.length).toBe(1);

      const main = worktrees[0];
      expect(main.path).toBe(realpathSync(repo));
      expect(main.head).toBe((await run(repo, ["rev-parse", "HEAD"])).trim());
      expect(main.branch).toBe("refs/heads/main");
      expect(main.detached).toBe(false);
      expect(main.bare).toBe(false);
      expect(main.locked).toBe(false);
      expect(main.lockReason).toBeNull();
      expect(main.prunable).toBe(false);
      expect(main.prunableReason).toBeNull();
    });

    it("parses locked and detached worktrees", async () => {
      const linked = join(base, "linked");
      await run(repo, ["worktree", "add", "-q", linked, "-b", "feature"]);
      await run(repo, ["worktree", "lock", "--reason", "busy", linked]);
      await run(repo, ["worktree", "add", "-q", "--detach", join(base, "detached"), "HEAD"]);

      const worktrees = await listWorktrees(repo);
      expect(worktrees.length).toBe(3);

      const locked = worktrees.find((wt) => wt.path === realpathSync(linked));
      expect(locked?.locked).toBe(true);
      expect(locked?.lockReason).toBe("busy");
      expect(locked?.branch).toBe("refs/heads/feature");

      const detached = worktrees.find((wt) => wt.path === realpathSync(join(base, "detached")));
      expect(detached?.detached).toBe(true);
      expect(detached?.branch).toBeNull();
      expect(detached?.locked).toBe(false);
    });

    it("returns an empty list outside a repository", async () => {
      const outside = join(base, "outside");
      await mkdir(outside);
      expect(await listWorktrees(outside)).toEqual([]);
    });
  });

  describe("auditWorktreeSafety", () => {
    it("reports a clean worktree as safe to reclaim", async () => {
      const verdict = await auditWorktreeSafety(repo);

      expect(verdict.worktree).toBe(repo);
      expect(verdict.dirty).toBe(false);
      expect(verdict.untracked).toBe(false);
      expect(verdict.ignoredFiles).toEqual([]);
      expect(verdict.ignoredTruncated).toBe(false);
      expect(verdict.unpushedCommits).toBe(1);
      expect(verdict.stashCount).toBe(0);
      expect(verdict.inProgressOps).toEqual([]);
      expect(verdict.locked).toBe(false);
      expect(verdict.hasSubmodules).toBe(false);
      expect(verdict.safeToReclaimLocalCaches).toBe(true);
      expect(verdict.reasons.at(-1)).toContain("never-touch");
    });

    it("blocks reclaim when tracked files are modified", async () => {
      await writeFile(join(repo, "README.md"), "changed\n");

      const verdict = await auditWorktreeSafety(repo);
      expect(verdict.dirty).toBe(true);
      expect(verdict.untracked).toBe(false);
      expect(verdict.safeToReclaimLocalCaches).toBe(false);
      expect(verdict.reasons.join(" ")).toContain("tracked changes");
    });

    it("blocks reclaim when untracked files exist", async () => {
      await writeFile(join(repo, "new-file.txt"), "new\n");

      const verdict = await auditWorktreeSafety(repo);
      expect(verdict.dirty).toBe(false);
      expect(verdict.untracked).toBe(true);
      expect(verdict.safeToReclaimLocalCaches).toBe(false);
      expect(verdict.reasons.join(" ")).toContain("untracked");
    });

    it("lists ignored files and blocks reclaim", async () => {
      await writeFile(join(repo, "debug.log"), "log\n");

      const verdict = await auditWorktreeSafety(repo);
      expect(verdict.ignoredFiles).toEqual(["debug.log"]);
      expect(verdict.ignoredTruncated).toBe(false);
      expect(verdict.untracked).toBe(false);
      expect(verdict.dirty).toBe(false);
      expect(verdict.safeToReclaimLocalCaches).toBe(false);
      expect(verdict.reasons.join(" ")).toContain("ignored files present: 1");
    });

    it("caps the ignored file list at 200", async () => {
      const names = Array.from({ length: 205 }, (_, i) => `debug-${String(i).padStart(3, "0")}.log`);
      await Promise.all(names.map((name) => writeFile(join(repo, name), "log\n")));

      const verdict = await auditWorktreeSafety(repo);
      expect(verdict.ignoredFiles.length).toBe(200);
      expect(verdict.ignoredTruncated).toBe(true);
      expect(verdict.safeToReclaimLocalCaches).toBe(false);
    });

    it("counts stashes and notes they are repo-global", async () => {
      await writeFile(join(repo, "README.md"), "stash me\n");
      await run(repo, ["stash", "push", "-q", "-m", "wip"]);

      const verdict = await auditWorktreeSafety(repo);
      expect(verdict.stashCount).toBe(1);
      expect(verdict.dirty).toBe(false);
      expect(verdict.untracked).toBe(false);
      expect(verdict.reasons.join(" ")).toContain("stashes are repo-global");
    });

    it("counts unpushed commits", async () => {
      await writeFile(join(repo, "local.txt"), "local\n");
      await run(repo, ["add", "local.txt"]);
      await run(repo, ["commit", "-q", "-m", "local only"]);

      const verdict = await auditWorktreeSafety(repo);
      expect(verdict.unpushedCommits).toBeGreaterThanOrEqual(1);
      expect(verdict.reasons.join(" ")).toContain(`unpushed commits: ${verdict.unpushedCommits}`);
    });

    it("detects in-progress git operations", async () => {
      const gitPath = (await run(repo, ["rev-parse", "--git-path", "MERGE_HEAD"])).trim();
      const mergeHead = isAbsolute(gitPath) ? gitPath : join(repo, gitPath);
      await writeFile(mergeHead, `${"0".repeat(40)}\n`);

      const verdict = await auditWorktreeSafety(repo);
      expect(verdict.inProgressOps).toContain("merge");
      expect(verdict.safeToReclaimLocalCaches).toBe(false);
      expect(verdict.reasons.join(" ")).toContain("in-progress operations: merge");
    });

    it("reports locked linked worktrees", async () => {
      const linked = join(base, "linked");
      await run(repo, ["worktree", "add", "-q", linked, "-b", "feature"]);
      await run(repo, ["worktree", "lock", "--reason", "busy", linked]);

      const verdict = await auditWorktreeSafety(linked);
      expect(verdict.locked).toBe(true);
      expect(verdict.dirty).toBe(false);
      expect(verdict.untracked).toBe(false);
      expect(verdict.safeToReclaimLocalCaches).toBe(true);
      expect(verdict.reasons.join(" ")).toContain("worktree locked: busy");
    });

    it("detects submodules", async () => {
      const dep = join(base, "dep");
      await mkdir(dep);
      await run(dep, ["init", "-q", "-b", "main"]);
      await writeFile(join(dep, "dep.txt"), "dep\n");
      await run(dep, ["add", "."]);
      await run(dep, ["commit", "-q", "-m", "dep init"]);
      await run(repo, ["-c", "protocol.file.allow=always", "submodule", "add", "-q", "../dep", "deps/dep"]);

      const verdict = await auditWorktreeSafety(repo);
      expect(verdict.hasSubmodules).toBe(true);
      expect(verdict.safeToReclaimLocalCaches).toBe(false);
      expect(verdict.reasons.join(" ")).toContain("submodules present");
    });

    it("does not treat submodule status as present without .gitmodules", async () => {
      const verdict = await auditWorktreeSafety(repo);
      expect(verdict.hasSubmodules).toBe(false);
    });

    it("treats a failed ignored-file listing as unsafe", async () => {
      const outside = join(base, "outside");
      await mkdir(outside);

      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const verdict = await auditWorktreeSafety(outside);
      spy.mockRestore();

      expect(verdict.safeToReclaimLocalCaches).toBe(false);
      expect(verdict.reasons.join(" ")).toContain("ignored-file listing failed; treat as unsafe");
    });
  });

  describe("hashFile", () => {
    it("returns the sha256 and size of a file", async () => {
      const result = await hashFile(join(repo, "README.md"));
      expect(result).toEqual({
        sha256: createHash("sha256").update("hello\n").digest("hex"),
        size: 6,
      });
    });

    it("streams files larger than a single chunk", async () => {
      const content = "line\n".repeat(20000);
      await writeFile(join(repo, "large.txt"), content);
      const result = await hashFile(join(repo, "large.txt"));
      expect(result).toEqual({
        sha256: createHash("sha256").update(content).digest("hex"),
        size: Buffer.byteLength(content),
      });
    });

    it("rejects for missing files", async () => {
      await expect(hashFile(join(repo, "nope.txt"))).rejects.toThrow();
    });
  });

  describe("isPathInside", () => {
    it("accepts paths nested below the parent", () => {
      expect(isPathInside(join(repo, "src", "a.ts"), repo)).toBe(true);
      expect(isPathInside("nested/file.ts", "nested")).toBe(true);
    });

    it("accepts dot-prefixed names that are not parent segments", () => {
      expect(isPathInside("/a/..cache", "/a")).toBe(true);
      expect(isPathInside(join(repo, "..cache", "file"), repo)).toBe(true);
    });

    it("rejects the parent itself and escapes", () => {
      expect(isPathInside(repo, repo)).toBe(false);
      expect(isPathInside(join(repo, "..", "escape"), repo)).toBe(false);
      expect(isPathInside(join(repo, ".."), repo)).toBe(false);
      expect(isPathInside(join(base, "sibling"), repo)).toBe(false);
    });
  });

  describe("NEVER_TOUCH_RULES", () => {
    it("covers worktrees, stashes, unpushed commits, and unknown state", () => {
      const rules = NEVER_TOUCH_RULES.join(" ").toLowerCase();
      expect(rules).toContain("worktrees");
      expect(rules).toContain("stash");
      expect(rules).toContain("unpushed");
      expect(rules).toContain("git clean");
      expect(rules).toContain(".env");
      expect(rules).toContain("unknown");
    });
  });
});
