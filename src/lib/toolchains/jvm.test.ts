// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ProviderContext } from "./types.js";
import { jvmProvider } from "./jvm.js";

let root: string;
let ctx: ProviderContext;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "jvm-provider-"));
  const home = join(root, "home");
  const cacheNamespace = join(root, "cache", "repo-abc");
  const projectRoot = join(root, "project");
  await mkdir(home, { recursive: true });
  await mkdir(projectRoot, { recursive: true });
  ctx = {
    projectRoot,
    worktreeRoot: projectRoot,
    repoId: "repo-abc",
    cacheNamespace,
    worktreeKey: "wt-1",
    home,
    projectFiles: [],
  };
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("jvmProvider", () => {
  it("exposes id and languages", () => {
    expect(jvmProvider.id).toBe("jvm");
    expect(jvmProvider.languages).toEqual(["java"]);
  });

  it("detects no build files", async () => {
    expect(await jvmProvider.detect(ctx)).toBe(false);
  });

  it.each(["pom.xml", "build.gradle", "build.gradle.kts", "settings.gradle", "settings.gradle.kts"])(
    "detects %s",
    async (file) => {
      await writeFile(join(ctx.projectRoot, file), "");
      expect(await jvmProvider.detect(ctx)).toBe(true);
    },
  );

  it("appends Maven file-lock options only for pom.xml projects", async () => {
    await writeFile(join(ctx.projectRoot, "pom.xml"), "<project/>");
    expect(await jvmProvider.env(ctx)).toEqual([
      {
        name: "MAVEN_OPTS",
        value:
          "-Daether.syncContext.named.factory=file-lock -Daether.syncContext.named.nameMapper=file-gav",
        mode: "append",
      },
    ]);
  });

  it("returns no env for Gradle-only projects", async () => {
    await writeFile(join(ctx.projectRoot, "build.gradle"), "");
    const env = await jvmProvider.env(ctx);
    expect(env).toEqual([]);
    expect(env.map((entry) => entry.name)).not.toContain("GRADLE_USER_HOME");
  });

  it("reports Maven and Gradle cache dirs under the fake home", async () => {
    expect(await jvmProvider.cacheDirs(ctx)).toEqual([
      {
        id: "jvm-m2",
        path: join(ctx.home, ".m2", "repository"),
        tool: "maven",
        description: "Maven local repository (already shared across worktrees)",
        autoSafe: false,
      },
      {
        id: "jvm-gradle-deps",
        path: join(ctx.home, ".gradle", "caches"),
        tool: "gradle",
        description: "Gradle dependency/build caches (already shared, tool-GC'd)",
        autoSafe: false,
      },
    ]);
  });

  it("seeds nothing and prunes nothing", async () => {
    expect(await jvmProvider.seed(ctx)).toEqual([]);
    expect(await jvmProvider.prune(ctx)).toBeNull();
  });

  it("documents the configuration-cache and repo-sharing hazards", async () => {
    expect(await jvmProvider.notes(ctx)).toEqual([
      "Never share project .gradle/ state or build/ across worktrees; configuration cache is not relocatable.",
      "Prefer a shared HTTP build cache node over one shared build-cache directory for parallel worktree builds.",
      "Maven needs -Daether.syncContext.named.factory=file-lock for safe multi-process repo sharing.",
    ]);
  });
});
