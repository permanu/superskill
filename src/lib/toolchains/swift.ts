// SPDX-License-Identifier: Apache-2.0
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import type {
  CacheDirSpec,
  EnvVar,
  ProviderContext,
  PruneSpec,
  SeedSpec,
  ToolchainProvider,
} from "./types.js";

function hasXcodeProjectEntry(projectRoot: string): boolean {
  let entries: string[];
  try {
    entries = readdirSync(projectRoot);
  } catch (e: any) {
    if (e?.code === "ENOENT") return false;
    throw e;
  }
  return entries.some((entry) => entry.endsWith(".xcodeproj") || entry.endsWith(".xcworkspace"));
}

export const swiftProvider: ToolchainProvider = {
  id: "swift",
  languages: ["swift"],

  async detect(ctx: ProviderContext): Promise<boolean> {
    if (existsSync(join(ctx.projectRoot, "Package.swift"))) return true;
    return hasXcodeProjectEntry(ctx.projectRoot);
  },

  async env(ctx: ProviderContext): Promise<EnvVar[]> {
    return [
      { name: "MODULE_CACHE_DIR", value: join(ctx.cacheNamespace, "swift-module-cache") },
      { name: "CLANG_MODULE_CACHE_PATH", value: join(ctx.cacheNamespace, "clang-module-cache") },
      { name: "COMPILATION_CACHE_CAS_PATH", value: join(ctx.cacheNamespace, "xcode-cas") },
      { name: "COMPILATION_CACHE_KEEP_CAS_DIRECTORY", value: "YES" },
    ];
  },

  async cacheDirs(ctx: ProviderContext): Promise<CacheDirSpec[]> {
    return [
      {
        id: "swift-module-cache",
        path: join(ctx.cacheNamespace, "swift-module-cache"),
        tool: "swift",
        description: "Shared Swift module cache (compiler module artifacts)",
        autoSafe: true,
      },
      {
        id: "clang-module-cache",
        path: join(ctx.cacheNamespace, "clang-module-cache"),
        tool: "clang",
        description: "Shared Clang module cache (module/PCH artifacts)",
        autoSafe: true,
      },
      {
        id: "xcode-cas",
        path: join(ctx.cacheNamespace, "xcode-cas"),
        tool: "xcode",
        description: "Xcode compilation cache CAS (content-addressed)",
        autoSafe: true,
      },
      {
        id: "swift-derived-data",
        path: join(ctx.worktreeRoot, ".superskill", "DerivedData"),
        tool: "xcode",
        description: "Per-worktree Xcode DerivedData (never shared; build.db is single-writer)",
        autoSafe: false,
      },
    ];
  },

  async seed(_ctx: ProviderContext): Promise<SeedSpec[]> {
    return [];
  },

  async prune(_ctx: ProviderContext): Promise<PruneSpec | null> {
    return null;
  },

  async notes(_ctx: ProviderContext): Promise<string[]> {
    return [
      "Never share DerivedData across concurrent worktrees: build.db is single-writer and xcodebuild errors on concurrent use.",
      "Use -derivedDataPath per worktree; share only ModuleCache and CompilationCache CAS.",
      "SwiftPM scratch (.build) stays per worktree; only --cache-path is shared.",
    ];
  },
};
