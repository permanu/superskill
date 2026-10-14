// SPDX-License-Identifier: Apache-2.0
import { accessSync, constants, existsSync, statSync } from "node:fs";
import { delimiter, join } from "node:path";
import type { EnvVar, ProviderContext, ToolchainProvider } from "./types.js";

export function commandExists(cmd: string): boolean {
  const pathValue = process.env.PATH;
  if (!pathValue) return false;
  for (const dir of pathValue.split(delimiter).slice(0, 128)) {
    if (!dir) continue;
    for (const name of process.platform === "win32" ? [cmd, `${cmd}.exe`] : [cmd]) {
      const path = join(dir, name);
      try {
        if (!statSync(path).isFile()) continue;
        accessSync(path, constants.X_OK);
        return true;
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code !== "ENOENT" && code !== "ENOTDIR" && code !== "EACCES") {
          console.error(`[toolchain-rust] cannot inspect executable ${path}: ${code ?? String(err)}`);
        }
      }
    }
  }
  return false;
}

export const DEFAULT_SCCACHE_CACHE_SIZE = "10G";

export function sccacheCacheSize(env: NodeJS.ProcessEnv = process.env): string {
  const override = env.SUPERSKILL_SCCACHE_CACHE_SIZE?.trim();
  return override && override.length > 0 ? override : DEFAULT_SCCACHE_CACHE_SIZE;
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
        { name: "SCCACHE_CACHE_SIZE", value: sccacheCacheSize() },
        { name: "SCCACHE_BASEDIRS", value: [...new Set([ctx.projectRoot, ctx.worktreeRoot])].join(delimiter) },
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
