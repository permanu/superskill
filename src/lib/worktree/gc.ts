// SPDX-License-Identifier: Apache-2.0
import { execFile } from "node:child_process";
import { lstat, readdir, readFile, stat } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { promisify } from "node:util";
import { ALL_PROVIDERS } from "../toolchains/index.js";
import type { PruneSpec } from "../toolchains/types.js";
import { buildProviderContext } from "./context.js";
import { platformCacheRoot, resolveRepoIdentity } from "./paths.js";
import { duBytes, quarantinePaths, type QuarantineResult } from "./quarantine.js";
import { listWorktrees } from "./safety.js";

const execFileAsync = promisify(execFile);

const DAY_MS = 24 * 60 * 60 * 1000;
const PRUNE_TIMEOUT_MS = 60_000;
const PRUNE_MAX_BUFFER = 16 * 1024 * 1024;

export const AUTO_MIN_AGE_DAYS = 30;

export type GcTier = "auto" | "consent";

export interface GcCandidate {
  path: string;
  repoId: string;
  tool: string;
  bytes: number | null;
  ageDays: number | null;
  tier: GcTier;
  journalHint?: string;
}

export interface GcFilters {
  all?: boolean;
  repoId?: string;
  worktree?: string;
  tools?: string[];
  project?: string;
  olderThanDays?: number;
  newerThanDays?: number;
  minBytes?: number;
  maxBytes?: number;
  tier?: "auto" | "consent" | "both";
  include?: string[];
  exclude?: string[];
  keepLatest?: number;
}

export interface GcPlan {
  cacheRoot: string;
  candidates: GcCandidate[];
  selected: GcCandidate[];
  skipped: Array<{ candidate: GcCandidate; reason: string }>;
  toolPrunes: Array<{ provider: string; spec: PruneSpec }>;
  notes: string[];
}

export interface ToolInference {
  tool: string;
  tier: GcTier;
}

export const TOOL_PREFIXES = (
  [
    { prefix: "go-build", tool: "go", tier: "auto" },
    { prefix: "go-mod", tool: "go", tier: "auto" },
    { prefix: "sccache", tool: "rust", tier: "auto" },
    { prefix: "ccache", tool: "cpp", tier: "auto" },
    { prefix: "cargo-build", tool: "rust", tier: "consent" },
    { prefix: "node-modules", tool: "node", tier: "consent" },
    { prefix: "pnpm-store", tool: "node", tier: "auto" },
    { prefix: "bun-cache", tool: "node", tier: "auto" },
    { prefix: "yarn-cache", tool: "node", tier: "auto" },
    { prefix: "npm-cache", tool: "node", tier: "auto" },
    { prefix: "pypoetry", tool: "python", tier: "auto" },
    { prefix: "pixi", tool: "python", tier: "auto" },
    { prefix: "pdm", tool: "python", tier: "auto" },
    { prefix: "pip", tool: "python", tier: "auto" },
    { prefix: "uv", tool: "python", tier: "auto" },
    { prefix: "bundle-cache", tool: "ruby", tier: "auto" },
  ] satisfies Array<{ prefix: string; tool: string; tier: GcTier }>
).sort((a, b) => b.prefix.length - a.prefix.length);

const NESTED_PARENT_DIRS = new Set(["cargo-build", "link", "links"]);

export function inferTool(name: string): ToolInference {
  const lower = name.toLowerCase();
  for (const entry of TOOL_PREFIXES) {
    if (lower.startsWith(entry.prefix)) return { tool: entry.tool, tier: entry.tier };
  }
  return { tool: "unknown", tier: "consent" };
}

function ageInDays(mtimeMs: number): number {
  return Math.max(0, (Date.now() - mtimeMs) / DAY_MS);
}

async function ageDaysOf(dir: string): Promise<number | null> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT" && code !== "EACCES") {
      console.error(`[worktree-gc] cannot read ${dir}: ${code ?? String(err)}`);
    }
    return null;
  }
  if (names.length === 0) {
    try {
      return ageInDays((await stat(dir)).mtimeMs);
    } catch {
      return null;
    }
  }
  const stats = await Promise.allSettled(names.map((name) => lstat(join(dir, name))));
  let newest = 0;
  let found = false;
  for (const settled of stats) {
    if (settled.status !== "fulfilled") continue;
    found = true;
    newest = Math.max(newest, settled.value.mtimeMs);
  }
  return found ? ageInDays(newest) : null;
}

async function buildCandidate(
  dir: string,
  repoId: string,
  inference: ToolInference,
  measure: boolean,
): Promise<GcCandidate> {
  const [bytes, ageDays] = await Promise.all([measure ? duBytes(dir) : Promise.resolve(0), ageDaysOf(dir)]);
  return { path: dir, repoId, tool: inference.tool, bytes, ageDays, tier: inference.tier };
}

export async function scanCacheRoot(
  opts: { cacheRoot?: string; repoId?: string; all?: boolean; measureSizes?: boolean } = {},
): Promise<GcCandidate[]> {
  const root = resolve(opts.cacheRoot ?? platformCacheRoot());
  const measure = opts.measureSizes !== false;
  let repoIds: string[];
  if (opts.all !== true && opts.repoId !== undefined) {
    repoIds = [opts.repoId];
  } else {
    try {
      repoIds = (await readdir(root, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
        .map((entry) => entry.name);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        console.error(`[worktree-gc] cannot read cache root ${root}: ${code ?? String(err)}`);
      }
      return [];
    }
  }

  const candidates: GcCandidate[] = [];
  for (const repoId of repoIds) {
    const repoDir = join(root, repoId);
    let entries;
    try {
      entries = await readdir(repoDir, { withFileTypes: true });
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "ENOENT" && code !== "EACCES") {
        console.error(`[worktree-gc] cannot read ${repoDir}: ${code ?? String(err)}`);
      }
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      const dir = join(repoDir, entry.name);
      const inference = inferTool(entry.name);
      candidates.push(await buildCandidate(dir, repoId, inference, measure));

      if (NESTED_PARENT_DIRS.has(entry.name)) {
        let children;
        try {
          children = await readdir(dir, { withFileTypes: true });
        } catch {
          continue;
        }
        for (const child of children) {
          if (!child.isDirectory() || child.name.startsWith(".")) continue;
          const childInference = inferTool(child.name);
          const effective = childInference.tool === "unknown" ? inference : childInference;
          candidates.push(await buildCandidate(join(dir, child.name), repoId, effective, measure));
        }
      }
    }
  }

  return candidates.sort((a, b) => a.path.localeCompare(b.path));
}

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(escaped);
}

function normalizePatterns(patterns: string[] | undefined): RegExp[] {
  return (patterns ?? [])
    .map((pattern) => pattern.trim())
    .filter((pattern) => pattern.length > 0)
    .map(globToRegExp);
}

function relativeToRepo(candidate: GcCandidate): string {
  const marker = `/${candidate.repoId}/`;
  const index = candidate.path.indexOf(marker);
  return index >= 0 ? candidate.path.slice(index + marker.length) : candidate.path;
}

function matchesAny(candidate: GcCandidate, patterns: RegExp[]): boolean {
  if (patterns.length === 0) return false;
  const relative = relativeToRepo(candidate);
  return patterns.some((pattern) => pattern.test(relative) || pattern.test(candidate.path));
}

function skipReason(
  candidate: GcCandidate,
  filters: GcFilters,
  context: { tierFilter: "auto" | "consent" | "both"; tierExplicit: boolean; explicitAge: boolean },
): string | null {
  if (filters.repoId !== undefined && candidate.repoId !== filters.repoId) {
    return `repo ${candidate.repoId} does not match ${filters.repoId}`;
  }
  if (filters.project !== undefined && candidate.repoId !== filters.project) {
    return `project ${candidate.repoId} does not match ${filters.project}`;
  }
  const tools = (filters.tools ?? []).filter((tool) => tool.trim().length > 0);
  if (tools.length > 0 && !tools.includes(candidate.tool)) {
    return `tool ${candidate.tool} not selected`;
  }

  if (filters.olderThanDays !== undefined) {
    if (candidate.ageDays === null) return "unknown age";
    if (candidate.ageDays < filters.olderThanDays) {
      return `too young (${candidate.ageDays.toFixed(1)}d < ${filters.olderThanDays}d)`;
    }
  }
  if (filters.newerThanDays !== undefined) {
    if (candidate.ageDays === null) return "unknown age";
    if (candidate.ageDays > filters.newerThanDays) {
      return `too old (${candidate.ageDays.toFixed(1)}d > ${filters.newerThanDays}d)`;
    }
  }

  if (filters.minBytes !== undefined) {
    if (candidate.bytes === null) return "unknown size";
    if (candidate.bytes < filters.minBytes) return `smaller than ${filters.minBytes} bytes`;
  }
  if (filters.maxBytes !== undefined) {
    if (candidate.bytes === null) return "unknown size";
    if (candidate.bytes > filters.maxBytes) return `larger than ${filters.maxBytes} bytes`;
  }

  const exclude = normalizePatterns(filters.exclude);
  if (exclude.length > 0 && matchesAny(candidate, exclude)) return "excluded by pattern";
  const include = normalizePatterns(filters.include);
  if (include.length > 0 && !matchesAny(candidate, include)) return "not matched by include pattern";

  if (context.tierFilter === "auto" && candidate.tier !== "auto") return "consent tier not selected";
  if (context.tierFilter === "consent" && candidate.tier !== "consent") return "auto tier not selected";
  if (
    candidate.tier === "consent" &&
    context.tierFilter === "both" &&
    !context.tierExplicit &&
    !context.explicitAge
  ) {
    return "consent tier requires an explicit tier or age filter";
  }
  if (candidate.tier === "auto" && !context.explicitAge) {
    if (candidate.ageDays === null) return "unknown age";
    if (candidate.ageDays < AUTO_MIN_AGE_DAYS) {
      return `auto tier requires age >= ${AUTO_MIN_AGE_DAYS}d`;
    }
  }
  return null;
}

export function filterCandidates(
  candidates: GcCandidate[],
  filters: GcFilters,
): { selected: GcCandidate[]; skipped: Array<{ candidate: GcCandidate; reason: string }> } {
  const tierFilter = filters.tier ?? "both";
  const context = {
    tierFilter,
    tierExplicit: filters.tier !== undefined,
    explicitAge: filters.olderThanDays !== undefined,
  };

  const selected: GcCandidate[] = [];
  const skipped: Array<{ candidate: GcCandidate; reason: string }> = [];
  for (const candidate of candidates) {
    const reason = skipReason(candidate, filters, context);
    if (reason === null) selected.push(candidate);
    else skipped.push({ candidate, reason });
  }

  if (filters.keepLatest !== undefined) {
    const keep = Math.max(0, Math.floor(filters.keepLatest));
    const groups = new Map<string, GcCandidate[]>();
    for (const candidate of selected) {
      const list = groups.get(candidate.tool) ?? [];
      list.push(candidate);
      groups.set(candidate.tool, list);
    }
    const retained = new Set<GcCandidate>();
    for (const [tool, list] of groups) {
      const sorted = [...list].sort(
        (a, b) => (a.ageDays ?? -Infinity) - (b.ageDays ?? -Infinity),
      );
      for (const candidate of sorted.slice(0, keep)) {
        retained.add(candidate);
        skipped.push({
          candidate,
          reason: `keepLatest: keeping ${keep} most recent ${tool} dir(s)`,
        });
      }
    }
    for (let index = selected.length - 1; index >= 0; index -= 1) {
      if (retained.has(selected[index])) selected.splice(index, 1);
    }
  }

  return { selected, skipped };
}

async function collectToolPrunes(
  repoRoot: string,
  filters: GcFilters,
  notes: string[],
): Promise<Array<{ provider: string; spec: PruneSpec }>> {
  const toolPrunes: Array<{ provider: string; spec: PruneSpec }> = [];
  let built;
  try {
    built = await buildProviderContext(repoRoot);
  } catch (err) {
    notes.push(`provider context unavailable: ${(err as Error).message}`);
    return toolPrunes;
  }
  const threshold = filters.olderThanDays ?? AUTO_MIN_AGE_DAYS;
  for (const provider of ALL_PROVIDERS) {
    try {
      if (!(await provider.detect(built.ctx))) continue;
      const spec = await provider.prune(built.ctx);
      if (!spec || !spec.autoSafe) continue;
      if (threshold >= spec.minAgeDays) {
        toolPrunes.push({ provider: provider.id, spec });
        notes.push(`${provider.id}: tool prune available (${spec.command} ${spec.args.join(" ")})`);
      } else {
        notes.push(
          `${provider.id}: tool prune needs entries >= ${spec.minAgeDays}d; current threshold ${threshold}d`,
        );
      }
    } catch (err) {
      console.error(`[worktree-gc] provider ${provider.id} prune probe failed: ${(err as Error).message}`);
    }
  }
  return toolPrunes;
}

export interface WorktreeFilterResolution {
  path: string | null;
  note: string | null;
}

export async function resolveWorktreeFilter(
  value: string,
  repoRoot: string,
  opts: { all?: boolean } = {},
): Promise<WorktreeFilterResolution> {
  const trimmed = value.trim();
  if (trimmed.length === 0) return { path: null, note: null };
  if (opts.all === true) {
    return { path: null, note: `ignoring --worktree ${trimmed} because --all is set` };
  }
  const resolved = resolve(trimmed);
  try {
    const info = await stat(resolved);
    if (info.isDirectory()) return { path: resolved, note: null };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      console.error(`[worktree-gc] cannot stat worktree ${resolved}: ${code ?? String(err)}`);
    }
  }
  const wanted = basename(resolved);
  const worktrees = await listWorktrees(repoRoot);
  const match = worktrees.find((worktree) => basename(resolve(worktree.path)) === wanted);
  if (match) return { path: resolve(match.path), note: null };
  return { path: null, note: `worktree not found: ${trimmed}` };
}

export async function runGc(
  filters: GcFilters,
  opts: { dryRun: boolean; repoRoot: string; cacheRoot?: string },
): Promise<GcPlan & { quarantined?: QuarantineResult }> {
  const cacheRoot = resolve(opts.cacheRoot ?? platformCacheRoot());
  const notes: string[] = [];
  let effectiveFilters = filters;
  if (filters.worktree !== undefined && filters.worktree.trim().length > 0) {
    const resolution = await resolveWorktreeFilter(filters.worktree, opts.repoRoot, {
      all: filters.all === true,
    });
    if (resolution.note !== null) notes.push(resolution.note);
    const scopedRepoId =
      resolution.path === null
        ? undefined
        : (await resolveRepoIdentity(resolution.path)).repoId;
    effectiveFilters = { ...filters, repoId: scopedRepoId };
  }
  const candidates = await scanCacheRoot({
    cacheRoot,
    repoId: effectiveFilters.repoId,
    all: effectiveFilters.all === true,
  });
  const { selected, skipped } = filterCandidates(candidates, effectiveFilters);
  const toolPrunes = await collectToolPrunes(opts.repoRoot, effectiveFilters, notes);

  if (opts.dryRun) {
    notes.push(`dry run: ${selected.length} candidate(s) selected, nothing moved`);
    return { cacheRoot, candidates, selected, skipped, toolPrunes, notes };
  }

  const quarantined = await quarantinePaths(
    opts.repoRoot,
    selected.map((candidate) => candidate.path),
    { cacheRoot },
  );
  notes.push(
    `quarantined ${quarantined.moved.length} dir(s), ${quarantined.skipped.length} skipped (reversible)`,
  );
  return { cacheRoot, candidates, selected, skipped, toolPrunes, notes, quarantined };
}

function quoteArgument(value: string): string {
  return /[\s"']/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
}

export async function runToolPrune(
  repoRoot: string,
  spec: PruneSpec,
  opts: { apply: boolean },
): Promise<{ tool: string; command: string; applied: boolean; stdout: string; stderr: string; note: string }> {
  const command = [spec.command, ...spec.args].map(quoteArgument).join(" ");
  if (!spec.command || spec.command.trim().length === 0) {
    return { tool: spec.tool, command, applied: false, stdout: "", stderr: "", note: "no command" };
  }
  if (!opts.apply) {
    return { tool: spec.tool, command, applied: false, stdout: "", stderr: "", note: "dry run: not executed" };
  }
  try {
    const { stdout, stderr } = await execFileAsync(spec.command, spec.args, {
      cwd: repoRoot,
      timeout: PRUNE_TIMEOUT_MS,
      maxBuffer: PRUNE_MAX_BUFFER,
    });
    return { tool: spec.tool, command, applied: true, stdout, stderr, note: "executed" };
  } catch (err) {
    const error = err as NodeJS.ErrnoException & { stdout?: string; stderr?: string };
    if (error.code === "ENOENT") {
      return { tool: spec.tool, command, applied: false, stdout: "", stderr: "", note: "tool not installed" };
    }
    return {
      tool: spec.tool,
      command,
      applied: false,
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? "",
      note: `command failed: ${error.code ?? String(err)}`,
    };
  }
}

export async function resolveProjectLabels(vaultPath: string): Promise<Map<string, string>> {
  const labels = new Map<string, string>();
  let raw: string;
  try {
    raw = await readFile(join(vaultPath, "project-map.json"), "utf-8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT" && code !== "EACCES") {
      console.error(`[worktree-gc] cannot read project-map.json: ${code ?? String(err)}`);
    }
    return labels;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("[worktree-gc] ignoring corrupt project-map.json");
    return labels;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return labels;

  let inspected = 0;
  for (const [dir, slug] of Object.entries(parsed as Record<string, unknown>)) {
    if (inspected >= 50) break;
    if (typeof slug !== "string" || slug.length === 0) continue;
    try {
      const info = await stat(dir);
      if (!info.isDirectory()) continue;
      inspected += 1;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "ENOENT" && code !== "EACCES") {
        console.error(`[worktree-gc] cannot stat ${dir}: ${code ?? String(err)}`);
      }
      continue;
    }
    const identity = await resolveRepoIdentitySafe(dir);
    if (identity !== null && !labels.has(identity)) labels.set(identity, slug);
  }
  return labels;
}

async function resolveRepoIdentitySafe(dir: string): Promise<string | null> {
  try {
    const identity = await resolveRepoIdentity(dir);
    return identity.repoId;
  } catch (err) {
    console.error(`[worktree-gc] cannot resolve repo identity for ${dir}: ${(err as Error).message}`);
    return null;
  }
}
