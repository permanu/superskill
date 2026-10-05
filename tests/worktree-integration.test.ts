// SPDX-License-Identifier: Apache-2.0
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { promisify } from "node:util";
import type { CommandContext } from "../src/core/types.js";
import { worktreeApplyCommand } from "../src/commands/worktree/apply.js";
import { worktreeBootstrapCommand } from "../src/commands/worktree/bootstrap.js";
import { worktreeEnvCommand } from "../src/commands/worktree/env.js";
import { renderWorktreeGc, worktreeGcCommand } from "../src/commands/worktree/gc.js";
import { activateRepo, deactivateRepo } from "../src/lib/worktree/activate.js";
import { auditRepo } from "../src/lib/worktree/audit.js";
import { isHookInstalled } from "../src/lib/worktree/hooks.js";
import { repoStateDir } from "../src/lib/worktree/paths.js";
import { verifySeededFiles } from "../src/lib/worktree/seed.js";
import { readManifest, readPolicy } from "../src/lib/worktree/state.js";

const execFileAsync = promisify(execFile);

const ISOLATED_ENV_KEYS = [
  "HOME",
  "XDG_CONFIG_HOME",
  "GIT_CONFIG_GLOBAL",
  "GIT_CONFIG_NOSYSTEM",
  "SUPERSKILL_CACHE_ROOT",
  "SUPERSKILL_WORKTREE_BOOTSTRAP",
] as const;

type IsolatedEnvKey = (typeof ISOLATED_ENV_KEYS)[number];

function isolatedGitEnv(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    ...process.env,
    GIT_AUTHOR_NAME: "Test",
    GIT_AUTHOR_EMAIL: "test@example.com",
    GIT_COMMITTER_NAME: "Test",
    GIT_COMMITTER_EMAIL: "test@example.com",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    ...extra,
  };
}

describe("worktree cache integration", { timeout: 30_000 }, () => {
  let base: string;
  let cacheRoot: string;
  let repo: string;
  let worktree: string;
  let stubBin: string;
  let originalCwd: string;
  let ctx: CommandContext;
  const savedEnv: Partial<Record<IsolatedEnvKey, string | undefined>> = {};

  async function git(cwd: string, args: string[], extraEnv: NodeJS.ProcessEnv = {}): Promise<string> {
    const { stdout } = await execFileAsync("git", args, {
      cwd,
      env: isolatedGitEnv(extraEnv),
      timeout: 30000,
    });
    return stdout;
  }

  async function inWorktree<T>(fn: () => Promise<T>): Promise<T> {
    const previous = process.cwd();
    process.chdir(worktree);
    try {
      return await fn();
    } finally {
      process.chdir(previous);
    }
  }

  beforeAll(async () => {
    originalCwd = process.cwd();
    for (const key of ISOLATED_ENV_KEYS) savedEnv[key] = process.env[key];
    base = await realpath(await mkdtemp(join(tmpdir(), "worktree-integration-")));
    cacheRoot = await realpath(await mkdtemp(join(tmpdir(), "worktree-integration-cache-")));
    process.env.HOME = join(base, "home");
    process.env.XDG_CONFIG_HOME = join(base, "xdg");
    process.env.GIT_CONFIG_GLOBAL = "/dev/null";
    process.env.GIT_CONFIG_NOSYSTEM = "1";
    process.env.SUPERSKILL_CACHE_ROOT = cacheRoot;
    delete process.env.SUPERSKILL_WORKTREE_BOOTSTRAP;
    ctx = { vaultPath: join(base, "vault") } as unknown as CommandContext;

    repo = join(base, "repo");
    await mkdir(repo, { recursive: true });
    await git(repo, ["init", "-q", "-b", "main"]);
    await writeFile(join(repo, "go.mod"), "module example.com/worktree-integration\n\ngo 1.22\n");
    await writeFile(join(repo, "package.json"), '{"name":"worktree-integration","private":true}\n');
    await writeFile(join(repo, "README.md"), "integration fixture\n");
    await mkdir(join(repo, "node_modules", "leftpad"), { recursive: true });
    await writeFile(join(repo, "node_modules", "leftpad", "index.js"), "module.exports = 1;\n");
    await writeFile(
      join(repo, "node_modules", "leftpad", "package.json"),
      '{"name":"leftpad","version":"1.0.0"}\n',
    );
    await git(repo, ["add", "go.mod", "package.json", "README.md"]);
    await git(repo, ["commit", "-q", "-m", "init"]);

    stubBin = join(base, "stub-bin");
    await mkdir(stubBin, { recursive: true });
    const stub = join(stubBin, "superskill-cli");
    await writeFile(stub, "#!/bin/sh\nexit 0\n");
    await chmod(stub, 0o755);

    worktree = join(repo, ".worktrees", "feat-1");
  });

  afterAll(async () => {
    try {
      process.chdir(originalCwd);
    } catch {
      // the original directory may no longer exist; cleanup still proceeds
    }
    for (const key of ISOLATED_ENV_KEYS) {
      const value = savedEnv[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    if (base) await rm(base, { recursive: true, force: true });
    if (cacheRoot) await rm(cacheRoot, { recursive: true, force: true });
  });

  it("activates a real repo with go + typescript stacks and installs the hook", async () => {
    expect(existsSync(join(repo, "go.mod"))).toBe(true);
    expect(existsSync(join(repo, "package.json"))).toBe(true);
    expect(existsSync(join(repo, "node_modules", "leftpad", "index.js"))).toBe(true);

    const result = await activateRepo(repo, { yes: true, hooks: true, hosts: [], seed: true });

    expect(result.changed).toBe(true);
    expect(result.dryRun).toBe(false);
    expect(result.hook?.changed).toBe(true);
    expect(result.stacks).toEqual(expect.arrayContaining(["go", "typescript"]));

    const policy = await readPolicy(repo);
    expect(policy).not.toBeNull();
    expect(policy!.stacks).toEqual(expect.arrayContaining(["go", "typescript"]));
    expect(policy!.activation).toEqual({ hooks: true, seed: true, install: false });
    expect(await isHookInstalled(repo)).toBe(true);
  });

  it("creates a real git worktree that does not inherit untracked node_modules", async () => {
    await mkdir(join(repo, ".worktrees"), { recursive: true });
    await git(repo, ["worktree", "add", worktree, "-b", "feat-1"], {
      PATH: `${stubBin}:${process.env.PATH ?? ""}`,
      SUPERSKILL_WORKTREE_BOOTSTRAP: "0",
    });

    expect(existsSync(join(worktree, ".git"))).toBe(true);
    expect(existsSync(join(worktree, "go.mod"))).toBe(true);
    expect(existsSync(join(worktree, "node_modules"))).toBe(false);
  });

  it("bootstraps the worktree through the command and seeds node_modules", async () => {
    const result = await inWorktree(() => worktreeBootstrapCommand({ source: "worktree-create" }, ctx));

    expect(result.skipped).toBe(false);
    expect(result.seeded).toBeDefined();
    expect(result.seeded!.seeded.map((seed) => seed.relative)).toContain("node_modules");
    expect(existsSync(join(worktree, "node_modules", "leftpad", "index.js"))).toBe(true);

    const manifest = await readManifest(repo, worktree);
    expect(manifest).not.toBeNull();
    expect(manifest!.worktree).toBe(worktree);
    expect(manifest!.files.map((file) => file.path).sort()).toEqual([
      "node_modules/leftpad/index.js",
      "node_modules/leftpad/package.json",
    ]);
  });

  it("verifies seeded files and reports a modified copy", async () => {
    const clean = await verifySeededFiles(worktree);
    expect(clean).not.toBeNull();
    expect(clean!.modified).toEqual([]);
    expect(clean!.missing).toEqual([]);
    expect(clean!.intact).toBe(2);

    await writeFile(join(worktree, "node_modules", "leftpad", "index.js"), "module.exports = 2;\n");
    const dirty = await verifySeededFiles(worktree);
    expect(dirty).not.toBeNull();
    expect(dirty!.modified).toEqual(["node_modules/leftpad/index.js"]);
  });

  it("audits the dirty worktree without proposing destructive items", async () => {
    const audit = await auditRepo(worktree);

    expect(audit.policy).not.toBeNull();
    expect(audit.items.map((item) => item.id)).toEqual(expect.arrayContaining(["policy", "hook"]));

    const entry = audit.worktrees.find((candidate) => basename(candidate.info.path) === "feat-1");
    expect(entry).toBeDefined();
    expect(entry!.verdict.untracked || entry!.verdict.dirty).toBe(true);
    expect(entry!.verdict.safeToReclaimLocalCaches).toBe(false);
    expect(entry!.verdict.reasons.length).toBeGreaterThan(0);
    expect(entry!.manifest?.modified).toContain("node_modules/leftpad/index.js");
    expect(entry!.items.some((item) => item.id.startsWith("reclaim:"))).toBe(false);
  });

  it("plans gc from the worktree without deleting anything", async () => {
    const outcome = await inWorktree(() => worktreeGcCommand({ json: true }, ctx));
    const text = renderWorktreeGc(outcome);

    expect((outcome as { action?: string }).action).toBe("plan");
    expect(text).toContain("Nothing was deleted");
    expect(existsSync(join(cacheRoot, "_quarantine"))).toBe(false);
  });

  it("renders the worktree environment including GOCACHE", async () => {
    const result = await inWorktree(() => worktreeEnvCommand({ json: false }, ctx));

    expect(result.providers).toContain("go");
    expect(result.json.GOCACHE).toBeDefined();
    expect(result.text).toContain("export GOCACHE=");
  });

  it("plans safe apply items without writing to disk", async () => {
    const policyPath = join(await repoStateDir(repo), "policy.json");
    const before = await readFile(policyPath, "utf-8");

    const result = await inWorktree(() => worktreeApplyCommand({ allSafe: true, yes: false }, ctx));

    expect(result.dryRun).toBe(true);
    expect(result.applied).toEqual([]);
    expect(result.planned.map((item) => item.id)).toEqual(expect.arrayContaining(["policy", "hook"]));

    const after = await readFile(policyPath, "utf-8");
    expect(after).toBe(before);
  });

  it("deactivates the repo, removing the hook and the policy", async () => {
    const result = await deactivateRepo(repo, { hosts: [], removePolicy: true });

    expect(result.hook.removed).toBe(true);
    expect(result.policyRemoved).toBe(true);
    expect(await isHookInstalled(repo)).toBe(false);
    expect(await readPolicy(repo)).toBeNull();
  });
});
