// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { CommandContext } from "../../core/types.js";
import { resolveRepoIdentity } from "../../lib/worktree/paths.js";
import { worktreeGcCommand, type WorktreeGcOutcome } from "./gc.js";

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

const DAY_MS = 24 * 60 * 60 * 1000;

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd, env: GIT_ENV, timeout: 15000 });
  return stdout;
}

function makeCtx(): CommandContext {
  return {
    vaultFs: {} as CommandContext["vaultFs"],
    vaultPath: "/tmp/vault",
    sessionRegistry: {} as CommandContext["sessionRegistry"],
    config: { vaultPath: "/tmp/vault", maxInjectTokens: 1500, sessionTtlHours: 2 },
    log: { debug() {}, info() {}, warn() {}, error() {} },
    projectSlug: null,
  };
}

describe("worktreeGcCommand --worktree wiring", () => {
  let base: string;
  let cacheRoot: string;
  let repo: string;
  let previousCacheRoot: string | undefined;

  beforeEach(async () => {
    base = await mkdtemp(join(tmpdir(), "worktree-gc-command-"));
    cacheRoot = join(base, "cache");
    repo = join(base, "repo");
    await mkdir(repo, { recursive: true });
    await git(repo, ["init", "-q", "-b", "main"]);
    await writeFile(join(repo, "README.md"), "hello\n");
    await git(repo, ["add", "README.md"]);
    await git(repo, ["commit", "-q", "-m", "init"]);
    previousCacheRoot = process.env.SUPERSKILL_CACHE_ROOT;
    process.env.SUPERSKILL_CACHE_ROOT = cacheRoot;
  });

  afterEach(async () => {
    if (previousCacheRoot === undefined) delete process.env.SUPERSKILL_CACHE_ROOT;
    else process.env.SUPERSKILL_CACHE_ROOT = previousCacheRoot;
    await rm(base, { recursive: true, force: true });
  });

  async function addWorktree(name: string): Promise<string> {
    const worktree = join(base, "worktrees", name);
    await mkdir(join(base, "worktrees"), { recursive: true });
    await git(repo, ["worktree", "add", "-q", worktree, "-b", name]);
    return worktree;
  }

  async function seedCandidate(repoId: string, dirName: string): Promise<string> {
    const dir = join(cacheRoot, repoId, dirName);
    await mkdir(dir, { recursive: true });
    const file = join(dir, "artifact.bin");
    await writeFile(file, "x".repeat(1024));
    const when = new Date(Date.now() - 40 * DAY_MS);
    await utimes(file, when, when);
    await utimes(dir, when, when);
    return dir;
  }

  async function inDir<T>(dir: string, fn: () => Promise<T>): Promise<T> {
    const previous = process.cwd();
    const previousGlobal = process.env.GIT_CONFIG_GLOBAL;
    const previousSystem = process.env.GIT_CONFIG_NOSYSTEM;
    process.chdir(dir);
    process.env.GIT_CONFIG_GLOBAL = "/dev/null";
    process.env.GIT_CONFIG_NOSYSTEM = "1";
    try {
      return await fn();
    } finally {
      process.chdir(previous);
      if (previousGlobal === undefined) delete process.env.GIT_CONFIG_GLOBAL;
      else process.env.GIT_CONFIG_GLOBAL = previousGlobal;
      if (previousSystem === undefined) delete process.env.GIT_CONFIG_NOSYSTEM;
      else process.env.GIT_CONFIG_NOSYSTEM = previousSystem;
    }
  }

  it("scopes a named --worktree run to that worktree's repo without throwing", async () => {
    await addWorktree("feat-1");
    const identity = await resolveRepoIdentity(repo);
    const scoped = await seedCandidate(identity.repoId, "go-build");
    const other = await seedCandidate("other-repo", "go-build");

    const outcome = (await inDir(repo, () =>
      worktreeGcCommand({ worktree: "feat-1", olderThan: "30d", json: true }, makeCtx()),
    )) as WorktreeGcOutcome;

    expect(outcome.action).toBe("plan");
    expect(outcome.applied).toBe(false);
    expect(outcome.notes.some((note) => note.includes("worktree not found"))).toBe(false);
    expect(outcome.plan?.candidates.map((entry) => entry.repoId)).toEqual([identity.repoId]);
    expect(outcome.plan?.selected.map((entry) => entry.path)).toContain(scoped);
    expect(outcome.plan?.selected.map((entry) => entry.path)).not.toContain(other);
  });

  it("scopes by a worktree path as well as by name", async () => {
    const worktree = await addWorktree("feat-2");
    const identity = await resolveRepoIdentity(repo);
    const scoped = await seedCandidate(identity.repoId, "go-build");

    const outcome = (await inDir(repo, () =>
      worktreeGcCommand({ worktree, olderThan: "30d", json: true }, makeCtx()),
    )) as WorktreeGcOutcome;

    expect(outcome.plan?.candidates.map((entry) => entry.repoId)).toEqual([identity.repoId]);
    expect(outcome.plan?.selected.map((entry) => entry.path)).toContain(scoped);
    expect(outcome.repoRoot).toBeTruthy();
  });

  it("reports an unknown worktree name instead of throwing", async () => {
    const identity = await resolveRepoIdentity(repo);
    await seedCandidate(identity.repoId, "go-build");

    const outcome = (await inDir(repo, () =>
      worktreeGcCommand({ worktree: "ghost", olderThan: "30d", json: true }, makeCtx()),
    )) as WorktreeGcOutcome;

    expect(outcome.action).toBe("plan");
    expect(outcome.notes).toContain("worktree not found: ghost");
  });

  it("surfaces the --all ignores --worktree note", async () => {
    await addWorktree("feat-3");
    const identity = await resolveRepoIdentity(repo);
    await seedCandidate(identity.repoId, "go-build");
    await seedCandidate("other-repo", "go-build");

    const outcome = (await inDir(repo, () =>
      worktreeGcCommand({ all: true, worktree: "feat-3", olderThan: "30d", json: true }, makeCtx()),
    )) as WorktreeGcOutcome;

    expect(
      outcome.notes.some(
        (note) => note.includes("ignoring --worktree feat-3") && note.includes("--all"),
      ),
    ).toBe(true);
    expect(outcome.plan?.candidates.map((entry) => entry.repoId).sort()).toEqual(
      [identity.repoId, "other-repo"].sort(),
    );
  });

  it("notes invalid duration and size filters instead of throwing", async () => {
    const outcome = (await inDir(repo, () =>
      worktreeGcCommand(
        { olderThan: "nope", newerThan: "nah", minSize: "?", maxSize: "-1" },
        makeCtx(),
      ),
    )) as WorktreeGcOutcome;

    expect(outcome.action).toBe("plan");
    expect(outcome.notes.join("\n")).toContain('ignored invalid --older-than "nope"');
    expect(outcome.notes.join("\n")).toContain('ignored invalid --newer-than "nah"');
    expect(outcome.notes.join("\n")).toContain('ignored invalid --min-size "?"');
    expect(outcome.notes.join("\n")).toContain('ignored invalid --max-size "-1"');
  });

  it("maps a --project slug to its repo id and reports unknown slugs", async () => {
    const vault = join(base, "vault");
    await mkdir(vault, { recursive: true });
    const identity = await resolveRepoIdentity(repo);
    await writeFile(join(vault, "project-map.json"), JSON.stringify({ [repo]: "my-project" }));
    const ctx = makeCtx();
    ctx.vaultPath = vault;

    const mapped = (await inDir(repo, () =>
      worktreeGcCommand({ project: "my-project", olderThan: "30d" }, ctx),
    )) as WorktreeGcOutcome;
    expect(mapped.repoId).toBe(identity.repoId);
    expect(mapped.notes.some((note) => note.includes("project my-project -> repo"))).toBe(true);

    const unknown = (await inDir(repo, () =>
      worktreeGcCommand({ project: "ghost-project", olderThan: "30d" }, ctx),
    )) as WorktreeGcOutcome;
    expect(unknown.notes.some((note) => note.includes("ghost-project not found"))).toBe(true);
  });

  it("plans a purge without deleting and then purges old quarantine dirs", async () => {
    const quarantineDir = join(cacheRoot, "_quarantine", "old-journal");
    await mkdir(quarantineDir, { recursive: true });
    await writeFile(join(quarantineDir, "data"), "x");
    const when = new Date(Date.now() - 30 * DAY_MS);
    await utimes(quarantineDir, when, when);

    const plan = (await inDir(repo, () =>
      worktreeGcCommand({ purge: true, json: true }, makeCtx()),
    )) as WorktreeGcOutcome;
    expect(plan.action).toBe("purge");
    expect(plan.applied).toBe(false);
    expect(plan.purge?.purged).toContain(quarantineDir);
    expect(existsSync(quarantineDir)).toBe(true);
    expect(plan.notes.join(" ")).toContain("pass --yes");

    const applied = (await inDir(repo, () =>
      worktreeGcCommand({ purge: true, yes: true, json: true }, makeCtx()),
    )) as WorktreeGcOutcome;
    expect(applied.applied).toBe(true);
    expect(applied.purge?.purged).toContain(quarantineDir);
    expect(existsSync(quarantineDir)).toBe(false);
  });

  it("reports an invalid --undo id without touching the cache", async () => {
    const outcome = (await inDir(repo, () =>
      worktreeGcCommand({ undo: "../bad" }, makeCtx()),
    )) as WorktreeGcOutcome;

    expect(outcome.action).toBe("restore");
    expect(outcome.restore?.restored).toEqual([]);
    expect(outcome.restore?.skipped[0]?.reason).toBe("invalid journal id");
  });

  it("quarantines selected candidates on --apply --yes", async () => {
    const identity = await resolveRepoIdentity(repo);
    const scoped = await seedCandidate(identity.repoId, "go-build");

    const outcome = (await inDir(repo, () =>
      worktreeGcCommand({ apply: true, yes: true, olderThan: "30d" }, makeCtx()),
    )) as WorktreeGcOutcome;

    expect(outcome.action).toBe("apply");
    expect(outcome.applied).toBe(true);
    expect(outcome.quarantined?.moved.map((entry) => entry.from)).toContain(scoped);
    expect(existsSync(scoped)).toBe(false);
    expect(existsSync(outcome.quarantined?.quarantineDir ?? "")).toBe(true);
  });
});
