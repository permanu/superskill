// SPDX-License-Identifier: Apache-2.0

import { existsSync } from "node:fs";
import { join } from "node:path";
import type { CacheDirSpec, EnvVar, PruneSpec, SeedSpec, ToolchainProvider } from "./types.js";

export const rubyProvider: ToolchainProvider = {
  id: "ruby",
  languages: ["ruby"],

  async detect(ctx): Promise<boolean> {
    return existsSync(join(ctx.projectRoot, "Gemfile"));
  },

  async env(ctx): Promise<EnvVar[]> {
    return [
      {
        name: "BUNDLE_USER_CACHE",
        value: join(ctx.cacheNamespace, "bundle-cache"),
      },
    ];
  },

  async cacheDirs(ctx): Promise<CacheDirSpec[]> {
    return [
      {
        id: "ruby-bundle-cache",
        path: join(ctx.cacheNamespace, "bundle-cache"),
        tool: "bundler",
        description: "Bundler download/build cache shared across worktrees",
        autoSafe: true,
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
      "System gems are already shared across worktrees; do not set a shared BUNDLE_PATH when lockfiles can diverge.",
      "bootsnap caches are path-keyed and safe per worktree; never share them.",
    ];
  },
};
