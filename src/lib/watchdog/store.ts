// SPDX-License-Identifier: Apache-2.0
import { claimNumberedFile } from "../auto-number.js";
import { createFrontmatter, parseFrontmatter, serializeFrontmatter, type Frontmatter } from "../frontmatter.js";
import type { VaultFS } from "../vault-fs.js";
import type { Finding, FindingStatus, FindingSummary, StoredFinding, WatchdogReport } from "./types.js";
import { renderReport } from "./report.js";

export const WATCHDOG_DIR = "watchdog";
const LOOKBACK = 20;

export interface StoredReport {
  path: string;
  name: string;
  frontmatter: Frontmatter;
  findings: StoredFinding[];
}

function toStored(findings: Finding[]): StoredFinding[] {
  return findings.map((finding) => ({
    id: finding.id,
    category: finding.category,
    severity: finding.severity,
    status: "open" as const,
    title: finding.title,
    proposal: finding.proposal,
  }));
}

export async function saveReport(vaultFs: VaultFS, report: WatchdogReport): Promise<string> {
  const date = report.generatedAt.slice(0, 10);
  const slug = `${report.scope.kind}-${date}`;
  const stored = toStored(report.findings);
  const frontmatter = createFrontmatter({
    type: "watchdog",
    kind: "dig",
    scope: report.scope.kind,
    ...(report.scope.tool !== undefined ? { tool: report.scope.tool } : {}),
    ...(report.scope.project !== undefined ? { project: report.scope.project } : {}),
    sessions: report.sessions,
    critical: report.summary.critical,
    high: report.summary.high,
    medium: report.summary.medium,
    low: report.summary.low,
    total: report.summary.total,
    findings: stored,
  });
  const body = renderReport(report);
  const claimed = await claimNumberedFile(
    vaultFs,
    WATCHDOG_DIR,
    (_number, padded) => `${padded}-${slug}.md`,
    () => serializeFrontmatter(frontmatter, body),
  );
  return claimed.path;
}

function asStoredFindings(value: unknown): StoredFinding[] {
  if (!Array.isArray(value)) return [];
  const findings: StoredFinding[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    if (typeof item.id !== "string" || typeof item.title !== "string") continue;
    findings.push({
      id: item.id,
      category: (item.category as StoredFinding["category"]) ?? "environment",
      severity: (item.severity as StoredFinding["severity"]) ?? "low",
      status: (item.status as FindingStatus) ?? "open",
      title: item.title,
      proposal: typeof item.proposal === "string" ? item.proposal : "",
    });
  }
  return findings;
}

export async function loadReportFile(vaultFs: VaultFS, path: string): Promise<StoredReport | null> {
  let content: string;
  try {
    content = await vaultFs.read(path);
  } catch {
    return null;
  }
  const { data } = parseFrontmatter(content);
  const name = path.split("/").pop() ?? path;
  return { path, name, frontmatter: data, findings: asStoredFindings(data.findings) };
}

export async function listReports(vaultFs: VaultFS, limit = LOOKBACK): Promise<StoredReport[]> {
  let entries: string[];
  try {
    entries = await vaultFs.list(WATCHDOG_DIR, 1);
  } catch {
    return [];
  }
  const sorted = entries
    .filter((entry) => entry.endsWith(".md"))
    .sort((a, b) => b.localeCompare(a))
    .slice(0, limit);
  const reports: StoredReport[] = [];
  for (const path of sorted) {
    const report = await loadReportFile(vaultFs, path);
    if (report) reports.push(report);
  }
  return reports;
}

export async function latestReport(vaultFs: VaultFS): Promise<StoredReport | null> {
  const reports = await listReports(vaultFs, 1);
  return reports[0] ?? null;
}

export async function setFindingStatus(
  vaultFs: VaultFS,
  path: string,
  findingId: string,
  status: FindingStatus,
): Promise<boolean> {
  const report = await loadReportFile(vaultFs, path);
  if (!report) return false;
  let changed = false;
  const findings = report.findings.map((finding) => {
    if (finding.id !== findingId) return finding;
    changed = true;
    return { ...finding, status };
  });
  if (!changed) return false;
  const { content } = parseFrontmatter(await vaultFs.read(path));
  const frontmatter: Frontmatter = { ...report.frontmatter, findings };
  await vaultFs.write(path, serializeFrontmatter(frontmatter, content));
  return true;
}

export async function recurrenceCounts(
  vaultFs: VaultFS,
  ids: Set<string>,
  lookback = LOOKBACK,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (ids.size === 0) return counts;
  const reports = await listReports(vaultFs, lookback);
  for (const report of reports) {
    for (const finding of report.findings) {
      if (!ids.has(finding.id)) continue;
      counts.set(finding.id, (counts.get(finding.id) ?? 0) + 1);
    }
  }
  return counts;
}

export async function appendFixLog(vaultFs: VaultFS, path: string, notes: string[]): Promise<void> {
  if (notes.length === 0) return;
  const stamp = new Date().toISOString();
  const block = `\n\n## Fix log — ${stamp}\n${notes.map((note) => `- ${note}`).join("\n")}\n`;
  await vaultFs.append(path, block);
}

export function reportSummaryLine(frontmatter: Frontmatter): FindingSummary {
  return {
    critical: Number(frontmatter.critical ?? 0),
    high: Number(frontmatter.high ?? 0),
    medium: Number(frontmatter.medium ?? 0),
    low: Number(frontmatter.low ?? 0),
    total: Number(frontmatter.total ?? 0),
  };
}
