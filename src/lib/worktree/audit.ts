// SPDX-License-Identifier: Apache-2.0
import { execFile } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { resolveProviders } from "../toolchains/index.js";
import type { CacheDirSpec, ProviderContext, ToolchainProvider } from "../toolchains/types.js";
import { buildProviderContext } from "./context.js";
import {
  NEVER_TOUCH_RULES,
  auditWorktreeSafety,
  isPathInside,
  listWorktrees,
} from "./safety.js";
import type { WorktreeInfo, WorktreeSafetyVerdict } from "./safety.js";
import { readManifest, readPolicy, verifyManifest } from "./state.js";
import type { WorktreeManifest, WorktreePolicy } from "./state.js";

const execFileAsync = promisify(execFile);
const DU_TIMEOUT_MS = 30_000;
const DU_MAX_BUFFER = 1024 * 1024;
const MS_PER_DAY = 86_400_000;

export type AuditItemKind = "policy" | "hook" | "env" | "seed" | "prune";

export interface AuditItem {
  id: string;
  kind: AuditItemKind;
  title: string;
  detail: string;
  safe: boolean;
  consent: boolean;
  command?: string;
}

export interface AuditedCacheDir extends CacheDirSpec {
  exists: boolean;
  bytes: number | null;
  ageDays: number | null;
}

export interface ManifestAudit {
  seeded: number;
  modified: string[];
  missing: string[];
}

export interface WorktreeAudit {
  info: WorktreeInfo;
  verdict: WorktreeSafetyVerdict;
  cacheDirs: AuditedCacheDir[];
  manifest: ManifestAudit | null;
  items: AuditItem[];
}

export interface RepoAudit {
  repoId: string;
  repoRoot: string;
  stacks: string[];
  providers: string[];
  policy: WorktreePolicy | null;
  mainWorktree: string;
  worktrees: WorktreeAudit[];
  items: AuditItem[];
  summary: { worktrees: number; cacheBytes: number | null; safeItems: number; consentItems: number };
  notes: string[];
}

export interface AuditOptions {
  includeSizes?: boolean;
  worktree?: string;
}

async function probeCommandFailure(context: string, err: unknown): Promise<void> {
  const code = (err as NodeJS.ErrnoException).code;
  if (code !== "ENOENT") {
    console.error(`[worktree-audit] ${context}: ${code ?? String(err)}`);
  }
}

export async function probeDirSize(path: string): Promise<number | null> {
  if (!existsSync(path)) return null;
  try {
    const { stdout } = await execFileAsync("du", ["-sk", path], {
      timeout: DU_TIMEOUT_MS,
      maxBuffer: DU_MAX_BUFFER,
      encoding: "utf-8",
    });
    const kb = Number.parseInt(stdout.trim().split("\n")[0] ?? "", 10);
    return Number.isFinite(kb) ? kb * 1024 : null;
  } catch (err) {
    await probeCommandFailure(`du failed for ${path}`, err);
    return null;
  }
}

export async function probeDirAge(path: string): Promise<number | null> {
  let entries: string[];
  try {
    entries = await readdir(path);
  } catch (err) {
    await probeCommandFailure(`cannot read ${path}`, err);
    return null;
  }
  let newest = 0;
  let found = false;
  for (const entry of entries) {
    try {
      const stats = await stat(join(path, entry));
      if (!found || stats.mtimeMs > newest) {
        newest = stats.mtimeMs;
        found = true;
      }
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        console.error(`[worktree-audit] cannot stat ${join(path, entry)}: ${code ?? String(err)}`);
      }
    }
  }
  if (!found) return null;
  return Math.max(0, Date.now() - newest) / MS_PER_DAY;
}

function policyItem(policy: WorktreePolicy | null): AuditItem {
  return {
    id: "policy",
    kind: "policy",
    title: "Worktree policy",
    detail: policy
      ? `installed (v${policy.v}, repo ${policy.repoId}, stacks: ${policy.stacks.join(", ") || "none"}, hosts: ${policy.hosts.join(", ") || "none"})`
      : "not installed; run worktree init to record stacks, tools, and activation flags",
    safe: true,
    consent: false,
  };
}

function hookItem(policy: WorktreePolicy | null): AuditItem {
  const automatic = policy === null || policy.activation.hooks;
  return {
    id: "hook",
    kind: "hook",
    title: "Worktree start hook",
    detail: automatic
      ? "post-checkout worktree-start hook installs automatically as part of the feature; no consent required"
      : "post-checkout hook activation is disabled in the policy",
    safe: true,
    consent: false,
  };
}

function toPosix(path: string): string {
  return path.split(sep).join("/");
}

function isConservativeEnvelope(verdict: WorktreeSafetyVerdict): boolean {
  return (
    !verdict.dirty &&
    !verdict.untracked &&
    verdict.inProgressOps.length === 0 &&
    !verdict.locked &&
    !verdict.hasSubmodules &&
    !verdict.ignoredTruncated
  );
}

function manifestCoversDir(manifest: WorktreeManifest, rel: string): boolean {
  const prefix = `${rel.replace(/\/+$/, "")}/`;
  return manifest.files.some((entry) => entry.path === prefix || entry.path.startsWith(prefix));
}

async function gatherCacheDirs(
  providers: ToolchainProvider[],
  ctx: ProviderContext,
): Promise<Array<{ providerId: string; spec: CacheDirSpec }>> {
  const lists = await Promise.all(
    providers.map(async (provider) => ({ provider, specs: await provider.cacheDirs(ctx) })),
  );
  const seen = new Set<string>();
  const out: Array<{ providerId: string; spec: CacheDirSpec }> = [];
  for (const { provider, specs } of lists) {
    for (const spec of specs) {
      const key = resolve(spec.path);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ providerId: provider.id, spec });
    }
  }
  return out;
}

async function auditCacheDirs(
  providerDirs: Array<{ providerId: string; spec: CacheDirSpec }>,
  includeSizes: boolean,
): Promise<{ cacheDirs: AuditedCacheDir[]; audited: Array<{ providerId: string; dir: AuditedCacheDir }> }> {
  const audited = await Promise.all(
    providerDirs.map(async ({ providerId, spec }) => {
      const exists = existsSync(spec.path);
      const shouldProbe = includeSizes && exists;
      const [bytes, ageDays] = shouldProbe
        ? await Promise.all([probeDirSize(spec.path), probeDirAge(spec.path)])
        : [null, null];
      return { providerId, dir: { ...spec, exists, bytes, ageDays } };
    }),
  );
  return { cacheDirs: audited.map((entry) => entry.dir), audited };
}

interface WorktreeItemsInput {
  providers: ToolchainProvider[];
  providerCtx: ProviderContext;
  worktreePath: string;
  audited: Array<{ providerId: string; dir: AuditedCacheDir }>;
  verdict: WorktreeSafetyVerdict;
  manifest: WorktreeManifest | null;
  manifestIntact: boolean;
}

async function collectWorktreeItems(input: WorktreeItemsInput): Promise<AuditItem[]> {
  const { providers, providerCtx, worktreePath, audited, verdict, manifest, manifestIntact } = input;
  const items: AuditItem[] = [];
  const conservative = isConservativeEnvelope(verdict);

  const envLists = await Promise.all(providers.map((provider) => provider.env(providerCtx)));
  const envNames = [...new Set(envLists.flat().map((entry) => entry.name))];
  items.push({
    id: "env",
    kind: "env",
    title: "Environment overrides",
    detail:
      envNames.length > 0
        ? `${envNames.length} variable(s): ${envNames.join(", ")}`
        : "no environment overrides for this worktree",
    safe: true,
    consent: false,
  });

  for (const provider of providers) {
    for (const seed of await provider.seed(providerCtx)) {
      const present = existsSync(seed.dest);
      items.push({
        id: `seed:${provider.id}:${seed.relative}`,
        kind: "seed",
        title: `Seed ${seed.relative}`,
        detail: present
          ? `already present at ${seed.dest}; seeding would be skipped`
          : `copy ${seed.relative} from ${seed.source} via ${seed.method} (opt-in)`,
        safe: false,
        consent: true,
      });
    }
  }

  if (conservative) {
    for (const provider of providers) {
      const prune = await provider.prune(providerCtx);
      if (!prune) continue;
      const command = [prune.command, ...prune.args].join(" ");
      items.push({
        id: `prune:${provider.id}`,
        kind: "prune",
        title: `Prune ${provider.id}`,
        detail: `${prune.description}; tool: ${prune.tool}; command: ${command}; min age: ${prune.minAgeDays} day(s)`,
        safe: false,
        consent: true,
        command,
      });
    }
  }

  if (conservative && manifestIntact && manifest) {
    for (const { providerId, dir } of audited) {
      if (!dir.exists || !isPathInside(dir.path, worktreePath)) continue;
      const rel = toPosix(relative(worktreePath, dir.path));
      if (!manifestCoversDir(manifest, rel)) continue;
      const caveat = dir.autoSafe
        ? "tool-managed cache"
        : "not marked autoSafe; verify contents before consenting";
      items.push({
        id: `reclaim:${providerId}:${dir.id}`,
        kind: "prune",
        title: `Reclaim worktree-local cache ${dir.id}`,
        detail: `deletes ${dir.path}; proposed only because the worktree is clean and the seed manifest covers it (${caveat}); requires explicit consent`,
        safe: false,
        consent: true,
      });
    }
  }

  return items;
}

async function readWorktreeManifest(
  repoRoot: string,
  worktreePath: string,
  originalRoot: string,
): Promise<WorktreeManifest | null> {
  const candidates = [worktreePath];
  if (resolve(worktreePath) !== resolve(originalRoot)) {
    try {
      if (realpathSync(worktreePath) === realpathSync(originalRoot)) candidates.push(originalRoot);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        console.error(`[worktree-audit] cannot resolve ${worktreePath}: ${code ?? String(err)}`);
      }
    }
  }
  for (const candidate of candidates) {
    const manifest = await readManifest(repoRoot, candidate);
    if (manifest) return manifest;
  }
  return null;
}

export async function auditRepo(worktreeRoot: string, opts: AuditOptions = {}): Promise<RepoAudit> {
  const built = await buildProviderContext(worktreeRoot);
  const providers = await resolveProviders(built.ctx);
  const mainWorktree = built.repoRoot;

  const listed = await listWorktrees(mainWorktree);
  const filter = opts.worktree;
  const selected = filter ? listed.filter((entry) => basename(entry.path) === filter) : listed;

  const policy = await readPolicy(mainWorktree);
  const repoItems: AuditItem[] = [policyItem(policy), hookItem(policy)];

  const contextCache = new Map<string, ProviderContext>([
    [resolve(built.ctx.worktreeRoot), built.ctx],
  ]);
  const contextFor = async (path: string): Promise<ProviderContext> => {
    const key = resolve(path);
    const cached = contextCache.get(key);
    if (cached) return cached;
    const next = await buildProviderContext(path);
    contextCache.set(key, next.ctx);
    return next.ctx;
  };

  const worktrees: WorktreeAudit[] = [];
  for (const info of selected) {
    const providerCtx = await contextFor(info.path);
    const [verdict, providerDirs] = await Promise.all([
      auditWorktreeSafety(info.path),
      gatherCacheDirs(providers, providerCtx),
    ]);
    const { cacheDirs, audited } = await auditCacheDirs(providerDirs, opts.includeSizes === true);

    const manifest = await readWorktreeManifest(mainWorktree, info.path, worktreeRoot);
    let manifestAudit: ManifestAudit | null = null;
    let manifestIntact = false;
    if (manifest) {
      const check = await verifyManifest(manifest, { root: info.path });
      manifestAudit = {
        seeded: manifest.files.length,
        modified: check.modified,
        missing: check.missing,
      };
      manifestIntact = check.modified.length === 0 && check.missing.length === 0;
    }

    const items = await collectWorktreeItems({
      providers,
      providerCtx,
      worktreePath: info.path,
      audited,
      verdict,
      manifest,
      manifestIntact,
    });
    worktrees.push({ info, verdict, cacheDirs, manifest: manifestAudit, items });
  }

  const notes: string[] = [`never-touch rules: ${NEVER_TOUCH_RULES.join("; ")}`];
  const noteSeen = new Set(notes);
  for (const provider of providers) {
    for (const note of await provider.notes(built.ctx)) {
      if (noteSeen.has(note)) continue;
      noteSeen.add(note);
      notes.push(note);
    }
  }

  const allItems = [...repoItems, ...worktrees.flatMap((entry) => entry.items)];
  const probedBytes = worktrees
    .flatMap((entry) => entry.cacheDirs.map((dir) => dir.bytes))
    .filter((bytes): bytes is number => bytes !== null);
  const cacheBytes =
    opts.includeSizes === true && probedBytes.length > 0
      ? probedBytes.reduce((sum, bytes) => sum + bytes, 0)
      : null;

  return {
    repoId: built.repoId,
    repoRoot: built.repoRoot,
    stacks: built.stacks,
    providers: providers.map((provider) => provider.id),
    policy,
    mainWorktree,
    worktrees,
    items: repoItems,
    summary: {
      worktrees: worktrees.length,
      cacheBytes,
      safeItems: allItems.filter((item) => item.safe).length,
      consentItems: allItems.filter((item) => item.consent).length,
    },
    notes,
  };
}
