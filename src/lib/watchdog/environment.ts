// SPDX-License-Identifier: Apache-2.0
import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { HygieneReport } from "../hygiene/types.js";
import type { Finding } from "./types.js";
import { findingId } from "./detectors.js";
import { formatBytes } from "./digest.js";

const TMP_RE = /\.tmp$/;
const CACHE_MIN_BYTES = 512 * 1024 * 1024;
const HARNESS_MIN_BYTES = 1024 * 1024 * 1024;
const TOOL_OUTPUT_MIN_BYTES = 200 * 1024 * 1024;
const MAX_ENTRIES = 120_000;

export interface LeakedTmpScan {
  root: string;
  files: Array<{ path: string; bytes: number }>;
  totalBytes: number;
}

export async function scanLeakedTmpFiles(home = homedir()): Promise<LeakedTmpScan> {
  const root = join(home, ".superskill");
  const files: Array<{ path: string; bytes: number }> = [];
  let entries: string[];
  try {
    entries = (await readdir(root, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && TMP_RE.test(entry.name))
      .map((entry) => entry.name);
  } catch {
    return { root, files, totalBytes: 0 };
  }
  let totalBytes = 0;
  for (const name of entries) {
    const path = join(root, name);
    try {
      const info = await stat(path);
      files.push({ path, bytes: info.size });
      totalBytes += info.size;
    } catch {
      continue;
    }
  }
  return { root, files, totalBytes };
}

export async function dirSizeBounded(path: string, maxEntries = MAX_ENTRIES): Promise<{ bytes: number; truncated: boolean }> {
  let bytes = 0;
  let visited = 0;
  const queue: string[] = [path];
  while (queue.length > 0 && visited < maxEntries) {
    const current = queue.pop();
    if (current === undefined) break;
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      visited += 1;
      if (visited >= maxEntries) return { bytes, truncated: true };
      const child = join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(child);
      } else if (entry.isFile()) {
        try {
          bytes += (await stat(child)).size;
        } catch {
          continue;
        }
      }
    }
  }
  return { bytes, truncated: visited >= maxEntries };
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
}

export async function detectEnvironment(opts: EnvironmentOptions = {}): Promise<Finding[]> {
  const home = opts.home ?? homedir();
  const findings: Finding[] = [];

  const tmp = await scanLeakedTmpFiles(home);
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

  try {
    const cacheRoot = join(home, ".superskill", "cache");
    const cacheEntries = await readdir(cacheRoot, { withFileTypes: true });
    for (const entry of cacheEntries) {
      if (!entry.isDirectory()) continue;
      const path = join(cacheRoot, entry.name);
      const { bytes } = await dirSizeBounded(path, 40_000);
      if (bytes < CACHE_MIN_BYTES) continue;
      findings.push(await sizeFinding({
        key: `cache:${entry.name}`,
        title: `superskill toolchain cache "${entry.name}" is ${formatBytes(bytes)}`,
        detail: `Build artifacts for rule validation. Regenerable, but costly to rebuild if deleted mid-task.`,
        evidenceRef: `${path} (${formatBytes(bytes)})`,
        proposal: `Review before reclaiming: if no rule-validation run is pending, delete \`${path}\` and it will rebuild on demand.`,
        severity: bytes >= 2 * 1024 * 1024 * 1024 ? "medium" : "low",
      }));
    }
  } catch {
    // no cache dir
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
      const { bytes } = await dirSizeBounded(store.path);
      if (bytes < store.min) continue;
      findings.push(await sizeFinding({
        key: store.key,
        title: `${store.label} is ${formatBytes(bytes)}`,
        detail: `Harness stores grow without bound; nothing in the harness cleans them up.`,
        evidenceRef: `${store.path} (${formatBytes(bytes)})`,
        proposal: store.proposal,
        severity: "low",
      }));
    }
  }

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
