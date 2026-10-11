import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, realpath, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { promisify } from "node:util";
import { hashId, localRemotePath, normalizeRemote, platformCacheRoot, resolveRepoIdentity } from "./paths.js";

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

const platformState = vi.hoisted(() => ({ value: process.platform }));

vi.mock("node:os", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:os")>();
  return { ...actual, platform: () => platformState.value };
});

beforeEach(() => {
  platformState.value = process.platform;
});

describe("normalizeRemote", () => {
  it("lowercases only the host and keeps the port", () => {
    expect(normalizeRemote("ssh://git@GitHub.com:2222/Owner/Repo.git")).toBe("github.com:2222/Owner/Repo");
    expect(normalizeRemote("ssh://git@GitHub.com:3333/Owner/Repo.git")).toBe("github.com:3333/Owner/Repo");
    expect(normalizeRemote("ssh://git@GitHub.com:2222/Owner/Repo.git")).not.toBe(
      normalizeRemote("ssh://git@GitHub.com:3333/Owner/Repo.git"),
    );
  });

  it("preserves pathname case and strips credentials, query, and fragment", () => {
    expect(normalizeRemote("https://User:Pass@GitHub.com/Owner/Repo.git?token=1#frag")).toBe(
      "github.com/Owner/Repo",
    );
  });

  it("normalizes scp-style remotes through the ssh scheme", () => {
    expect(normalizeRemote("git@GitHub.com:Owner/Repo.git")).toBe("github.com/Owner/Repo");
  });

  it("does not mangle bracketed IPv6 remotes", () => {
    expect(normalizeRemote("ssh://git@[::1]:2222/Repo.git")).toBe("[::1]:2222/Repo");
    const conservative = normalizeRemote("git@[::1]:Repo.git");
    expect(conservative).toContain("[::1]");
    expect(conservative).not.toContain("ssh://[/");
  });
});

describe("platformCacheRoot", () => {
  it("ignores blank overrides and resolves an absolute path", () => {
    expect(platformCacheRoot({ SUPERSKILL_CACHE_ROOT: "" })).toBe(platformCacheRoot({}));
    expect(isAbsolute(platformCacheRoot({ SUPERSKILL_CACHE_ROOT: "relative/dir" }))).toBe(true);
    expect(platformCacheRoot({ SUPERSKILL_CACHE_ROOT: "relative/dir" })).toBe(resolve("relative/dir"));
  });

  it("treats a blank XDG_CACHE_HOME as unset on linux", () => {
    platformState.value = "linux";
    expect(isAbsolute(platformCacheRoot({ XDG_CACHE_HOME: "" }))).toBe(true);
    expect(platformCacheRoot({ XDG_CACHE_HOME: "" })).toBe(join(homedir(), ".cache", "superskill"));
    expect(platformCacheRoot({ XDG_CACHE_HOME: "cache-root" })).toBe(resolve("cache-root", "superskill"));
  });

  it("treats a blank LOCALAPPDATA as unset on win32", () => {
    platformState.value = "win32";
    const root = platformCacheRoot({ LOCALAPPDATA: "" });
    expect(isAbsolute(root)).toBe(true);
    expect(root).toBe(resolve(join(homedir(), "AppData", "Local"), "superskill"));
  });
});

describe("localRemotePath", () => {
  it("detects local filesystem remotes", () => {
    expect(localRemotePath("/abs/path/repo")).toBe("/abs/path/repo");
    expect(localRemotePath("/abs/path/repo.git")).toBe("/abs/path/repo.git");
    expect(localRemotePath("../sibling")).toBe("../sibling");
    expect(localRemotePath("./sibling")).toBe("./sibling");
    expect(localRemotePath("sibling/repo")).toBe("sibling/repo");
    expect(localRemotePath("~/repo")).toBe("~/repo");
  });

  it("returns null for URL and scp-style remotes", () => {
    expect(localRemotePath("https://github.com/Owner/Repo.git")).toBeNull();
    expect(localRemotePath("ssh://git@github.com/Owner/Repo")).toBeNull();
    expect(localRemotePath("git@github.com:Owner/Repo.git")).toBeNull();
    expect(localRemotePath("")).toBeNull();
    expect(localRemotePath("   ")).toBeNull();
  });

  it("resolves file:// URLs to paths", () => {
    expect(localRemotePath("file:///tmp/repo")).toBe("/tmp/repo");
  });
});

describe("resolveRepoIdentity with local-path remotes", () => {
  let base: string;

  beforeEach(async () => {
    base = await mkdtemp(join(tmpdir(), "worktree-paths-"));
  });

  afterEach(async () => {
    await rm(base, { recursive: true, force: true });
  });

  async function initRepo(name: string, remote?: string): Promise<string> {
    const dir = join(base, name);
    await mkdir(dir, { recursive: true });
    await git(dir, ["init", "-q", "-b", "main"]);
    await git(dir, ["commit", "-q", "--allow-empty", "-m", "init"]);
    if (remote !== undefined) await git(dir, ["remote", "add", "origin", remote]);
    return dir;
  }

  it("gives a path-clone the source repo's identity and records the legacy id", async () => {
    const origin = await initRepo("origin", "https://github.com/Owner/Repo.git");
    const clone = join(base, "clone");
    await git(base, ["clone", "-q", origin, clone]);

    const originIdentity = await resolveRepoIdentity(origin);
    const cloneIdentity = await resolveRepoIdentity(clone);

    expect(cloneIdentity.repoId).toBe(originIdentity.repoId);
    expect(cloneIdentity.legacyRepoId).toBe(hashId(normalizeRemote(origin)));
    expect(originIdentity.legacyRepoId).toBeNull();
  });

  it("shares identity between sibling clones of the same local source", async () => {
    const origin = await initRepo("origin", "https://github.com/Owner/Repo.git");
    await git(base, ["clone", "-q", origin, join(base, "clone-a")]);
    await git(base, ["clone", "-q", origin, join(base, "clone-b")]);

    const a = await resolveRepoIdentity(join(base, "clone-a"));
    const b = await resolveRepoIdentity(join(base, "clone-b"));
    expect(a.repoId).toBe(b.repoId);
  });

  it("falls back to the source common dir when the source has no usable remote", async () => {
    const origin = await initRepo("origin");
    const clone = join(base, "clone");
    await git(base, ["clone", "-q", origin, clone]);

    const identity = await resolveRepoIdentity(clone);
    const originCommon = await realpath(join(origin, ".git"));
    expect(identity.repoId).toBe(hashId(originCommon));
    expect(identity.legacyRepoId).toBe(hashId(normalizeRemote(origin)));
  });

  it("handles file:// remotes like plain path remotes", async () => {
    const origin = await initRepo("origin", "https://github.com/Owner/Repo.git");
    const clone = join(base, "clone");
    await git(base, ["clone", "-q", `file://${origin}`, clone]);

    const originIdentity = await resolveRepoIdentity(origin);
    const cloneIdentity = await resolveRepoIdentity(clone);
    expect(cloneIdentity.repoId).toBe(originIdentity.repoId);
  });

  it("follows local-remote chains to the ultimate URL remote", async () => {
    const origin = await initRepo("origin", "https://github.com/Owner/Repo.git");
    const middle = join(base, "middle");
    await git(base, ["clone", "-q", origin, middle]);
    const leaf = join(base, "leaf");
    await git(base, ["clone", "-q", middle, leaf]);

    const originIdentity = await resolveRepoIdentity(origin);
    const leafIdentity = await resolveRepoIdentity(leaf);
    expect(leafIdentity.repoId).toBe(originIdentity.repoId);
    expect(leafIdentity.legacyRepoId).toBe(hashId(normalizeRemote(middle)));
  });

  it("terminates on cyclic local remotes", async () => {
    const a = await initRepo("repo-a");
    const b = await initRepo("repo-b");
    await git(a, ["remote", "add", "origin", b]);
    await git(b, ["remote", "add", "origin", a]);

    const identity = await resolveRepoIdentity(a);
    const bCommon = await realpath(join(b, ".git"));
    expect(identity.repoId).toBe(hashId(bCommon));
  });

  it("uses a deterministic path hash when the source repo is gone", async () => {
    const gone = join(base, "gone");
    const clone = await initRepo("clone", gone);

    const identity = await resolveRepoIdentity(clone);
    expect(identity.repoId).toBe(hashId(gone));
    expect(identity.legacyRepoId).toBeNull();
  });
});
