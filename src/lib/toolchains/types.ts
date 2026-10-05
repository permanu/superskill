// SPDX-License-Identifier: Apache-2.0

export interface EnvVar {
  name: string;
  value: string;
  /** Merge strategy when the variable already exists. Default: replace. */
  mode?: "set" | "append" | "prepend" | "path-prepend";
}

export interface CacheDirSpec {
  id: string;
  path: string;
  tool: string;
  description: string;
  /** Safe for automated reclaim (tool-managed, content-addressed, self-cleaning). */
  autoSafe: boolean;
}

export interface SeedSpec {
  /** Absolute path in a source worktree (usually the main worktree). */
  source: string;
  /** Absolute path in the destination worktree. */
  dest: string;
  kind: "dir" | "file";
  method: "auto-reflink" | "copy";
  /** Relative path inside the worktree, for reporting. */
  relative: string;
}

export interface PruneSpec {
  tool: string;
  command: string;
  args: string[];
  description: string;
  autoSafe: boolean;
  /** Minimum age in days for entries before the tool prune runs. */
  minAgeDays: number;
}

export interface ProviderContext {
  /** Main worktree root (repo root containing the shared .git dir). */
  projectRoot: string;
  /** Current worktree root (may equal projectRoot). */
  worktreeRoot: string;
  /** Stable repo identity derived from remote URL hash or path fallback. */
  repoId: string;
  /** Platform cache namespace for this repo: <cacheRoot>/<repoId>. */
  cacheNamespace: string;
  /** Per-worktree key for namespaced intermediate dirs. */
  worktreeKey: string;
  home: string;
  /** Files present at the project root, pre-scanned by the caller. */
  projectFiles: string[];
}

export interface ToolchainProvider {
  /** Stable id: rust | go | node | python | ruby | jvm | swift | cpp */
  id: string;
  /** Language names from stack-detector this provider serves. */
  languages: string[];
  /** True when this provider applies to the repo. */
  detect(ctx: ProviderContext): Promise<boolean>;
  /** Environment variables to inject into agent/build sessions. */
  env(ctx: ProviderContext): Promise<EnvVar[]>;
  /** Cache directories owned or redirected by this provider. */
  cacheDirs(ctx: ProviderContext): Promise<CacheDirSpec[]>;
  /** Cheap per-worktree seeds (CoW copies) performed at worktree creation. */
  seed(ctx: ProviderContext): Promise<SeedSpec[]>;
  /** Optional tool-native prune command for GC. */
  prune(ctx: ProviderContext): Promise<PruneSpec | null>;
  /** Safety notes surfaced in audit/status output. */
  notes(ctx: ProviderContext): Promise<string[]>;
}
