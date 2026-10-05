import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { promisify } from "node:util";
import type { CommandContext } from "../../core/types.js";
import {
  formatBytes,
  parseDuration,
  parseSize,
  renderWorktreeGc,
  worktreeGcCommand,
  type WorktreeGcOutcome,
} from "../../commands/worktree/gc.js";
import {
  AUTO_MIN_AGE_DAYS,
  filterCandidates,
  resolveProjectLabels,
  resolveWorktreeFilter,
  runGc,
  runToolPrune,
  scanCacheRoot,
  type GcCandidate,
  type GcPlan,
} from "./gc.js";
import { resolveRepoIdentity } from "./paths.js";
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

const DAY_MS = 24 * 60 * 60 * 1000;

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd, env: GIT_ENV, timeout: 15000 });
  return stdout;
}

async function initRepo(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
  await git(path, ["init", "-q", "-b", "main"]);
}

async function backdate(path: string, days: number): Promise<void> {
  const when = new Date(Date.now() - days * DAY_MS);
  await utimes(path, when, when);
}

async function backdateTree(path: string, days: number): Promise<void> {
  await backdate(path, days);
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    await backdate(child, days);
    if (entry.isDirectory()) await backdateTree(child, days);
  }
}

function candidate(overrides: Partial<GcCandidate> = {}): GcCandidate {
  return {
    path: "/fake/cache/repo-a/go-build",
    repoId: "repo-a",
    tool: "go",
    bytes: 1024,
    ageDays: 40,
    tier: "auto",
    ...overrides,
  };
}

describe("worktree gc", () => {
  let base: string;
  let cacheRoot: string;
  let repo: string;

  beforeEach(async () => {
    base = await mkdtemp(join(tmpdir(), "worktree-gc-"));
    cacheRoot = join(base, "cache");
    repo = join(base, "repo");
    await initRepo(repo);
    await mkdir(join(cacheRoot, "repo-a", "go-build"), { recursive: true });
    await writeFile(join(cacheRoot, "repo-a", "go-build", "pkg.bin"), "g".repeat(4096));
    await mkdir(join(cacheRoot, "repo-a", "sccache"), { recursive: true });
    await writeFile(join(cacheRoot, "repo-a", "sccache", "obj"), "s".repeat(2048));
    await mkdir(join(cacheRoot, "repo-a", "node-modules"), { recursive: true });
    await writeFile(join(cacheRoot, "repo-a", "node-modules", "pkg.js"), "n".repeat(512));
    await mkdir(join(cacheRoot, "repo-a", "mystery"), { recursive: true });
    await writeFile(join(cacheRoot, "repo-a", "mystery", "blob"), "m".repeat(256));
    await mkdir(join(cacheRoot, "repo-a", "cargo-build", "hash1"), { recursive: true });
    await writeFile(join(cacheRoot, "repo-a", "cargo-build", "hash1", "out"), "c".repeat(128));
    await mkdir(join(cacheRoot, "repo-a", "_quarantine", "old-journal"), { recursive: true });
    await writeFile(join(cacheRoot, "repo-a", "_quarantine", "old-journal", "data"), "q".repeat(64));
    await mkdir(join(cacheRoot, "repo-b", "bundle-cache"), { recursive: true });
    await writeFile(join(cacheRoot, "repo-b", "bundle-cache", "gem"), "r".repeat(64));
  });

  afterEach(async () => {
    await rm(base, { recursive: true, force: true });
  });

  describe("scanCacheRoot", () => {
    it("infers deterministic tools and tiers and skips _quarantine", async () => {
      const candidates = await scanCacheRoot({ cacheRoot });
      const relative = candidates.map((entry) => entry.path.slice(cacheRoot.length + 1));

      expect(relative.sort()).toEqual(
        [
          "repo-a/cargo-build",
          "repo-a/cargo-build/hash1",
          "repo-a/go-build",
          "repo-a/mystery",
          "repo-a/node-modules",
          "repo-a/sccache",
          "repo-b/bundle-cache",
        ].sort(),
      );
      expect(relative.some((entry) => entry.includes("_quarantine"))).toBe(false);

      const byPath = new Map(candidates.map((entry) => [entry.path.slice(cacheRoot.length + 1), entry]));
      expect(byPath.get("repo-a/go-build")).toMatchObject({ repoId: "repo-a", tool: "go", tier: "auto" });
      expect(byPath.get("repo-a/sccache")).toMatchObject({ tool: "rust", tier: "auto" });
      expect(byPath.get("repo-a/node-modules")).toMatchObject({ tool: "node", tier: "consent" });
      expect(byPath.get("repo-a/mystery")).toMatchObject({ tool: "unknown", tier: "consent" });
      expect(byPath.get("repo-a/cargo-build")).toMatchObject({ tool: "rust", tier: "consent" });
      expect(byPath.get("repo-a/cargo-build/hash1")).toMatchObject({ tool: "rust", tier: "consent" });
      expect(byPath.get("repo-a/go-build")?.bytes).toBeGreaterThan(0);
      expect(byPath.get("repo-a/go-build")?.ageDays).toBeGreaterThanOrEqual(0);
    });

    it("scopes the scan to a single repo id", async () => {
      const candidates = await scanCacheRoot({ cacheRoot, repoId: "repo-b" });
      expect(candidates).toHaveLength(1);
      expect(candidates[0].path).toBe(join(cacheRoot, "repo-b", "bundle-cache"));
    });

    it("returns an empty list for a missing cache root", async () => {
      expect(await scanCacheRoot({ cacheRoot: join(base, "nope") })).toEqual([]);
    });

    it("tolerates a file where the cache root or a repo dir is expected", async () => {
      const asFile = join(base, "cache-file");
      await writeFile(asFile, "not a directory");
      expect(await scanCacheRoot({ cacheRoot: asFile })).toEqual([]);

      await writeFile(join(cacheRoot, "file-repo"), "not a directory");
      expect(await scanCacheRoot({ cacheRoot, repoId: "file-repo" })).toEqual([]);
    });

    it("scans every repo when all is set even with a repoId", async () => {
      const candidates = await scanCacheRoot({ cacheRoot, repoId: "repo-a", all: true });
      expect(candidates.some((entry) => entry.repoId === "repo-b")).toBe(true);
      expect(candidates.some((entry) => entry.repoId === "repo-a")).toBe(true);
    });

    it("descends into nested dirs but skips hidden and file children", async () => {
      await mkdir(join(cacheRoot, "repo-a", "cargo-build", ".hidden"), { recursive: true });
      await writeFile(join(cacheRoot, "repo-a", "cargo-build", "file.txt"), "x");
      await mkdir(join(cacheRoot, "repo-a", "cargo-build", "go-build"), { recursive: true });
      await mkdir(join(cacheRoot, "repo-a", "empty-cache"), { recursive: true });

      const candidates = await scanCacheRoot({ cacheRoot, repoId: "repo-a" });
      const relative = candidates.map((entry) => entry.path.slice(cacheRoot.length + 1));

      expect(relative).not.toContain("repo-a/cargo-build/.hidden");
      expect(relative).not.toContain("repo-a/cargo-build/file.txt");
      expect(relative).toContain("repo-a/cargo-build/go-build");
      expect(candidates.find((entry) => entry.path.endsWith("cargo-build/go-build"))?.tool).toBe("go");
      expect(candidates.find((entry) => entry.path.endsWith("empty-cache"))?.ageDays).not.toBeNull();
    });
  });

  describe("filterCandidates", () => {
    it("auto-selects old auto-tier candidates by default", () => {
      const { selected, skipped } = filterCandidates([candidate()], {});
      expect(selected).toHaveLength(1);
      expect(skipped).toEqual([]);
      expect(AUTO_MIN_AGE_DAYS).toBe(30);
    });

    it("skips young and unknown-age auto candidates", () => {
      const young = filterCandidates([candidate({ ageDays: 20 })], {});
      expect(young.selected).toEqual([]);
      expect(young.skipped[0].reason).toContain(`>= ${AUTO_MIN_AGE_DAYS}d`);

      const unknown = filterCandidates([candidate({ ageDays: null })], {});
      expect(unknown.selected).toEqual([]);
      expect(unknown.skipped[0].reason).toBe("unknown age");
    });

    it("does not let newerThanDays bypass the auto-tier age floor", () => {
      const young = candidate({ ageDays: 10 });
      const narrowed = filterCandidates([young], { newerThanDays: 20 });
      expect(narrowed.selected).toEqual([]);
      expect(narrowed.skipped[0].reason).toContain(`>= ${AUTO_MIN_AGE_DAYS}d`);

      expect(filterCandidates([young], { olderThanDays: 5 }).selected).toHaveLength(1);

      const old = candidate({ ageDays: 40 });
      expect(filterCandidates([old], { newerThanDays: 20 }).selected).toEqual([]);
      expect(filterCandidates([old], { newerThanDays: 100 }).selected).toHaveLength(1);

      const consent = candidate({ tier: "consent", tool: "node", ageDays: 90 });
      expect(filterCandidates([consent], { newerThanDays: 120 }).selected).toEqual([]);
      expect(filterCandidates([consent], { olderThanDays: 30 }).selected).toHaveLength(1);
    });

    it("never auto-selects consent-tier candidates without an explicit tier or age filter", () => {
      const consent = candidate({
        path: "/fake/cache/repo-a/node-modules",
        tool: "node",
        tier: "consent",
        ageDays: 90,
      });
      expect(filterCandidates([consent], {}).selected).toEqual([]);
      expect(filterCandidates([consent], {}).skipped[0].reason).toContain("consent");
      expect(filterCandidates([consent], { tier: "consent" }).selected).toHaveLength(1);
      expect(filterCandidates([consent], { olderThanDays: 30 }).selected).toHaveLength(1);
    });

    it("honours explicit tier filters", () => {
      const auto = candidate();
      const consent = candidate({ tier: "consent", tool: "node" });
      expect(filterCandidates([auto], { tier: "consent" }).skipped[0].reason).toContain("auto tier");
      expect(filterCandidates([consent], { tier: "auto" }).skipped[0].reason).toContain("consent tier");
    });

    it("matches include and exclude patterns relative to the cache root", () => {
      const go = candidate();
      const node = candidate({
        path: "/fake/cache/repo-a/node-modules",
        tool: "node",
        tier: "consent",
      });

      const included = filterCandidates([go, node], { include: ["node-*"], olderThanDays: 10 });
      expect(included.selected.map((entry) => entry.tool)).toEqual(["node"]);

      const excluded = filterCandidates([go, node], { exclude: ["go-*"], olderThanDays: 10 });
      expect(excluded.selected.map((entry) => entry.tool)).toEqual(["node"]);
      expect(excluded.skipped.some((entry) => entry.reason.includes("excluded"))).toBe(true);
    });

    it("skips unknown sizes when a size filter is active", () => {
      const result = filterCandidates([candidate({ bytes: null })], { minBytes: 1 });
      expect(result.selected).toEqual([]);
      expect(result.skipped[0].reason).toBe("unknown size");
    });

    it("keeps the N most recent dirs per tool with keepLatest", () => {
      const older = candidate({ ageDays: 60, bytes: 30, path: "/fake/cache/repo-a/node-modules-c", tool: "node", tier: "consent" });
      const newest = candidate({ ageDays: 10, bytes: 20, path: "/fake/cache/repo-a/node-modules-b", tool: "node", tier: "consent" });
      const middle = candidate({ ageDays: 40, bytes: 10, path: "/fake/cache/repo-a/node-modules-a", tool: "node", tier: "consent" });

      const { selected, skipped } = filterCandidates([older, newest, middle], {
        tier: "consent",
        keepLatest: 1,
      });

      expect(selected.map((entry) => entry.path).sort()).toEqual([
        "/fake/cache/repo-a/node-modules-a",
        "/fake/cache/repo-a/node-modules-c",
      ]);
      expect(skipped.some((entry) => entry.candidate.path.endsWith("node-modules-b") && entry.reason.includes("keepLatest"))).toBe(true);
    });

    it("treats a pre-resolved project value as a repo id", () => {
      expect(filterCandidates([candidate()], { project: "repo-a" }).selected).toHaveLength(1);
      expect(filterCandidates([candidate()], { project: "other" }).selected).toEqual([]);
    });

    it("skips mismatched repo, tool, and max-size filters with reasons", () => {
      const wrongRepo = filterCandidates([candidate()], { repoId: "repo-b" });
      expect(wrongRepo.selected).toEqual([]);
      expect(wrongRepo.skipped[0].reason).toBe("repo repo-a does not match repo-b");

      const wrongTool = filterCandidates([candidate()], { tools: [" ", "node"], olderThanDays: 1 });
      expect(wrongTool.selected).toEqual([]);
      expect(wrongTool.skipped[0].reason).toBe("tool go not selected");

      const tooBig = filterCandidates([candidate({ bytes: 2048 })], { maxBytes: 1024, olderThanDays: 1 });
      expect(tooBig.selected).toEqual([]);
      expect(tooBig.skipped[0].reason).toBe("larger than 1024 bytes");

      const unknownSize = filterCandidates([candidate({ bytes: null })], { maxBytes: 1, olderThanDays: 1 });
      expect(unknownSize.skipped[0].reason).toBe("unknown size");
    });

    it("reports unknown age whenever an explicit age filter is set", () => {
      const older = filterCandidates([candidate({ ageDays: null })], { olderThanDays: 5 });
      expect(older.skipped[0].reason).toBe("unknown age");

      const newer = filterCandidates([candidate({ ageDays: null })], { newerThanDays: 5 });
      expect(newer.skipped[0].reason).toBe("unknown age");
    });

    it("matches exclude patterns against the full path when the repo id is absent", () => {
      const odd = candidate({ path: "/somewhere/else/go-build" });
      const result = filterCandidates([odd], { exclude: ["  ", "go-*"], olderThanDays: 1 });
      expect(result.selected).toEqual([]);
      expect(result.skipped[0].reason).toBe("excluded by pattern");
    });

    it("orders unknown ages last when keeping the newest candidates", () => {
      const unknown = candidate({ path: "/fake/cache/repo-a/node-modules-x", tool: "node", tier: "consent", ageDays: null });
      const known = candidate({ path: "/fake/cache/repo-a/node-modules-y", tool: "node", tier: "consent", ageDays: 5 });
      const { selected, skipped } = filterCandidates([unknown, known], { tier: "consent", keepLatest: 1 });

      expect(selected.map((entry) => entry.path)).toEqual([known.path]);
      expect(skipped.map((entry) => entry.candidate.path)).toEqual([unknown.path]);
    });
  });

  describe("runGc", () => {
    it("dry-run selects old candidates and makes no changes", async () => {
      const goBuild = join(cacheRoot, "repo-a", "go-build");
      await backdateTree(goBuild, 40);

      const plan = await runGc(
        { repoId: "repo-a", olderThanDays: 30 },
        { dryRun: true, repoRoot: repo, cacheRoot },
      );

      expect(plan.quarantined).toBeUndefined();
      expect(plan.selected.map((entry) => entry.path)).toEqual([goBuild]);
      expect(plan.notes.some((note) => note.includes("dry run"))).toBe(true);
      expect(existsSync(goBuild)).toBe(true);
      expect(existsSync(join(cacheRoot, "_quarantine"))).toBe(false);
    });

    it("applies by quarantining selected dirs (never deleting)", async () => {
      const goBuild = join(cacheRoot, "repo-a", "go-build");
      await backdateTree(goBuild, 40);

      const plan = await runGc(
        { repoId: "repo-a", olderThanDays: 30 },
        { dryRun: false, repoRoot: repo, cacheRoot },
      );

      expect(plan.quarantined?.moved.length).toBe(1);
      const quarantinedPath = plan.quarantined?.moved[0].to ?? "";
      expect(existsSync(goBuild)).toBe(false);
      expect(existsSync(quarantinedPath)).toBe(true);
      const journal = await readJournal(repo);
      expect(journal.some((entry) => entry.action === "quarantine")).toBe(true);
    });
  });

  describe("resolveWorktreeFilter", () => {
    async function addWorktree(name: string): Promise<string> {
      await writeFile(join(repo, "README.md"), "hello\n");
      await git(repo, ["add", "README.md"]);
      await git(repo, ["commit", "-q", "-m", "init"]);
      const worktree = join(base, "worktrees", name);
      await mkdir(join(base, "worktrees"), { recursive: true });
      await git(repo, ["worktree", "add", "-q", worktree, "-b", name]);
      return worktree;
    }

    it("accepts an existing directory and resolves a name by basename", async () => {
      const worktree = await addWorktree("feat-1");

      const byPath = await resolveWorktreeFilter(worktree, repo);
      expect(byPath.path).toBe(worktree);
      expect(byPath.note).toBeNull();

      const byName = await resolveWorktreeFilter("feat-1", repo);
      expect(byName.path).not.toBeNull();
      expect(basename(byName.path ?? "")).toBe("feat-1");
      expect(existsSync(byName.path ?? "")).toBe(true);
      expect(byName.note).toBeNull();
    });

    it("reports unknown worktrees and ignores --worktree with --all", async () => {
      const missing = await resolveWorktreeFilter("ghost", repo);
      expect(missing.path).toBeNull();
      expect(missing.note).toBe("worktree not found: ghost");

      const withAll = await resolveWorktreeFilter("feat-1", repo, { all: true });
      expect(withAll.path).toBeNull();
      expect(withAll.note).toContain("--worktree");
      expect(withAll.note).toContain("--all");
    });

    it("returns no filter for blank input and tolerates stat failures", async () => {
      expect(await resolveWorktreeFilter("   ", repo)).toEqual({ path: null, note: null });

      const file = join(base, "plain-file");
      await writeFile(file, "x");
      const result = await resolveWorktreeFilter(join(file, "child"), repo);
      expect(result.path).toBeNull();
      expect(result.note).toContain("worktree not found");
    });

    it("scopes a gc run to a worktree name and never scans a bogus repo id", async () => {
      await addWorktree("feat-1");
      const identity = await resolveRepoIdentity(repo);
      const scoped = join(cacheRoot, identity.repoId, "go-build");
      await mkdir(scoped, { recursive: true });
      await writeFile(join(scoped, "pkg.bin"), "z".repeat(2048));
      await backdateTree(scoped, 40);
      const otherScoped = join(cacheRoot, "other-repo", "go-build");
      await mkdir(otherScoped, { recursive: true });
      await writeFile(join(otherScoped, "pkg.bin"), "y".repeat(2048));
      await backdateTree(otherScoped, 40);

      const plan = await runGc(
        { worktree: "feat-1", olderThanDays: 30 },
        { dryRun: true, repoRoot: repo, cacheRoot },
      );

      expect(plan.selected).toHaveLength(1);
      expect(plan.selected[0].repoId).toBe(identity.repoId);
      expect(plan.selected[0].path).toBe(scoped);

      const bogus = await runGc(
        { worktree: "ghost", olderThanDays: 30 },
        { dryRun: true, repoRoot: repo, cacheRoot },
      );

      expect(bogus.notes.some((note) => note.includes("worktree not found: ghost"))).toBe(true);
      expect(bogus.selected.every((entry) => entry.repoId !== "ghost")).toBe(true);
      expect(bogus.selected.map((entry) => entry.path)).toContain(scoped);
      expect(bogus.selected.map((entry) => entry.path)).toContain(otherScoped);
    });
  });

  describe("runToolPrune", () => {
    const spec = {
      tool: "node",
      command: "node",
      args: ["-e", "console.log('pruned')"],
      description: "test prune",
      autoSafe: true,
      minAgeDays: 0,
    };

    it("returns the command without executing on dry runs", async () => {
      const result = await runToolPrune(repo, spec, { apply: false });
      expect(result.applied).toBe(false);
      expect(result.command).toContain("node");
      expect(result.stdout).toBe("");
    });

    it("executes and captures output when applied", async () => {
      const result = await runToolPrune(repo, spec, { apply: true });
      expect(result.applied).toBe(true);
      expect(result.stdout).toContain("pruned");
    });

    it("quotes arguments containing spaces", async () => {
      const result = await runToolPrune(
        repo,
        { ...spec, args: ["-e", "console.log('a b')"] },
        { apply: false },
      );
      expect(result.command).toContain(`"console.log('a b')"`);
    });

    it("never runs when the command is missing", async () => {
      const result = await runToolPrune(
        repo,
        { ...spec, command: "superskill-definitely-missing-tool" },
        { apply: true },
      );
      expect(result.applied).toBe(false);
      expect(result.note).toBe("tool not installed");
    });

    it("skips execution when the spec has no command", async () => {
      const result = await runToolPrune(repo, { ...spec, command: "" }, { apply: true });
      expect(result).toMatchObject({ applied: false, note: "no command" });
    });

    it("captures stderr and the exit code when the command fails", async () => {
      const result = await runToolPrune(
        repo,
        { ...spec, args: ["-e", "process.stderr.write('boom'); process.exit(3)"] },
        { apply: true },
      );
      expect(result.applied).toBe(false);
      expect(result.note).toBe("command failed: 3");
      expect(result.stderr).toContain("boom");
    });
  });

  describe("resolveProjectLabels", () => {
    it("maps repo ids to slugs and tolerates bad entries", async () => {
      const vault = join(base, "vault");
      await mkdir(vault);
      const otherRepo = join(base, "other-repo");
      await initRepo(otherRepo);
      await writeFile(
        join(vault, "project-map.json"),
        JSON.stringify({
          [repo]: "my-project",
          [otherRepo]: "other-project",
          [join(base, "missing-repo")]: "ghost",
        }),
      );

      const labels = await resolveProjectLabels(vault);
      expect(labels.size).toBe(2);
      expect([...labels.values()].sort()).toEqual(["my-project", "other-project"]);
    });

    it("returns an empty map for corrupt or missing project-map.json", async () => {
      const vault = join(base, "vault-2");
      await mkdir(vault);
      expect((await resolveProjectLabels(vault)).size).toBe(0);
      await mkdir(vault, { recursive: true });
      await writeFile(join(vault, "project-map.json"), "{ not json");
      expect((await resolveProjectLabels(vault)).size).toBe(0);
    });

    it("tolerates non-object maps, bad slugs, files, and unreadable paths", async () => {
      const vault = join(base, "vault-3");
      await mkdir(vault, { recursive: true });
      const mapPath = join(vault, "project-map.json");

      await writeFile(mapPath, "[]");
      expect((await resolveProjectLabels(vault)).size).toBe(0);

      const plain = join(base, "plain-dir");
      await mkdir(plain, { recursive: true });
      await writeFile(
        mapPath,
        JSON.stringify({ [plain]: 42, [join(base, "missing-zero")]: "" }),
      );
      expect((await resolveProjectLabels(vault)).size).toBe(0);

      const file = join(base, "file-entry");
      await writeFile(file, "x");
      await writeFile(mapPath, JSON.stringify({ [file]: "file-slug" }));
      expect((await resolveProjectLabels(vault)).size).toBe(0);

      await writeFile(mapPath, JSON.stringify({ [join(file, "nested")]: "weird" }));
      expect((await resolveProjectLabels(vault)).size).toBe(0);
    });

    it("falls back to the platform cache root when runGc gets no explicit root", async () => {
      const previous = process.env.SUPERSKILL_CACHE_ROOT;
      process.env.SUPERSKILL_CACHE_ROOT = cacheRoot;
      try {
        const plan = await runGc({ repoId: "repo-b" }, { dryRun: true, repoRoot: repo });
        expect(plan.cacheRoot).toBe(cacheRoot);
        expect(plan.candidates.map((entry) => entry.path)).toContain(
          join(cacheRoot, "repo-b", "bundle-cache"),
        );
      } finally {
        if (previous === undefined) delete process.env.SUPERSKILL_CACHE_ROOT;
        else process.env.SUPERSKILL_CACHE_ROOT = previous;
      }
    });
  });

  describe("worktree gc command helpers", () => {
    it("parses durations into days", () => {
      expect(parseDuration("30d")).toBe(30);
      expect(parseDuration("12h")).toBeCloseTo(0.5);
      expect(parseDuration("2w")).toBe(14);
      expect(parseDuration("1")).toBe(1);
      expect(parseDuration("nope")).toBeNull();
      expect(parseDuration("0d")).toBeNull();
      expect(parseDuration("-1d")).toBeNull();
    });

    it("parses sizes into bytes", () => {
      expect(parseSize("1G")).toBe(1024 ** 3);
      expect(parseSize("500M")).toBe(500 * 1024 ** 2);
      expect(parseSize("1024")).toBe(1024);
      expect(parseSize("2T")).toBe(2 * 1024 ** 4);
      expect(parseSize("1kb")).toBe(1024);
      expect(parseSize("1.5m")).toBe(Math.round(1.5 * 1024 ** 2));
      expect(parseSize("nope")).toBeNull();
    });

    it("formats sizes across units and for unknown values", () => {
      expect(formatBytes(512)).toBe("512 B");
      expect(formatBytes(2048)).toBe("2.0 KB");
      expect(formatBytes(10 * 1024)).toBe("10 KB");
      expect(formatBytes(1024 ** 4)).toBe("1.0 TB");
      expect(formatBytes(null)).toBe("?");
      expect(formatBytes(undefined)).toBe("?");
      expect(formatBytes(Number.NaN)).toBe("?");
    });

    it("renders the dry-run footer with Nothing was deleted", () => {
      const plan: GcPlan = {
        cacheRoot: "/cache",
        candidates: [],
        selected: [],
        skipped: [],
        toolPrunes: [],
        notes: [],
      };
      const text = renderWorktreeGc({
        action: "plan",
        applied: false,
        cacheRoot: "/cache",
        plan,
        notes: [],
        verbose: false,
      });
      expect(text).toContain("Nothing was deleted");
    });

    it("renders the reversible quarantine footer for applies", () => {
      const plan: GcPlan = {
        cacheRoot: "/cache",
        candidates: [],
        selected: [],
        skipped: [],
        toolPrunes: [],
        notes: [],
      };
      const text = renderWorktreeGc({
        action: "apply",
        applied: true,
        cacheRoot: "/cache",
        plan,
        quarantined: {
          journalId: "journal-1",
          quarantineDir: "/cache/_quarantine/journal-1",
          moved: [
            { from: "/cache/repo-a/go-build", to: "/cache/_quarantine/journal-1/go-build", bytes: 2048 },
            { from: "/cache/repo-a/sccache", to: "/cache/_quarantine/journal-1/sccache", bytes: 1024 },
          ],
          skipped: [],
        },
        notes: [],
        verbose: false,
      });
      expect(text).toContain("quarantined (reversible): 2 dirs");
      expect(text).toContain("--undo journal-1");
    });

    it("renders verbose skips, tool prunes, unknown ages, and caps candidates at 40", () => {
      const selected = Array.from({ length: 41 }, (_, index) =>
        candidate({
          path: `/cache/repo-a/go-build-${index}`,
          bytes: 1024 * (index + 1),
          ageDays: index % 7 === 0 ? null : 40,
        }),
      );
      const plan: GcPlan = {
        cacheRoot: "/cache",
        candidates: selected,
        selected,
        skipped: [
          { candidate: candidate({ path: "/cache/repo-a/young", ageDays: 3 }), reason: "too young" },
          { candidate: candidate({ path: "/cache/repo-a/young-2", ageDays: 2 }), reason: "too young" },
        ],
        toolPrunes: [
          {
            provider: "go",
            spec: {
              tool: "go",
              command: "go",
              args: ["clean"],
              description: "go clean",
              autoSafe: true,
              minAgeDays: 30,
            },
          },
        ],
        notes: [],
      };
      const text = renderWorktreeGc({
        action: "plan",
        applied: false,
        cacheRoot: "/cache",
        plan,
        notes: [],
        verbose: true,
      });

      expect(text).toContain("... 1 more");
      expect(text).toContain("go: go clean — go clean");
      expect(text).toContain("- repo-a/young: too young");
      expect(text).toContain("?  auto");
      expect(text).not.toContain("skipped reasons:");
    });

    it("aggregates skipped reasons unless verbose", () => {
      const plan: GcPlan = {
        cacheRoot: "/cache",
        candidates: [],
        selected: [],
        skipped: [
          { candidate: candidate({ path: "/cache/repo-a/young", ageDays: 3 }), reason: "too young" },
          { candidate: candidate({ path: "/cache/repo-a/young-2", ageDays: 2 }), reason: "too young" },
        ],
        toolPrunes: [],
        notes: [],
      };
      const text = renderWorktreeGc({
        action: "plan",
        applied: false,
        cacheRoot: "/cache",
        plan,
        notes: [],
        verbose: false,
      });
      expect(text).toContain("skipped reasons:");
      expect(text).toContain("2x too young");
      expect(text).not.toContain("- repo-a/young");
    });

    it("renders purge plans, purge applies, and restores", () => {
      const purgePlan = renderWorktreeGc({
        action: "purge",
        applied: false,
        cacheRoot: "/cache",
        purge: {
          journalId: "p-1",
          purged: ["/cache/_quarantine/a"],
          skipped: [{ path: "/cache/_quarantine/b", reason: "too young" }],
          bytes: 2048,
        },
        notes: ["purge plan only"],
        verbose: false,
      });
      expect(purgePlan).toContain("purged: 1 dir(s), 2.0 KB freed");
      expect(purgePlan).toContain("skipped /cache/_quarantine/b: too young");
      expect(purgePlan).toContain("Re-run with --purge --yes");
      expect(purgePlan).toContain("note: purge plan only");

      const restore = renderWorktreeGc({
        action: "restore",
        applied: false,
        cacheRoot: "/cache",
        restore: {
          restored: ["/cache/repo-a/go-build"],
          skipped: [{ path: "/cache/repo-a/x", reason: "target already exists" }],
        },
        notes: [],
        verbose: false,
      });
      expect(restore).toContain("restored: 1 path(s)");
      expect(restore).toContain("+ /cache/repo-a/go-build");
      expect(restore).toContain("skipped /cache/repo-a/x: target already exists");
    });

    it("falls back to a plan rendering for empty input", () => {
      const text = renderWorktreeGc(null);
      expect(text).toContain("superskill worktree gc — plan");
      expect(text).toContain("Nothing was deleted. 0 dir(s), 0 B selected");
    });

    it("plans a command run without touching the cache", async () => {
      const previous = process.env.SUPERSKILL_CACHE_ROOT;
      process.env.SUPERSKILL_CACHE_ROOT = cacheRoot;
      try {
        const outcome = (await worktreeGcCommand(
          { worktree: repo, olderThan: "30d" },
          { vaultPath: join(base, "vault") } as unknown as CommandContext,
        )) as WorktreeGcOutcome;

        expect(outcome.action).toBe("plan");
        expect(outcome.applied).toBe(false);
        expect(existsSync(join(cacheRoot, "repo-a", "go-build"))).toBe(true);
        expect(existsSync(join(cacheRoot, "_quarantine"))).toBe(false);
      } finally {
        if (previous === undefined) delete process.env.SUPERSKILL_CACHE_ROOT;
        else process.env.SUPERSKILL_CACHE_ROOT = previous;
      }
    });
  });
});
