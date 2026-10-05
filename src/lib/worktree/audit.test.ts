// SPDX-License-Identifier: Apache-2.0
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { auditRepo, probeDirAge, probeDirSize } from "./audit.js";
import type { RepoAudit, WorktreeAudit } from "./audit.js";
import { formatBytes, renderWorktreeAudit } from "../../commands/worktree/audit.js";
import { seedWorktree } from "./seed.js";
import { writeManifest } from "./state.js";
import type { WorktreeManifest } from "./state.js";

const execFileAsync = promisify(execFile);
const MS_PER_DAY = 86_400_000;

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

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

describe("worktree audit", () => {
  let base: string;
  let repo: string;

  beforeEach(async () => {
    base = await mkdtemp(join(tmpdir(), "worktree-audit-"));
    repo = join(base, "repo");
    await mkdir(repo);
    await git(repo, ["init", "-q", "-b", "main"]);
    await writeFile(join(repo, "package.json"), '{"name":"fixture","version":"1.0.0"}\n');
    await writeFile(join(repo, "README.md"), "hello\n");
    await git(repo, ["add", "."]);
    await git(repo, ["commit", "-q", "-m", "init"]);
  });

  afterEach(async () => {
    await rm(base, { recursive: true, force: true });
  });

  it("audits a clean repo without proposing destructive items", async () => {
    await git(repo, ["worktree", "add", "-q", join(base, "linked"), "-b", "feature"]);

    const audit = await auditRepo(repo);
    const repoReal = realpathSync(repo);

    expect(audit.repoId).toBeTruthy();
    expect(audit.repoRoot).toBe(repoReal);
    expect(audit.mainWorktree).toBe(repoReal);
    expect(audit.providers).toContain("node");
    expect(audit.stacks).toContain("typescript");
    expect(audit.worktrees).toHaveLength(2);

    const repoIds = audit.items.map((item) => item.id);
    expect(repoIds).toContain("policy");
    expect(repoIds).toContain("hook");
    expect(audit.items.every((item) => item.safe && !item.consent)).toBe(true);

    const allItems = [...audit.items, ...audit.worktrees.flatMap((entry) => entry.items)];
    const allIds = allItems.map((item) => item.id);
    expect(allIds).toContain("env");
    expect(allIds.filter((id) => id.startsWith("reclaim:") || id.startsWith("prune:"))).toEqual([]);

    expect(audit.summary.worktrees).toBe(2);
    expect(audit.summary.cacheBytes).toBeNull();
    expect(audit.summary.safeItems).toBe(allItems.filter((item) => item.safe).length);
    expect(audit.summary.consentItems).toBe(allItems.filter((item) => item.consent).length);
    expect(audit.notes.join(" ")).toContain("Never remove");

    for (const entry of audit.worktrees) {
      for (const dir of entry.cacheDirs) {
        expect(dir.bytes).toBeNull();
        expect(dir.ageDays).toBeNull();
      }
    }
  });

  it("probes cache dir sizes and age only when requested", async () => {
    await mkdir(join(repo, "node_modules"), { recursive: true });
    await writeFile(join(repo, "node_modules", "blob.bin"), Buffer.alloc(1024 * 1024, "x"));

    const audit = await auditRepo(repo, { includeSizes: true });
    const main = audit.worktrees.find((entry) => entry.info.path === realpathSync(repo));
    const dir = main?.cacheDirs.find((entry) => entry.id === "node-modules");

    expect(main).toBeDefined();
    expect(dir?.exists).toBe(true);
    if (dir && dir.bytes !== null) expect(dir.bytes).toBeGreaterThan(0);
    if (dir && dir.ageDays !== null) expect(dir.ageDays).toBeGreaterThanOrEqual(0);
    if (audit.summary.cacheBytes !== null) expect(audit.summary.cacheBytes).toBeGreaterThan(0);

    const seed = main?.items.find((item) => item.id === "seed:node:node_modules");
    expect(seed).toBeDefined();
    expect(seed?.safe).toBe(false);
    expect(seed?.consent).toBe(true);
    expect(seed?.detail).toContain("already present");
  });

  it("filters worktrees by name", async () => {
    await git(repo, ["worktree", "add", "-q", join(base, "linked"), "-b", "feature"]);

    const filtered = await auditRepo(repo, { worktree: "linked" });
    expect(filtered.worktrees).toHaveLength(1);
    expect(filtered.worktrees[0].info.path).toBe(realpathSync(join(base, "linked")));
    expect(filtered.summary.worktrees).toBe(1);

    const none = await auditRepo(repo, { worktree: "does-not-exist" });
    expect(none.worktrees).toEqual([]);
    expect(none.summary.worktrees).toBe(0);
  });

  it("emits a consent-gated reclaim item for a seeded cache and drops it when the manifest breaks", async () => {
    await writeFile(join(repo, ".gitignore"), "node_modules/\n");
    await git(repo, ["add", ".gitignore"]);
    await git(repo, ["commit", "-q", "-m", "ignore node_modules"]);

    const content = "module.exports = 1;\n";
    await mkdir(join(repo, "node_modules", "pkg"), { recursive: true });
    await writeFile(join(repo, "node_modules", "pkg", "index.js"), content);

    await git(repo, ["worktree", "add", "-q", join(base, "linked"), "-b", "feature"]);
    const linked = realpathSync(join(base, "linked"));

    const seed = await seedWorktree(linked);
    expect(seed.seeded.map((entry) => entry.relative)).toContain("node_modules");

    const audit = await auditRepo(linked);
    const entry = audit.worktrees.find((item) => item.info.path === linked);
    expect(entry).toBeDefined();
    expect(entry?.verdict.safeToReclaimLocalCaches).toBe(false);
    expect(entry?.manifest?.modified).toEqual([]);
    expect(entry?.manifest?.missing).toEqual([]);

    const reclaim = entry?.items.find((item) => item.id === "reclaim:node:node-modules");
    expect(reclaim).toBeDefined();
    expect(reclaim?.kind).toBe("prune");
    expect(reclaim?.safe).toBe(false);
    expect(reclaim?.consent).toBe(true);
    expect(reclaim?.detail).toContain("explicit consent");

    await writeFile(join(linked, "node_modules", "pkg", "index.js"), "tampered\n");
    const after = await auditRepo(linked);
    const tampered = after.worktrees.find((item) => item.info.path === linked);
    expect(tampered?.manifest?.modified).toContain("node_modules/pkg/index.js");
    expect(tampered?.items.some((item) => item.id === "reclaim:node:node-modules")).toBe(false);
  });

  it("withholds prune and reclaim items from a dirty worktree", async () => {
    await writeFile(join(repo, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    await git(repo, ["add", "pnpm-lock.yaml"]);
    await git(repo, ["commit", "-q", "-m", "add pnpm lockfile"]);
    await git(repo, ["worktree", "add", "-q", join(base, "linked"), "-b", "feature"]);
    await writeFile(join(base, "linked", "README.md"), "dirty\n");

    const audit = await auditRepo(repo);
    const main = audit.worktrees.find((entry) => entry.info.path === realpathSync(repo));
    const linked = audit.worktrees.find(
      (entry) => entry.info.path === realpathSync(join(base, "linked")),
    );

    expect(main?.items.some((item) => item.id === "prune:node")).toBe(true);
    expect(linked).toBeDefined();
    expect(linked?.verdict.dirty).toBe(true);
    expect(linked?.verdict.reasons.length).toBeGreaterThan(0);
    expect(linked?.verdict.reasons.join(" ")).toContain("tracked changes");

    const ids = linked?.items.map((item) => item.id) ?? [];
    expect(ids).toContain("env");
    expect(ids.some((id) => id.startsWith("reclaim:"))).toBe(false);
    expect(ids.some((id) => id.startsWith("prune:"))).toBe(false);
    const kinds = new Set((linked?.items ?? []).map((item) => item.kind));
    expect(kinds.has("prune")).toBe(false);
  });

  it("proposes a prune item for a clean worktree with go.mod", async () => {
    await writeFile(join(repo, "go.mod"), "go 1.22\n");
    await git(repo, ["add", "go.mod"]);
    await git(repo, ["commit", "-q", "-m", "add go module"]);

    const audit = await auditRepo(repo, { worktree: basename(repo) });
    expect(audit.worktrees).toHaveLength(1);
    const entry = audit.worktrees[0];
    expect(entry.verdict.dirty).toBe(false);
    expect(entry.verdict.untracked).toBe(false);

    const prune = entry.items.find((item) => item.id === "prune:go");
    expect(prune).toBeDefined();
    expect(prune?.kind).toBe("prune");
    expect(prune?.safe).toBe(false);
    expect(prune?.consent).toBe(true);
    expect(prune?.command).toBe("go clean -cache");
    expect(prune?.detail).toContain("tool: go");
  });

  it("reports manifest modifications after tampering", async () => {
    const manifest: WorktreeManifest = {
      v: 1,
      worktree: realpathSync(repo),
      createdAt: new Date().toISOString(),
      files: [{ path: "README.md", sha256: sha256("hello\n"), size: 6 }],
    };
    await writeManifest(repo, manifest);
    await writeFile(join(repo, "README.md"), "tampered\n");

    const audit = await auditRepo(repo);
    const entry = audit.worktrees.find((item) => item.info.path === realpathSync(repo));
    expect(entry?.manifest).not.toBeNull();
    expect(entry?.manifest?.seeded).toBe(1);
    expect(entry?.manifest?.modified).toContain("README.md");
    expect((entry?.manifest?.modified.length ?? 0)).toBeGreaterThan(0);
    expect(entry?.verdict.safeToReclaimLocalCaches).toBe(false);
  });

  it("renders a repo audit and formats sizes", async () => {
    const audit = await auditRepo(repo, { worktree: basename(repo) });
    const text = renderWorktreeAudit(audit);

    expect(text).toContain(`Worktree audit: ${audit.repoId}`);
    expect(text).toContain("Repo items:");
    expect(text).toContain("Summary:");
    expect(text).toContain("Notes:");
    expect(text).toContain("[safe]");
    expect(text).toContain("env");
    expect(text).toContain("cache bytes: unknown");

    expect(formatBytes(null)).toBe("unknown");
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(10 * 1024 ** 3)).toBe("10 GB");
  });

  it("probes directory size and age best-effort", async () => {
    const data = join(base, "data");
    await mkdir(data);
    await writeFile(join(data, "a.txt"), "a\n");
    await writeFile(join(data, "b.txt"), "b\n");

    const size = await probeDirSize(data);
    if (size !== null) expect(size).toBeGreaterThanOrEqual(0);
    expect(await probeDirSize(join(base, "missing"))).toBeNull();

    const old = new Date(Date.now() - 10 * MS_PER_DAY);
    await utimes(join(data, "a.txt"), old, old);
    await utimes(join(data, "b.txt"), old, old);

    const age = await probeDirAge(data);
    expect(age).not.toBeNull();
    if (age !== null) {
      expect(age).toBeGreaterThan(9);
      expect(age).toBeLessThan(11);
    }
    expect(await probeDirAge(join(base, "missing"))).toBeNull();

    const empty = join(base, "empty");
    await mkdir(empty);
    expect(await probeDirAge(empty)).toBeNull();
  });
});

describe("renderWorktreeAudit variants", () => {
  function verdict(worktree: string): WorktreeAudit["verdict"] {
    return {
      worktree,
      dirty: false,
      untracked: false,
      ignoredFiles: [],
      ignoredTruncated: false,
      unpushedCommits: 0,
      stashCount: 0,
      inProgressOps: [],
      locked: false,
      hasSubmodules: false,
      safeToReclaimLocalCaches: true,
      reasons: [],
    };
  }

  function info(overrides: Partial<WorktreeAudit["info"]> & { path: string }): WorktreeAudit["info"] {
    return {
      head: null,
      branch: null,
      detached: false,
      bare: false,
      locked: false,
      lockReason: null,
      prunable: false,
      prunableReason: null,
      ...overrides,
    };
  }

  it("renders an empty audit with unknown stacks and no providers", () => {
    const audit: RepoAudit = {
      repoId: "empty-repo",
      repoRoot: "/repo",
      stacks: [],
      providers: [],
      policy: null,
      mainWorktree: "/repo",
      worktrees: [],
      items: [],
      summary: { worktrees: 0, cacheBytes: null, safeItems: 0, consentItems: 0 },
      notes: [],
    };

    const text = renderWorktreeAudit(audit);
    expect(text).toContain("stacks: unknown");
    expect(text).toContain("providers: none");
    expect(text).toContain("policy: not installed");
    expect(text).toContain("Worktrees (0):");
    expect(text).toContain("(none)");
    expect(text).toContain("cache bytes: unknown");
    expect(text).toContain("Summary:");
  });

  it("renders bare, detached, head-only, and branch worktrees with flags and sizes", () => {
    const bare: WorktreeAudit = {
      info: info({ path: "/repo/bare", bare: true }),
      verdict: {
        ...verdict("/repo/bare"),
        dirty: true,
        unpushedCommits: 3,
        stashCount: 2,
        locked: true,
        hasSubmodules: true,
        safeToReclaimLocalCaches: false,
        reasons: ["dirty"],
      },
      cacheDirs: [],
      manifest: null,
      items: [],
    };
    const detached: WorktreeAudit = {
      info: info({ path: "/repo/det", detached: true }),
      verdict: verdict("/repo/det"),
      cacheDirs: [
        {
          id: "go-build",
          path: "/repo/det/.cache/go-build",
          tool: "go",
          description: "build cache",
          autoSafe: true,
          exists: true,
          bytes: 1536,
          ageDays: null,
        },
        {
          id: "go-mod",
          path: "/shared/go-mod",
          tool: "go",
          description: "module cache",
          autoSafe: true,
          exists: false,
          bytes: null,
          ageDays: 1.25,
        },
      ],
      manifest: { seeded: 2, modified: ["a.js"], missing: ["b.js"] },
      items: [
        {
          id: "prune:go",
          kind: "prune",
          title: "prune",
          detail: "go clean",
          safe: false,
          consent: true,
          command: "go clean -cache",
        },
        { id: "reclaim:go", kind: "prune", title: "reclaim", detail: "reclaim", safe: false, consent: false },
      ],
    };
    const onBranch: WorktreeAudit = {
      info: info({ path: "/repo/branch", head: "abcdef1234567890ff", branch: "refs/heads/feature/x" }),
      verdict: verdict("/repo/branch"),
      cacheDirs: [],
      manifest: { seeded: 0, modified: [], missing: [] },
      items: [{ id: "env", kind: "env", title: "env", detail: "env", safe: true, consent: false }],
    };
    const headOnly: WorktreeAudit = {
      info: info({ path: "/repo/head-only", head: "0123456789abcdef" }),
      verdict: verdict("/repo/head-only"),
      cacheDirs: [],
      manifest: null,
      items: [],
    };

    const audit: RepoAudit = {
      repoId: "rich-repo",
      repoRoot: "/repo",
      stacks: ["go"],
      providers: ["go"],
      policy: { v: 1 } as unknown as RepoAudit["policy"],
      mainWorktree: "/repo",
      worktrees: [bare, detached, onBranch, headOnly],
      items: [
        { id: "policy:1", kind: "policy", title: "policy", detail: "install", safe: true, consent: false },
        {
          id: "prune:go",
          kind: "prune",
          title: "prune",
          detail: "go clean",
          safe: false,
          consent: true,
          command: "go clean -cache",
        },
      ],
      summary: { worktrees: 4, cacheBytes: 1536, safeItems: 1, consentItems: 1 },
      notes: ["one note"],
    };

    const text = renderWorktreeAudit(audit);
    expect(text).toContain("policy: installed (v1)");
    expect(text).toContain("[safe] policy:1 — install");
    expect(text).toContain("[consent] prune:go — go clean (command: go clean -cache)");
    expect(text).toContain("branch: bare");
    expect(text).toContain("branch: detached @ unknown");
    expect(text).toContain("branch: feature/x");
    expect(text).toContain("branch: 0123456789ab");
    expect(text).toContain("dirty=yes untracked=no");
    expect(text).toContain("unpushed=3");
    expect(text).toContain("stashes=2");
    expect(text).toContain("locked=yes");
    expect(text).toContain("submodules=yes");
    expect(text).toContain("cache dirs:");
    expect(text).toContain("age=unknown");
    expect(text).toContain("age=1.3d");
    expect(text).toContain("size=1.5 KB");
    expect(text).toContain("(go, local)");
    expect(text).toContain("manifest: seeded=2 modified=1 missing=1");
    expect(text).toContain("modified: a.js");
    expect(text).toContain("missing: b.js");
    expect(text).toContain("manifest: none");
    expect(text).toContain("[manual] reclaim:go — reclaim");
    expect(text).toContain("(go, shared)");
    expect(text).toContain("cache bytes: 1.5 KB");
  });
});
