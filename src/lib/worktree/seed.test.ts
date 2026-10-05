// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CommandContext } from "../../core/types.js";
import { worktreeBootstrapCommand } from "../../commands/worktree/bootstrap.js";
import { copyTreeCoW, seedWorktree, verifySeededFiles } from "./seed.js";
import {
  POLICY_SCHEMA_VERSION,
  listingSignature,
  readJournal,
  readManifest,
  writeManifest,
  writePolicy,
  type WorktreePolicy,
} from "./state.js";

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

const ctx = {
  log: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
} as unknown as CommandContext;

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd, env: GIT_ENV, timeout: 20000 });
  return stdout;
}

async function optionalModule(specifier: string): Promise<Record<string, unknown> | null> {
  try {
    return (await import(specifier)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const envModule = await optionalModule("./env.js");
const sessionDescribe = typeof envModule?.resolveWorktreeEnv === "function" ? describe : describe.skip;

function samplePolicy(repoRoot: string): WorktreePolicy {
  return {
    v: POLICY_SCHEMA_VERSION,
    repoId: "0123456789abcdef",
    remoteHash: null,
    repoRoot,
    createdAt: "2026-01-02T03:04:05.678Z",
    updatedAt: "2026-01-02T03:04:05.678Z",
    stacks: ["typescript"],
    tools: ["node"],
    flags: {},
    hosts: [],
    activation: { hooks: false, seed: true, install: false },
  };
}

describe("worktree seed", () => {
  let base: string;
  let repo: string;

  beforeEach(async () => {
    base = await mkdtemp(join(tmpdir(), "worktree-seed-"));
    repo = join(base, "repo");
    await mkdir(repo, { recursive: true });
    await git(repo, ["init", "-q", "-b", "main"]);
    await writeFile(join(repo, "package.json"), '{"name":"seed-test","private":true}\n');
    await writeFile(join(repo, "README.md"), "seed test\n");
    await git(repo, ["add", "."]);
    await git(repo, ["commit", "-q", "-m", "init"]);
  });

  afterEach(async () => {
    await rm(base, { recursive: true, force: true });
  });

  async function addNodeModules(): Promise<void> {
    await mkdir(join(repo, "node_modules", "pkg"), { recursive: true });
    await writeFile(join(repo, "node_modules", "pkg", "index.js"), "module.exports = 1;\n");
    await writeFile(join(repo, "node_modules", "pkg", "package.json"), '{"name":"pkg","version":"1.0.0"}\n');
    await symlink("index.js", join(repo, "node_modules", "pkg", "link.js"));
  }

  async function addWorktree(name: string): Promise<string> {
    const worktree = join(base, name);
    await git(repo, ["worktree", "add", "-q", "-b", name, worktree]);
    return worktree;
  }

  it("copies node_modules into a linked worktree and records a manifest and journal", async () => {
    await addNodeModules();
    const worktree = await addWorktree("wt-a");

    const result = await seedWorktree(worktree);

    expect(result.seeded.map((s) => s.relative)).toEqual(["node_modules"]);
    const seeded = result.seeded[0];
    expect(["reflink", "copy"]).toContain(seeded.method);
    expect(seeded.files).toBe(2);
    expect(seeded.bytes).toBeGreaterThan(0);
    expect(result.skipped).toEqual([]);

    expect(await readFile(join(worktree, "node_modules", "pkg", "index.js"), "utf-8")).toBe(
      "module.exports = 1;\n",
    );
    expect(await readFile(join(worktree, "node_modules", "pkg", "package.json"), "utf-8")).toBe(
      '{"name":"pkg","version":"1.0.0"}\n',
    );

    const manifest = await readManifest(worktree, worktree);
    expect(manifest).not.toBeNull();
    expect(manifest!.files.map((f) => f.path).sort()).toEqual([
      "node_modules/pkg/index.js",
      "node_modules/pkg/package.json",
    ]);
    expect(manifest!.files.every((f) => f.sha256.length === 64 && f.size > 0)).toBe(true);

    const verify = await verifySeededFiles(worktree);
    expect(verify).toEqual({ modified: [], missing: [], intact: 2 });
    expect(await verifySeededFiles(worktree, worktree)).toEqual({ modified: [], missing: [], intact: 2 });

    const journal = await readJournal(worktree);
    expect(journal).toHaveLength(1);
    expect(journal[0].action).toBe("seed");
    expect(journal[0].paths).toEqual(["node_modules"]);
  });

  it("returns a null verification result when no manifest exists", async () => {
    const worktree = await addWorktree("wt-nomanifest");
    expect(await verifySeededFiles(worktree)).toBeNull();
  });

  it("skips when the source is missing", async () => {
    const worktree = await addWorktree("wt-missing");
    const result = await seedWorktree(worktree);

    expect(result.seeded).toEqual([]);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].relative).toBe("node_modules");
    expect(result.skipped[0].reason).toContain("source missing");
    expect(existsSync(join(worktree, "node_modules"))).toBe(false);
  });

  it("skips when the destination already exists and never overwrites it", async () => {
    await addNodeModules();
    const worktree = await addWorktree("wt-present");
    await mkdir(join(worktree, "node_modules"), { recursive: true });
    await writeFile(join(worktree, "node_modules", "sentinel.txt"), "keep me\n");

    const result = await seedWorktree(worktree);

    expect(result.seeded).toEqual([]);
    expect(result.skipped).toEqual([{ relative: "node_modules", reason: "already present" }]);
    expect(await readFile(join(worktree, "node_modules", "sentinel.txt"), "utf-8")).toBe("keep me\n");
  });

  it("skips a destination locked by another bootstrap", async () => {
    await addNodeModules();
    const worktree = await addWorktree("wt-locked");
    const lockPath = join(worktree, "node_modules.superskill-lock");
    await writeFile(lockPath, "other-process\n");

    const result = await seedWorktree(worktree);

    expect(result.seeded).toEqual([]);
    expect(result.skipped).toEqual([{ relative: "node_modules", reason: "locked by another bootstrap" }]);
    expect(existsSync(join(worktree, "node_modules"))).toBe(false);
    expect(existsSync(lockPath)).toBe(true);
  });

  it("removes its lock after a successful copy", async () => {
    await addNodeModules();
    const worktree = await addWorktree("wt-unlocked");

    const result = await seedWorktree(worktree);

    expect(result.seeded.map((s) => s.relative)).toEqual(["node_modules"]);
    expect(existsSync(join(worktree, "node_modules.superskill-lock"))).toBe(false);
  });

  it("skips everything on the main worktree", async () => {
    await addNodeModules();
    const result = await seedWorktree(repo);

    expect(result.seeded).toEqual([]);
    expect(result.skipped).toEqual([{ relative: "node_modules", reason: "main worktree" }]);
  });

  it("reports planned seeds without copying on dryRun", async () => {
    await addNodeModules();
    const worktree = await addWorktree("wt-dry");

    const result = await seedWorktree(worktree, { dryRun: true });

    expect(result.seeded.map((s) => s.relative)).toEqual(["node_modules"]);
    expect(result.notes.some((n) => n.includes("dry run"))).toBe(true);
    expect(existsSync(join(worktree, "node_modules"))).toBe(false);
    expect(await readManifest(worktree, worktree)).toBeNull();
    expect(await readJournal(worktree)).toEqual([]);
  });

  it("flags modified and missing files during verification", async () => {
    await addNodeModules();
    const worktree = await addWorktree("wt-modified");
    await seedWorktree(worktree);

    await writeFile(join(worktree, "node_modules", "pkg", "index.js"), "module.exports = 2;\n");
    const verify = await verifySeededFiles(worktree);

    expect(verify).not.toBeNull();
    expect(verify!.modified).toEqual(["node_modules/pkg/index.js"]);
    expect(verify!.missing).toEqual([]);
    expect(verify!.intact).toBe(1);
  });

  it("filters providers by requested tools", async () => {
    await addNodeModules();
    const worktree = await addWorktree("wt-tools");

    const result = await seedWorktree(worktree, { tools: ["rust"] });

    expect(result.seeded).toEqual([]);
    expect(result.notes.some((n) => n.includes('"rust"'))).toBe(true);
    expect(existsSync(join(worktree, "node_modules"))).toBe(false);
  });

  it("verifies synthetic trailing-slash manifest entries against the listing signature", async () => {
    const cacheDir = join(repo, "cache");
    await mkdir(cacheDir, { recursive: true });
    await writeFile(join(cacheDir, "a.txt"), "alpha\n");
    await writeFile(join(cacheDir, "b.txt"), "beta\n");

    await writeManifest(repo, {
      v: 1,
      worktree: repo,
      createdAt: "2026-01-02T03:04:05.678Z",
      files: [{ path: "cache/", sha256: await listingSignature(cacheDir), size: 0 }],
    });

    expect(await verifySeededFiles(repo)).toEqual({ modified: [], missing: [], intact: 1 });

    await writeFile(join(cacheDir, "a.txt"), "alpha changed\n");
    const verify = await verifySeededFiles(repo);
    expect(verify).toEqual({ modified: ["cache/"], missing: [], intact: 0 });
  });

  it("fails copyTreeCoW loudly when cp cannot copy and never leaves a fallback", async () => {
    const missingSource = join(base, "missing-source");
    await expect(copyTreeCoW(missingSource, join(base, "cp-dest"))).rejects.toThrow(/cp failed/);
  });

  it("refuses the copy fallback when the destination state is unknown", async () => {
    const blocker = join(base, "blocker-file");
    await writeFile(blocker, "x");
    await expect(copyTreeCoW(join(base, "some-source"), join(blocker, "child"))).rejects.toThrow(
      /left in place/,
    );
  });
});

describe("worktree bootstrap", () => {
  let base: string;
  let repo: string;

  beforeEach(async () => {
    base = await mkdtemp(join(tmpdir(), "worktree-bootstrap-"));
    repo = join(base, "repo");
    await mkdir(repo, { recursive: true });
    await git(repo, ["init", "-q", "-b", "main"]);
    await writeFile(join(repo, "package.json"), '{"name":"bootstrap-test","private":true}\n');
    await git(repo, ["add", "."]);
    await git(repo, ["commit", "-q", "-m", "init"]);
  });

  afterEach(async () => {
    await rm(base, { recursive: true, force: true });
  });

  async function addNodeModules(): Promise<void> {
    await mkdir(join(repo, "node_modules", "pkg"), { recursive: true });
    await writeFile(join(repo, "node_modules", "pkg", "index.js"), "module.exports = 1;\n");
  }

  async function addWorktree(name: string): Promise<string> {
    const worktree = join(base, name);
    await git(repo, ["worktree", "add", "-q", "-b", name, worktree]);
    return worktree;
  }

  it("returns skipped without throwing when no policy exists", async () => {
    const plain = join(base, "plain");
    await mkdir(plain);
    const previous = process.cwd();
    process.chdir(plain);
    try {
      const result = await worktreeBootstrapCommand({}, ctx);
      expect(result.skipped).toBe(true);
      expect(result.reason).toBe("repo not activated");
      expect(result.worktreeRoot).toBe(process.cwd());
    } finally {
      process.chdir(previous);
    }
  });

  it("seeds a newly created worktree when the policy enables seeding", async () => {
    await addNodeModules();
    const worktree = await addWorktree("wt-bootstrap");
    await writePolicy(repo, samplePolicy(await realpath(repo)));
    const previous = process.cwd();
    process.chdir(worktree);
    try {
      const result = await worktreeBootstrapCommand({ source: "worktree-create" }, ctx);
      expect(result.skipped).toBe(false);
      expect(result.repoId).toBe("0123456789abcdef");
      expect(result.seeded?.seeded.map((s) => s.relative)).toEqual(["node_modules"]);
      expect(existsSync(join(process.cwd(), "node_modules", "pkg", "index.js"))).toBe(true);
    } finally {
      process.chdir(previous);
    }
  });

  it("skips seeding when SUPERSKILL_WORKTREE_BOOTSTRAP=0", async () => {
    await addNodeModules();
    const worktree = await addWorktree("wt-disabled");
    await writePolicy(repo, samplePolicy(await realpath(repo)));
    const previous = process.cwd();
    const previousFlag = process.env.SUPERSKILL_WORKTREE_BOOTSTRAP;
    process.chdir(worktree);
    process.env.SUPERSKILL_WORKTREE_BOOTSTRAP = "0";
    try {
      const result = await worktreeBootstrapCommand({}, ctx);
      expect(result.skipped).toBe(true);
      expect(result.reason).toContain("SUPERSKILL_WORKTREE_BOOTSTRAP");
      expect(existsSync(join(process.cwd(), "node_modules"))).toBe(false);
    } finally {
      process.chdir(previous);
      if (previousFlag === undefined) delete process.env.SUPERSKILL_WORKTREE_BOOTSTRAP;
      else process.env.SUPERSKILL_WORKTREE_BOOTSTRAP = previousFlag;
    }
  });

  it("skips session env when CLAUDE_ENV_FILE is not set", async () => {
    await writePolicy(repo, samplePolicy(await realpath(repo)));
    const previous = process.cwd();
    const previousEnvFile = process.env.CLAUDE_ENV_FILE;
    process.chdir(repo);
    delete process.env.CLAUDE_ENV_FILE;
    try {
      const result = await worktreeBootstrapCommand({ source: "session", claudeEnv: true }, ctx);
      expect(result.skipped).toBe(true);
      expect(result.reason).toBe("CLAUDE_ENV_FILE not set");
    } finally {
      process.chdir(previous);
      if (previousEnvFile !== undefined) process.env.CLAUDE_ENV_FILE = previousEnvFile;
    }
  });

  sessionDescribe("session env with a real env module", () => {
    it("appends exports to CLAUDE_ENV_FILE without rewriting it", async () => {
      await writePolicy(repo, samplePolicy(await realpath(repo)));
      const envFile = join(base, "claude.env");
      await writeFile(envFile, "# existing\n");
      const previous = process.cwd();
      const previousEnvFile = process.env.CLAUDE_ENV_FILE;
      process.chdir(repo);
      process.env.CLAUDE_ENV_FILE = envFile;
      try {
        const result = await worktreeBootstrapCommand({ source: "session", claudeEnv: true }, ctx);
        expect(result.claudeEnvFile).toBe(envFile);
        const content = await readFile(envFile, "utf-8");
        expect(content.startsWith("# existing\n")).toBe(true);
        expect(content).toContain("export ");
      } finally {
        process.chdir(previous);
        if (previousEnvFile === undefined) delete process.env.CLAUDE_ENV_FILE;
        else process.env.CLAUDE_ENV_FILE = previousEnvFile;
      }
    });

    it("replaces the managed env block instead of duplicating it", async () => {
      await writePolicy(repo, samplePolicy(await realpath(repo)));
      const envFile = join(base, "claude-replace.env");
      await writeFile(envFile, "# existing\n");
      const previous = process.cwd();
      const previousEnvFile = process.env.CLAUDE_ENV_FILE;
      process.chdir(repo);
      process.env.CLAUDE_ENV_FILE = envFile;
      try {
        const first = await worktreeBootstrapCommand({ source: "session", claudeEnv: true }, ctx);
        expect(first.skipped).toBe(false);
        const second = await worktreeBootstrapCommand({ source: "session", claudeEnv: true }, ctx);
        expect(second.skipped).toBe(false);

        const content = await readFile(envFile, "utf-8");
        expect(content.split("# >>> superskill worktree-env").length - 1).toBe(1);
        expect(content.split("# <<< superskill worktree-env <<<").length - 1).toBe(1);
        expect(content.startsWith("# existing\n")).toBe(true);
        expect(content.length).toBeLessThan(2000);
      } finally {
        process.chdir(previous);
        if (previousEnvFile === undefined) delete process.env.CLAUDE_ENV_FILE;
        else process.env.CLAUDE_ENV_FILE = previousEnvFile;
      }
    });

    it("skips env values containing newlines and names them in the notes", async () => {
      await writeFile(join(repo, "go.mod"), "module example.com/test\n");
      await writePolicy(repo, samplePolicy(await realpath(repo)));
      const envFile = join(base, "claude-newline.env");
      await writeFile(envFile, "");
      const previous = process.cwd();
      const previousEnvFile = process.env.CLAUDE_ENV_FILE;
      const previousGoflags = process.env.GOFLAGS;
      process.chdir(repo);
      process.env.CLAUDE_ENV_FILE = envFile;
      process.env.GOFLAGS = "first\nsecond";
      try {
        const result = await worktreeBootstrapCommand({ source: "session", claudeEnv: true }, ctx);
        expect(result.skipped).toBe(false);
        const content = await readFile(envFile, "utf-8");
        expect(content).not.toContain("GOFLAGS");
        expect(content).not.toContain("second");
        expect(content).toContain("export GOCACHE=");
        expect(result.notes.some((note) => note.includes("GOFLAGS"))).toBe(true);
      } finally {
        process.chdir(previous);
        if (previousEnvFile === undefined) delete process.env.CLAUDE_ENV_FILE;
        else process.env.CLAUDE_ENV_FILE = previousEnvFile;
        if (previousGoflags === undefined) delete process.env.GOFLAGS;
        else process.env.GOFLAGS = previousGoflags;
      }
    });
  });
});
