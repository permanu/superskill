// SPDX-License-Identifier: Apache-2.0
import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import {
  type BatchStatus,
  type CampaignPlan,
  type CampaignState,
  type QueueEntry,
  collectEntries,
  loadPlan,
  readState,
  resolveWorkstreamsDir,
  stateFromPlan,
} from "./queue.js";

/** Documentation files that live next to rules but are not rules themselves. */
export const NON_RULE_FILES: ReadonlySet<string> = new Set(["INDEX.md", "sources.md", "categories.md"]);

export interface ScannedRule {
  lang: string;
  /** Path relative to the language directory. */
  file: string;
  prefix: string;
  /** Frontmatter `status`; "unknown" when absent or unparsed. */
  status: string;
}

export interface LanguageReport {
  lang: string;
  baseline: string;
  target: number;
  onDisk: number;
  verified: number;
  draft: number;
  other: number;
  batchTotal: number;
  batches: Record<BatchStatus, number>;
}

export interface StatusReport {
  generatedAt: string;
  contract: string;
  targetTotal: number;
  languageCount: number;
  onDiskTotal: number;
  verifiedTotal: number;
  draftTotal: number;
  otherTotal: number;
  batchTotal: number;
  batchTotals: Record<BatchStatus, number>;
  percentOnDisk: number;
  languages: LanguageReport[];
  nextPending: QueueEntry[];
  workstreams: QueueEntry[];
}

export interface GenerateStatusOptions {
  workstreamsDir?: string;
  catalogRulesDir?: string;
  /** Output path; defaults to <workstreamsDir>/STATUS.md. */
  statusPath?: string;
  /** Cap on the "next pending batches" list (default 20). */
  nextLimit?: number;
  /** Fixed timestamp, for deterministic tests. */
  generatedAt?: string;
}

export interface GenerateStatusResult {
  statusPath: string;
  markdown: string;
  report: StatusReport;
}

export function defaultCatalogRulesDir(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../../catalog/rules");
}

function emptyStatusCounts(): Record<BatchStatus, number> {
  return { pending: 0, claimed: 0, done: 0, failed: 0, blocked: 0, superseded: 0 };
}

async function walkMarkdown(root: string, rel: string, out: string[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(join(root, rel), { withFileTypes: true });
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") return;
    throw e;
  }
  for (const entry of entries) {
    const childRel = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      await walkMarkdown(root, childRel, out);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      out.push(childRel);
    }
  }
}

/**
 * Scan catalog/rules/<lang>/ for rule files and read their frontmatter status.
 * Missing directories are treated as empty; documentation files are skipped.
 */
export async function scanCatalogRules(
  catalogRulesDir: string,
  langs: readonly string[]
): Promise<ScannedRule[]> {
  const rules: ScannedRule[] = [];
  for (const lang of langs) {
    const langDir = join(catalogRulesDir, lang);
    const files: string[] = [];
    await walkMarkdown(langDir, "", files);
    files.sort();
    for (const file of files) {
      const base = file.split("/").pop() ?? file;
      if (NON_RULE_FILES.has(base)) continue;
      let status = "unknown";
      try {
        const raw = await readFile(join(langDir, file), "utf-8");
        const { data } = matter(raw);
        if (typeof data.status === "string" && data.status.length > 0) status = data.status;
      } catch (e) {
        const code = (e as NodeJS.ErrnoException).code;
        if (code !== "ENOENT") {
          console.error(`[rules-status] failed to parse ${join(langDir, file)}:`, (e as Error).message);
        }
      }
      rules.push({ lang, file, prefix: base.replace(/\.md$/, "").split("-")[0] ?? "", status });
    }
  }
  return rules;
}

export function buildReport(
  plan: CampaignPlan,
  state: CampaignState,
  rules: readonly ScannedRule[],
  generatedAt: string,
  nextLimit = 20
): StatusReport {
  const batches = collectEntries(plan, state, { kind: "batch" });
  const workstreams = collectEntries(plan, state, { kind: "workstream" });
  const planById = new Map(plan.batches.map((b) => [b.id, b]));

  const languages: LanguageReport[] = plan.languages.map((language) => {
    const langBatches = batches.filter((b) => b.lang === language.lang);
    const langRules = rules.filter((r) => r.lang === language.lang);
    const batchesByStatus = emptyStatusCounts();
    let target = 0;
    for (const batch of langBatches) {
      batchesByStatus[batch.status]++;
      target += planById.get(batch.id)?.target ?? batch.target;
    }
    return {
      lang: language.lang,
      baseline: language.baseline,
      target: language.target ?? target,
      onDisk: langRules.length,
      verified: langRules.filter((r) => r.status === "verified").length,
      draft: langRules.filter((r) => r.status === "draft").length,
      other: langRules.filter((r) => r.status !== "verified" && r.status !== "draft").length,
      batchTotal: langBatches.length,
      batches: batchesByStatus,
    };
  });

  const batchTotals = emptyStatusCounts();
  for (const batch of batches) batchTotals[batch.status]++;

  const targetTotal = languages.reduce((acc, l) => acc + l.target, 0);
  const onDiskTotal = rules.length;
  const nextPending = batches.filter((b) => b.status === "pending").slice(0, nextLimit);

  return {
    generatedAt,
    contract: plan.contract ?? "docs/authoring/CONTRACT.md",
    targetTotal,
    languageCount: languages.length,
    onDiskTotal,
    verifiedTotal: rules.filter((r) => r.status === "verified").length,
    draftTotal: rules.filter((r) => r.status === "draft").length,
    otherTotal: rules.filter((r) => r.status !== "verified" && r.status !== "draft").length,
    batchTotal: batches.length,
    batchTotals,
    percentOnDisk: targetTotal === 0 ? 0 : (onDiskTotal / targetTotal) * 100,
    languages,
    nextPending,
    workstreams,
  };
}

export function renderStatus(report: StatusReport): string {
  const lines: string[] = [];
  lines.push("# Atomic Rules Campaign — STATUS");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Contract: ${report.contract}`);
  lines.push("");
  lines.push("## Totals");
  lines.push("");
  lines.push(`- Target rules: **${report.targetTotal}** across ${report.languageCount} languages`);
  lines.push(`- On disk: **${report.onDiskTotal}** (${report.percentOnDisk.toFixed(1)}%)`);
  lines.push(`- Verified: **${report.verifiedTotal}** | Draft: **${report.draftTotal}** | Other/unparsed: **${report.otherTotal}**`);
  lines.push(
    `- Batches: **${report.batchTotals.done}/${report.batchTotal}** done | ${report.batchTotals.claimed} claimed | ` +
      `${report.batchTotals.pending} pending | ${report.batchTotals.failed} failed | ${report.batchTotals.blocked} blocked | ` +
      `${report.batchTotals.superseded} superseded`
  );
  lines.push("");
  lines.push("## Languages");
  lines.push("");
  lines.push("| Language | Baseline | Target | On disk | Verified | Draft | Other | Batches (pending/claimed/done/failed/blocked/superseded) |");
  lines.push("|---|---|---:|---:|---:|---:|---:|---|");
  for (const language of report.languages) {
    const b = language.batches;
    lines.push(
      `| ${language.lang} | ${language.baseline} | ${language.target} | ${language.onDisk} | ` +
        `${language.verified} | ${language.draft} | ${language.other} | ` +
        `${b.pending}/${b.claimed}/${b.done}/${b.failed}/${b.blocked}/${b.superseded} |`
    );
  }
  lines.push("");
  lines.push("## Rule status counts");
  lines.push("");
  lines.push("| Status | On disk |");
  lines.push("|---|---:|");
  lines.push(`| verified | ${report.verifiedTotal} |`);
  lines.push(`| draft | ${report.draftTotal} |`);
  lines.push(`| other/unparsed | ${report.otherTotal} |`);
  lines.push("");
  lines.push("## Next pending batches");
  lines.push("");
  if (report.batchTotals.pending === 0) {
    lines.push("All batches are claimed or complete.");
  } else {
    for (const batch of report.nextPending) {
      lines.push(`- \`${batch.id}\` — ${batch.title} (target ${batch.target})`);
    }
    const remaining = report.batchTotals.pending - report.nextPending.length;
    if (remaining > 0) lines.push(`- … and ${remaining} more pending`);
  }
  lines.push("");
  lines.push("## Non-content workstreams");
  lines.push("");
  if (report.workstreams.length === 0) {
    lines.push("None tracked.");
  } else {
    lines.push("| Workstream | Title | Status | Updated |");
    lines.push("|---|---|---|---|");
    for (const workstream of report.workstreams) {
      lines.push(
        `| \`${workstream.id}\` | ${workstream.title} | ${workstream.status} | ${workstream.updated ?? "—"} |`
      );
    }
  }
  lines.push("");
  return lines.join("\n");
}

async function writeFileAtomic(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(tmp, content, "utf-8");
  await rename(tmp, path);
}

/**
 * Regenerate workstreams/STATUS.md from plan.json, state.json and the on-disk
 * catalog. Read-only with respect to state.json; tolerates a missing catalog.
 */
export async function generateStatus(opts: GenerateStatusOptions = {}): Promise<GenerateStatusResult> {
  const workstreamsDir = resolveWorkstreamsDir(opts);
  const catalogRulesDir = opts.catalogRulesDir ? resolve(opts.catalogRulesDir) : defaultCatalogRulesDir();
  const plan = await loadPlan(workstreamsDir);
  const state = (await readState(workstreamsDir)) ?? stateFromPlan(plan);
  const rules = await scanCatalogRules(catalogRulesDir, plan.languages.map((l) => l.lang));
  const report = buildReport(
    plan,
    state,
    rules,
    opts.generatedAt ?? new Date().toISOString(),
    opts.nextLimit ?? 20
  );
  const markdown = renderStatus(report);
  const statusPath = resolve(opts.statusPath ?? join(workstreamsDir, "STATUS.md"));
  await writeFileAtomic(statusPath, markdown);
  return { statusPath, markdown, report };
}
