// SPDX-License-Identifier: Apache-2.0
import type { Finding, WatchdogReport } from "./types.js";
import { sortFindings } from "./types.js";
import type { StoredReport } from "./store.js";

const SEVERITY_MARK: Record<Finding["severity"], string> = {
  critical: "🔴 critical",
  high: "🟠 high",
  medium: "🟡 medium",
  low: "🔵 low",
};

export function renderFinding(finding: Finding): string {
  const lines: string[] = [];
  const recurred = finding.recurrences && finding.recurrences > 0 ? ` · recurred ${finding.recurrences}×` : "";
  lines.push(`### ${SEVERITY_MARK[finding.severity]} — ${finding.title}`);
  lines.push(`- id: \`${finding.id}\` · category: ${finding.category}${recurred}`);
  if (finding.tool || finding.sessionId) {
    lines.push(`- session: ${finding.tool ?? "?"}:${(finding.sessionId ?? "").slice(-12)}`);
  }
  lines.push(`- ${finding.detail}`);
  if (finding.evidence.length > 0) {
    lines.push("- evidence:");
    for (const item of finding.evidence) lines.push(`  - (${item.source}) ${item.ref}`);
  }
  lines.push(`- **proposal**: ${finding.proposal}`);
  lines.push("");
  return lines.join("\n");
}

export function renderReport(report: WatchdogReport): string {
  const lines: string[] = [];
  const scopeLabel = report.scope.kind === "env" ? "environment" : report.scope.kind;
  lines.push(`# Watchdog dig — ${scopeLabel}`);
  lines.push("");
  const meta = [
    `generated: ${report.generatedAt.replace("T", " ").slice(0, 19)}`,
    `sessions: ${report.sessions}`,
  ];
  if (report.scope.tool) meta.push(`tool: ${report.scope.tool}`);
  if (report.scope.project) meta.push(`project: ${report.scope.project}`);
  lines.push(`_${meta.join(" · ")}_`);
  lines.push("");
  lines.push(
    `Summary: ${report.summary.critical} critical · ${report.summary.high} high · ${report.summary.medium} medium · ${report.summary.low} low (${report.summary.total} total)`,
  );
  lines.push("");

  if (report.findings.length === 0) {
    lines.push("No findings. The environment and sessions look clean. 🐕");
    return lines.join("\n");
  }

  lines.push("## Findings (most severe first)");
  lines.push("");
  for (const finding of sortFindings(report.findings)) {
    lines.push(renderFinding(finding));
  }

  if (report.digests.length > 0) {
    lines.push("## Session digests");
    lines.push("");
    lines.push(report.digests.join("\n\n"));
  }
  return lines.join("\n");
}

export function renderStatus(reports: StoredReport[]): string {
  if (reports.length === 0) {
    return "Watchdog: no digs yet. Run `superskill-cli watchdog dig` or ask the agent to run a watchdog dig.";
  }
  const lines: string[] = ["Watchdog status", ""];
  for (const report of reports) {
    const fm = report.frontmatter;
    const open = report.findings.filter((finding) => finding.status === "open").length;
    const counts = `${fm.critical ?? 0}c/${fm.high ?? 0}h/${fm.medium ?? 0}m/${fm.low ?? 0}l`;
    lines.push(
      `- ${String(fm.created ?? "?")} · ${String(fm.scope ?? "?")} · ${report.name} · ${counts} · open findings: ${open}`,
    );
  }
  const latest = reports[0];
  const pending = latest.findings.filter((finding) => finding.status === "open");
  if (pending.length > 0) {
    lines.push("");
    lines.push(`Pending in latest (${latest.name}):`);
    for (const finding of pending) {
      lines.push(`- [${finding.severity}] \`${finding.id}\` ${finding.title}`);
    }
    lines.push("");
    lines.push("Fix with: `superskill-cli watchdog fix --finding <id> --apply` (add `--dry-run` first to preview).");
  }
  return lines.join("\n");
}
