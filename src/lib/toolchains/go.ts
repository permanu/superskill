// SPDX-License-Identifier: Apache-2.0
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { EnvVar, ProviderContext, ToolchainProvider } from "./types.js";

export const goProvider: ToolchainProvider = {
  id: "go",
  languages: ["go"],
  async detect(ctx: ProviderContext): Promise<boolean> {
    return existsSync(join(ctx.projectRoot, "go.mod"));
  },
  async env(ctx: ProviderContext): Promise<EnvVar[]> {
    return [
      { name: "GOCACHE", value: join(ctx.cacheNamespace, "go-build") },
      { name: "GOMODCACHE", value: join(ctx.cacheNamespace, "go-mod") },
      { name: "GOFLAGS", value: "-trimpath", mode: "append" },
    ];
  },
  async cacheDirs(ctx: ProviderContext) {
    return [
      {
        id: "go-build",
        path: join(ctx.cacheNamespace, "go-build"),
        tool: "go",
        description: "Go build cache shared across worktrees",
        autoSafe: true,
      },
      {
        id: "go-mod",
        path: join(ctx.cacheNamespace, "go-mod"),
        tool: "go",
        description: "Go module download cache shared across worktrees",
        autoSafe: true,
      },
    ];
  },
  async seed() {
    return [];
  },
  async prune() {
    return {
      tool: "go",
      command: "go",
      args: ["clean", "-cache"],
      description: "Trim Go build cache (tool-managed, self-trimming)",
      autoSafe: true,
      minAgeDays: 0,
    };
  },
  async notes() {
    return [
      "Default GOCACHE/GOMODCACHE are already shared per user; isolated HOME (containers/agents) is the duplication vector.",
      "GOFLAGS=-trimpath is appended, never replaced.",
    ];
  },
};
