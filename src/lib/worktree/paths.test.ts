import { describe, it, expect, beforeEach, vi } from "vitest";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { normalizeRemote, platformCacheRoot } from "./paths.js";

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
