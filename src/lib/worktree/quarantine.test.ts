import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, symlink, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import {
  assertSafePurgePath,
  duBytes,
  purgeQuarantine,
  quarantinePaths,
  restoreQuarantine,
} from "./quarantine.js";
import { readJournal } from "./state.js";

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

const DAY_MS = 24 * 60 * 60 * 1000;

async function backdate(path: string, days: number): Promise<void> {
  const when = new Date(Date.now() - days * DAY_MS);
  await utimes(path, when, when);
}

describe("worktree quarantine", () => {
  let base: string;
  let cacheRoot: string;
  let repo: string;

  beforeEach(async () => {
    base = await mkdtemp(join(tmpdir(), "worktree-quarantine-"));
    cacheRoot = join(base, "cache");
    repo = join(base, "repo");
    await mkdir(join(cacheRoot, "repo-a", "go-build"), { recursive: true });
    await writeFile(join(cacheRoot, "repo-a", "go-build", "pkg.bin"), "x".repeat(4096));
    await mkdir(repo, { recursive: true });
    await git(repo, ["init", "-q", "-b", "main"]);
  });

  afterEach(async () => {
    await rm(base, { recursive: true, force: true });
  });

  describe("quarantinePaths", () => {
    it("moves a cache dir into _quarantine and records a manifest + journal", async () => {
      const target = join(cacheRoot, "repo-a", "go-build");
      const result = await quarantinePaths(repo, [target], { cacheRoot, journalId: "q-1" });

      expect(result.moved.length).toBe(1);
      expect(result.moved[0].from).toBe(target);
      expect(result.moved[0].bytes).toBeGreaterThan(0);
      expect(result.skipped).toEqual([]);
      expect(existsSync(target)).toBe(false);
      expect(result.quarantineDir).toBe(join(cacheRoot, "_quarantine", "q-1"));

      const manifest = JSON.parse(
        await readFile(join(result.quarantineDir, "manifest.json"), "utf-8"),
      ) as { journalId: string; entries: Array<{ original: string; bytes: number }> };
      expect(manifest.journalId).toBe("q-1");
      expect(manifest.entries[0].original).toBe(target);
      expect(manifest.entries[0].bytes).toBeGreaterThan(0);

      const journal = await readJournal(repo);
      const entry = journal.find((candidate) => candidate.id === "q-1");
      expect(entry?.action).toBe("quarantine");
      expect(entry?.paths).toEqual([target]);
    });

    it("preserves basenames and suffixes collisions", async () => {
      await mkdir(join(cacheRoot, "repo-b", "go-build"), { recursive: true });
      const first = join(cacheRoot, "repo-a", "go-build");
      const second = join(cacheRoot, "repo-b", "go-build");

      const result = await quarantinePaths(repo, [first, second], { cacheRoot, journalId: "q-2" });
      expect(result.moved.length).toBe(2);
      expect(result.moved[0].to.endsWith("/go-build")).toBe(true);
      expect(result.moved[1].to.endsWith("/go-build-2")).toBe(true);
    });

    it("writes the manifest up front and restores around entries that vanish", async () => {
      await mkdir(join(cacheRoot, "repo-b", "go-build"), { recursive: true });
      const first = join(cacheRoot, "repo-a", "go-build");
      const second = join(cacheRoot, "repo-b", "go-build");

      const result = await quarantinePaths(repo, [first, second], { cacheRoot, journalId: "m-1" });
      expect(result.moved).toHaveLength(2);

      const manifest = JSON.parse(
        await readFile(join(result.quarantineDir, "manifest.json"), "utf-8"),
      ) as { entries: Array<{ original: string; quarantined: string }> };
      expect(manifest.entries.map((entry) => entry.original)).toEqual([first, second]);
      for (const entry of manifest.entries) {
        expect(existsSync(entry.quarantined)).toBe(true);
      }

      await rm(manifest.entries[0].quarantined, { recursive: true, force: true });
      const restore = await restoreQuarantine(repo, "m-1", { cacheRoot });

      expect(restore.restored).toEqual([second]);
      expect(restore.skipped).toEqual([{ path: first, reason: "quarantined entry missing" }]);
    });

    it("never quarantines anything outside the cache root", async () => {
      const outside = join(base, "outside");
      await mkdir(outside);
      await writeFile(join(outside, "work.txt"), "important user work\n");

      const result = await quarantinePaths(repo, [outside], { cacheRoot, journalId: "q-3" });

      expect(result.moved).toEqual([]);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toContain("outside cache root");
      expect(existsSync(join(outside, "work.txt"))).toBe(true);
    });

    it("skips symlinks and missing paths without touching them", async () => {
      const target = join(cacheRoot, "repo-a", "go-build");
      const link = join(cacheRoot, "repo-a", "go-build-link");
      await symlink(target, link);

      const result = await quarantinePaths(repo, [link, join(cacheRoot, "repo-a", "nope")], {
        cacheRoot,
        journalId: "q-4",
      });

      expect(result.moved).toEqual([]);
      expect(result.skipped.map((entry) => entry.reason)).toEqual(["symlink", "does not exist"]);
      expect(existsSync(link)).toBe(true);
      expect(existsSync(target)).toBe(true);
    });

    it("refuses to quarantine the quarantine root", async () => {
      await mkdir(join(cacheRoot, "_quarantine"), { recursive: true });
      const result = await quarantinePaths(repo, [join(cacheRoot, "_quarantine")], {
        cacheRoot,
        journalId: "q-5",
      });
      expect(result.moved).toEqual([]);
      expect(result.skipped[0].reason).toContain("quarantine");
    });

    it("rejects unsafe journal ids before moving anything", async () => {
      const target = join(cacheRoot, "repo-a", "go-build");
      await expect(
        quarantinePaths(repo, [target], { cacheRoot, journalId: "../../escape" }),
      ).rejects.toThrow(/unsafe/);
      expect(existsSync(target)).toBe(true);
    });

    it("refuses to quarantine through a symlinked _quarantine dir", async () => {
      const external = join(base, "external-quarantine");
      await mkdir(external, { recursive: true });
      await symlink(external, join(cacheRoot, "_quarantine"));
      const target = join(cacheRoot, "repo-a", "go-build");

      const result = await quarantinePaths(repo, [target], { cacheRoot, journalId: "q-link" });

      expect(result.moved).toEqual([]);
      expect(result.skipped[0].reason).toContain("quarantine root escapes");
      expect(existsSync(target)).toBe(true);
      expect(existsSync(join(external, "q-link"))).toBe(false);
    });

    it("refuses sources that resolve outside the cache root through a symlinked namespace", async () => {
      const external = join(base, "external-ns");
      await mkdir(join(external, "go-build"), { recursive: true });
      await writeFile(join(external, "go-build", "pkg.bin"), "x".repeat(128));
      await symlink(external, join(cacheRoot, "repo-link"));

      const source = join(cacheRoot, "repo-link", "go-build");
      const result = await quarantinePaths(repo, [source], { cacheRoot, journalId: "q-ns" });

      expect(result.moved).toEqual([]);
      expect(result.skipped[0].reason).toContain("resolves outside cache root");
      expect(existsSync(join(external, "go-build", "pkg.bin"))).toBe(true);
    });

    it("reports non-ENOENT lstat failures with the errno", async () => {
      const file = join(cacheRoot, "repo-a", "plain-file");
      await writeFile(file, "x");

      const result = await quarantinePaths(repo, [join(file, "child")], {
        cacheRoot,
        journalId: "q-lstat",
      });

      expect(result.moved).toEqual([]);
      expect(result.skipped[0].reason).toBe("lstat failed: ENOTDIR");
    });
  });

  describe("restoreQuarantine", () => {
    it("renames quarantined paths back to their original locations", async () => {
      const target = join(cacheRoot, "repo-a", "go-build");
      await quarantinePaths(repo, [target], { cacheRoot, journalId: "r-1" });

      const result = await restoreQuarantine(repo, "r-1", { cacheRoot });

      expect(result.restored).toEqual([target]);
      expect(result.skipped).toEqual([]);
      expect(existsSync(join(target, "pkg.bin"))).toBe(true);
      expect(existsSync(join(cacheRoot, "_quarantine", "r-1", "go-build"))).toBe(false);
      const journal = await readJournal(repo);
      expect(journal.some((entry) => entry.action === "restore" && entry.paths.includes(target))).toBe(true);
    });

    it("fails safe when the restore target already exists", async () => {
      const target = join(cacheRoot, "repo-a", "go-build");
      await quarantinePaths(repo, [target], { cacheRoot, journalId: "r-2" });
      await mkdir(target, { recursive: true });
      await writeFile(join(target, "user-file.txt"), "user work\n");

      const result = await restoreQuarantine(repo, "r-2", { cacheRoot });

      expect(result.restored).toEqual([]);
      expect(result.skipped[0].reason).toBe("target already exists");
      expect(existsSync(join(target, "user-file.txt"))).toBe(true);
      expect(existsSync(join(cacheRoot, "_quarantine", "r-2", "go-build"))).toBe(true);
    });

    it("reports a missing manifest instead of throwing", async () => {
      const result = await restoreQuarantine(repo, "does-not-exist", { cacheRoot });
      expect(result.restored).toEqual([]);
      expect(result.skipped[0].reason).toContain("manifest");
    });

    it("rejects unsafe journal ids without reading outside the cache root", async () => {
      const result = await restoreQuarantine(repo, "../../escape", { cacheRoot });
      expect(result.restored).toEqual([]);
      expect(result.skipped[0].reason).toBe("invalid journal id");
    });

    it("rejects malformed manifests and entries that escape their bounds", async () => {
      const quarantine = join(cacheRoot, "_quarantine");
      await mkdir(join(quarantine, "bad-json"), { recursive: true });
      await writeFile(join(quarantine, "bad-json", "manifest.json"), "{ not json");
      const badJson = await restoreQuarantine(repo, "bad-json", { cacheRoot });
      expect(badJson.restored).toEqual([]);
      expect(badJson.skipped[0].reason).toContain("manifest");

      await mkdir(join(quarantine, "bad-shape"), { recursive: true });
      await writeFile(join(quarantine, "bad-shape", "manifest.json"), JSON.stringify({ v: 1, entries: "nope" }));
      const badShape = await restoreQuarantine(repo, "bad-shape", { cacheRoot });
      expect(badShape.skipped[0].reason).toContain("manifest");

      const manifest = (entries: Array<Record<string, unknown>>): string =>
        JSON.stringify({
          v: 1,
          journalId: "manifest-bounds",
          ts: new Date().toISOString(),
          repoRoot: repo,
          entries,
        });

      await mkdir(join(quarantine, "manifest-bounds"), { recursive: true });
      await writeFile(
        join(quarantine, "manifest-bounds", "manifest.json"),
        manifest([
          {
            original: join(base, "outside-original"),
            quarantined: join(quarantine, "manifest-bounds", "outside-original"),
            basename: "outside-original",
            bytes: 1,
          },
          {
            original: join(cacheRoot, "repo-a", "escaped"),
            quarantined: join(base, "outside-quarantine"),
            basename: "escaped",
            bytes: 1,
          },
        ]),
      );

      const bounds = await restoreQuarantine(repo, "manifest-bounds", { cacheRoot });
      expect(bounds.restored).toEqual([]);
      const reasons = bounds.skipped.map((entry) => entry.reason);
      expect(reasons.some((reason) => reason.includes("outside cache root"))).toBe(true);
      expect(reasons).toContain("manifest entry escapes the quarantine dir");
    });

    it("uses the platform cache root when no explicit root is given", async () => {
      const previous = process.env.SUPERSKILL_CACHE_ROOT;
      const envRoot = join(base, "env-cache");
      process.env.SUPERSKILL_CACHE_ROOT = envRoot;
      try {
        const result = await restoreQuarantine(repo, "missing-journal");
        expect(result.restored).toEqual([]);
        expect(result.skipped[0].path).toBe(join(envRoot, "_quarantine", "missing-journal"));
      } finally {
        if (previous === undefined) delete process.env.SUPERSKILL_CACHE_ROOT;
        else process.env.SUPERSKILL_CACHE_ROOT = previous;
      }
    });
  });

  describe("purgeQuarantine", () => {
    it("apply=false only plans and changes nothing", async () => {
      const target = join(cacheRoot, "repo-a", "go-build");
      await quarantinePaths(repo, [target], { cacheRoot, journalId: "p-1" });
      const quarantineDir = join(cacheRoot, "_quarantine", "p-1");
      await backdate(quarantineDir, 30);

      const result = await purgeQuarantine({ cacheRoot, olderThanDays: 14, apply: false });

      expect(result.purged).toContain(quarantineDir);
      expect(result.bytes).toBeGreaterThan(0);
      expect(existsSync(quarantineDir)).toBe(true);
    });

    it("frees a backdated quarantine dir on apply", async () => {
      const target = join(cacheRoot, "repo-a", "go-build");
      await quarantinePaths(repo, [target], { cacheRoot, journalId: "p-2" });
      const quarantineDir = join(cacheRoot, "_quarantine", "p-2");
      await backdate(quarantineDir, 30);

      const result = await purgeQuarantine({
        cacheRoot,
        olderThanDays: 14,
        apply: true,
        repoRoot: repo,
      });

      expect(result.purged).toEqual([quarantineDir]);
      expect(result.bytes).toBeGreaterThan(0);
      expect(existsSync(quarantineDir)).toBe(false);
      const journal = await readJournal(repo);
      expect(journal.some((entry) => entry.action === "purge")).toBe(true);
    });

    it("keeps quarantine dirs younger than the age gate", async () => {
      const target = join(cacheRoot, "repo-a", "go-build");
      const quarantineResult = await quarantinePaths(repo, [target], { cacheRoot, journalId: "p-3" });
      const quarantineDir = quarantineResult.quarantineDir;

      const result = await purgeQuarantine({ cacheRoot, olderThanDays: 14, apply: true });

      expect(result.purged).toEqual([]);
      expect(result.skipped[0].reason).toContain("too young");
      expect(existsSync(quarantineDir)).toBe(true);
    });

    it("never purges anything outside _quarantine", async () => {
      const keep = join(cacheRoot, "repo-a", "go-build");
      const result = await purgeQuarantine({ cacheRoot, olderThanDays: 0, apply: true });

      expect(result.purged).toEqual([]);
      expect(existsSync(keep)).toBe(true);
    });

    it("refuses to purge through a symlinked _quarantine dir", async () => {
      const external = join(base, "external-quarantine");
      await mkdir(join(external, "victim"), { recursive: true });
      await writeFile(join(external, "victim", "keep.txt"), "keep me\n");
      await symlink(external, join(cacheRoot, "_quarantine"));
      await backdate(join(external, "victim"), 30);

      const result = await purgeQuarantine({
        cacheRoot,
        olderThanDays: 14,
        apply: true,
        repoRoot: repo,
      });

      expect(result.purged).toEqual([]);
      expect(result.skipped.some((entry) => entry.reason.includes("purge safety"))).toBe(true);
      expect(existsSync(join(external, "victim", "keep.txt"))).toBe(true);
    });

    it("purges only the requested journal when an id is given", async () => {
      await mkdir(join(cacheRoot, "repo-a", "go-build"), { recursive: true });
      await mkdir(join(cacheRoot, "repo-a", "sccache"), { recursive: true });
      await quarantinePaths(repo, [join(cacheRoot, "repo-a", "go-build")], {
        cacheRoot,
        journalId: "p-4",
      });
      await quarantinePaths(repo, [join(cacheRoot, "repo-a", "sccache")], {
        cacheRoot,
        journalId: "p-5",
      });
      await backdate(join(cacheRoot, "_quarantine", "p-4"), 30);
      await backdate(join(cacheRoot, "_quarantine", "p-5"), 30);

      const result = await purgeQuarantine({ cacheRoot, olderThanDays: 14, apply: true, journalId: "p-4" });

      expect(result.purged).toEqual([join(cacheRoot, "_quarantine", "p-4")]);
      expect(existsSync(join(cacheRoot, "_quarantine", "p-5"))).toBe(true);
    });

    it("rejects unsafe ids, missing journals, reserved paths, and non-directories", async () => {
      const cache = join(base, "purge-edge");
      await mkdir(join(cache, "_quarantine", "_reserved"), { recursive: true });
      await writeFile(join(cache, "_quarantine", "plain-file"), "x");

      const invalid = await purgeQuarantine({
        cacheRoot: cache,
        olderThanDays: 0,
        apply: true,
        journalId: "../../evil",
      });
      expect(invalid.purged).toEqual([]);
      expect(invalid.skipped[0].reason).toBe("invalid journal id");

      const missing = await purgeQuarantine({
        cacheRoot: cache,
        olderThanDays: 0,
        apply: true,
        journalId: "nope",
      });
      expect(missing.purged).toEqual([]);
      expect(missing.skipped[0].reason).toBe("journal not found");

      const all = await purgeQuarantine({ cacheRoot: cache, olderThanDays: 0, apply: false });
      expect(all.purged).toEqual([]);
      const reasons = all.skipped.map((entry) => entry.reason);
      expect(reasons).toContain("reserved path");
      expect(reasons).toContain("not a directory");
    });

    it("returns an empty result when the quarantine root cannot be listed", async () => {
      const cache = join(base, "purge-file-root");
      await mkdir(cache, { recursive: true });
      await writeFile(join(cache, "_quarantine"), "not a directory");

      const result = await purgeQuarantine({ cacheRoot: cache, olderThanDays: 0, apply: true });
      expect(result.purged).toEqual([]);
      expect(result.skipped).toEqual([]);
      expect(result.bytes).toBe(0);
    });
  });

  describe("assertSafePurgePath", () => {
    it("accepts only real journal dirs inside _quarantine", async () => {
      const cache = join(base, "guard-cache");
      const quarantine = join(cache, "_quarantine", "2026-01-02T03-04-05.678Z");
      await mkdir(quarantine, { recursive: true });
      await mkdir(join(cache, "_quarantine", "custom-id"), { recursive: true });

      expect(await assertSafePurgePath(quarantine, cache)).toBe(true);
      expect(await assertSafePurgePath(join(cache, "_quarantine", "custom-id"), cache, "custom-id")).toBe(true);
      expect(await assertSafePurgePath(join(cache, "repo-a"), cache)).toBe(false);
      expect(await assertSafePurgePath(join(cache, "_quarantine", "custom-id"), cache, "other-id")).toBe(false);
      expect(await assertSafePurgePath(join(cache, "_quarantine", "_purged"), cache)).toBe(false);
      expect(await assertSafePurgePath(join(cache, "_quarantine", "missing-id"), cache)).toBe(false);
      expect(await assertSafePurgePath(join(base, "escape"), cache)).toBe(false);
    });

    it("refuses symlinked journals and a symlinked _quarantine root", async () => {
      const cache = join(base, "guard-cache-2");
      await mkdir(join(cache, "_quarantine", "real-id"), { recursive: true });
      const external = join(base, "guard-external");
      await mkdir(join(external, "victim"), { recursive: true });
      await symlink(external, join(cache, "_quarantine", "link-id"));

      expect(await assertSafePurgePath(join(cache, "_quarantine", "real-id"), cache)).toBe(true);
      expect(await assertSafePurgePath(join(cache, "_quarantine", "link-id"), cache)).toBe(false);

      const symlinkedCache = join(base, "guard-cache-3");
      await mkdir(symlinkedCache, { recursive: true });
      await symlink(external, join(symlinkedCache, "_quarantine"));
      expect(
        await assertSafePurgePath(join(symlinkedCache, "_quarantine", "victim"), symlinkedCache),
      ).toBe(false);
    });
  });

  describe("duBytes", () => {
    it("reports bytes for a directory and null for a missing path", async () => {
      const bytes = await duBytes(join(cacheRoot, "repo-a", "go-build"));
      expect(bytes).toBeGreaterThan(0);
      expect(await duBytes(join(cacheRoot, "nope"))).toBeNull();
    });
  });
});
