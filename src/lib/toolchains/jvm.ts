// SPDX-License-Identifier: Apache-2.0

import { existsSync } from "node:fs";
import { join } from "node:path";
import type { CacheDirSpec, EnvVar, PruneSpec, SeedSpec, ToolchainProvider } from "./types.js";

const JVM_PROJECT_FILES = [
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "settings.gradle",
  "settings.gradle.kts",
];

const MAVEN_OPTS_VALUE =
  "-Daether.syncContext.named.factory=file-lock -Daether.syncContext.named.nameMapper=file-gav";

export const jvmProvider: ToolchainProvider = {
  id: "jvm",
  languages: ["java"],

  async detect(ctx): Promise<boolean> {
    return JVM_PROJECT_FILES.some((file) => existsSync(join(ctx.projectRoot, file)));
  },

  async env(ctx): Promise<EnvVar[]> {
    if (!existsSync(join(ctx.projectRoot, "pom.xml"))) {
      return [];
    }
    return [
      {
        name: "MAVEN_OPTS",
        value: MAVEN_OPTS_VALUE,
        mode: "append",
      },
    ];
  },

  async cacheDirs(ctx): Promise<CacheDirSpec[]> {
    return [
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
    ];
  },

  async seed(_ctx): Promise<SeedSpec[]> {
    return [];
  },

  async prune(_ctx): Promise<PruneSpec | null> {
    return null;
  },

  async notes(_ctx): Promise<string[]> {
    return [
      "Never share project .gradle/ state or build/ across worktrees; configuration cache is not relocatable.",
      "Prefer a shared HTTP build cache node over one shared build-cache directory for parallel worktree builds.",
      "Maven needs -Daether.syncContext.named.factory=file-lock for safe multi-process repo sharing.",
    ];
  },
};
