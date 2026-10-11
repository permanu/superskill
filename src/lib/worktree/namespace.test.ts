// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import {
  markerTargetMissing,
  migrateLegacyNamespace,
  namespaceUpkeep,
  readWorktreeMarkers,
  recordWorktreeMarker,
} from "./namespace.js";
import { hashId, normalizeRemote, resolveRepoIdentity, worktreeKey } from "./paths.js";

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

describe("worktree markers", () => {
  let base: string;
  let cacheNs: string;

  beforeEach(async () => {
    base = await mkdtemp(join(tmpdir(), "worktree-namespace-"));
    cacheNs = join(base, "cache", "repo-id");
  });

  afterEach(async () => {
    await rm(base, { recursive: true, force: true });
  });

  it("records a marker with the resolved worktree path and refreshes it", async () => {
    const worktree = join(base, "wt");
    await mkdir(worktree, { recursive: true });
    await recordWorktreeMarker(cacheNs, "key1", worktree);
    const marker = join(cacheNs, ".worktrees", "key1");
    expect(await readFile(marker, "utf-8")).toBe(`${worktree}\n`);

    const before = await stat(marker);
    await recordWorktreeMarker(cacheNs, "key1", worktree);
    const after = await stat(marker);
    expect(after.mtimeMs).toBe(before.mtimeMs);
  });

  it("reads markers back and ignores missing dirs", async () => {
    expect((await readWorktreeMarkers(cacheNs)).size).toBe(0);
    const worktree = join(base, "wt");
    await mkdir(worktree, { recursive: true });
    await recordWorktreeMarker(cacheNs, "key1", worktree);
    await recordWorktreeMarker(cacheNs, "key2", worktree);
    const markers = await readWorktreeMarkers(cacheNs);
    expect(markers.get("key1")).toBe(worktree);
    expect(markers.get("key2")).toBe(worktree);
  });

  it("detects missing marker targets only for absent paths", async () => {
    expect(await markerTargetMissing(join(base, "does-not-exist"))).toBe(true);
    expect(await markerTargetMissing(base)).toBe(false);
  });
});

describe("migrateLegacyNamespace", () => {
  let base: string;
  let cacheRoot: string;

  beforeEach(async () => {
    base = await mkdtemp(join(tmpdir(), "worktree-migrate-"));
    cacheRoot = join(base, "cache");
  });

  afterEach(async () => {
    await rm(base, { recursive: true, force: true });
  });

  it("is a no-op without a legacy id", async () => {
    const result = await migrateLegacyNamespace(
      { repoId: "new", legacyRepoId: null },
      { cacheRoot },
    );
    expect(result.migrated).toBe(false);
    expect(result.note).toBeNull();
  });

  it("renames the legacy namespace into the shared one", async () => {
    const legacyDir = join(cacheRoot, "legacy");
    await mkdir(join(legacyDir, "go-build"), { recursive: true });
    await writeFile(join(legacyDir, "go-build", "artifact"), "x");

    const result = await migrateLegacyNamespace(
      { repoId: "shared", legacyRepoId: "legacy" },
      { cacheRoot },
    );
    expect(result.migrated).toBe(true);
    expect(result.note).toContain("legacy");
    expect(existsSync(join(cacheRoot, "shared", "go-build", "artifact"))).toBe(true);
    expect(existsSync(legacyDir)).toBe(false);
  });

  it("reports without renaming in dry-run", async () => {
    await mkdir(join(cacheRoot, "legacy"), { recursive: true });
    const result = await migrateLegacyNamespace(
      { repoId: "shared", legacyRepoId: "legacy" },
      { cacheRoot, dryRun: true },
    );
    expect(result.migrated).toBe(false);
    expect(result.note).toContain("would migrate");
    expect(existsSync(join(cacheRoot, "legacy"))).toBe(true);
  });

  it("keeps the legacy namespace when the target already exists", async () => {
    await mkdir(join(cacheRoot, "legacy"), { recursive: true });
    await mkdir(join(cacheRoot, "shared"), { recursive: true });
    const result = await migrateLegacyNamespace(
      { repoId: "shared", legacyRepoId: "legacy" },
      { cacheRoot },
    );
    expect(result.migrated).toBe(false);
    expect(result.note).toContain("already exists");
    expect(existsSync(join(cacheRoot, "legacy"))).toBe(true);
  });
});

describe("namespaceUpkeep", () => {
  let base: string;
  let cacheRoot: string;

  beforeEach(async () => {
    base = await mkdtemp(join(tmpdir(), "worktree-upkeep-"));
    cacheRoot = join(base, "cache");
  });

  afterEach(async () => {
    await rm(base, { recursive: true, force: true });
  });

  async function initOrigin(): Promise<string> {
    const origin = join(base, "origin");
    await mkdir(origin, { recursive: true });
    await git(origin, ["init", "-q", "-b", "main"]);
    await git(origin, ["commit", "-q", "--allow-empty", "-m", "init"]);
    await git(origin, ["remote", "add", "origin", "https://github.com/Owner/Repo.git"]);
    return origin;
  }

  it("migrates the legacy namespace and records a marker for a path-clone", async () => {
    const origin = await initOrigin();
    const clone = join(base, "clone");
    await git(base, ["clone", "-q", origin, clone]);

    const identity = await resolveRepoIdentity(clone);
    expect(identity.legacyRepoId).not.toBeNull();
    const legacyDir = join(cacheRoot, identity.legacyRepoId!);
    await mkdir(join(legacyDir, "go-build"), { recursive: true });
    await writeFile(join(legacyDir, "go-build", "artifact"), "x");

    const result = await namespaceUpkeep(clone, { cacheRoot });
    expect(result.migrated).toBe(true);
    expect(existsSync(join(cacheRoot, identity.repoId, "go-build", "artifact"))).toBe(true);
    expect(existsSync(legacyDir)).toBe(false);

    const marker = join(cacheRoot, identity.repoId, ".worktrees", worktreeKey(clone));
    expect(await readFile(marker, "utf-8")).toBe(`${clone}\n`);
  });

  it("only records a marker when there is nothing to migrate", async () => {
    const origin = await initOrigin();
    const result = await namespaceUpkeep(origin, { cacheRoot });
    expect(result.migrated).toBe(false);
    const identity = await resolveRepoIdentity(origin);
    const marker = join(cacheRoot, identity.repoId, ".worktrees", worktreeKey(origin));
    expect(existsSync(marker)).toBe(true);
  });

  it("reports the pending migration in dry-run without writing anything", async () => {
    const origin = await initOrigin();
    const clone = join(base, "clone");
    await git(base, ["clone", "-q", origin, clone]);
    const identity = await resolveRepoIdentity(clone);
    await mkdir(join(cacheRoot, identity.legacyRepoId!), { recursive: true });

    const result = await namespaceUpkeep(clone, { cacheRoot, dryRun: true });
    expect(result.migrated).toBe(false);
    expect(result.notes.some((note) => note.includes("would migrate"))).toBe(true);
    expect(existsSync(join(cacheRoot, identity.legacyRepoId!))).toBe(true);
    expect(existsSync(join(cacheRoot, identity.repoId))).toBe(false);
  });

  it("never throws on a repoless directory", async () => {
    const plain = join(base, "plain");
    await mkdir(plain, { recursive: true });
    const result = await namespaceUpkeep(plain, { cacheRoot });
    expect(result.migrated).toBe(false);
    const identity = await resolveRepoIdentity(plain);
    expect(identity.legacyRepoId).toBeNull();
  });

  it("exposes the legacy id as the pre-fix path hash", async () => {
    const origin = await initOrigin();
    const clone = join(base, "clone");
    await git(base, ["clone", "-q", origin, clone]);
    const identity = await resolveRepoIdentity(clone);
    expect(identity.legacyRepoId).toBe(hashId(normalizeRemote(origin)));
  });
});
