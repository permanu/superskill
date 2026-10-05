// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { realpathSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CommandContext } from "../../core/types.js";
import { worktreeAuditCommand } from "./audit.js";
import {
  parseSize,
  renderWorktreeStatus,
  worktreeStatusCommand,
  type WorktreeStatusResult,
} from "./status.js";

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

describe("parseSize", () => {
  it("parses plain bytes and suffixed units", () => {
    expect(parseSize("123")).toBe(123);
    expect(parseSize("0")).toBe(0);
    expect(parseSize("10G")).toBe(10 * 1024 ** 3);
    expect(parseSize("500M")).toBe(500 * 1024 ** 2);
    expect(parseSize("1T")).toBe(1024 ** 4);
    expect(parseSize("2KB")).toBe(2048);
    expect(parseSize("4K")).toBe(4096);
    expect(parseSize("1.5G")).toBe(Math.round(1.5 * 1024 ** 3));
    expect(parseSize(" 4 MiB ")).toBe(4 * 1024 ** 2);
  });

  it("rejects junk and negative values", () => {
    expect(parseSize("")).toBeNull();
    expect(parseSize("abc")).toBeNull();
    expect(parseSize("-5G")).toBeNull();
    expect(parseSize("10X")).toBeNull();
    expect(parseSize("G10")).toBeNull();
  });
});

describe("renderWorktreeStatus", () => {
  it("includes the repo id and budget exceeded text", () => {
    const result: WorktreeStatusResult = {
      repoId: "deadbeefdeadbeef",
      repoRoot: "/tmp/repo",
      stacks: ["typescript"],
      worktrees: [{ path: "/tmp/repo", name: "repo", safe: false, reasons: ["tracked changes present (dirty worktree)"] }],
      cache: { dirs: 2, bytes: 50 * 1024 * 1024 },
      policy: { installed: true, hookInstalled: true, hosts: ["claude-code"] },
      budget: { limitBytes: 1024, usedBytes: 50 * 1024 * 1024, exceeded: true },
      notes: ["never-touch rules: ..."],
    };

    const text = renderWorktreeStatus(result);
    expect(text).toContain("deadbeefdeadbeef");
    expect(text.toLowerCase()).toContain("exceeded");
    expect(text).toContain("claude-code");
    expect(text).toContain("[unsafe]");
  });

  it("renders empty worktrees, no policy, no hosts, and no budget", () => {
    const text = renderWorktreeStatus({
      repoId: "repo-x",
      repoRoot: "/tmp/repo-x",
      stacks: [],
      worktrees: [],
      cache: { dirs: 0, bytes: null },
      policy: { installed: false, hookInstalled: null, hosts: [] },
      budget: null,
      notes: [],
    });

    expect(text).toContain("stacks: unknown");
    expect(text).toContain("(none)");
    expect(text).toContain("Policy: not installed; hook: unknown; hosts: none");
    expect(text).toContain("Budget: none");
    expect(text).toContain("Cache: 0 dir(s), unknown");
  });

  it("renders safe worktrees, reasons, and an unexceeded budget", () => {
    const text = renderWorktreeStatus({
      repoId: "repo-y",
      repoRoot: "/tmp/repo-y",
      stacks: ["go"],
      worktrees: [{ path: "/tmp/wt", name: "wt", safe: true, reasons: ["clean"] }],
      cache: { dirs: 1, bytes: 2048 },
      policy: { installed: true, hookInstalled: false, hosts: ["claude-code"] },
      budget: { limitBytes: 1024 ** 3, usedBytes: 2048, exceeded: false },
      notes: ["checked 1 worktree"],
    });

    expect(text).toContain("[safe] /tmp/wt (wt)");
    expect(text).toContain("- clean");
    expect(text).toContain("hook: not installed");
    expect(text).toContain("Budget: limit 1 GB, used 2 KB");
    expect(text).not.toContain("budget exceeded");
    expect(text).toContain("Notes:");
    expect(text).toContain("checked 1 worktree");
  });
});

describe("worktreeStatusCommand", () => {
  let base: string;

  beforeEach(async () => {
    base = await mkdtemp(join(tmpdir(), "worktree-status-"));
  });

  afterEach(async () => {
    await rm(base, { recursive: true, force: true });
  });

  async function initRepo(): Promise<string> {
    const repo = join(base, "repo");
    await mkdir(repo);
    await git(repo, ["init", "-q", "-b", "main"]);
    await writeFile(join(repo, "package.json"), '{"name":"fixture","version":"1.0.0"}\n');
    await writeFile(join(repo, "README.md"), "hello\n");
    await git(repo, ["add", "."]);
    await git(repo, ["commit", "-q", "-m", "init"]);
    return repo;
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

  it("audits the current repo and flags a tiny budget", async () => {
    const repo = await initRepo();
    await mkdir(join(repo, "node_modules"), { recursive: true });
    await writeFile(join(repo, "node_modules", "blob.bin"), Buffer.alloc(64 * 1024, "y"));

    const result = await inDir(repo, () => worktreeStatusCommand({ budget: "1B" }, makeCtx()));

    expect(result.repoId).toBeTruthy();
    expect(result.stacks).toContain("typescript");
    expect(result.worktrees).toHaveLength(1);
    expect(result.worktrees[0].name).toBe("repo");
    expect(result.cache.dirs).toBeGreaterThan(0);
    expect(result.budget?.limitBytes).toBe(1);
    expect(result.budget?.usedBytes).toBe(result.cache.bytes);
    if (result.cache.bytes !== null) {
      expect(result.budget?.exceeded).toBe(true);
      expect(renderWorktreeStatus(result).toLowerCase()).toContain("exceeded");
    }
  });

  it("detects the worktree-start hook marker", async () => {
    const repo = await initRepo();

    const before = await inDir(repo, () => worktreeStatusCommand({}, makeCtx()));
    expect(before.policy.hookInstalled).toBe(false);

    await writeFile(
      join(repo, ".git", "hooks", "post-checkout"),
      '#!/bin/sh\nsuperskill worktree-start "$@"\n',
      { mode: 0o755 },
    );
    const after = await inDir(repo, () => worktreeStatusCommand({}, makeCtx()));
    expect(after.policy.hookInstalled).toBe(true);
  });

  it("returns an unknown hook state outside a git repository", async () => {
    const plain = join(base, "plain");
    await mkdir(plain);
    const result = await inDir(plain, () => worktreeStatusCommand({}, makeCtx()));
    expect(result.worktrees).toEqual([]);
    expect(result.policy.hookInstalled).toBeNull();
  });

  it("notes an invalid budget value instead of dropping it", async () => {
    const repo = await initRepo();
    const result = await inDir(repo, () => worktreeStatusCommand({ budget: "wat" }, makeCtx()));
    expect(result.budget).toBeNull();
    expect(result.notes.some((note) => note.includes("invalid budget"))).toBe(true);
  });

  it("returns an unreadable hook state when the hook path is a directory", async () => {
    const repo = await initRepo();
    await mkdir(join(repo, ".git", "hooks", "post-checkout"), { recursive: true });

    const result = await inDir(repo, () => worktreeStatusCommand({}, makeCtx()));
    expect(result.policy.hookInstalled).toBeNull();
  });

  it("treats a blank budget as no budget without a note", async () => {
    const repo = await initRepo();
    const result = await inDir(repo, () => worktreeStatusCommand({ budget: "   " }, makeCtx()));
    expect(result.budget).toBeNull();
    expect(result.notes.some((note) => note.includes("invalid budget"))).toBe(false);
  });

  it("runs the audit command against the current directory", async () => {
    const repo = await initRepo();
    const audit = await inDir(repo, () => worktreeAuditCommand({ json: true }, makeCtx()));
    expect(audit.repoId).toBeTruthy();
    expect(audit.worktrees).toHaveLength(1);
    expect(audit.worktrees[0].info.path).toBe(realpathSync(repo));
  });
});
