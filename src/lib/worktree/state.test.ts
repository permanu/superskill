import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { appendFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  POLICY_SCHEMA_VERSION,
  appendJournal,
  clearHookState,
  listingSignature,
  newJournalId,
  readHookState,
  readJournal,
  readManifest,
  readPolicy,
  verifyManifest,
  writeHookState,
  writeManifest,
  writePolicy,
  type HookState,
  type JournalEntry,
  type WorktreeManifest,
  type WorktreePolicy,
} from "./state.js";
import { repoStateDir } from "./paths.js";

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

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function samplePolicy(repo: string): WorktreePolicy {
  return {
    v: POLICY_SCHEMA_VERSION,
    repoId: "0123456789abcdef",
    remoteHash: null,
    repoRoot: repo,
    createdAt: "2026-01-02T03:04:05.678Z",
    updatedAt: "2026-01-02T03:04:05.678Z",
    stacks: ["node"],
    tools: ["vitest"],
    flags: { hooks: "disabled" },
    hosts: [],
    activation: { hooks: false, seed: true, install: false },
  };
}

describe("worktree state", () => {
  let base: string;
  let repo: string;

  beforeEach(async () => {
    base = await mkdtemp(join(tmpdir(), "worktree-state-"));
    repo = join(base, "repo");
    await mkdir(repo);
    await git(repo, ["init", "-q", "-b", "main"]);
    await writeFile(join(repo, "README.md"), "hello\n");
    await git(repo, ["add", "."]);
    await git(repo, ["commit", "-q", "-m", "init"]);
  });

  afterEach(async () => {
    await rm(base, { recursive: true, force: true });
  });

  describe("policy", () => {
    it("round-trips a policy through the state dir with 0600 permissions", async () => {
      const policy = samplePolicy(repo);
      await writePolicy(repo, policy);

      expect(await readPolicy(repo)).toEqual(policy);

      const stateDir = await repoStateDir(repo);
      const filePath = join(stateDir, "policy.json");
      const raw = await readFile(filePath, "utf-8");
      expect(JSON.parse(raw)).toEqual(policy);
      expect((await stat(filePath)).mode & 0o077).toBe(0);
    });

    it("returns null when no policy exists", async () => {
      expect(await readPolicy(repo)).toBeNull();
    });

    it("returns null and logs for corrupt JSON", async () => {
      const stateDir = await repoStateDir(repo);
      await mkdir(stateDir, { recursive: true });
      await writeFile(join(stateDir, "policy.json"), "{ definitely not json");

      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const result = await readPolicy(repo);
      const calls = spy.mock.calls;
      spy.mockRestore();

      expect(result).toBeNull();
      expect(calls.some((args) => typeof args[0] === "string" && args[0].includes("[worktree-state]"))).toBe(true);
    });

    it("returns null and logs for policy JSON with an invalid shape", async () => {
      const stateDir = await repoStateDir(repo);
      await mkdir(stateDir, { recursive: true });
      const invalid = [
        { v: POLICY_SCHEMA_VERSION + 1, repoId: "abc", stacks: [], activation: {} },
        { ...samplePolicy(repo), repoId: 7 },
        { ...samplePolicy(repo), stacks: "node" },
        { ...samplePolicy(repo), activation: null },
        [],
      ];
      await writeFile(join(stateDir, "policy.json"), JSON.stringify(invalid[0]));

      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      for (const value of invalid) {
        await writeFile(join(stateDir, "policy.json"), JSON.stringify(value));
        expect(await readPolicy(repo)).toBeNull();
      }
      const calls = spy.mock.calls;
      spy.mockRestore();

      expect(calls.some((args) => typeof args[0] === "string" && args[0].includes("[worktree-state]"))).toBe(true);
    });

    it("returns null for truncated JSON", async () => {
      const stateDir = await repoStateDir(repo);
      await mkdir(stateDir, { recursive: true });
      await writeFile(join(stateDir, "policy.json"), '{"v":1');

      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const result = await readPolicy(repo);
      spy.mockRestore();

      expect(result).toBeNull();
    });
  });

  describe("hook state", () => {
    it("round-trips hook state with and without a backup path", async () => {
      const state: HookState = {
        v: 1,
        kind: "husky",
        fingerprint: "abc123",
        installedAt: "2026-01-02T03:04:05.678Z",
      };
      await writeHookState(repo, state);
      expect(await readHookState(repo)).toEqual(state);

      const withBackup: HookState = {
        v: 1,
        kind: "lefthook",
        fingerprint: "def456",
        backupPath: join(repo, ".git", "hooks", "pre-commit.prev"),
        installedAt: "2026-01-02T03:04:05.678Z",
      };
      await writeHookState(repo, withBackup);
      expect(await readHookState(repo)).toEqual(withBackup);
    });

    it("clears hook state and is idempotent", async () => {
      await writeHookState(repo, {
        v: 1,
        kind: "block",
        fingerprint: "abc123",
        installedAt: "2026-01-02T03:04:05.678Z",
      });
      expect(await readHookState(repo)).not.toBeNull();

      await clearHookState(repo);
      expect(await readHookState(repo)).toBeNull();
      await expect(clearHookState(repo)).resolves.toBeUndefined();
    });

    it("returns null and logs for corrupt hook state", async () => {
      const stateDir = await repoStateDir(repo);
      await mkdir(stateDir, { recursive: true });
      await writeFile(join(stateDir, "hook.state"), '{"v":1,"kind":"bogus"}');

      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const result = await readHookState(repo);
      const calls = spy.mock.calls;
      spy.mockRestore();

      expect(result).toBeNull();
      expect(calls.some((args) => typeof args[0] === "string" && args[0].includes("[worktree-state]"))).toBe(true);
    });
  });

  describe("journal", () => {
    it("derives the journal id from an ISO timestamp with a random suffix", () => {
      const id = newJournalId(new Date("2026-01-02T03:04:05.678Z"));
      expect(id).toMatch(/^2026-01-02T03-04-05\.678Z-[0-9a-f]{8}$/);
      expect(newJournalId()).toMatch(/^[0-9A-Za-z][0-9A-Za-z._:-]*$/);
      expect(newJournalId(new Date("2026-01-02T03:04:05.678Z"))).not.toBe(id);
    });

    it("appends and reads journal entries in order", async () => {
      const first: JournalEntry = {
        id: newJournalId(new Date("2026-01-02T03:04:05.678Z")),
        ts: "2026-01-02T03:04:05.678Z",
        action: "seed",
        paths: ["README.md"],
        bytes: 6,
      };
      const second: JournalEntry = {
        id: newJournalId(new Date("2026-01-02T03:04:06.000Z")),
        ts: "2026-01-02T03:04:06.000Z",
        action: "quarantine",
        paths: ["sub/data.txt"],
        bytes: 5,
        detail: "moved to cache",
      };
      await appendJournal(repo, first);
      await appendJournal(repo, second);

      expect(await readJournal(repo)).toEqual([first, second]);
    });

    it("returns an empty list when the journal does not exist", async () => {
      expect(await readJournal(repo)).toEqual([]);
    });

    it("skips corrupt journal lines", async () => {
      const entry: JournalEntry = {
        id: newJournalId(new Date("2026-01-02T03:04:05.678Z")),
        ts: "2026-01-02T03:04:05.678Z",
        action: "install",
        paths: [".git/hooks/pre-commit"],
        bytes: 0,
      };
      await appendJournal(repo, entry);
      const journalPath = join(await repoStateDir(repo), "journal.jsonl");
      await appendFile(journalPath, '{"id": truncated\n');

      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const entries = await readJournal(repo);
      const calls = spy.mock.calls;
      spy.mockRestore();

      expect(entries).toEqual([entry]);
      expect(calls.some((args) => typeof args[0] === "string" && args[0].includes("[worktree-state]"))).toBe(true);
    });
  });

  describe("manifest", () => {
    async function setupManifest(): Promise<WorktreeManifest> {
      await mkdir(join(repo, "sub"), { recursive: true });
      await writeFile(join(repo, "sub", "data.txt"), "data\n");
      const manifest: WorktreeManifest = {
        v: 1,
        worktree: repo,
        createdAt: "2026-01-02T03:04:05.678Z",
        files: [
          { path: "README.md", sha256: sha256("hello\n"), size: 6 },
          { path: "sub/data.txt", sha256: sha256("data\n"), size: 5 },
        ],
      };
      await writeManifest(repo, manifest);
      return manifest;
    }

    it("writes and reads a manifest keyed by worktree path", async () => {
      const manifest = await setupManifest();
      const loaded = await readManifest(repo, repo);
      expect(loaded).toEqual(manifest);

      expect(await readManifest(repo, join(repo, "other-worktree"))).toBeNull();
      expect(await readManifest(join(base, "no-repo"), repo)).toBeNull();
    });

    it("verifies intact files", async () => {
      const manifest = await setupManifest();
      const result = await verifyManifest(manifest);
      expect(result).toEqual({
        modified: [],
        missing: [],
        intact: ["README.md", "sub/data.txt"],
      });
    });

    it("reports tampered files as modified", async () => {
      const manifest = await setupManifest();
      await writeFile(join(repo, "README.md"), "tampered\n");

      const result = await verifyManifest(manifest);
      expect(result.modified).toEqual(["README.md"]);
      expect(result.intact).toEqual(["sub/data.txt"]);
      expect(result.missing).toEqual([]);
    });

    it("reports deleted files as missing", async () => {
      const manifest = await setupManifest();
      await rm(join(repo, "sub", "data.txt"));

      const result = await verifyManifest(manifest);
      expect(result.missing).toEqual(["sub/data.txt"]);
      expect(result.intact).toEqual(["README.md"]);
      expect(result.modified).toEqual([]);
    });

    it("resolves relative paths against opts.root", async () => {
      const manifest = await setupManifest();
      const other = join(base, "other-root");
      await mkdir(join(other, "sub"), { recursive: true });
      await writeFile(join(other, "README.md"), "hello\n");
      await writeFile(join(other, "sub", "data.txt"), "data\n");

      const result = await verifyManifest(manifest, { root: other });
      expect(result).toEqual({
        modified: [],
        missing: [],
        intact: ["README.md", "sub/data.txt"],
      });
    });

    it("verifies directory entries against listing signatures and ignores size", async () => {
      const cache = join(repo, "cache");
      await mkdir(join(cache, "nested"), { recursive: true });
      await writeFile(join(cache, "a.txt"), "alpha\n");
      await writeFile(join(cache, "nested", "b.txt"), "beta\n");
      const manifest: WorktreeManifest = {
        v: 1,
        worktree: repo,
        createdAt: "2026-01-02T03:04:05.678Z",
        files: [{ path: "cache/", sha256: await listingSignature(cache), size: 999999 }],
      };

      expect(await verifyManifest(manifest)).toEqual({
        modified: [],
        missing: [],
        intact: ["cache/"],
      });
    });

    it("computes listing signatures from sorted directory-relative entries", async () => {
      const cache = join(repo, "cache");
      await mkdir(join(cache, "nested"), { recursive: true });
      await writeFile(join(cache, "a.txt"), "alpha\n");
      await writeFile(join(cache, "nested", "b.txt"), "beta\n");
      const a = await stat(join(cache, "a.txt"));
      const b = await stat(join(cache, "nested", "b.txt"));
      const expected = createHash("sha256")
        .update([`a.txt:${a.size}:${a.mtimeMs}`, `nested/b.txt:${b.size}:${b.mtimeMs}`].sort().join("\n"))
        .digest("hex");

      expect(await listingSignature(cache)).toBe(expected);

      const empty = join(repo, "empty-dir");
      await mkdir(empty);
      expect(await listingSignature(empty)).toBe(sha256(""));
    });

    it("reports changed directories as modified and removed directories as missing", async () => {
      const cache = join(repo, "cache");
      await mkdir(cache);
      await writeFile(join(cache, "a.txt"), "alpha\n");
      const manifest: WorktreeManifest = {
        v: 1,
        worktree: repo,
        createdAt: "2026-01-02T03:04:05.678Z",
        files: [
          { path: "cache/", sha256: await listingSignature(cache), size: 6 },
          { path: "gone/", sha256: sha256(""), size: 0 },
        ],
      };
      await writeFile(join(cache, "b.txt"), "beta\n");

      const result = await verifyManifest(manifest);
      expect(result.modified).toEqual(["cache/"]);
      expect(result.missing).toEqual(["gone/"]);
      expect(result.intact).toEqual([]);
    });

    it("rejects escaping entries as modified without reading them", async () => {
      const outside = join(base, "outside.txt");
      await writeFile(outside, "secret\n");
      const escaped = ["../outside.txt", "../missing.txt", outside, join(base, "missing-absolute.txt")];
      const manifest: WorktreeManifest = {
        v: 1,
        worktree: repo,
        createdAt: "2026-01-02T03:04:05.678Z",
        files: [
          { path: "../outside.txt", sha256: sha256("secret\n"), size: 7 },
          { path: "../missing.txt", sha256: sha256(""), size: 0 },
          { path: outside, sha256: sha256("secret\n"), size: 7 },
          { path: join(base, "missing-absolute.txt"), sha256: sha256(""), size: 0 },
        ],
      };

      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const result = await verifyManifest(manifest);
      spy.mockRestore();

      expect(result.modified.sort()).toEqual([...escaped].sort());
      expect(result.missing).toEqual([]);
      expect(result.intact).toEqual([]);
    });
  });
});
