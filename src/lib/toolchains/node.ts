// SPDX-License-Identifier: Apache-2.0

import { existsSync } from "node:fs";
import { join } from "node:path";
import type { CacheDirSpec, EnvVar, PruneSpec, ProviderContext, SeedSpec, ToolchainProvider } from "./types.js";

type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

const LOCKFILES: ReadonlyArray<readonly [string, PackageManager]> = [
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["bun.lock", "bun"],
  ["bun.lockb", "bun"],
  ["package-lock.json", "npm"],
];

const PM_CONFIG: Record<PackageManager, { envName: string; subdir: string; tool: string; description: string }> = {
  pnpm: {
    envName: "PNPM_CONFIG_STORE_DIR",
    subdir: "pnpm-store",
    tool: "pnpm",
    description: "pnpm content-addressable store shared across worktrees",
  },
  bun: {
    envName: "BUN_INSTALL_CACHE_DIR",
    subdir: "bun-cache",
    tool: "bun",
    description: "Bun package cache shared across worktrees",
  },
  yarn: {
    envName: "YARN_CACHE_FOLDER",
    subdir: "yarn-cache",
    tool: "yarn",
    description: "Yarn package cache shared across worktrees",
  },
  npm: {
    envName: "npm_config_cache",
    subdir: "npm-cache",
    tool: "npm",
    description: "npm package cache shared across worktrees",
  },
};

function detectPackageManager(ctx: ProviderContext): PackageManager {
  for (const [file, pm] of LOCKFILES) {
    if (ctx.projectFiles.includes(file) || existsSync(join(ctx.projectRoot, file))) {
      return pm;
    }
  }
  return "npm";
}

export const nodeProvider: ToolchainProvider = {
  id: "node",
  languages: ["typescript"],

  async detect(ctx: ProviderContext): Promise<boolean> {
    return existsSync(join(ctx.projectRoot, "package.json"));
  },

  async env(ctx: ProviderContext): Promise<EnvVar[]> {
    const pm = detectPackageManager(ctx);
    const cfg = PM_CONFIG[pm];
    const vars: EnvVar[] = [
      { name: cfg.envName, value: join(ctx.cacheNamespace, pm, cfg.subdir) },
    ];
    if (pm === "pnpm") {
      vars.push({ name: "PNPM_CONFIG_PACKAGE_IMPORT_METHOD", value: "clone" });
    }
    return vars;
  },

  async cacheDirs(ctx: ProviderContext): Promise<CacheDirSpec[]> {
    const pm = detectPackageManager(ctx);
    const cfg = PM_CONFIG[pm];
    return [
      {
        id: cfg.subdir,
        path: join(ctx.cacheNamespace, pm, cfg.subdir),
        tool: cfg.tool,
        description: cfg.description,
        autoSafe: true,
      },
      {
        id: "node-modules",
        path: join(ctx.worktreeRoot, "node_modules"),
        tool: "node",
        description: "per-worktree dependency tree; seeded via reflink, never shared",
        autoSafe: false,
      },
    ];
  },

  async seed(ctx: ProviderContext): Promise<SeedSpec[]> {
    return [
      {
        source: join(ctx.projectRoot, "node_modules"),
        dest: join(ctx.worktreeRoot, "node_modules"),
        kind: "dir",
        method: "auto-reflink",
        relative: "node_modules",
      },
    ];
  },

  async prune(ctx: ProviderContext): Promise<PruneSpec | null> {
    if (detectPackageManager(ctx) !== "pnpm") return null;
    return {
      tool: "pnpm",
      command: "pnpm",
      args: ["store", "prune"],
      description: "Remove unreferenced packages from pnpm store",
      autoSafe: true,
      minAgeDays: 0,
    };
  },

  async notes(_ctx: ProviderContext): Promise<string[]> {
    return [
      "Never symlink node_modules across worktrees; always install per worktree from a shared content-addressable store.",
      "Turborepo and Nx caches are already shared across worktrees by default; do not override their cache dirs.",
    ];
  },
};
