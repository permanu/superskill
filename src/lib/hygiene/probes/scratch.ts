// SPDX-License-Identifier: Apache-2.0
import { existsSync } from "node:fs";
import type { Dirent } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { probeDirSize } from "../../worktree/audit.js";
import { hashId } from "../../worktree/paths.js";
import { SCRATCH_MARKER, defaultScratchRoots } from "../policy.js";
import { quoteShell } from "../shell.js";
import type { HygieneItem, HygieneProbe, HygieneProbeOptions, HygieneProbeResult } from "../types.js";

export interface ScratchProbeDeps {
  roots?: string[];
  marker?: string;
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

export async function runScratchProbe(
  opts: HygieneProbeOptions,
  deps: ScratchProbeDeps = {},
): Promise<HygieneProbeResult> {
  const roots = deps.roots ?? defaultScratchRoots();
  const marker = deps.marker ?? SCRATCH_MARKER;
  const ttlDays = opts.policy.scratchTtlHours / 24;
  const collected: HygieneItem[] = [];

  try {
    for (const root of roots) {
      let entries: Dirent[];
      try {
        entries = await readdir(root, { withFileTypes: true });
      } catch (err) {
        reportProbeError(`cannot read root ${root}`, err);
        continue;
      }

      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
        const path = join(root, entry.name);

        let ageDays: number;
        try {
          const stats = await stat(path);
          ageDays = roundAgeDays(opts.now - stats.mtimeMs);
        } catch (err) {
          reportProbeError(`cannot stat ${path}`, err);
          continue;
        }
        if (ageDays < ttlDays) continue;

        const owned = existsSync(join(path, marker));
        const bytes = opts.sizes ? await probeDirSize(path) : null;
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
