// SPDX-License-Identifier: Apache-2.0
import { HYGIENE_CATEGORY_ORDER } from "./report.js";
import type { HygieneCategory, HygieneReport } from "./types.js";

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

function formatAge(ageDays: number | null): string {
  if (ageDays === null || !Number.isFinite(ageDays)) return "unknown";
  return `${Math.round(ageDays)}d`;
}

function categoryLabel(category: HygieneCategory): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function formatHygieneReport(report: HygieneReport, opts: { dueOnly?: boolean } = {}): string {
  const lines: string[] = [];
  lines.push(
    `Superskill hygiene report — ${report.generatedAt} — ${report.totals.itemCount} item(s), ` +
      `${report.totals.dueCount} due (known ${formatBytes(report.totals.knownBytes)}, ` +
      `due ${formatBytes(report.totals.dueBytes)})`,
  );

  const visible = opts.dueOnly === true ? report.items.filter((item) => item.due) : report.items;
  for (const category of HYGIENE_CATEGORY_ORDER) {
    const group = visible.filter((item) => item.category === category);
    if (group.length === 0) continue;
    lines.push("");
    lines.push(`${categoryLabel(category)}:`);
    for (const item of group) {
      const marker = item.due ? "[due]" : "[   ]";
      lines.push(
        `  ${marker} ${item.title} — ${formatBytes(item.bytes)} — ${formatAge(item.ageDays)} — ` +
          `${item.tier} — ${item.reason}`,
      );
      if (item.due && item.plan !== null) lines.push(`      plan: ${item.plan}`);
    }
  }

  if (report.skipped.length > 0) {
    lines.push("");
    lines.push("Skipped:");
    for (const skip of report.skipped) lines.push(`  ${skip.probe}: ${skip.reason}`);
  }

  lines.push("");
  lines.push("Nothing was deleted. Everything above is a recommendation.");
  lines.push(
    "Next: run `superskill hygiene --due` to act on due items; " +
      "use `superskill worktree gc --all` to reclaim worktree caches.",
  );
  return lines.join("\n");
}
