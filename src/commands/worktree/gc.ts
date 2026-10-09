// SPDX-License-Identifier: Apache-2.0
import { existsSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import type { CommandContext } from "../../core/types.js";
import { formatBytes as formatBytesImpl } from "../../lib/format-bytes.js";
import { buildProviderContext } from "../../lib/worktree/context.js";
import {
  resolveProjectLabels,
  runGc,
  type GcFilters,
  type GcPlan,
} from "../../lib/worktree/gc.js";
import { platformCacheRoot } from "../../lib/worktree/paths.js";
import {
  purgeQuarantine,
  restoreQuarantine,
  type PurgeResult,
  type QuarantineResult,
} from "../../lib/worktree/quarantine.js";

export interface WorktreeGcArgs {
  all?: boolean;
  worktree?: string;
  tool?: string[];
  project?: string;
  olderThan?: string;
  newerThan?: string;
  minSize?: string;
  maxSize?: string;
  tier?: "auto" | "consent" | "both";
  include?: string[];
  exclude?: string[];
  keepLatest?: number;
  apply?: boolean;
  purge?: boolean;
  yes?: boolean;
  undo?: string;
  json?: boolean;
  verbose?: boolean;
}

export interface WorktreeGcOutcome {
  action: "plan" | "apply" | "purge" | "restore";
  applied: boolean;
  cacheRoot: string;
  repoId?: string;
  repoRoot?: string;
  plan?: GcPlan;
  quarantined?: QuarantineResult;
  purge?: PurgeResult;
  restore?: { restored: string[]; skipped: Array<{ path: string; reason: string }> };
  notes: string[];
  verbose: boolean;
}

const DURATION_PATTERN = /^(\d+(?:\.\d+)?)\s*([dhw])?$/i;
const SIZE_PATTERN = /^(\d+(?:\.\d+)?)\s*([kmgt]?)b?$/i;
const SIZE_MULTIPLIERS: Record<string, number> = {
  "": 1,
  k: 1024,
  m: 1024 ** 2,
  g: 1024 ** 3,
  t: 1024 ** 4,
};

/** Parses "30d", "12h", "2w" into days; null when invalid or non-positive. */
export function parseDuration(input: string): number | null {
  const match = DURATION_PATTERN.exec(input.trim());
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  const unit = (match[2] ?? "d").toLowerCase();
  if (unit === "h") return value / 24;
  if (unit === "w") return value * 7;
  return value;
}

/** Parses "1G", "500M", "1024" into bytes; null when invalid or non-positive. */
export function parseSize(input: string): number | null {
  const match = SIZE_PATTERN.exec(input.trim());
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  const unit = (match[2] ?? "").toLowerCase();
  const multiplier = SIZE_MULTIPLIERS[unit] ?? 1;
  return Math.round(value * multiplier);
}

export function formatBytes(bytes: number | null | undefined): string {
  return formatBytesImpl(bytes, { nullLabel: "?", maxUnit: "TB" });
}

function displayPath(path: string, cacheRoot?: string): string {
  if (!cacheRoot) return path;
  const rel = relative(cacheRoot, path);
  return rel.length === 0 || rel.startsWith("..") || isAbsolute(rel) ? path : rel;
}

export async function worktreeGcCommand(args: WorktreeGcArgs, ctx: CommandContext): Promise<unknown> {
  const cacheRoot = platformCacheRoot();
  const notes: string[] = [];
  const verbose = args.verbose === true;
  const wantsAll = args.all === true;
  const worktreeValue = args.worktree?.trim() ?? "";
  const worktreePath = worktreeValue.length > 0 ? resolve(worktreeValue) : null;
  const target = worktreePath !== null && existsSync(worktreePath) ? worktreePath : (ctx.workspacePath ?? process.cwd());
  const built = await buildProviderContext(target);

  if (args.undo !== undefined && args.undo.trim().length > 0) {
    const restore = await restoreQuarantine(built.repoRoot, args.undo.trim(), { cacheRoot });
    return {
      action: "restore",
      applied: false,
      cacheRoot,
      repoId: built.repoId,
      repoRoot: built.repoRoot,
      restore,
      notes,
      verbose,
    } satisfies WorktreeGcOutcome;
  }

  if (args.purge === true) {
    const apply = args.yes === true;
    const purge = await purgeQuarantine({
      apply,
      olderThanDays: 14,
      cacheRoot,
      repoRoot: built.repoRoot,
    });
    notes.push(
      apply
        ? `purged ${purge.purged.length} quarantine dir(s), freed ${formatBytes(purge.bytes)} (permanent)`
        : "purge plan only; pass --yes to delete quarantined dirs older than 14 days",
    );
    return {
      action: "purge",
      applied: apply,
      cacheRoot,
      repoId: built.repoId,
      repoRoot: built.repoRoot,
      purge,
      notes,
      verbose,
    } satisfies WorktreeGcOutcome;
  }

  let repoId: string | undefined = built.repoId;
  let projectRepoId: string | undefined;
  if (args.project !== undefined && args.project.trim().length > 0 && !wantsAll) {
    const labels = await resolveProjectLabels(ctx.vaultPath);
    const match = [...labels.entries()].find(([, slug]) => slug === args.project);
    if (match) {
      repoId = match[0];
      projectRepoId = match[0];
      notes.push(`project ${args.project} -> repo ${repoId}`);
    } else {
      notes.push(`project ${args.project} not found in project-map.json; scoping to ${repoId}`);
    }
  }
  if (wantsAll) repoId = undefined;

  const olderThanDays = args.olderThan === undefined ? undefined : parseDuration(args.olderThan);
  if (args.olderThan !== undefined && olderThanDays === null) {
    notes.push(`ignored invalid --older-than "${args.olderThan}"`);
  }
  const newerThanDays = args.newerThan === undefined ? undefined : parseDuration(args.newerThan);
  if (args.newerThan !== undefined && newerThanDays === null) {
    notes.push(`ignored invalid --newer-than "${args.newerThan}"`);
  }
  const minBytes = args.minSize === undefined ? undefined : parseSize(args.minSize);
  if (args.minSize !== undefined && minBytes === null) {
    notes.push(`ignored invalid --min-size "${args.minSize}"`);
  }
  const maxBytes = args.maxSize === undefined ? undefined : parseSize(args.maxSize);
  if (args.maxSize !== undefined && maxBytes === null) {
    notes.push(`ignored invalid --max-size "${args.maxSize}"`);
  }

  const filters: GcFilters = {
    all: wantsAll,
    repoId,
    worktree: worktreeValue.length > 0 ? worktreeValue : undefined,
    tools: args.tool,
    project: projectRepoId,
    olderThanDays: olderThanDays ?? undefined,
    newerThanDays: newerThanDays ?? undefined,
    minBytes: minBytes ?? undefined,
    maxBytes: maxBytes ?? undefined,
    tier: args.tier,
    include: args.include,
    exclude: args.exclude,
    keepLatest: args.keepLatest,
  };

  const apply = args.apply === true;
  const plan = await runGc(filters, { dryRun: !apply, repoRoot: built.repoRoot, cacheRoot });
  notes.push(...plan.notes);

  return {
    action: apply ? "apply" : "plan",
    applied: apply,
    cacheRoot,
    repoId: wantsAll ? undefined : repoId,
    repoRoot: built.repoRoot,
    plan: {
      cacheRoot: plan.cacheRoot,
      candidates: plan.candidates,
      selected: plan.selected,
      skipped: plan.skipped,
      toolPrunes: plan.toolPrunes,
      notes: plan.notes,
    },
    quarantined: plan.quarantined,
    notes,
    verbose,
  } satisfies WorktreeGcOutcome;
}

export function renderWorktreeGc(result: unknown): string {
  const outcome = (result ?? {}) as Partial<WorktreeGcOutcome>;
  const action = outcome.action ?? "plan";
  const lines: string[] = [`superskill worktree gc — ${action}`];
  if (outcome.repoId !== undefined) lines.push(`repo: ${outcome.repoId}`);
  if (outcome.cacheRoot !== undefined) lines.push(`cache root: ${outcome.cacheRoot}`);

  if (outcome.plan) {
    const plan = outcome.plan;
    lines.push("");
    lines.push(
      `candidates: ${plan.candidates.length}, selected: ${plan.selected.length}, skipped: ${plan.skipped.length}`,
    );
    if (plan.selected.length > 0) {
      lines.push("");
      lines.push("  SIZE         AGE    TIER      TOOL      PATH");
      for (const candidate of plan.selected.slice(0, 40)) {
        const size = formatBytes(candidate.bytes).padStart(9);
        const age = (candidate.ageDays === null ? "?" : `${Math.floor(candidate.ageDays)}d`).padStart(5);
        const tier = candidate.tier.padEnd(9);
        const tool = candidate.tool.padEnd(9);
        lines.push(`  ${size}  ${age}  ${tier} ${tool} ${displayPath(candidate.path, plan.cacheRoot)}`);
      }
      if (plan.selected.length > 40) {
        lines.push(`  ... ${plan.selected.length - 40} more`);
      }
    }
    if (plan.skipped.length > 0) {
      lines.push("");
      if (outcome.verbose === true) {
        lines.push("skipped:");
        for (const entry of plan.skipped) {
          lines.push(`  - ${displayPath(entry.candidate.path, plan.cacheRoot)}: ${entry.reason}`);
        }
      } else {
        const reasons = new Map<string, number>();
        for (const entry of plan.skipped) {
          reasons.set(entry.reason, (reasons.get(entry.reason) ?? 0) + 1);
        }
        lines.push("skipped reasons:");
        for (const [reason, count] of [...reasons.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)) {
          lines.push(`  ${count}x ${reason}`);
        }
      }
    }
    if (plan.toolPrunes.length > 0) {
      lines.push("");
      lines.push("tool-native prunes (informational; run with --apply via the tool itself):");
      for (const entry of plan.toolPrunes) {
        lines.push(
          `  ${entry.provider}: ${entry.spec.command} ${entry.spec.args.join(" ")} — ${entry.spec.description}`,
        );
      }
    }
  }

  if (action === "plan") {
    const selectedBytes = (outcome.plan?.selected ?? []).reduce(
      (sum, candidate) => sum + (candidate.bytes ?? 0),
      0,
    );
    lines.push("");
    lines.push(
      `Nothing was deleted. ${outcome.plan?.selected.length ?? 0} dir(s), ${formatBytes(selectedBytes)} selected; ` +
        "re-run with --apply to quarantine them (reversible).",
    );
  }

  if (action === "apply" && outcome.quarantined) {
    const bytes = outcome.quarantined.moved.reduce((sum, entry) => sum + entry.bytes, 0);
    lines.push("");
    lines.push(
      `quarantined (reversible): ${outcome.quarantined.moved.length} dirs, ${formatBytes(bytes)} — journal ${outcome.quarantined.journalId}`,
    );
    lines.push(`  undo: superskill-cli worktree gc --undo ${outcome.quarantined.journalId}`);
    for (const entry of outcome.quarantined.skipped) {
      lines.push(`  skipped ${entry.path}: ${entry.reason}`);
    }
  }

  if (action === "purge" && outcome.purge) {
    lines.push("");
    lines.push(
      `purged: ${outcome.purge.purged.length} dir(s), ${formatBytes(outcome.purge.bytes)} freed (permanent; quarantine is the only place deletion happens)`,
    );
    for (const entry of outcome.purge.skipped) {
      lines.push(`  skipped ${entry.path}: ${entry.reason}`);
    }
    if (outcome.applied !== true) {
      lines.push("Nothing was deleted. Re-run with --purge --yes to apply.");
    }
  }

  if (action === "restore" && outcome.restore) {
    lines.push("");
    lines.push(`restored: ${outcome.restore.restored.length} path(s)`);
    for (const path of outcome.restore.restored) lines.push(`  + ${path}`);
    for (const entry of outcome.restore.skipped) {
      lines.push(`  skipped ${entry.path}: ${entry.reason}`);
    }
  }

  if ((outcome.notes ?? []).length > 0) {
    lines.push("");
    for (const note of outcome.notes ?? []) lines.push(`note: ${note}`);
  }

  return lines.join("\n");
}
