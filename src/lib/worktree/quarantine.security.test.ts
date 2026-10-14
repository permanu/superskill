import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { chmod, mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { CommandContext } from "../../core/types.js";
import { worktreeGcCommand, type WorktreeGcOutcome } from "../../commands/worktree/gc.js";
import { repoStateDir } from "./paths.js";
import { purgeQuarantine, quarantinePaths, restoreQuarantine } from "./quarantine.js";

describe("quarantine recovery boundaries", () => {
  let base: string;
  let cacheRoot: string;
  let source: string;
  let repo: string;
  let previousCacheRoot: string | undefined;

  beforeEach(async () => {
    base = await mkdtemp(join(tmpdir(), "quarantine-security-"));
    cacheRoot = join(base, "cache");
    previousCacheRoot = process.env.SUPERSKILL_CACHE_ROOT;
    process.env.SUPERSKILL_CACHE_ROOT = cacheRoot;
    source = join(cacheRoot, "repo", "go-build");
    repo = join(base, "repo");
    await mkdir(source, { recursive: true });
    await mkdir(repo);
    await promisify(execFile)("git", ["init", "-q", "-b", "main"], { cwd: repo });
    await writeFile(join(source, "keep"), "user data");
  });

  afterEach(async () => {
    if (previousCacheRoot === undefined) delete process.env.SUPERSKILL_CACHE_ROOT;
    else process.env.SUPERSKILL_CACHE_ROOT = previousCacheRoot;
    await rm(base, { recursive: true, force: true });
  });

  it("never moves data when the recovery manifest cannot be created", async () => {
    const quarantineDir = join(cacheRoot, "_quarantine", "blocked");
    await mkdir(join(quarantineDir, "manifest.json"), { recursive: true });
    const result = await quarantinePaths(repo, [source], { cacheRoot, journalId: "blocked" });
    expect(result.moved).toEqual([]);
    expect(existsSync(join(source, "keep"))).toBe(true);
  });

  it("creates private recovery metadata", async () => {
    const result = await quarantinePaths(repo, [source], { cacheRoot, journalId: "private" });
    expect((await stat(result.quarantineDir)).mode & 0o777).toBe(0o700);
    expect((await stat(join(result.quarantineDir, "manifest.json"))).mode & 0o777).toBe(0o600);
  });

  it("refuses recovery metadata that another user could alter", async () => {
    const result = await quarantinePaths(repo, [source], { cacheRoot, journalId: "public" });
    await chmod(join(result.quarantineDir, "manifest.json"), 0o666);
    expect((await restoreQuarantine(repo, "public", { cacheRoot })).restored).toEqual([]);
    expect((await purgeQuarantine({ cacheRoot, olderThanDays: 0, apply: true })).purged).toEqual([]);
    expect(existsSync(join(result.quarantineDir, "go-build", "keep"))).toBe(true);
  });

  it("refuses restore through a replaced target ancestor", async () => {
    const result = await quarantinePaths(repo, [source], { cacheRoot, journalId: "restore" });
    await rm(join(cacheRoot, "repo"), { recursive: true });
    const outside = join(base, "outside");
    await mkdir(outside);
    await symlink(outside, join(cacheRoot, "repo"));
    const restored = await restoreQuarantine(repo, "restore", { cacheRoot });
    expect(restored.restored).toEqual([]);
    expect(existsSync(join(outside, "go-build"))).toBe(false);
    expect(existsSync(join(result.quarantineDir, "go-build", "keep"))).toBe(true);
  });

  it.each(["missing", "wrong-id", "future", "bad-entry"])("never purges a %s manifest", async (kind) => {
    const dir = join(cacheRoot, "_quarantine", "journal");
    await mkdir(join(dir, "keep"), { recursive: true, mode: 0o700 });
    const manifest = {
      v: 1,
      journalId: kind === "wrong-id" ? "other" : "journal",
      ts: kind === "future" ? "2999-01-01T00:00:00.000Z" : "2020-01-01T00:00:00.000Z",
      repoRoot: repo,
      entries: kind === "bad-entry" ? [null] : [{ original: source, quarantined: join(dir, "keep"), basename: "go-build", bytes: 0 }],
    };
    if (kind !== "missing") await writeFile(join(dir, "manifest.json"), JSON.stringify(manifest), { mode: 0o600 });
    const result = await purgeQuarantine({ cacheRoot, olderThanDays: 0, apply: true });
    expect(result.purged).toEqual([]);
    expect(existsSync(join(dir, "keep"))).toBe(true);
  });

  it("rejects an altered repository identity without restoring", async () => {
    const result = await quarantinePaths(repo, [source], { cacheRoot, journalId: "identity" });
    const path = join(result.quarantineDir, "manifest.json");
    const manifest = JSON.parse(await readFile(path, "utf-8"));
    manifest.repoRoot = join(base, "foreign");
    await writeFile(path, JSON.stringify(manifest));
    expect((await restoreQuarantine(repo, "identity", { cacheRoot })).restored).toEqual([]);
    expect(existsSync(source)).toBe(false);
  });

  it("keeps worktree-local reclaim recoverable without the append-only journal", async () => {
    const target = join(repo, "node_modules");
    await mkdir(target);
    await writeFile(join(target, "keep"), "local cache");
    const result = await quarantinePaths(repo, [target], { worktreeRoot: repo, journalId: "local" });
    expect(result.moved).toHaveLength(1);
    const state = await repoStateDir(repo);
    await rm(join(state, "journal.jsonl"), { force: true });
    const context = { workspacePath: repo } as CommandContext;
    const planned = await worktreeGcCommand({ undo: "local" }, context) as WorktreeGcOutcome;
    expect(planned.applied).toBe(false);
    expect(planned.restore?.planned).toEqual([target]);
    expect(existsSync(target)).toBe(false);
    const restored = await worktreeGcCommand({ undo: "local", yes: true }, context) as WorktreeGcOutcome;
    expect(restored.applied).toBe(true);
    expect(await readFile(join(target, "keep"), "utf-8")).toBe("local cache");
  });

  it("plans and explicitly purges validated local quarantine, never other metadata", async () => {
    const target = join(repo, "node_modules");
    await mkdir(target);
    const result = await quarantinePaths(repo, [target], { worktreeRoot: repo, journalId: "local-purge" });
    const path = join(result.quarantineDir, "manifest.json");
    const manifest = JSON.parse(await readFile(path, "utf-8"));
    manifest.ts = "2020-01-01T00:00:00.000Z";
    await writeFile(path, JSON.stringify(manifest));
    const { utimes } = await import("node:fs/promises");
    await utimes(result.quarantineDir, new Date(manifest.ts), new Date(manifest.ts));
    const dry = await purgeQuarantine({ worktreeRoot: repo, repoRoot: repo, olderThanDays: 14, apply: false });
    expect(dry.purged).toEqual([result.quarantineDir]);
    expect(existsSync(result.quarantineDir)).toBe(true);
    const applied = await purgeQuarantine({ worktreeRoot: repo, repoRoot: repo, olderThanDays: 14, apply: true });
    expect(applied.purged).toEqual([result.quarantineDir]);
    expect(existsSync(join(await repoStateDir(repo), "journal.jsonl"))).toBe(true);
  });

  it("refuses reclaim through any symlinked ancestor inside a worktree", async () => {
    const external = join(base, "external");
    await mkdir(join(external, "cache"), { recursive: true });
    await symlink(external, join(repo, "linked"));
    const result = await quarantinePaths(repo, [join(repo, "linked", "cache")], { worktreeRoot: repo });
    expect(result.moved).toEqual([]);
    expect(existsSync(join(external, "cache"))).toBe(true);
  });
});
