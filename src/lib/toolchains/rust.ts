// SPDX-License-Identifier: Apache-2.0
import { existsSync } from "node:fs";
import { delimiter, join } from "node:path";
import type { EnvVar, ProviderContext, ToolchainProvider } from "./types.js";

export function commandExists(cmd: string): boolean {
  const pathValue = process.env.PATH;
  if (!pathValue) return false;
  for (const dir of pathValue.split(delimiter)) {
    if (!dir) continue;
    if (existsSync(join(dir, cmd)) || existsSync(join(dir, `${cmd}.exe`))) return true;
  }
  return false;
}

export const rustProvider: ToolchainProvider = {
  id: "rust",
  languages: ["rust"],
  async detect(ctx: ProviderContext): Promise<boolean> {
    return existsSync(join(ctx.projectRoot, "Cargo.toml"));
  },
  async env(ctx: ProviderContext): Promise<EnvVar[]> {
    const vars: EnvVar[] = [
      {
        name: "CARGO_BUILD_BUILD_DIR",
        value: join(ctx.cacheNamespace, "cargo-build", ctx.worktreeKey),
      },
    ];
    if (commandExists("sccache")) {
      vars.push(
        { name: "RUSTC_WRAPPER", value: "sccache" },
        { name: "SCCACHE_DIR", value: join(ctx.cacheNamespace, "sccache") },
        { name: "SCCACHE_CACHE_SIZE", value: "20G" },
        { name: "SCCACHE_BASEDIRS", value: ctx.projectRoot },
        { name: "CARGO_INCREMENTAL", value: "0" },
      );
    }
    return vars;
  },
  async cacheDirs(ctx: ProviderContext) {
    return [
      {
        id: "rust-sccache",
        path: join(ctx.cacheNamespace, "sccache"),
        tool: "sccache",
        description: "Rust compiler cache shared across worktrees",
        autoSafe: true,
      },
      {
        id: "rust-build-dir",
        path: join(ctx.cacheNamespace, "cargo-build"),
        tool: "cargo",
        description: "Cargo intermediates relocated out of worktrees (Cargo >=1.91)",
        autoSafe: false,
      },
    ];
  },
  async seed(ctx: ProviderContext) {
    return [
      {
        source: join(ctx.projectRoot, "target"),
        dest: join(ctx.worktreeRoot, "target"),
        kind: "dir" as const,
        method: "auto-reflink" as const,
        relative: "target",
      },
    ];
  },
  async prune() {
    return null;
  },
  async notes() {
    return [
      "Never share CARGO_TARGET_DIR across concurrent worktrees (stale fingerprints, cargo#16642).",
      "CCACHE/SCCACHE cross-worktree hits require SCCACHE_BASEDIRS to cover every worktree path.",
      "kache is an alternative wrapper for higher cross-worktree hit rates.",
    ];
  },
};
