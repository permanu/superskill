// SPDX-License-Identifier: Apache-2.0
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_HYGIENE_POLICY } from "../policy.js";
import type { HygieneProbeOptions } from "../types.js";
import { hashId } from "../../worktree/paths.js";
import {
  parsePruneDryRun,
  parseWorktreeListPorcelain,
  runWorktreesProbe,
  type WorktreeExec,
} from "./worktrees.js";

const MS_PER_DAY = 86_400_000;
const NOW = Date.UTC(2026, 0, 15);
const MIN_AGE_DAYS = 14;

const REPO = "/repo";
const TMP_WT = join(tmpdir(), "superskill-hygiene-wt-temp");

const PORCELAIN_FIXTURE = [
  "worktree /repo",
  "HEAD aaaa1111",
  "branch refs/heads/main",
  "",
  "worktree /repo/wt-branch",
  "HEAD bbbb2222",
  "branch refs/heads/feature/login",
  "",
  "worktree /repo/wt-detached",
  "HEAD cccc3333",
  "detached",
  "",
  "worktree /repo/wt-locked",
  "HEAD dddd4444",
  "branch refs/heads/locked",
  "locked locked by user",
  "",
  "worktree /repo/wt-prunable",
  "HEAD eeee5555",
  "branch refs/heads/gone",
  "prunable gitdir file points to non-existent location",
  "",
].join("\n");

type Handler = (args: string[]) => { stdout: string; stderr?: string } | Error;

function makeExec(handler: Handler): { exec: WorktreeExec; calls: string[][] } {
  const calls: string[][] = [];
  const exec: WorktreeExec = async (_cmd, args) => {
    calls.push([...args]);
    const result = handler(args);
    if (result instanceof Error) throw result;
    return result;
  };
  return { exec, calls };
}

function fail(code: string | number, stderr = ""): Error {
  const error = new Error(`git failed (${code})`) as Error & {
    code: string | number;
    stderr: string;
  };
  error.code = code;
  error.stderr = stderr;
  return error;
}

function options(repoPaths: string[], overrides: Partial<HygieneProbeOptions> = {}): HygieneProbeOptions {
  return {
    repoPaths,
    sizes: false,
    policy: { ...DEFAULT_HYGIENE_POLICY, worktreeStaleMinAgeDays: MIN_AGE_DAYS },
    now: NOW,
    ...overrides,
  };
}

function oldSeconds(): number {
  return (NOW - 20 * MS_PER_DAY) / 1000;
}

function youngSeconds(): number {
  return (NOW - 2 * MS_PER_DAY) / 1000;
}

const PROBE_PORCELAIN = [
  "worktree /repo",
  "HEAD aaaa1111",
  "branch refs/heads/main",
  "",
  "worktree /repo/wt-due",
  "HEAD bbbb2222",
  "branch refs/heads/stale-feature",
  "",
  "worktree /repo/wt-dirty",
  "HEAD cccc3333",
  "branch refs/heads/dirty",
  "",
  "worktree /repo/wt-unpushed",
  "HEAD dddd4444",
  "branch refs/heads/unpushed",
  "",
  "worktree /repo/wt-locked",
  "HEAD eeee5555",
  "branch refs/heads/locked",
  "locked locked by user",
  "",
  "worktree /repo/wt-young",
  "HEAD ffff6666",
  "branch refs/heads/young",
  "",
  "worktree /repo/wt-ignored",
  "HEAD 22228888",
  "branch refs/heads/ignored",
  "",
  `worktree ${TMP_WT}`,
  "HEAD 11117777",
  "branch refs/heads/tmp-wt",
  "",
].join("\n");

function probeHandler(): Handler {
  return (args) => {
    if (args[0] !== "-C" || args[1] === undefined) {
      return new Error(`unexpected call: ${args.join(" ")}`);
    }
    const target = args[1];
    if (args[2] === "rev-parse") {
      return target === REPO
        ? { stdout: "true\n" }
        : fail(128, "fatal: not a git repository");
    }
    if (args[2] === "worktree" && args[3] === "prune") {
      return {
        stdout: "",
        stderr: `Removing ${REPO}/wt-gone: gitdir file points to non-existent location\n`,
      };
    }
    if (args[2] === "worktree" && args[3] === "list") {
      return { stdout: PROBE_PORCELAIN };
    }
    if (args[2] === "status") {
      return { stdout: target === `${REPO}/wt-dirty` ? " M tracked.txt\n?? untracked.txt\n" : "" };
    }
    if (args[2] === "rev-list") {
      return { stdout: target === `${REPO}/wt-unpushed` ? "3\n" : "0\n" };
    }
    if (args[2] === "log") {
      return { stdout: `${target === `${REPO}/wt-young` ? youngSeconds() : oldSeconds()}\n` };
    }
    if (args[2] === "clean") {
      return { stdout: target === `${REPO}/wt-ignored` ? "Would remove local.env\n" : "" };
    }
    return new Error(`unexpected call: ${args.join(" ")}`);
  };
}

describe("parseWorktreeListPorcelain", () => {
  it("parses main, branch, detached, locked, and prunable entries", () => {
    const parsed = parseWorktreeListPorcelain(PORCELAIN_FIXTURE);

    expect(parsed).toHaveLength(5);
    expect(parsed[0]).toEqual({
      path: "/repo",
      head: "aaaa1111",
      branch: "refs/heads/main",
      detached: false,
      locked: false,
      prunable: false,
    });
    expect(parsed[1].branch).toBe("refs/heads/feature/login");
    expect(parsed[2].path).toBe("/repo/wt-detached");
    expect(parsed[2].detached).toBe(true);
    expect(parsed[2].branch).toBeUndefined();
    expect(parsed[3].locked).toBe(true);
    expect(parsed[4].prunable).toBe(true);
  });

  it("returns no entries for empty output", () => {
    expect(parseWorktreeListPorcelain("")).toEqual([]);
  });
});

describe("parsePruneDryRun", () => {
  it("extracts reported paths from stdout and stderr and dedupes", () => {
    const stdout = "Removing worktrees/one: gitdir file points to non-existent location\n";
    const stderr = [
      "Removing /repo/wt two: not a valid gitdir file",
      "Removing worktrees/one: gitdir file points to non-existent location",
      "",
    ].join("\n");

    expect(parsePruneDryRun(stdout, stderr)).toEqual(["worktrees/one", "/repo/wt two"]);
  });

  it("ignores unrelated lines and missing stderr", () => {
    expect(parsePruneDryRun("fatal: nothing to prune\n")).toEqual([]);
    expect(parsePruneDryRun("", undefined)).toEqual([]);
  });
});

describe("runWorktreesProbe", () => {
  it("reports prunable registrations and classifies live worktrees", async () => {
    const { exec, calls } = makeExec(probeHandler());

    const result = await runWorktreesProbe(options([REPO]), { exec });

    expect(result.category).toBe("worktrees");
    expect(result.label).toBe("Git worktrees");
    expect(result.skipped).toBeNull();

    const prunable = result.items.find((item) => item.id.startsWith("worktrees:prunable:"));
    expect(prunable).toBeDefined();
    expect(prunable).toMatchObject({
      id: `worktrees:prunable:${hashId(REPO)}`,
      title: "Prunable worktree registrations — repo",
      path: `${REPO}/.git`,
      bytes: 0,
      ageDays: null,
      tier: "consent",
      due: true,
      plan: `git -C "${REPO}" worktree prune`,
      meta: { repo: REPO, count: 1 },
    });
    expect(prunable!.reason).toContain("1 stale registration(s)");

    const due = result.items.find((item) => item.id === `worktrees:${hashId(`${REPO}/wt-due`)}`);
    expect(due).toMatchObject({
      title: "Stale worktree stale-feature",
      path: `${REPO}/wt-due`,
      bytes: null,
      ageDays: 20,
      tier: "consent",
      due: true,
      reason: "clean, fully pushed, idle 20d",
      plan: `git -C "${REPO}" worktree remove "${REPO}/wt-due"`,
      meta: {
        repo: REPO,
        branch: "stale-feature",
        dirtyFiles: 0,
        unpushed: 0,
        ignoredFiles: 0,
        tempDir: false,
      },
    });

    const dirty = result.items.find((item) => item.title === "Stale worktree dirty");
    expect(dirty).toMatchObject({ due: false, reason: "has uncommitted changes", tier: "consent" });
    expect(dirty!.meta.dirtyFiles).toBe(2);

    const unpushed = result.items.find((item) => item.title === "Stale worktree unpushed");
    expect(unpushed).toMatchObject({ due: false, reason: "has 3 unpushed commit(s)" });

    const locked = result.items.find((item) => item.title === "Stale worktree locked");
    expect(locked).toMatchObject({ due: false, reason: "locked" });

    const young = result.items.find((item) => item.title === "Stale worktree young");
    expect(young).toMatchObject({ due: false, reason: "younger than 14d", ageDays: 2 });

    const ignored = result.items.find((item) => item.title === "Stale worktree ignored");
    expect(ignored).toMatchObject({
      due: false,
      reason: "contains ignored/untracked files that removal would delete",
      tier: "consent",
    });
    expect(ignored!.meta.ignoredFiles).toBe(1);

    const temp = result.items.find((item) => item.title === "Stale worktree tmp-wt");
    expect(temp).toMatchObject({
      path: TMP_WT,
      tier: "review",
      due: false,
      reason: "lives under a temp dir; harness may own it",
      plan: null,
    });
    expect(temp!.meta.tempDir).toBe(true);

    expect(result.items).toHaveLength(8);

    expect(calls.some((args) => args[1] === REPO && args[2] === "status")).toBe(false);
    const worktreeOps = calls.filter((args) => args[2] === "worktree");
    expect(worktreeOps.some((args) => args[3] === "prune")).toBe(true);
    expect(worktreeOps.every((args) => args[3] !== "prune" || args.includes("--dry-run"))).toBe(true);
    expect(worktreeOps.every((args) => args[3] !== "remove")).toBe(true);
    const cleanCalls = calls.filter((args) => args[2] === "clean");
    expect(cleanCalls).toHaveLength(7);
    expect(cleanCalls.every((args) => args.includes("-nxd"))).toBe(true);
  });

  it("silently skips paths that are not git repositories", async () => {
    const { exec } = makeExec((args) => {
      if (args[2] === "rev-parse") return fail(128, "fatal: not a git repository");
      return new Error("unexpected call");
    });

    const result = await runWorktreesProbe(options(["/definitely-not-a-repo", "/definitely-not-a-repo"]), {
      exec,
    });

    expect(result.items).toEqual([]);
    expect(result.skipped).toBeNull();
  });

  it("skips when rev-parse does not confirm a work tree", async () => {
    const { exec } = makeExec(() => ({ stdout: "false\n" }));

    const result = await runWorktreesProbe(options([REPO]), { exec });

    expect(result.items).toEqual([]);
  });

  it("does not run any git command without repo paths", async () => {
    const { exec, calls } = makeExec(() => new Error("must not run"));

    const result = await runWorktreesProbe(options([]), { exec });

    expect(result.items).toEqual([]);
    expect(calls).toEqual([]);
  });

  it("treats a failing status as dirty and unpushed as unknown", async () => {
    const { exec } = makeExec((args) => {
      if (args[2] === "rev-parse") return { stdout: "true\n" };
      if (args[2] === "worktree" && args[3] === "prune") return { stdout: "", stderr: "" };
      if (args[2] === "worktree" && args[3] === "list") {
        return {
          stdout: [
            "worktree /repo",
            "HEAD aaaa1111",
            "branch refs/heads/main",
            "",
            "worktree /repo/wt-two",
            "HEAD bbbb2222",
            "branch refs/heads/two",
            "",
          ].join("\n"),
        };
      }
      if (args[2] === "status") return fail(128, "fatal: cannot change to worktree");
      if (args[2] === "rev-list") return fail(128, "fatal");
      if (args[2] === "log") return { stdout: `${oldSeconds()}\n` };
      if (args[2] === "clean") return { stdout: "" };
      return new Error("unexpected call");
    });

    const result = await runWorktreesProbe(options([REPO]), { exec });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      due: false,
      reason: "status unavailable",
      meta: { dirtyFiles: "unavailable", unpushed: "unknown" },
    });
  });

  it("blocks due with an unavailable ignored-file check when clean fails", async () => {
    const { exec } = makeExec((args) => {
      if (args[2] === "rev-parse") return { stdout: "true\n" };
      if (args[2] === "worktree" && args[3] === "prune") return { stdout: "", stderr: "" };
      if (args[2] === "worktree" && args[3] === "list") {
        return {
          stdout: [
            "worktree /repo",
            "HEAD aaaa1111",
            "branch refs/heads/main",
            "",
            "worktree /repo/wt-clean",
            "HEAD bbbb2222",
            "branch refs/heads/clean",
            "",
          ].join("\n"),
        };
      }
      if (args[2] === "status") return { stdout: "" };
      if (args[2] === "rev-list") return { stdout: "0\n" };
      if (args[2] === "log") return { stdout: `${oldSeconds()}\n` };
      if (args[2] === "clean") return fail(128, "fatal: cannot run clean");
      return new Error("unexpected call");
    });

    const result = await runWorktreesProbe(options([REPO]), { exec });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      due: false,
      meta: { ignoredFiles: "unavailable" },
    });
    expect(result.items[0].reason).toContain("ignored-file check unavailable");
  });
});

const GIT_ENV: NodeJS.ProcessEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: "Test",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "Test",
  GIT_COMMITTER_EMAIL: "test@example.com",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
};

function realExec(): WorktreeExec {
  return (cmd, args, opts) =>
    new Promise((resolvePromise, rejectPromise) => {
      execFile(cmd, args, { ...opts, encoding: "utf-8", env: GIT_ENV }, (err, stdout, stderr) => {
        if (err) {
          const failure = err as Error & { stdout?: string; stderr?: string };
          failure.stdout = stdout;
          failure.stderr = stderr;
          rejectPromise(failure);
          return;
        }
        resolvePromise({ stdout, stderr });
      });
    });
}

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await new Promise<{ stdout: string }>((resolvePromise, rejectPromise) => {
    execFile("git", args, { cwd, env: GIT_ENV, timeout: 20000 }, (err, stdout) => {
      if (err) rejectPromise(err);
      else resolvePromise({ stdout });
    });
  });
  return stdout;
}

describe("runWorktreesProbe with real git", () => {
  it("finds a real worktree and classifies it", async () => {
    const base = await mkdtemp(join(tmpdir(), "hygiene-worktrees-"));
    try {
      const repo = join(base, "repo");
      await mkdir(repo);
      await git(repo, ["init", "-q", "-b", "main"]);
      await writeFile(join(repo, "README.md"), "hello\n");
      await git(repo, ["add", "README.md"]);
      await git(repo, ["commit", "-q", "-m", "init"]);
      const worktree = join(base, "wt-one");
      await git(repo, ["worktree", "add", "-q", "-b", "one", worktree]);

      const result = await runWorktreesProbe(options([repo]), { exec: realExec() });

      expect(result.skipped).toBeNull();
      expect(result.items).toHaveLength(1);
      const item = result.items[0];
      expect(item.category).toBe("worktrees");
      expect(item.meta.repo).toBe(repo);
      expect(item.meta.branch).toBe("one");
      expect(item.meta.dirtyFiles).toBe(0);
      expect(item.meta.unpushed).toBe(1);
      expect(typeof item.meta.tempDir).toBe("boolean");
      expect(item.tier).toBe(item.meta.tempDir === true ? "review" : "consent");
      expect(item.ageDays).toBeTypeOf("number");
      expect(item.due).toBe(false);
      expect(item.id.startsWith("worktrees:prunable:")).toBe(false);
      expect(result.items.some((entry) => entry.id.startsWith("worktrees:prunable:"))).toBe(false);
    } finally {
      await rm(base, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  }, 15000);
});
