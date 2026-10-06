// SPDX-License-Identifier: Apache-2.0
import { formatBytes, type FormatBytesOptions } from "../format-bytes.js";
import { HYGIENE_CATEGORY_ORDER } from "./report.js";
import type { HygieneCategory, HygieneReport } from "./types.js";

const BYTES_OPTIONS: FormatBytesOptions = { compact: true, maxUnit: "PB" };

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
      `${report.totals.dueCount} due (known ${formatBytes(report.totals.knownBytes, BYTES_OPTIONS)}, ` +
      `due ${formatBytes(report.totals.dueBytes, BYTES_OPTIONS)})`,
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
        `  ${marker} ${item.title} — ${formatBytes(item.bytes, BYTES_OPTIONS)} — ${formatAge(item.ageDays)} — ` +
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
