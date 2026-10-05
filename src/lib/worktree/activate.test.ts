import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { activateRepo, deactivateRepo } from "./activate.js";
import { isHookInstalled, postCheckoutPath } from "./hooks.js";
import { repoStateDir } from "./paths.js";
import { readPolicy } from "./state.js";

const execFileAsync = promisify(execFile);

const ISOLATED_ENV_KEYS = ["HOME", "GIT_CONFIG_GLOBAL", "GIT_CONFIG_NOSYSTEM", "XDG_CONFIG_HOME"] as const;

function isolatedGitEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    GIT_AUTHOR_NAME: "Test",
    GIT_AUTHOR_EMAIL: "test@example.com",
    GIT_COMMITTER_NAME: "Test",
    GIT_COMMITTER_EMAIL: "test@example.com",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
  };
}

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd, env: isolatedGitEnv(), timeout: 15000 });
  return stdout;
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

describe("worktree activate", () => {
  let base: string;
  let repo: string;
  const savedEnv: Partial<Record<(typeof ISOLATED_ENV_KEYS)[number], string | undefined>> = {};

  beforeEach(async () => {
    base = await mkdtemp(join(tmpdir(), "worktree-activate-"));
    for (const key of ISOLATED_ENV_KEYS) {
      savedEnv[key] = process.env[key];
    }
    process.env.HOME = join(base, "home");
    process.env.XDG_CONFIG_HOME = join(base, "xdg");
    process.env.GIT_CONFIG_GLOBAL = "/dev/null";
    process.env.GIT_CONFIG_NOSYSTEM = "1";
    repo = join(base, "repo");
    await mkdir(repo);
    await git(repo, ["init", "-q", "-b", "main"]);
    await writeFile(join(repo, "README.md"), "hello\n");
    await git(repo, ["add", "."]);
    await git(repo, ["commit", "-q", "-m", "init"]);
  });

  afterEach(async () => {
    for (const key of ISOLATED_ENV_KEYS) {
      const value = savedEnv[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await rm(base, { recursive: true, force: true });
  });

  it("dry-run plans everything without writing policy, hook, or state", async () => {
    await writeFile(join(repo, "go.mod"), "module example.com/demo\n\ngo 1.22\n");
    const result = await activateRepo(repo, { dryRun: true, hosts: [] });

    expect(result.dryRun).toBe(true);
    expect(result.changed).toBe(true);
    expect(result.stacks).toContain("go");
    expect(result.hook).not.toBeNull();
    expect(result.hook?.changed).toBe(true);
    expect(result.adapters).toEqual([]);

    const stateDir = await repoStateDir(repo);
    expect(await exists(join(stateDir, "policy.json"))).toBe(false);
    expect(await exists(join(stateDir, "hook.state"))).toBe(false);
    expect(await exists(await postCheckoutPath(repo))).toBe(false);
  });

  it("installs policy and hook on a real run with detected stacks", async () => {
    await writeFile(join(repo, "go.mod"), "module example.com/demo\n\ngo 1.22\n");
    const result = await activateRepo(repo, { yes: true, hooks: true, hosts: [] });

    expect(result.dryRun).toBe(false);
    expect(result.stacks).toContain("go");
    expect(result.providers).toContain("go");
    expect(result.hook?.kind).toBe("block");
    expect(result.hook?.changed).toBe(true);

    const policy = await readPolicy(repo);
    expect(policy).not.toBeNull();
    expect(policy?.stacks).toContain("go");
    expect(policy?.tools).toContain("go");
    expect(policy?.hosts).toEqual([]);
    expect(policy?.activation).toEqual({ hooks: true, seed: true, install: false });
    expect(policy?.flags.GOCACHE).toBeDefined();

    const hookPath = await postCheckoutPath(repo);
    expect(await exists(hookPath)).toBe(true);
    expect(await isHookInstalled(repo)).toBe(true);
  });

  it("is idempotent on re-activation", async () => {
    const first = await activateRepo(repo, { yes: true, hosts: [] });
    expect(first.changed).toBe(true);
    const second = await activateRepo(repo, { yes: true, hosts: [] });
    expect(second.changed).toBe(false);
    expect(second.hook?.changed).toBe(false);
    const policy = await readPolicy(repo);
    expect(policy?.createdAt).toBeDefined();
  });

  it("requires consent: plans without writing policy, hook, or adapters", async () => {
    await writeFile(join(repo, "go.mod"), "module example.com/demo\n\ngo 1.22\n");
    const result = await activateRepo(repo, {});

    expect(result.dryRun).toBe(true);
    expect(result.changed).toBe(true);
    expect(result.hook).not.toBeNull();
    expect(result.hook?.changed).toBe(true);
    expect(result.notes.join(" ")).toContain(
      "consent required: pass --yes (CLI) or confirm=true (MCP)",
    );

    const stateDir = await repoStateDir(repo);
    expect(await exists(join(stateDir, "policy.json"))).toBe(false);
    expect(await exists(join(stateDir, "hook.state"))).toBe(false);
    expect(await exists(await postCheckoutPath(repo))).toBe(false);
  });

  it("treats yes + dryRun as a dry run without writing", async () => {
    const result = await activateRepo(repo, { yes: true, dryRun: true, hosts: [] });

    expect(result.dryRun).toBe(true);
    expect(result.notes.join(" ")).toContain("dry-run");
    const stateDir = await repoStateDir(repo);
    expect(await exists(join(stateDir, "policy.json"))).toBe(false);
    expect(await exists(await postCheckoutPath(repo))).toBe(false);
  });

  it("honors hooks: false", async () => {
    const result = await activateRepo(repo, { yes: true, hooks: false, hosts: [] });

    expect(result.hook).toBeNull();
    expect((await readPolicy(repo))?.activation.hooks).toBe(false);
    expect(await exists(await postCheckoutPath(repo))).toBe(false);
  });

  it("deactivate removes the hook and the policy when requested", async () => {
    await activateRepo(repo, { yes: true, hosts: [] });
    const hookPath = await postCheckoutPath(repo);
    expect(await exists(hookPath)).toBe(true);

    const result = await deactivateRepo(repo, { hosts: [], removePolicy: true });
    expect(result.hook.removed).toBe(true);
    expect(result.policyRemoved).toBe(true);
    expect(await exists(hookPath)).toBe(false);
    expect(await readPolicy(repo)).toBeNull();
  });

  it("deactivate keeps the policy by default", async () => {
    await activateRepo(repo, { yes: true, hosts: [] });
    const result = await deactivateRepo(repo, { hosts: [] });
    expect(result.hook.removed).toBe(true);
    expect(result.policyRemoved).toBe(false);
    expect(await readPolicy(repo)).not.toBeNull();
  });
});
