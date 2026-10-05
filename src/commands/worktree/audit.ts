// SPDX-License-Identifier: Apache-2.0
import type { CommandContext } from "../../core/types.js";
import { auditRepo } from "../../lib/worktree/audit.js";
import type { AuditItem, RepoAudit } from "../../lib/worktree/audit.js";
import { isPathInside } from "../../lib/worktree/safety.js";
import type { WorktreeInfo } from "../../lib/worktree/safety.js";

export interface WorktreeAuditArgs {
  json?: boolean;
  sizes?: boolean;
  worktree?: string;
}

const SIZE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB"] as const;

export function formatBytes(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes)) return "unknown";
  if (bytes <= 0) return "0 B";
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < SIZE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = unit === 0 || value >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${SIZE_UNITS[unit]}`;
}

function yesNo(value: boolean): string {
  return value ? "yes" : "no";
}

function itemFlag(item: AuditItem): string {
  if (item.safe) return "[safe]";
  return item.consent ? "[consent]" : "[manual]";
}

function branchLabel(info: WorktreeInfo): string {
  if (info.bare) return "bare";
  if (info.detached) return `detached @ ${info.head?.slice(0, 12) ?? "unknown"}`;
  if (info.branch) return info.branch.replace(/^refs\/heads\//, "");
  return info.head?.slice(0, 12) ?? "unknown";
}

export async function worktreeAuditCommand(
  args: WorktreeAuditArgs,
  ctx: CommandContext,
): Promise<RepoAudit> {
  const audit = await auditRepo(process.cwd(), { includeSizes: args.sizes, worktree: args.worktree });
  ctx.log.debug(
    `[worktree-audit] audited ${audit.worktrees.length} worktree(s) for repo ${audit.repoId}`,
  );
  return audit;
}

export function renderWorktreeAudit(audit: RepoAudit): string {
  const lines: string[] = [];
  lines.push(`Worktree audit: ${audit.repoId}`);
  lines.push(`  repo root: ${audit.repoRoot}`);
  lines.push(`  main worktree: ${audit.mainWorktree}`);
  lines.push(`  stacks: ${audit.stacks.join(", ") || "unknown"}`);
  lines.push(`  providers: ${audit.providers.join(", ") || "none"}`);
  lines.push(`  policy: ${audit.policy ? `installed (v${audit.policy.v})` : "not installed"}`);
  lines.push("");
  lines.push("Repo items:");
  for (const item of audit.items) {
    lines.push(`  ${itemFlag(item)} ${item.id} — ${item.detail}`);
  }
  lines.push("");
  lines.push(`Worktrees (${audit.worktrees.length}):`);
  if (audit.worktrees.length === 0) lines.push("  (none)");
  for (const entry of audit.worktrees) {
    lines.push(`  ${entry.verdict.safeToReclaimLocalCaches ? "[safe]" : "[unsafe]"} ${entry.info.path}`);
    lines.push(`    branch: ${branchLabel(entry.info)}`);
    lines.push(
      `    dirty=${yesNo(entry.verdict.dirty)} untracked=${yesNo(entry.verdict.untracked)} ` +
        `ignored=${entry.verdict.ignoredFiles.length} unpushed=${entry.verdict.unpushedCommits} ` +
        `stashes=${entry.verdict.stashCount} locked=${yesNo(entry.verdict.locked)} ` +
        `submodules=${yesNo(entry.verdict.hasSubmodules)}`,
    );
    lines.push("    cache dirs:");
    if (entry.cacheDirs.length === 0) lines.push("      (none)");
    for (const dir of entry.cacheDirs) {
      const scope = isPathInside(dir.path, entry.info.path) ? "local" : "shared";
      const age = dir.ageDays === null ? "unknown" : `${dir.ageDays.toFixed(1)}d`;
      lines.push(
        `      - ${dir.id} (${dir.tool}, ${scope}) ${dir.path} ` +
          `exists=${yesNo(dir.exists)} size=${formatBytes(dir.bytes)} age=${age}`,
      );
    }
    if (entry.manifest) {
      lines.push(
        `    manifest: seeded=${entry.manifest.seeded} modified=${entry.manifest.modified.length} ` +
          `missing=${entry.manifest.missing.length}`,
      );
      for (const path of entry.manifest.modified) lines.push(`      modified: ${path}`);
      for (const path of entry.manifest.missing) lines.push(`      missing: ${path}`);
    } else {
      lines.push("    manifest: none");
    }
    lines.push("    items:");
    if (entry.items.length === 0) lines.push("      (none)");
    for (const item of entry.items) {
      const suffix = item.command ? ` (command: ${item.command})` : "";
      lines.push(`      ${itemFlag(item)} ${item.id} — ${item.detail}${suffix}`);
    }
    lines.push("    reasons:");
    for (const reason of entry.verdict.reasons) lines.push(`      - ${reason}`);
  }
  lines.push("");
  lines.push("Summary:");
  lines.push(`  worktrees: ${audit.summary.worktrees}`);
  lines.push(`  cache bytes: ${formatBytes(audit.summary.cacheBytes)}`);
  lines.push(`  safe items: ${audit.summary.safeItems}`);
  lines.push(`  consent items: ${audit.summary.consentItems}`);
  lines.push("");
  lines.push("Notes:");
  for (const note of audit.notes) lines.push(`  - ${note}`);
  return lines.join("\n");
}
