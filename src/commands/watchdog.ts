// SPDX-License-Identifier: Apache-2.0
import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { CommandContext } from "../core/types.js";
import { VaultFS } from "../lib/vault-fs.js";
import { loadGraph } from "../lib/graph/store.js";
import { hygieneCommand } from "./hygiene.js";
import {
  listTraceSessions,
  loadTraceByRef,
  findTraceRef,
  latestTraceRef,
  describeTraceSources,
} from "../lib/watchdog/traces/index.js";
import { listVaultTraces, loadVaultTrace } from "../lib/watchdog/traces/vault.js";
import type { TraceSessionRef, SessionTrace } from "../lib/watchdog/types.js";
import { renderDigest } from "../lib/watchdog/digest.js";
import {
  detectErrorRate,
  detectFailedReads,
  detectNavigationThrash,
  detectOversizeOutputs,
  detectPromptCorrections,
  detectRepeatedCalls,
  detectSessionNoteSignals,
  detectSteering,
  detectToolErrorLoop,
  detectUnguardedRepo,
  detectVerificationGap,
  findingId,
} from "../lib/watchdog/detectors.js";
import { collectRepoContext, type RepoContext } from "../lib/watchdog/repo-context.js";
import { detectDeadSkills } from "../lib/watchdog/skills.js";
import { detectPlugins } from "../lib/watchdog/plugins.js";
import {
  detectEnvironment,
  hygieneItemsToFindings,
  scanLeakedTmpFiles,
} from "../lib/watchdog/environment.js";
import type { Finding, FindingCategory, WatchdogReport, FixAction, FixRunResult, Severity } from "../lib/watchdog/types.js";
import { sortFindings, summarizeFindings, SEVERITY_ORDER } from "../lib/watchdog/types.js";
import {
  appendFixLog,
  latestReport,
  listReports,
  loadReportFile,
  recurrenceCounts,
  saveReport,
  setFindingStatus,
} from "../lib/watchdog/store.js";
import { renderReport, renderStatus } from "../lib/watchdog/report.js";

const MAX_WINDOW_SESSIONS = 25;
const MAX_DIGESTS = 8;
const MAX_PER_CATEGORY = 8;
const LOAD_CONCURRENCY = 4;

export interface WatchdogArgs {
  action: "dig" | "fix" | "status";
  scope?: "session" | "window" | "env" | "all";
  sessionId?: string;
  tool?: string;
  since?: string;
  count?: number;
  project?: string;
  /** Ignore the current project filter and review sessions across all projects. */
  allProjects?: boolean;
  persist?: boolean;
  findingIds?: string[];
  categories?: string[];
  dismiss?: boolean;
  apply?: boolean;
  reportPath?: string;
}

export interface DigResult {
  action: "dig";
  report: WatchdogReport;
  rendered: string;
  persisted_path?: string;
  sources?: Array<{ id: string; label: string; root: string | null }>;
}

export interface StatusResult {
  action: "status";
  reports: Array<{
    name: string;
    path: string;
    created: string;
    scope: string;
    summary: { critical: number; high: number; medium: number; low: number; total: number };
    open: Array<{ id: string; severity: Severity; title: string }>;
  }>;
  rendered: string;
  sources: Array<{ id: string; label: string; root: string | null }>;
}

export type WatchdogResult = DigResult | FixRunResult | StatusResult;

export async function watchdogCommand(args: WatchdogArgs, ctx: CommandContext): Promise<WatchdogResult> {
  const vaultFs = vaultFor(ctx, args.project);
  switch (args.action) {
    case "dig":
      return runDig(args, ctx, vaultFs);
    case "fix":
      return runFix(args, ctx, vaultFs);
    case "status":
      return runStatus(ctx, vaultFs);
    default:
      throw new Error(`Unknown watchdog action: ${String(args.action)}`);
  }
}

function vaultFor(ctx: CommandContext, project?: string): VaultFS {
  if (!project || project === ctx.projectSlug) return ctx.vaultFs;
  return new VaultFS(ctx.vaultPath, { projectSlug: project });
}

/**
 * High/critical findings always ship. Medium/low are capped per category so a
 * window dig reads as a review, not a wall; the dropped items fold into one
 * rollup finding per category, ranked by the occurrence weight.
 */
export function capFindings(findings: Finding[], maxPerCategory = MAX_PER_CATEGORY): Finding[] {
  const kept: Finding[] = [];
  const byCategory = new Map<FindingCategory, Finding[]>();

  for (const finding of findings) {
    if (finding.severity === "critical" || finding.severity === "high") {
      kept.push(finding);
      continue;
    }
    const list = byCategory.get(finding.category) ?? [];
    list.push(finding);
    byCategory.set(finding.category, list);
  }

  for (const [category, list] of byCategory) {
    const sorted = [...list].sort((a, b) => {
      const byWeight = (b.weight ?? 0) - (a.weight ?? 0);
      return byWeight !== 0 ? byWeight : a.id.localeCompare(b.id);
    });
    kept.push(...sorted.slice(0, maxPerCategory));
    const dropped = sorted.slice(maxPerCategory);
    if (dropped.length === 0) continue;
    kept.push({
      id: findingId(category, "rollup"),
      category,
      severity: dropped.some((finding) => finding.severity === "medium") ? "medium" : "low",
      title: `${dropped.length} more ${category} findings folded (low-signal repeats)`,
      detail: `The report keeps the top ${maxPerCategory} per category; the rest were repetitions of the same kinds of issues.`,
      evidence: dropped.slice(0, 5).map((finding) => ({ source: "trace" as const, ref: finding.title })),
      proposal: `Fix the listed top findings first; these repeats usually disappear with them. Re-run the dig afterwards to confirm.`,
      weight: dropped.length,
    });
  }

  return kept;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

function severityRank(severity: Severity): number {
  return SEVERITY_ORDER.indexOf(severity);
}

export function mergeFindings(groups: Finding[][]): Finding[] {
  const merged = new Map<string, Finding>();
  for (const group of groups) {
    for (const finding of group) {
      const existing = merged.get(finding.id);
      if (!existing) {
        merged.set(finding.id, finding);
        continue;
      }
      const refs = new Set(existing.evidence.map((item) => `${item.source}:${item.ref}`));
      const evidence = [...existing.evidence];
      for (const item of finding.evidence) {
        const key = `${item.source}:${item.ref}`;
        if (!refs.has(key)) {
          refs.add(key);
          evidence.push(item);
        }
      }
      merged.set(finding.id, {
        ...existing,
        severity: severityRank(finding.severity) < severityRank(existing.severity) ? finding.severity : existing.severity,
        evidence: evidence.slice(0, 8),
        sessionId: existing.sessionId ?? finding.sessionId,
      });
    }
  }
  return [...merged.values()];
}

function parseSince(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const match = /^(\d+)\s*(m|h|d|w)?$/i.exec(raw.trim());
  if (!match) {
    const parsed = Date.parse(raw);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  const value = Number(match[1]);
  const unit = (match[2] ?? "d").toLowerCase();
  const factor = unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : unit === "d" ? 86_400_000 : 604_800_000;
  return Date.now() - value * factor;
}

function reportId(): string {
  return `wd_${Date.now().toString(36)}_${randomBytes(2).toString("hex")}`;
}

async function collectRepoFindings(repo: RepoContext): Promise<Finding[]> {
  const findings: Finding[] = [];
  findings.push(...detectUnguardedRepo(repo));
  findings.push(...detectSteering(repo));
  return findings;
}

async function collectSkillFindings(repoRoot: string): Promise<Finding[]> {
  try {
    const graph = await loadGraph(repoRoot);
    if (graph.nodes.length === 0) return [];
    return detectDeadSkills(graph);
  } catch {
    return [];
  }
}

function sessionFindings(trace: SessionTrace, repo: RepoContext | null): Finding[] {
  const findings: Finding[] = [
    ...detectToolErrorLoop(trace),
    ...detectRepeatedCalls(trace),
    ...detectNavigationThrash(trace),
    ...detectFailedReads(trace),
    ...detectOversizeOutputs(trace),
    ...detectPromptCorrections(trace),
    ...detectErrorRate(trace),
    ...detectSessionNoteSignals(trace),
  ];
  if (repo) findings.push(...detectVerificationGap(trace, repo));
  return findings;
}

async function loadAnyTrace(ctx: CommandContext, ref: TraceSessionRef): Promise<SessionTrace> {
  if (ref.tool === "superskill") return loadVaultTrace(ctx.vaultFs, ref);
  return loadTraceByRef(ref);
}

async function repoPathForSlug(vaultPath: string, slug: string): Promise<string | null> {
  try {
    const raw = await readFile(join(vaultPath, "project-map.json"), "utf-8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const [repo, value] of Object.entries(parsed)) {
      if (value === slug) return repo;
    }
  } catch {
    return null;
  }
  return null;
}

/** undefined = no filter; null = skip harness sources; string = filter to this repo path. */
async function harnessProjectFilter(args: WatchdogArgs, ctx: CommandContext): Promise<string | null | undefined> {
  if (args.allProjects) return undefined;
  if (args.project) return await repoPathForSlug(ctx.vaultPath, args.project);
  return process.cwd();
}

async function resolveRef(args: WatchdogArgs, ctx: CommandContext, vaultFs: VaultFS): Promise<TraceSessionRef | null> {
  const scopedSlug = args.allProjects ? null : args.project ?? ctx.projectSlug ?? null;
  if (args.sessionId) {
    const [tool, id] = args.sessionId.includes(":") ? args.sessionId.split(":") : [args.tool, args.sessionId];
    if (tool && tool !== "superskill" && id) {
      const ref = await findTraceRef(tool, id);
      if (ref) return ref;
    }
    if (!args.tool || args.tool !== "superskill") {
      for (const source of ["opencode", "claude-code", "codex"]) {
        const ref = await findTraceRef(source, args.sessionId);
        if (ref) return ref;
      }
    }
    // Universal fallback: find the vault session note by id.
    const vaultRefs = await listVaultTraces(vaultFs, { projectSlug: scopedSlug, limit: 40 }).catch(() => []);
    return vaultRefs.find((ref) => ref.id === args.sessionId) ?? null;
  }

  const filter = await harnessProjectFilter(args, ctx);
  if (filter !== null) {
    const harnessRef = await latestTraceRef({
      tool: args.tool,
      ...(filter !== undefined ? { project: filter } : {}),
      limit: 1,
    });
    if (harnessRef) return harnessRef;
  }
  if (args.tool && args.tool !== "superskill") return null;

  // Universal fallback: vault session notes cover every harness.
  const vaultRefs = await listVaultTraces(vaultFs, {
    projectSlug: scopedSlug,
    limit: 1,
  });
  return vaultRefs[0] ?? null;
}

async function finalizeReport(
  report: WatchdogReport,
  digests: string[],
  ctx: CommandContext,
  persist: boolean,
  vaultFs: VaultFS,
): Promise<DigResult> {
  report.digests = digests.slice(0, MAX_DIGESTS);
  report.findings = capFindings(report.findings);
  report.summary = summarizeFindings(report.findings);
  report.findings = sortFindings(report.findings);

  const recurrence = await recurrenceCounts(vaultFs, new Set(report.findings.map((f) => f.id))).catch(() => new Map<string, number>());
  for (const finding of report.findings) {
    const count = recurrence.get(finding.id) ?? 0;
    if (count > 0) finding.recurrences = count;
  }

  let persistedPath: string | undefined;
  const canPersist = Boolean(ctx.projectSlug) || vaultFs !== ctx.vaultFs;
  if (persist && canPersist) {
    try {
      persistedPath = await saveReport(vaultFs, report);
      report.persistedPath = persistedPath;
    } catch (err: unknown) {
      ctx.log.warn(`[watchdog] could not persist dig report: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return {
    action: "dig",
    report,
    rendered: renderReport(report),
    ...(persistedPath !== undefined ? { persisted_path: persistedPath } : {}),
    sources: describeTraceSources(),
  };
}

async function runDig(args: WatchdogArgs, ctx: CommandContext, vaultFs: VaultFS): Promise<DigResult> {
  const scope = args.scope ?? "session";
  const persist = args.persist !== false;
  const repo = await collectRepoContext(process.cwd()).catch(() => null);
  const repoRoot = repo?.root;

  if (scope === "env") {
    return digEnvironment(args, ctx, repo, vaultFs);
  }

  if (scope === "window" || scope === "all") {
    return digWindow(args, ctx, repo, scope === "all", vaultFs);
  }

  // session scope
  const ref = await resolveRef(args, ctx, vaultFs);
  if (!ref) {
    const report: WatchdogReport = {
      id: reportId(),
      kind: "dig",
      scope: { kind: "session", sessionIds: [], tool: args.tool, project: repoRoot },
      generatedAt: new Date().toISOString(),
      sessions: 0,
      findings: [],
      summary: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
      digests: [],
    };
    return finalizeReport(report, [], ctx, false, vaultFs);
  }

  let trace: SessionTrace;
  try {
    trace = await loadAnyTrace(ctx, ref);
  } catch (err: unknown) {
    throw new Error(`Could not read ${ref.tool} session ${ref.id}: ${err instanceof Error ? err.message : String(err)}`);
  }

  const groups: Finding[][] = [sessionFindings(trace, repo)];
  if (repo) groups.push(await collectRepoFindings(repo));
  if (repoRoot) groups.push(await collectSkillFindings(repoRoot));

  const report: WatchdogReport = {
    id: reportId(),
    kind: "dig",
    scope: { kind: "session", sessionIds: [ref.id], tool: ref.tool, project: ref.project ?? repoRoot },
    generatedAt: new Date().toISOString(),
    sessions: 1,
    findings: mergeFindings(groups),
    summary: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
    digests: [],
  };
  return finalizeReport(report, [renderDigest(trace)], ctx, persist, vaultFs);
}

async function digWindow(args: WatchdogArgs, ctx: CommandContext, repo: RepoContext | null, includeEnv: boolean, vaultFs: VaultFS): Promise<DigResult> {
  const since = args.since ? parseSince(args.since) : args.count ? undefined : Date.now() - 7 * 86_400_000;
  const limit = Math.min(args.count ?? 20, MAX_WINDOW_SESSIONS);
  const filter = await harnessProjectFilter(args, ctx);
  const refs = filter === null ? [] : await listTraceSessions({
    tool: args.tool,
    ...(filter !== undefined ? { project: filter } : {}),
    ...(since !== undefined ? { since } : {}),
    limit,
  });

  // Universal fallback: include recent vault session notes (any harness).
  let vaultRefs: TraceSessionRef[] = [];
  if (!args.tool || args.tool === "superskill") {
    vaultRefs = await listVaultTraces(vaultFs, {
      projectSlug: args.allProjects ? null : args.project ?? ctx.projectSlug ?? null,
      ...(since !== undefined ? { since } : {}),
      limit: 10,
    }).catch(() => []);
  }
  const allRefs = [...refs, ...vaultRefs.filter((vaultRef) => !refs.some((ref) => ref.id === vaultRef.id))];

  const traces = await mapLimit(allRefs, LOAD_CONCURRENCY, async (ref) => {
    try {
      return await loadAnyTrace(ctx, ref);
    } catch {
      return null;
    }
  });
  const loaded = traces.filter((trace): trace is SessionTrace => trace !== null);

  const groups: Finding[][] = loaded.map((trace) => sessionFindings(trace, repo));
  if (repo) groups.push(await collectRepoFindings(repo));
  if (repo?.root) groups.push(await collectSkillFindings(repo.root));
  if (loaded.length >= 5) groups.push(await detectPlugins(loaded));
  if (includeEnv) groups.push(await collectEnvFindings(ctx, repo));

  const report: WatchdogReport = {
    id: reportId(),
    kind: "dig",
    scope: {
      kind: includeEnv ? "all" : "window",
      sessionIds: loaded.map((trace) => trace.ref.id),
      tool: args.tool,
      project: repo?.root,
      ...(since !== undefined ? { since } : {}),
    },
    generatedAt: new Date().toISOString(),
    sessions: loaded.length,
    findings: mergeFindings(groups),
    summary: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
    digests: [],
  };
  return finalizeReport(report, loaded.map((trace) => renderDigest(trace, 1200)), ctx, args.persist !== false, vaultFs);
}

async function collectEnvFindings(ctx: CommandContext, repo: RepoContext | null): Promise<Finding[]> {
  const findings = await detectEnvironment().catch(() => [] as Finding[]);
  try {
    const hygiene = await hygieneCommand({ sizes: false }, ctx);
    findings.push(...hygieneItemsToFindings(hygiene));
  } catch (err: unknown) {
    console.error(`[watchdog] hygiene probe failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (repo) {
    findings.push(...(await collectRepoFindings(repo)));
  }
  if (repo?.root) {
    findings.push(...(await collectSkillFindings(repo.root)));
  }
  return findings;
}

async function digEnvironment(args: WatchdogArgs, ctx: CommandContext, repo: RepoContext | null, vaultFs: VaultFS): Promise<DigResult> {
  const findings = await collectEnvFindings(ctx, repo);
  const report: WatchdogReport = {
    id: reportId(),
    kind: "dig",
    scope: { kind: "env", sessionIds: [], project: repo?.root },
    generatedAt: new Date().toISOString(),
    sessions: 0,
    findings,
    summary: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
    digests: [],
  };
  return finalizeReport(report, [], ctx, args.persist !== false, vaultFs);
}

async function runStatus(ctx: CommandContext, vaultFs: VaultFS): Promise<StatusResult> {
  const reports = await listReports(vaultFs, 10);
  return {
    action: "status",
    reports: reports.map((report) => ({
      name: report.name,
      path: report.path,
      created: String(report.frontmatter.created ?? ""),
      scope: String(report.frontmatter.scope ?? ""),
      summary: {
        critical: Number(report.frontmatter.critical ?? 0),
        high: Number(report.frontmatter.high ?? 0),
        medium: Number(report.frontmatter.medium ?? 0),
        low: Number(report.frontmatter.low ?? 0),
        total: Number(report.frontmatter.total ?? 0),
      },
      open: report.findings
        .filter((finding) => finding.status === "open")
        .map((finding) => ({ id: finding.id, severity: finding.severity, title: finding.title })),
    })),
    rendered: renderStatus(reports),
    sources: [
      ...describeTraceSources(),
      { id: "superskill", label: "Vault session notes (any harness)", root: ctx.vaultPath },
    ],
  };
}

const LEAKED_TMP_CATEGORY = "leaked-tmp";

async function quarantineLeakedTmp(dryRun: boolean): Promise<FixAction> {
  const scan = await scanLeakedTmpFiles();
  const action: FixAction = {
    id: `fx_quarantine_${Date.now().toString(36)}`,
    kind: "quarantine-files",
    description: `Quarantine ${scan.files.length} leaked .tmp files from ~/.superskill (${scan.totalBytes} bytes)`,
    path: scan.root,
    fileCount: scan.files.length,
    bytes: scan.totalBytes,
    status: dryRun ? "planned" : "applied",
  };
  if (dryRun || scan.files.length === 0) return action;

  const quarantineDir = join(homedir(), ".superskill", "quarantine", new Date().toISOString().replace(/[:.]/g, "-"));
  try {
    await mkdir(quarantineDir, { recursive: true });
    const moved: Array<{ name: string; original: string; bytes: number }> = [];
    for (const file of scan.files) {
      const name = file.path.split("/").pop() ?? file.path;
      await rename(file.path, join(quarantineDir, name));
      moved.push({ name, original: file.path, bytes: file.bytes });
    }
    await writeFile(
      join(quarantineDir, "manifest.json"),
      JSON.stringify(
        {
          createdAt: new Date().toISOString(),
          reason: "watchdog fix: leaked .tmp files",
          files: moved,
          undo: `Move the files in this directory back to ~/.superskill (original paths in manifest).`,
        },
        null,
        2,
      ),
      "utf-8",
    );
    return { ...action, path: quarantineDir };
  } catch (err: unknown) {
    return {
      ...action,
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function runFix(args: WatchdogArgs, ctx: CommandContext, vaultFs: VaultFS): Promise<FixRunResult> {
  const report = args.reportPath
    ? await loadReportFile(vaultFs, args.reportPath)
    : await latestReport(vaultFs);

  const dryRun = args.apply !== true;
  const actions: FixAction[] = [];
  const targetStatus = args.dismiss === true ? "dismissed" : "applied";

  if (!report) {
    return { action: "fix", dryRun, reportId: "", actions, applied: 0, planned: 0 };
  }

  const selected = report.findings.filter((finding) => {
    if (args.findingIds && args.findingIds.length > 0) {
      return args.findingIds.includes(finding.id) || args.findingIds.includes(`${finding.category}:${finding.id}`);
    }
    if (args.categories && args.categories.length > 0) {
      return args.categories.includes(finding.category) || args.categories.includes(finding.id);
    }
    return false;
  });

  for (const finding of selected) {
    const action: FixAction = {
      id: `fx_${finding.id}`,
      kind: "mark-finding",
      description: `Mark finding ${finding.id} as ${targetStatus}: ${finding.title}`,
      findingId: finding.id,
      status: dryRun ? "planned" : "applied",
    };
    if (!dryRun) {
      const ok = await setFindingStatus(vaultFs, report.path, finding.id, targetStatus);
      if (!ok) {
        action.status = "failed";
        action.error = "finding not found in report";
      }
    }
    actions.push(action);
  }

  const wantsTmp = (args.categories ?? []).includes(LEAKED_TMP_CATEGORY) ||
    (args.findingIds ?? []).some((id) => selected.some((finding) => finding.id === id && finding.id.includes("leaked")));
  if (wantsTmp) {
    actions.push(await quarantineLeakedTmp(dryRun));
  }

  const applied = actions.filter((action) => action.status === "applied").length;
  const planned = actions.filter((action) => action.status === "planned").length;

  if (!dryRun && actions.length > 0) {
    const notes = actions.map((action) => `${action.status}: ${action.description}${action.error ? ` (${action.error})` : ""}`);
    await appendFixLog(vaultFs, report.path, notes).catch(() => {});
  }

  return { action: "fix", dryRun, reportId: report.name, reportPath: report.path, actions, applied, planned };
}
