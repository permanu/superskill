// SPDX-License-Identifier: Apache-2.0
import { existsSync } from "fs";
import { join } from "path";
import type {
  CacheDirSpec,
  EnvVar,
  ProviderContext,
  PruneSpec,
  SeedSpec,
  ToolchainProvider,
} from "./types.js";

const BUILD_FILES = [
  "CMakeLists.txt",
  "meson.build",
  "BUILD",
  "BUILD.bazel",
  "WORKSPACE",
  "WORKSPACE.bazel",
];

export const cppProvider: ToolchainProvider = {
  id: "cpp",
  languages: ["cpp"],

  async detect(ctx: ProviderContext): Promise<boolean> {
    return BUILD_FILES.some((file) => existsSync(join(ctx.projectRoot, file)));
  },

  async env(ctx: ProviderContext): Promise<EnvVar[]> {
    return [
      { name: "CCACHE_DIR", value: join(ctx.cacheNamespace, "ccache") },
      { name: "CCACHE_BASEDIR", value: ctx.projectRoot },
      { name: "CCACHE_NOHASHDIR", value: "1" },
      { name: "CCACHE_MAXSIZE", value: "50G" },
      { name: "SCCACHE_DIR", value: join(ctx.cacheNamespace, "sccache") },
      { name: "SCCACHE_BASEDIRS", value: ctx.projectRoot },
    ];
  },

  async cacheDirs(ctx: ProviderContext): Promise<CacheDirSpec[]> {
    return [
      {
        id: "ccache",
        path: join(ctx.cacheNamespace, "ccache"),
        tool: "ccache",
        description: "Shared ccache directory (compiler cache)",
        autoSafe: true,
      },
      {
        id: "sccache",
        path: join(ctx.cacheNamespace, "sccache"),
        tool: "sccache",
        description: "Shared sccache directory (compiler cache)",
        autoSafe: true,
      },
    ];
  },

  async seed(_ctx: ProviderContext): Promise<SeedSpec[]> {
    return [];
  },

  async prune(_ctx: ProviderContext): Promise<PruneSpec | null> {
    return {
      tool: "ccache",
      command: "ccache",
      args: ["--cleanup"],
      description: "ccache cleanup of old entries",
      autoSafe: true,
      minAgeDays: 30,
    };
  },

  async notes(_ctx: ProviderContext): Promise<string[]> {
    return [
      "CCACHE_BASEDIR + CCACHE_NOHASHDIR are both required for cross-worktree hits with -g; avoid single-file mode (hash_dir=true breaks hits).",
      "Build dirs (CMakeCache.txt, .ninja_deps, meson-private) are absolute-path bound: per worktree only.",
      "Bazel: share --disk_cache only; never share --output_base between worktrees.",
    ];
  },
};
