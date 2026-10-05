// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { cppProvider } from "./cpp.js";
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

describe("cppProvider", () => {
  describe("detect", () => {
    let dir: string;

    beforeEach(async () => {
      dir = await mkdtemp(join(tmpdir(), "cpp-provider-"));
    });

    afterEach(async () => {
      await rm(dir, { recursive: true, force: true });
    });

    it("detects CMakeLists.txt", async () => {
      await writeFile(join(dir, "CMakeLists.txt"), "cmake_minimum_required(VERSION 3.20)\n");
      expect(await cppProvider.detect(makeCtx(dir))).toBe(true);
    });

    it("returns false for an empty directory", async () => {
      expect(await cppProvider.detect(makeCtx(dir))).toBe(false);
    });

    it("detects meson.build", async () => {
      await writeFile(join(dir, "meson.build"), "project('demo', 'cpp')\n");
      expect(await cppProvider.detect(makeCtx(dir))).toBe(true);
    });

    it("detects BUILD.bazel", async () => {
      await writeFile(join(dir, "BUILD.bazel"), "cc_binary(name = \"demo\")\n");
      expect(await cppProvider.detect(makeCtx(dir))).toBe(true);
    });

    it("returns false when projectRoot does not exist", async () => {
      expect(await cppProvider.detect(makeCtx(join(dir, "missing")))).toBe(false);
    });
  });

  describe("env", () => {
    it("returns the exact ccache/sccache env values", async () => {
      const ctx = makeCtx("/repo");
      const env = await cppProvider.env(ctx);
      expect(env.map((v) => v.name).sort()).toEqual([
        "CCACHE_BASEDIR",
        "CCACHE_DIR",
        "CCACHE_MAXSIZE",
        "CCACHE_NOHASHDIR",
        "SCCACHE_BASEDIRS",
        "SCCACHE_DIR",
      ]);
      const values = Object.fromEntries(env.map((v) => [v.name, v.value]));
      expect(values["CCACHE_DIR"]).toBe(join(ctx.cacheNamespace, "ccache"));
      expect(values["CCACHE_BASEDIR"]).toBe(ctx.projectRoot);
      expect(values["CCACHE_NOHASHDIR"]).toBe("1");
      expect(values["CCACHE_MAXSIZE"]).toBe("50G");
      expect(values["SCCACHE_DIR"]).toBe(join(ctx.cacheNamespace, "sccache"));
      expect(values["SCCACHE_BASEDIRS"]).toBe(ctx.projectRoot);
    });
  });

  describe("cacheDirs", () => {
    it("places ccache and sccache under the namespace", async () => {
      const ctx = makeCtx("/repo");
      const dirs = await cppProvider.cacheDirs(ctx);
      const byId = Object.fromEntries(dirs.map((d) => [d.id, d]));

      expect(byId["ccache"].path).toBe(join(ctx.cacheNamespace, "ccache"));
      expect(byId["sccache"].path).toBe(join(ctx.cacheNamespace, "sccache"));
      expect(byId["ccache"].autoSafe).toBe(true);
      expect(byId["sccache"].autoSafe).toBe(true);
      expect(dirs).toHaveLength(2);
    });
  });

  describe("seed", () => {
    it("offers no seeds (build dirs are absolute-path bound)", async () => {
      expect(await cppProvider.seed(makeCtx("/repo"))).toEqual([]);
    });
  });

  describe("prune", () => {
    it("returns a safe ccache cleanup spec", async () => {
      await expect(cppProvider.prune(makeCtx("/repo"))).resolves.toEqual({
        tool: "ccache",
        command: "ccache",
        args: ["--cleanup"],
        description: "ccache cleanup of old entries",
        autoSafe: true,
        minAgeDays: 30,
      });
    });
  });

  describe("notes", () => {
    it("documents cache env and build-dir scoping", async () => {
      const notes = await cppProvider.notes(makeCtx("/repo"));
      expect(notes).toHaveLength(3);
      expect(notes[0]).toContain("CCACHE_BASEDIR");
      expect(notes[1]).toContain("CMakeCache.txt");
      expect(notes[2]).toContain("Bazel");
    });
  });
});
