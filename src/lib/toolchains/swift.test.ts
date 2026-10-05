// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { swiftProvider } from "./swift.js";
import type { ProviderContext } from "./types.js";

function makeCtx(projectRoot: string, overrides: Partial<ProviderContext> = {}): ProviderContext {
  return {
    projectRoot,
    worktreeRoot: join(projectRoot, ".worktrees", "feature-x"),
    repoId: "repo123",
    cacheNamespace: join(tmpdir(), "superskill-cache", "repo123"),
    worktreeKey: "feature-x",
    home: tmpdir(),
    projectFiles: [],
    ...overrides,
  };
}

describe("swiftProvider", () => {
  describe("detect", () => {
    let dir: string;

    beforeEach(async () => {
      dir = await mkdtemp(join(tmpdir(), "swift-provider-"));
    });

    afterEach(async () => {
      await rm(dir, { recursive: true, force: true });
    });

    it("detects Package.swift", async () => {
      await writeFile(join(dir, "Package.swift"), "// swift-tools-version:5.9\n");
      expect(await swiftProvider.detect(makeCtx(dir))).toBe(true);
    });

    it("returns false for an empty directory", async () => {
      expect(await swiftProvider.detect(makeCtx(dir))).toBe(false);
    });

    it("detects an .xcodeproj directory", async () => {
      await mkdir(join(dir, "App.xcodeproj"));
      expect(await swiftProvider.detect(makeCtx(dir))).toBe(true);
    });

    it("detects an .xcworkspace directory", async () => {
      await mkdir(join(dir, "App.xcworkspace"));
      expect(await swiftProvider.detect(makeCtx(dir))).toBe(true);
    });

    it("returns false when projectRoot does not exist", async () => {
      expect(await swiftProvider.detect(makeCtx(join(dir, "missing")))).toBe(false);
    });
  });

  describe("env", () => {
    it("returns the exact cache env keys under the namespace", async () => {
      const ctx = makeCtx("/repo");
      const env = await swiftProvider.env(ctx);
      expect(env.map((v) => v.name).sort()).toEqual([
        "CLANG_MODULE_CACHE_PATH",
        "COMPILATION_CACHE_CAS_PATH",
        "COMPILATION_CACHE_KEEP_CAS_DIRECTORY",
        "MODULE_CACHE_DIR",
      ]);
      const values = Object.fromEntries(env.map((v) => [v.name, v.value]));
      expect(values["MODULE_CACHE_DIR"]).toBe(join(ctx.cacheNamespace, "swift-module-cache"));
      expect(values["CLANG_MODULE_CACHE_PATH"]).toBe(join(ctx.cacheNamespace, "clang-module-cache"));
      expect(values["COMPILATION_CACHE_CAS_PATH"]).toBe(join(ctx.cacheNamespace, "xcode-cas"));
      expect(values["COMPILATION_CACHE_KEEP_CAS_DIRECTORY"]).toBe("YES");
    });
  });

  describe("cacheDirs", () => {
    it("places shared caches under the namespace and DerivedData under the worktree", async () => {
      const ctx = makeCtx("/repo");
      const dirs = await swiftProvider.cacheDirs(ctx);
      const byId = Object.fromEntries(dirs.map((d) => [d.id, d]));

      expect(byId["swift-module-cache"].path).toBe(join(ctx.cacheNamespace, "swift-module-cache"));
      expect(byId["clang-module-cache"].path).toBe(join(ctx.cacheNamespace, "clang-module-cache"));
      expect(byId["xcode-cas"].path).toBe(join(ctx.cacheNamespace, "xcode-cas"));
      expect(byId["swift-derived-data"].path).toBe(
        join(ctx.worktreeRoot, ".superskill", "DerivedData"),
      );
    });

    it("marks only the shared caches autoSafe", async () => {
      const dirs = await swiftProvider.cacheDirs(makeCtx("/repo"));
      const autoSafe = dirs.filter((d) => d.autoSafe).map((d) => d.id).sort();
      expect(autoSafe).toEqual(["clang-module-cache", "swift-module-cache", "xcode-cas"]);
      expect(dirs.find((d) => d.id === "swift-derived-data")?.autoSafe).toBe(false);
    });
  });

  describe("seed", () => {
    it("offers no seeds", async () => {
      expect(await swiftProvider.seed(makeCtx("/repo"))).toEqual([]);
    });
  });

  describe("prune", () => {
    it("returns null (Xcode-managed only)", async () => {
      expect(await swiftProvider.prune(makeCtx("/repo"))).toBeNull();
    });
  });

  describe("notes", () => {
    it("documents DerivedData and SwiftPM scoping", async () => {
      const notes = await swiftProvider.notes(makeCtx("/repo"));
      expect(notes).toHaveLength(3);
      expect(notes[0]).toContain("build.db is single-writer");
      expect(notes[1]).toContain("-derivedDataPath");
      expect(notes[2]).toContain(".build");
    });
  });
});
