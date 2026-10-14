// SPDX-License-Identifier: Apache-2.0
import { constants } from "node:fs";
import type { Dirent } from "node:fs";
import { lstat, open, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";
import { probeDirSize } from "../../worktree/audit.js";
import { hashId } from "../../worktree/paths.js";
import { isPhysicallyContained } from "../../worktree/quarantine.js";
import { probeDeadline, PROBE_CANDIDATE_CAP } from "../budget.js";
import { SCRATCH_MARKER, defaultScratchRoots } from "../policy.js";
import { quoteShell } from "../shell.js";
import type { HygieneItem, HygieneProbe, HygieneProbeOptions, HygieneProbeResult } from "../types.js";

export interface ScratchProbeDeps {
  roots?: string[];
  marker?: string;
  managedRoot?: string;
}

export const SCRATCH_ITEM_CAP = 40;

const MS_PER_DAY = 86_400_000;
const LABEL = "Agent scratch";

function reportProbeError(context: string, err: unknown): void {
  const code = (err as NodeJS.ErrnoException).code;
  if (code === "ENOENT" || code === "EACCES") return;
  console.error(`[hygiene-scratch] ${context}: ${code ?? String(err)}`);
}

function roundAgeDays(ms: number): number {
  return Math.round((ms / MS_PER_DAY) * 10) / 10;
}

export function selectScratchItems(items: HygieneItem[], cap = SCRATCH_ITEM_CAP): HygieneItem[] {
  const sorted = [...items].sort((a, b) => (b.bytes ?? -1) - (a.bytes ?? -1));
  return sorted.slice(0, cap);
}

async function hasTrustedMarker(path: string, marker: string, managedRoot: string, now: number): Promise<boolean> {
  if (basename(marker) !== marker || !(await isPhysicallyContained(path, managedRoot))) return false;
  try {
    const root = await lstat(managedRoot);
    if ((root.mode & 0o077) !== 0 || (process.getuid && root.uid !== process.getuid())) return false;
    const file = await open(join(path, marker), constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOFOLLOW);
    try {
      const info = await file.stat();
      if (!info.isFile() || info.size > 4096 || (info.mode & 0o077) !== 0 || (process.getuid && info.uid !== process.getuid())) return false;
      const buffer = Buffer.alloc(info.size + 1);
      const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
      if (bytesRead !== info.size) return false;
      const value: unknown = JSON.parse(buffer.subarray(0, bytesRead).toString("utf-8"));
      if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
      const data = value as Record<string, unknown>;
      return data.v === 1 && data.owner === "superskill" && data.path === resolve(path) && typeof data.createdAt === "string" && Number.isFinite(Date.parse(data.createdAt)) && Date.parse(data.createdAt) >= 0 && Date.parse(data.createdAt) <= now;
    } finally {
      await file.close();
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT" && code !== "ELOOP" && !(err instanceof SyntaxError)) reportProbeError(`cannot validate marker in ${path}`, err);
    return false;
  }
}

export async function runScratchProbe(
  opts: HygieneProbeOptions,
  deps: ScratchProbeDeps = {},
): Promise<HygieneProbeResult> {
  const roots = deps.roots ?? defaultScratchRoots();
  const marker = deps.marker ?? SCRATCH_MARKER;
  const managedRoot = resolve(deps.managedRoot ?? join(homedir(), ".superskill", "scratch"));
  const deadline = probeDeadline(opts.deadline);
  const ttlDays = opts.policy.scratchTtlHours / 24;
  const collected: HygieneItem[] = [];
  let inspected = 0;

  try {
    for (const root of roots.slice(0, 20)) {
      if (Date.now() >= deadline || inspected >= PROBE_CANDIDATE_CAP) break;
      let entries: Dirent[];
      try {
        entries = await readdir(root, { withFileTypes: true });
      } catch (err) {
        reportProbeError(`cannot read root ${root}`, err);
        continue;
      }

      for (const entry of entries) {
        if (Date.now() >= deadline || inspected >= PROBE_CANDIDATE_CAP) break;
        if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
        inspected += 1;
        const path = join(root, entry.name);

        let ageDays: number;
        try {
          const stats = await lstat(path);
          if (!stats.isDirectory() || stats.isSymbolicLink()) continue;
          ageDays = roundAgeDays(opts.now - stats.mtimeMs);
        } catch (err) {
          reportProbeError(`cannot stat ${path}`, err);
          continue;
        }
        if (ageDays < ttlDays) continue;

        const owned = await hasTrustedMarker(path, marker, managedRoot, opts.now);
        const bytes = opts.sizes ? await probeDirSize(path, { deadline }) : null;
        if (!owned && bytes !== null && bytes < opts.policy.scratchReviewMinBytes) continue;

        const name = basename(path);
        collected.push({
          id: `scratch:${hashId(path)}`,
          category: "scratch",
          title: owned ? `Owned scratch ${name}` : `Unowned scratch ${name}`,
          path,
          bytes,
          ageDays,
          tier: owned ? "auto" : "review",
          due: owned,
          reason: owned
            ? `superskill-owned scratch idle ${ageDays}d (ttl ${opts.policy.scratchTtlHours}h)`
            : "not superskill-owned; verify contents before removing",
          plan: owned ? `rm -rf ${quoteShell(path)}` : null,
          meta: { owned, root },
        });
      }
    }

    return { category: "scratch", label: LABEL, items: selectScratchItems(collected), skipped: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[hygiene-scratch] probe failed: ${message}`);
    return {
      category: "scratch",
      label: LABEL,
      items: [],
      skipped: { probe: "scratch", reason: `probe failed: ${message}` },
    };
  }
}

export const scratchProbe: HygieneProbe = {
  id: "scratch",
  run: (opts) => runScratchProbe(opts),
};
