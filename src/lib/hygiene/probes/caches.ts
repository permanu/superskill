// SPDX-License-Identifier: Apache-2.0
import type { Dirent } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, isAbsolute, join, relative } from "node:path";
import { formatBytes } from "../../format-bytes.js";
import { probeDirAge, probeDirSize } from "../../worktree/audit.js";
import {
  inferTool,
  scanCacheRoot,
  type GcCandidate,
  type GcTier,
} from "../../worktree/gc.js";
import { hashId, platformCacheRoot } from "../../worktree/paths.js";
import type { HygienePolicy } from "../policy.js";
import type {
  HygieneItem,
  HygieneProbe,
  HygieneProbeOptions,
  HygieneProbeResult,
} from "../types.js";

const DEFAULT_ITEM_CAP = 40;
const MANAGED_ITEM_CAP = 60;

export interface CachesProbeDeps {
  scanCacheRoot?: typeof scanCacheRoot;
  inferTool?: typeof inferTool;
  platformCacheRoot?: typeof platformCacheRoot;
  home?: string;
  platform?: string;
}

const NAME_ALIASES = new Map<string, { tool: string; tier: GcTier }>([
  ["mozilla.sccache", { tool: "rust", tier: "auto" }],
  ["org.swift.swiftpm", { tool: "swift", tier: "auto" }],
]);

interface DefaultCacheEntry {
  path: string;
  name: string;
  tool: string;
  tier: GcTier;
  plan?: string;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function quoteShell(value: string): string {
  return `"${value.replace(/[\\"$`]/g, (char) => `\\${char}`)}"`;
}

function isDue(
  tier: GcTier,
  bytes: number | null,
  ageDays: number | null,
  policy: HygienePolicy,
): boolean {
  if (ageDays === null || ageDays < policy.cacheAutoMinAgeDays) return false;
  if (tier === "auto") return true;
  return bytes !== null && bytes >= policy.cacheConsentMinBytes;
}

function ageLabel(ageDays: number | null): string {
  return ageDays === null ? "unknown age" : `idle ${Math.floor(ageDays)}d`;
}

function relativeToRoot(root: string, path: string): string {
  const rel = relative(root, path);
  return rel.length === 0 || rel.startsWith("..") || isAbsolute(rel) ? path : rel;
}

function managedItem(
  candidate: GcCandidate,
  cacheRoot: string,
  policy: HygienePolicy,
  sizes: boolean,
): HygieneItem {
  const target = relativeToRoot(cacheRoot, candidate.path);
  const floor = policy.cacheAutoMinAgeDays;
  const bytes = sizes ? candidate.bytes : null;
  const plan =
    candidate.tier === "consent"
      ? `superskill-cli worktree gc --older-than ${floor}d --tier consent --include ${quoteShell(target)} --apply`
      : `superskill-cli worktree gc --older-than ${floor}d --include ${quoteShell(target)} --apply`;
  return {
    id: `cache:${hashId(candidate.path)}`,
    category: "caches",
    title: `${candidate.tool} cache — ${candidate.repoId}/${basename(candidate.path)}`,
    path: candidate.path,
    bytes,
    ageDays: candidate.ageDays,
    tier: candidate.tier,
    due: isDue(candidate.tier, bytes, candidate.ageDays, policy),
    reason:
      candidate.tier === "consent"
        ? `large cache (${formatBytes(bytes, { nullLabel: "unknown size", maxUnit: "TB" })}), ${ageLabel(candidate.ageDays)} — consent required`
        : `rebuildable cache, ${ageLabel(candidate.ageDays)} (auto tier)`,
    plan,
    meta: { repoId: candidate.repoId, tool: candidate.tool, tier: candidate.tier },
  };
}

function capManagedItems(items: HygieneItem[]): HygieneItem[] {
  if (items.length <= MANAGED_ITEM_CAP) return items;
  return [...items]
    .sort((a, b) => {
      if (a.due !== b.due) return a.due ? -1 : 1;
      const aBytes = a.bytes ?? -1;
      const bBytes = b.bytes ?? -1;
      if (aBytes !== bBytes) return bBytes - aBytes;
      const aAge = a.ageDays ?? -1;
      const bAge = b.ageDays ?? -1;
      if (aAge !== bAge) return bAge - aAge;
      return a.title.localeCompare(b.title);
    })
    .slice(0, MANAGED_ITEM_CAP);
}

async function collectManagedItems(
  opts: HygieneProbeOptions,
  deps: CachesProbeDeps,
): Promise<HygieneItem[]> {
  const scan = deps.scanCacheRoot ?? scanCacheRoot;
  const cacheRootOf = deps.platformCacheRoot ?? platformCacheRoot;
  const cacheRoot = cacheRootOf();
  const candidates = await scan({ all: true, measureSizes: opts.sizes });
  const items = candidates.map((candidate) => managedItem(candidate, cacheRoot, opts.policy, opts.sizes));
  return capManagedItems(items);
}

function classifyDefault(name: string, infer: typeof inferTool): { tool: string; tier: GcTier } | null {
  const alias = NAME_ALIASES.get(name.toLowerCase());
  if (alias !== undefined) return alias;
  const inferred = infer(name);
  return inferred.tool === "unknown" ? null : inferred;
}

function defaultPlan(name: string, tool: string, path: string): string {
  const lower = name.toLowerCase();
  if (lower.startsWith("go-build")) return "go clean -cache";
  if (lower.startsWith("go-mod")) return "go clean -modcache";
  if (tool === "node" && lower.startsWith("pnpm-store")) return "pnpm store prune";
  if (tool === "python" && lower.startsWith("pip")) return "pip cache purge";
  return `rm -rf ${quoteShell(path)}`;
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    const info = await stat(path);
    return info.isDirectory();
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT" && code !== "EACCES") {
      console.error(`[hygiene-caches] cannot stat ${path}: ${code ?? String(err)}`);
    }
    return false;
  }
}

function defaultCacheBase(platform: string, home: string): string | null {
  if (platform === "darwin") return join(home, "Library", "Caches");
  if (platform === "linux") return join(home, ".cache");
  return null;
}

async function collectDefaultItems(
  opts: HygieneProbeOptions,
  deps: CachesProbeDeps,
): Promise<HygieneItem[]> {
  const platform = deps.platform ?? process.platform;
  const home = deps.home ?? homedir();
  const cacheBase = defaultCacheBase(platform, home);
  if (cacheBase === null) return [];

  const infer = deps.inferTool ?? inferTool;
  const managedRootName = basename((deps.platformCacheRoot ?? platformCacheRoot)());
  const entries: DefaultCacheEntry[] = [];

  let dirents: Dirent[];
  try {
    dirents = await readdir(cacheBase, { withFileTypes: true });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "EACCES") return [];
    throw err;
  }

  for (const entry of dirents.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory() || entry.name.startsWith(".") || entry.name === managedRootName) continue;
    const classification = classifyDefault(entry.name, infer);
    if (classification === null) continue;
    entries.push({
      path: join(cacheBase, entry.name),
      name: entry.name,
      tool: classification.tool,
      tier: classification.tier,
    });
  }

  const goModPath = join(home, "go", "pkg", "mod");
  if (await isDirectory(goModPath)) {
    entries.push({
      path: goModPath,
      name: "go/pkg/mod",
      tool: "go",
      tier: "auto",
      plan: "go clean -modcache",
    });
  }

  const items: HygieneItem[] = [];
  for (const entry of entries.slice(0, DEFAULT_ITEM_CAP)) {
    const [bytes, ageDays] = await Promise.all([
      opts.sizes ? probeDirSize(entry.path) : Promise.resolve(null),
      probeDirAge(entry.path),
    ]);
    items.push({
      id: `cache:default:${hashId(entry.path)}`,
      category: "caches",
      title: `${entry.tool} default cache ${entry.name}`,
      path: entry.path,
      bytes,
      ageDays,
      tier: entry.tier,
      due: isDue(entry.tier, bytes, ageDays, opts.policy),
      reason: "default build cache (not superskill-managed); regenerates",
      plan: entry.plan ?? defaultPlan(entry.name, entry.tool, entry.path),
      meta: { managed: false, tool: entry.tool },
    });
  }
  return items;
}

export async function runCachesProbe(
  opts: HygieneProbeOptions,
  deps: CachesProbeDeps = {},
): Promise<HygieneProbeResult> {
  const errors: string[] = [];
  let managed: HygieneItem[] | null = null;
  let defaults: HygieneItem[] | null = null;

  try {
    managed = await collectManagedItems(opts, deps);
  } catch (err) {
    errors.push(`managed: ${errorMessage(err)}`);
    console.error(`[hygiene-caches] managed cache scan failed: ${errorMessage(err)}`);
  }

  try {
    defaults = await collectDefaultItems(opts, deps);
  } catch (err) {
    errors.push(`default: ${errorMessage(err)}`);
    console.error(`[hygiene-caches] default cache scan failed: ${errorMessage(err)}`);
  }

  return {
    category: "caches",
    label: "Build caches",
    items: [...(managed ?? []), ...(defaults ?? [])],
    skipped:
      managed === null && defaults === null
        ? { probe: "caches", reason: errors.join("; ") || "cache scan failed" }
        : null,
  };
}

export const cachesProbe: HygieneProbe = {
  id: "caches",
  run: runCachesProbe,
};
