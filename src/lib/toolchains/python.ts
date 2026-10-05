// SPDX-License-Identifier: Apache-2.0

import { existsSync } from "node:fs";
import { join } from "node:path";
import type { CacheDirSpec, EnvVar, PruneSpec, ProviderContext, SeedSpec, ToolchainProvider } from "./types.js";

const MARKERS = ["pyproject.toml", "requirements.txt", "uv.lock", "poetry.lock", "pdm.lock", "pixi.toml"];

export const pythonProvider: ToolchainProvider = {
  id: "python",
  languages: ["python"],

  async detect(ctx: ProviderContext): Promise<boolean> {
    return MARKERS.some((marker) => existsSync(join(ctx.projectRoot, marker)));
  },

  async env(ctx: ProviderContext): Promise<EnvVar[]> {
    return [
      { name: "UV_CACHE_DIR", value: join(ctx.cacheNamespace, "uv") },
      { name: "PIP_CACHE_DIR", value: join(ctx.cacheNamespace, "pip") },
      { name: "POETRY_CACHE_DIR", value: join(ctx.cacheNamespace, "pypoetry") },
      { name: "PDM_CACHE_DIR", value: join(ctx.cacheNamespace, "pdm") },
      { name: "PIXI_CACHE_DIR", value: join(ctx.cacheNamespace, "pixi") },
    ];
  },

  async cacheDirs(ctx: ProviderContext): Promise<CacheDirSpec[]> {
    return [
      {
        id: "uv-cache",
        path: join(ctx.cacheNamespace, "uv"),
        tool: "uv",
        description: "uv package/build cache shared across worktrees",
        autoSafe: true,
      },
      {
        id: "pip-cache",
        path: join(ctx.cacheNamespace, "pip"),
        tool: "pip",
        description: "pip wheel/download cache shared across worktrees",
        autoSafe: true,
      },
      {
        id: "poetry-cache",
        path: join(ctx.cacheNamespace, "pypoetry"),
        tool: "poetry",
        description: "Poetry cache shared across worktrees",
        autoSafe: true,
      },
      {
        id: "pdm-cache",
        path: join(ctx.cacheNamespace, "pdm"),
        tool: "pdm",
        description: "PDM cache shared across worktrees",
        autoSafe: true,
      },
      {
        id: "pixi-cache",
        path: join(ctx.cacheNamespace, "pixi"),
        tool: "pixi",
        description: "pixi package cache shared across worktrees",
        autoSafe: true,
      },
    ];
  },

  async seed(_ctx: ProviderContext): Promise<SeedSpec[]> {
    return [];
  },

  async prune(_ctx: ProviderContext): Promise<PruneSpec | null> {
    return {
      tool: "uv",
      command: "uv",
      args: ["cache", "prune", "--ci"],
      description: "Trim uv cache (keeps source-built wheels)",
      autoSafe: true,
      minAgeDays: 30,
    };
  },

  async notes(_ctx: ProviderContext): Promise<string[]> {
    return [
      "Per-worktree .venv stays per worktree (editable installs embed absolute paths).",
      "uv's default clone/hardlink linking makes venvs cheap; pip cache is tarball-only.",
    ];
  },
};
