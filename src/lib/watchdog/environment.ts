// SPDX-License-Identifier: Apache-2.0
import { opendir, lstat } from "node:fs/promises";
import type { Dirent } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { HygieneReport } from "../hygiene/types.js";
import type { Finding } from "./types.js";
import { findingId } from "./detectors.js";
import { formatBytes } from "./digest.js";
import { logSourceError } from "./traces/source.js";

const TMP_RE = /\.tmp$/;
const CACHE_MIN_BYTES = 512 * 1024 * 1024;
const HARNESS_MIN_BYTES = 1024 * 1024 * 1024;
const TOOL_OUTPUT_MIN_BYTES = 200 * 1024 * 1024;
const MAX_ENTRIES = 120_000;
const MAX_SCAN_MS = 2000;
const MAX_ROOTS = 32;

interface ScanBudget {
  remaining: number;
  deadline: number;
  truncated: boolean;
}

function bounded(value: number | undefined, cap: number): number {
  return Number.isFinite(value ?? cap) ? Math.min(cap, Math.max(0, Math.floor(value ?? cap))) : cap;
}

function scanBudget(maxEntries?: number, maxMs?: number): ScanBudget {
  return { remaining: bounded(maxEntries, MAX_ENTRIES), deadline: Date.now() + bounded(maxMs, MAX_SCAN_MS), truncated: false };
}

function exhausted(budget: ScanBudget): boolean {
  if (budget.remaining <= 0 || Date.now() >= budget.deadline) budget.truncated = true;
  return budget.truncated;
}

async function* scanEntries(path: string, budget: ScanBudget): AsyncGenerator<Dirent> {
  if (exhausted(budget)) return;
  try {
    const info = await lstat(path);
    if (!info.isDirectory() || info.isSymbolicLink()) return;
    const dir = await opendir(path, { bufferSize: 32 });
    for await (const entry of dir) {
      if (exhausted(budget)) break;
      budget.remaining -= 1;
      yield entry;
    }
  } catch (err) { logSourceError("environment scan", err); }
}

export interface LeakedTmpScan {
  root: string;
  files: Array<{ path: string; bytes: number }>;
  totalBytes: number;
  truncated?: boolean;
}

async function scanTmp(home: string, budget: ScanBudget): Promise<LeakedTmpScan> {
  const root = join(home, ".superskill");
  const files: Array<{ path: string; bytes: number }> = [];
  let totalBytes = 0;
  for await (const entry of scanEntries(root, budget)) {
    if (!entry.isFile() || !TMP_RE.test(entry.name)) continue;
    if (files.length >= 1000) { budget.truncated = true; break; }
    const path = join(root, entry.name);
    try {
      const info = await lstat(path);
      if (!info.isFile() || info.isSymbolicLink()) continue;
      files.push({ path, bytes: info.size });
      totalBytes += info.size;
    } catch (err) {
      logSourceError("temporary file stat", err);
      continue;
    }
  }
  return { root, files, totalBytes, truncated: budget.truncated };
}

export async function scanLeakedTmpFiles(home = homedir()): Promise<LeakedTmpScan> {
  return scanTmp(home, scanBudget());
}

async function dirSizeWithBudget(path: string, budget: ScanBudget): Promise<{ bytes: number; truncated: boolean }> {
  let bytes = 0;
  const queue: string[] = [path];
  while (queue.length > 0 && !exhausted(budget)) {
    const current = queue.pop();
    if (current === undefined) break;
    for await (const entry of scanEntries(current, budget)) {
      const child = join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(child);
      } else if (entry.isFile()) {
        try {
          const info = await lstat(child);
          if (info.isFile()) bytes += info.size;
        } catch (err) {
          logSourceError("environment file stat", err);
          continue;
        }
      }
    }
  }
  return { bytes, truncated: budget.truncated };
}

export async function dirSizeBounded(path: string, maxEntries = MAX_ENTRIES, maxMs = MAX_SCAN_MS): Promise<{ bytes: number; truncated: boolean }> {
  return dirSizeWithBudget(path, scanBudget(maxEntries, maxMs));
}

async function sizeFinding(opts: {
  category?: Finding["category"];
  key: string;
  title: string;
  detail: string;
  proposal: string;
  severity: Finding["severity"];
  evidenceRef: string;
}): Promise<Finding> {
  return {
    id: findingId(opts.category ?? "environment", opts.key),
    category: opts.category ?? "environment",
    severity: opts.severity,
    title: opts.title,
    detail: opts.detail,
    evidence: [{ source: "env", ref: opts.evidenceRef }],
    proposal: opts.proposal,
  };
}

export interface EnvironmentOptions {
  home?: string;
  checkHarnessStores?: boolean;
  maxEntries?: number;
  maxMs?: number;
  maxRoots?: number;
}

export async function detectEnvironment(opts: EnvironmentOptions = {}): Promise<Finding[]> {
  const home = opts.home ?? homedir();
  const findings: Finding[] = [];
  const budget = scanBudget(opts.maxEntries, opts.maxMs);
  let roots = bounded(opts.maxRoots, MAX_ROOTS);

  const tmp = await scanTmp(home, budget);
  if (tmp.files.length > 0) {
    findings.push(await sizeFinding({
      key: "leaked-tmp",
      title: `${tmp.files.length} leaked .tmp files in ~/.superskill (${formatBytes(tmp.totalBytes)})`,
      detail: `Atomic-write temp files that were never renamed or cleaned. They are dead weight and clutter every directory listing of the superskill home.`,
      evidenceRef: `${tmp.root}: ${tmp.files.length} files, ${formatBytes(tmp.totalBytes)}`,
      proposal: `Reclaim safely: \`superskill-cli watchdog fix --category leaked-tmp --apply\` (quarantines first, reversible).`,
      severity: "medium",
    }));
  }

  const cacheRoot = join(home, ".superskill", "cache");
  for await (const entry of scanEntries(cacheRoot, budget)) {
    if (!entry.isDirectory()) continue;
    if (roots-- <= 0) { budget.truncated = true; break; }
    const path = join(cacheRoot, entry.name);
    const { bytes, truncated } = await dirSizeWithBudget(path, budget);
    if (bytes < CACHE_MIN_BYTES) continue;
    findings.push(await sizeFinding({
      key: `cache:${entry.name}`,
      title: `superskill toolchain cache "${entry.name}" is ${formatBytes(bytes)}`,
      detail: `Build artifacts for rule validation. Regenerable, but costly to rebuild if deleted mid-task.${truncated ? " Size is a lower bound; scan capped." : ""}`,
      evidenceRef: `${path} (${formatBytes(bytes)})`,
      proposal: `Review before reclaiming: if no rule-validation run is pending, delete \`${path}\` and it will rebuild on demand.`,
      severity: bytes >= 2 * 1024 * 1024 * 1024 ? "medium" : "low",
    }));
  }

  if (opts.checkHarnessStores !== false) {
    const stores: Array<{ key: string; label: string; path: string; min: number; proposal: string }> = [
      {
        key: "opencode-storage",
        label: "OpenCode session storage",
        path: join(home, ".local", "share", "opencode", "storage"),
        min: HARNESS_MIN_BYTES,
        proposal: `Old parts/messages accumulate forever. Archive or remove sessions older than you need (harness data is user data — watchdog only reports it).`,
      },
      {
        key: "claude-projects",
        label: "Claude Code transcripts",
        path: join(home, ".claude", "projects"),
        min: HARNESS_MIN_BYTES,
        proposal: `Archived transcripts can be moved to cold storage. Keep the last few months for watchdog window digs.`,
      },
      {
        key: "codex-sessions",
        label: "Codex rollouts",
        path: join(home, ".codex", "sessions"),
        min: HARNESS_MIN_BYTES,
        proposal: `Codex has no built-in retention; archive old year/month folders when they stop being useful for digs.`,
      },
      {
        key: "opencode-tool-output",
        label: "OpenCode tool output cache",
        path: join(home, ".local", "share", "opencode", "tool-output"),
        min: TOOL_OUTPUT_MIN_BYTES,
        proposal: `Truncated tool outputs. Safe to clear when no OpenCode session is running.`,
      },
    ];
    for (const store of stores) {
      if (exhausted(budget)) break;
      if (roots-- <= 0) { budget.truncated = true; break; }
      const { bytes, truncated } = await dirSizeWithBudget(store.path, budget);
      if (bytes < store.min) continue;
      findings.push(await sizeFinding({
        key: store.key,
        title: `${store.label} is ${formatBytes(bytes)}`,
        detail: `Review the harness retention policy before reclaiming user data.${truncated ? " Size is a lower bound; scan capped." : ""}`,
        evidenceRef: `${store.path} (${formatBytes(bytes)})`,
        proposal: store.proposal,
        severity: "low",
      }));
    }
  }

  if (budget.truncated) findings.push(await sizeFinding({
    key: "scan-budget", title: "Environment scan stopped at its safety budget", severity: "low",
    detail: "Entry, root, or elapsed-time limits were reached. Reported sizes are lower bounds; unvisited paths were not assessed.",
    evidenceRef: "bounded local environment scan", proposal: "Review a smaller directory separately; do not infer that unvisited stores are clean.",
  }));

  return findings;
}

export function hygieneItemsToFindings(report: HygieneReport): Finding[] {
  const findings: Finding[] = [];
  for (const item of report.items) {
    if (!item.due) continue;
    const bytes = item.bytes ?? 0;
    const severity: Finding["severity"] = bytes >= 1024 ** 3 ? "high" : bytes >= 256 * 1024 * 1024 ? "medium" : "low";
    findings.push({
      id: findingId("environment", `hygiene:${item.id}`),
      category: "environment",
      severity,
      title: `[hygiene] ${item.title}`,
      detail: `${item.reason}${item.path ? ` — ${item.path}` : ""}`,
      evidence: [{ source: "env", ref: `${item.category}: ${item.path ?? item.id}${item.bytes !== null ? ` (${formatBytes(item.bytes)})` : ""}` }],
      proposal: item.plan ? `Run: ${item.plan}` : "Review and reclaim manually.",
    });
  }
  return findings;
}
