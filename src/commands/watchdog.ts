// SPDX-License-Identifier: Apache-2.0
import { randomBytes } from "node:crypto";
import type { CommandContext } from "../core/types.js";
import { validateProjectSlug } from "../config.js";
import { VaultError, VaultFS } from "../lib/vault-fs.js";
import { loadGraph } from "../lib/graph/store.js";
import { hygieneCommand } from "./hygiene.js";
import {
  collectTraceSessions,
  loadTraceByRef,
  findTraceRef,
  latestTraceRef,
  describeTraceSources,
} from "../lib/watchdog/traces/index.js";
import { MAX_TRACE_SOURCE_ERRORS, traceErrorCode } from "../lib/watchdog/traces/source.js";
import { listVaultTraces, loadVaultTrace } from "../lib/watchdog/traces/vault.js";
import type { TraceSessionRef, SessionTrace, TraceSourceIssue } from "../lib/watchdog/types.js";
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
import { collectRepoContext, resolveRepoRoot, type RepoContext } from "../lib/watchdog/repo-context.js";
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
import { quarantineTmpFiles } from "../lib/watchdog/quarantine.js";

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
  confirm?: boolean;
  includePrompts?: boolean;
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
  if (args.allProjects && args.confirm !== true) throw new VaultError("INVALID_ARGUMENT", "Cross-project history requires confirm: true.");
  if (args.project) validateProjectSlug(args.project);
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
  if (project && project !== ctx.projectSlug) throw new VaultError("PERMISSION_DENIED", "Watchdog project must match the scoped workspace project.");
  return ctx.vaultFs;
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

function addSourceIssue(issues: TraceSourceIssue[], source: string, code: string): void {
  const sourceId = /^[a-z0-9-]{1,40}$/.test(source) ? source : "unknown";
  const safeCode = traceErrorCode({ code });
  if (issues.some((issue) => issue.source === sourceId && issue.code === safeCode)) return;
  if (issues.length >= MAX_TRACE_SOURCE_ERRORS) return;
  issues.push({ source: sourceId, code: safeCode });
}

function traceIssues(trace: SessionTrace): TraceSourceIssue[] {
  const issues: TraceSourceIssue[] = [];
  for (const code of trace.sourceErrors ?? []) addSourceIssue(issues, trace.ref.tool, code);
  if (trace.truncated) addSourceIssue(issues, trace.ref.tool, "TRUNCATED");
  return issues;
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

function sessionFindings(trace: SessionTrace, repo: RepoContext | null, includePrompts = false): Finding[] {
  const findings: Finding[] = [
    ...detectToolErrorLoop(trace, includePrompts),
    ...detectRepeatedCalls(trace, includePrompts),
    ...detectNavigationThrash(trace),
    ...detectFailedReads(trace, includePrompts),
    ...detectOversizeOutputs(trace, includePrompts),
    ...detectPromptCorrections(trace, includePrompts),
    ...detectErrorRate(trace),
    ...detectSessionNoteSignals(trace, includePrompts),
  ];
  if (repo) findings.push(...detectVerificationGap(trace, repo));
  return findings;
}

async function loadAnyTrace(vaultFs: VaultFS, ref: TraceSessionRef): Promise<SessionTrace> {
  if (ref.tool === "superskill") return loadVaultTrace(vaultFs, ref);
  return loadTraceByRef(ref);
}

/** undefined = no filter; null = skip harness sources; string = filter to this repo path. */
async function harnessProjectFilter(args: WatchdogArgs, ctx: CommandContext): Promise<string | null | undefined> {
  if (args.allProjects === true) return undefined;
  if (!ctx.projectSlug) return null;
  return resolveRepoRoot(ctx.workspacePath ?? process.cwd());
}

function historyVault(args: WatchdogArgs, ctx: CommandContext, vaultFs: VaultFS): VaultFS {
  return args.allProjects === true && args.confirm === true ? new VaultFS(ctx.vaultPath) : vaultFs;
}

function vaultHistoryOptions(args: WatchdogArgs, ctx: CommandContext, vaultFs: VaultFS) {
  return args.allProjects === true && args.confirm === true
    ? { allProjects: true, confirm: true }
    : { projectSlug: args.project ?? ctx.projectSlug ?? vaultFs.projectSlug ?? null };
}

async function resolveRef(args: WatchdogArgs, ctx: CommandContext, vaultFs: VaultFS): Promise<TraceSessionRef | null> {
  const filter = await harnessProjectFilter(args, ctx);
  const historyFs = historyVault(args, ctx, vaultFs);
  const historyOpts = vaultHistoryOptions(args, ctx, vaultFs);
  if (args.sessionId) {
    const [tool, id] = args.sessionId.includes(":") ? args.sessionId.split(":") : [args.tool, args.sessionId];
    if (filter !== null && tool && tool !== "superskill" && id) {
      const ref = await findTraceRef(tool, id, { project: filter });
      if (ref) return ref;
    }
    if (filter !== null && !tool) {
      for (const source of ["opencode", "claude-code", "codex"]) {
        const ref = await findTraceRef(source, args.sessionId, { project: filter });
        if (ref) return ref;
      }
    }
    if (tool && tool !== "superskill") return null;
    // Universal fallback: find the vault session note by id.
    const vaultRefs = await listVaultTraces(historyFs, { ...historyOpts, limit: 40 });
    return vaultRefs.find((ref) => ref.id === id) ?? null;
  }

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
  const vaultRefs = await listVaultTraces(historyFs, {
    ...historyOpts,
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
  report.incomplete ??= false;
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
  const canPersist = !report.incomplete && (Boolean(ctx.projectSlug) || vaultFs !== ctx.vaultFs);
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
    rendered: report.incomplete
      ? `${renderReport(report)}\n\nINCOMPLETE: source data could not be fully assessed (${(report.sourceErrors ?? []).map(({ source, code }) => `${source}:${code}`).join(", ") || "unknown source error"}). This is not a clean result.`
      : renderReport(report),
    ...(persistedPath !== undefined ? { persisted_path: persistedPath } : {}),
    sources: describeTraceSources(),
  };
}

async function runDig(args: WatchdogArgs, ctx: CommandContext, vaultFs: VaultFS): Promise<DigResult> {
  const scope = args.scope ?? "session";
  const persist = args.persist !== false;
  const filter = await harnessProjectFilter(args, ctx);
  const repo = filter === null ? null : await collectRepoContext(filter ?? ctx.workspacePath ?? process.cwd()).catch(() => null);
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
    trace = await loadAnyTrace(historyVault(args, ctx, vaultFs), ref);
  } catch (err: unknown) {
    throw new Error(`Could not read ${ref.tool} session ${ref.id} (${traceErrorCode(err)}).`);
  }

  const groups: Finding[][] = [sessionFindings(trace, repo, args.includePrompts === true)];
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
    ...(traceIssues(trace).length > 0 ? { incomplete: true, sourceErrors: traceIssues(trace) } : {}),
  };
  return finalizeReport(report, [renderDigest(trace, 2400, { includePrompts: args.includePrompts })], ctx, persist, vaultFs);
}

async function digWindow(args: WatchdogArgs, ctx: CommandContext, repo: RepoContext | null, includeEnv: boolean, vaultFs: VaultFS): Promise<DigResult> {
  const since = args.since ? parseSince(args.since) : args.count ? undefined : Date.now() - 7 * 86_400_000;
  const limit = Math.min(args.count ?? 20, MAX_WINDOW_SESSIONS);
  const filter = await harnessProjectFilter(args, ctx);
  const traceList = filter === null
    ? { sessions: [], sourceErrors: [] as TraceSourceIssue[] }
    : await collectTraceSessions({
      tool: args.tool,
      ...(filter !== undefined ? { project: filter } : {}),
      ...(since !== undefined ? { since } : {}),
      limit,
    });
  const refs = traceList.sessions;
  const sourceErrors = [...traceList.sourceErrors];

  // Universal fallback: include recent vault session notes (any harness).
  let vaultRefs: TraceSessionRef[] = [];
  if (!args.tool || args.tool === "superskill") {
    vaultRefs = await listVaultTraces(historyVault(args, ctx, vaultFs), {
      ...vaultHistoryOptions(args, ctx, vaultFs),
      ...(since !== undefined ? { since } : {}),
      limit: 10,
    });
  }
  const allRefs = [...refs, ...vaultRefs.filter((vaultRef) => !refs.some((ref) => ref.id === vaultRef.id))];

  const traces = await mapLimit(allRefs, LOAD_CONCURRENCY, async (ref) => {
    try {
      return await loadAnyTrace(historyVault(args, ctx, vaultFs), ref);
    } catch (err) {
      addSourceIssue(sourceErrors, ref.tool, traceErrorCode(err));
      return null;
    }
  });
  const loaded = traces.filter((trace): trace is SessionTrace => trace !== null);
  for (const trace of loaded) {
    for (const issue of traceIssues(trace)) addSourceIssue(sourceErrors, issue.source, issue.code);
  }

  const groups: Finding[][] = loaded.map((trace) => sessionFindings(trace, repo, args.includePrompts === true));
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
    ...(sourceErrors.length > 0 ? { incomplete: true, sourceErrors } : {}),
  };
  return finalizeReport(report, loaded.map((trace) => renderDigest(trace, 1200, { includePrompts: args.includePrompts })), ctx, args.persist !== false, vaultFs);
}

async function collectEnvFindings(ctx: CommandContext, repo: RepoContext | null): Promise<Finding[]> {
  const findings = await detectEnvironment().catch(() => [] as Finding[]);
  try {
    const hygiene = await hygieneCommand({ sizes: false, repoPaths: repo ? [repo.root] : [] }, ctx);
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

  try {
    const quarantineDir = await quarantineTmpFiles(scan);
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
