import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { createProgram } from "../src/cli.js";
import { quarantinePaths } from "../src/lib/worktree/quarantine.js";
import type { CommandContext } from "../src/core/types.js";

const active = vi.hoisted(() => ({ ctx: undefined as unknown }));
vi.mock("../src/app-context.js", () => ({
  createScopedCtx: vi.fn(async () => active.ctx),
  createCtx: vi.fn(async () => active.ctx),
}));

const execFileAsync = promisify(execFile);
let root: string;
let repo: string;
let exitCode: typeof process.exitCode;
let cacheRoot: string | undefined;

beforeEach(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "cli-undo-")));
  repo = join(root, "repo");
  await mkdir(repo);
  await execFileAsync("git", ["init", "-q"], {
    cwd: repo,
    env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" },
    timeout: 10000,
  });
  await writeFile(join(repo, "package.json"), '{"name":"cli-undo-fixture","private":true}\n');
  active.ctx = {
    workspacePath: repo,
    vaultPath: join(root, "vault"),
    log: { debug() {}, info() {}, warn() {}, error() {} },
  } as CommandContext;
  exitCode = process.exitCode;
  process.exitCode = undefined;
  cacheRoot = process.env.SUPERSKILL_CACHE_ROOT;
  process.env.SUPERSKILL_CACHE_ROOT = join(root, "cache");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(async () => {
  process.exitCode = exitCode;
  if (cacheRoot === undefined) delete process.env.SUPERSKILL_CACHE_ROOT;
  else process.env.SUPERSKILL_CACHE_ROOT = cacheRoot;
  vi.restoreAllMocks();
  await rm(root, { recursive: true, force: true });
});

describe("CLI undo with real worktree commands", () => {
  it.each(["apply", "gc"])("worktree %s previews undo until --yes and then restores only the fixture", async (command) => {
    const original = join(repo, "node_modules");
    await mkdir(original);
    await writeFile(join(original, "artifact.txt"), "preserved payload");
    const quarantine = await quarantinePaths(repo, [original], { worktreeRoot: repo, journalId: "cli-restore" });
    expect(quarantine.moved).toHaveLength(1);
    const manifest = join(quarantine.quarantineDir, "manifest.json");
    const before = await readFile(manifest, "utf-8");

    await createProgram().exitOverride().parseAsync(["worktree", command, "--undo", quarantine.journalId, "--json"], { from: "user" });
    expect(process.exitCode).toBeUndefined();
    expect(existsSync(original)).toBe(false);
    expect(await readFile(manifest, "utf-8")).toBe(before);
    const preview = JSON.parse(String(vi.mocked(console.log).mock.calls.at(-1)?.[0]));
    if (command === "apply") expect(preview.dryRun).toBe(true);
    else expect(preview.applied).toBe(false);

    await createProgram().exitOverride().parseAsync(["worktree", command, "--undo", quarantine.journalId, "--yes", "--json"], { from: "user" });
    expect(process.exitCode).toBeUndefined();
    expect(await readFile(join(original, "artifact.txt"), "utf-8")).toBe("preserved payload");
    expect(existsSync(quarantine.moved[0].to)).toBe(false);
  });
});
