// SPDX-License-Identifier: Apache-2.0
import type { Dirent } from "node:fs";
import { lstat, readdir, realpath, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, isAbsolute, join, relative } from "node:path";
import { formatBytes } from "../../format-bytes.js";
import { probeDirAge, probeDirSize } from "../../worktree/audit.js";
import {
  inferTool,
  TOOL_PREFIXES,
  scanCacheRoot,
  type GcCandidate,
  type GcTier,
} from "../../worktree/gc.js";
import { hashId, platformCacheRoot, repoStateDir } from "../../worktree/paths.js";
import { isPhysicallyContained } from "../../worktree/quarantine.js";
import { probeDeadline } from "../budget.js";
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
  const plan = candidate.tool === "unknown" || /[*?\[\]{}]/.test(target) ? null :
    candidate.tier === "consent"
      ? `superskill-cli worktree gc --all --older-than ${floor}d --tier consent --include ${quoteShell(target)} --apply`
      : `superskill-cli worktree gc --all --older-than ${floor}d --include ${quoteShell(target)} --apply`;
  const reason =
    candidate.orphaned === true
      ? `orphaned worktree cache (registered worktree path is gone), ${ageLabel(candidate.ageDays)}`
      : candidate.tier === "consent"
        ? `large cache (${formatBytes(bytes, { nullLabel: "unknown size", maxUnit: "TB" })}), ${ageLabel(candidate.ageDays)} — consent required`
        : `rebuildable cache, ${ageLabel(candidate.ageDays)} (auto tier)`;
  return {
    id: `cache:${hashId(candidate.path)}`,
    category: "caches",
    title: `${candidate.tool} cache — ${candidate.repoId}/${basename(candidate.path)}`,
    path: candidate.path,
    bytes,
    ageDays: candidate.ageDays,
    tier: candidate.tier,
    due: candidate.tool !== "unknown" && isDue(candidate.tier, bytes, candidate.ageDays, policy),
    reason,
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
  const candidates = await scan({ all: true, measureSizes: opts.sizes, maxCandidates: MANAGED_ITEM_CAP, deadline: opts.deadline });
  const items = candidates.map((candidate) => managedItem(candidate, cacheRoot, opts.policy, opts.sizes));
  return capManagedItems(items);
}

function classifyDefault(name: string): { tool: string; tier: GcTier } | null {
  const alias = NAME_ALIASES.get(name.toLowerCase());
  if (alias !== undefined) return alias;
  const exact = TOOL_PREFIXES.find((entry) => entry.prefix === name.toLowerCase());
  return exact ? { tool: exact.tool, tier: exact.tier } : null;
}

function defaultPlan(name: string): string | null {
  const lower = name.toLowerCase();
  if (lower === "go-build") return "go clean -cache";
  if (lower === "go-mod") return "go clean -modcache";
  if (lower === "pnpm-store") return "pnpm store prune";
  if (lower === "pip") return "pip cache purge";
  if (lower === "uv") return "uv cache prune";
  if (lower === "ccache") return "ccache --cleanup";
  return null;
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
    if (entries.length >= DEFAULT_ITEM_CAP) break;
    if (!entry.isDirectory() || entry.name.startsWith(".") || entry.name === managedRootName) continue;
    const classification = classifyDefault(entry.name);
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
    if (Date.now() >= (opts.deadline ?? Infinity)) break;
    const [bytes, ageDays] = await Promise.all([
      opts.sizes ? probeDirSize(entry.path, { deadline: opts.deadline }) : Promise.resolve(null),
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
      plan: entry.plan ?? defaultPlan(entry.name),
      meta: { managed: false, tool: entry.tool },
    });
  }
  return items;
}

async function collectRetentionItems(opts: HygieneProbeOptions, deps: CachesProbeDeps): Promise<HygieneItem[]> {
  const cacheRoot = (deps.platformCacheRoot ?? platformCacheRoot)();
  const targets = [{ path: join(cacheRoot, "_quarantine"), root: cacheRoot, label: "Cache quarantine", plan: "superskill-cli worktree gc --all --purge" }];
  const seen = new Set<string>();
  for (const repo of opts.repoPaths.slice(0, 50)) {
    if (Date.now() >= (opts.deadline ?? Infinity)) break;
    const path = await repoStateDir(repo);
    const key = await realpath(path).catch(() => path);
    if (seen.has(key)) continue;
    seen.add(key);
    targets.push({ path, root: join(path, ".."), label: "Worktree metadata and local quarantine", plan: `superskill-cli worktree gc --worktree ${quoteShell(repo)} --purge` });
  }
  const items: HygieneItem[] = [];
  for (const target of targets.slice(0, 40)) {
    if (Date.now() >= (opts.deadline ?? Infinity)) break;
    try {
      const info = await lstat(target.path);
      if (!info.isDirectory() || !(await isPhysicallyContained(target.path, target.root))) continue;
      items.push({
        id: `cache:retention:${hashId(target.path)}`,
        category: "caches",
        title: target.label,
        path: target.path,
        bytes: opts.sizes ? await probeDirSize(target.path, { deadline: opts.deadline }) : null,
        ageDays: Math.max(0, opts.now - info.mtimeMs) / 86_400_000,
        tier: "review",
        due: false,
        reason: "retained recovery data; review manually. Purge is a plan until explicitly authorized with --yes; journals and manifests are never automatically deleted",
        plan: target.plan,
        meta: { retention: true, managed: true },
      });
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "ENOENT" && code !== "ENOTDIR") console.error(`[hygiene-caches] cannot inspect retention path ${target.path}: ${code ?? String(err)}`);
    }
  }
  return items;
}

export async function runCachesProbe(
  opts: HygieneProbeOptions,
  deps: CachesProbeDeps = {},
): Promise<HygieneProbeResult> {
  opts = { ...opts, deadline: probeDeadline(opts.deadline) };
  const errors: string[] = [];
  let managed: HygieneItem[] | null = null;
  let defaults: HygieneItem[] | null = null;
  let retention: HygieneItem[] = [];

  try {
    managed = await collectManagedItems(opts, deps);
  } catch (err) {
    errors.push(`managed: ${errorMessage(err)}`);
    console.error(`[hygiene-caches] managed cache scan failed: ${errorMessage(err)}`);
  }

  try {
    retention = await collectRetentionItems(opts, deps);
  } catch (err) {
    console.error(`[hygiene-caches] retention scan failed: ${errorMessage(err)}`);
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
    items: [...(managed ?? []), ...(defaults ?? []), ...retention],
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
