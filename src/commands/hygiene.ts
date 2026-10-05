// SPDX-License-Identifier: Apache-2.0
import { readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { CommandContext } from "../core/types.js";
import { buildHygieneReport, HYGIENE_CATEGORY_ORDER } from "../lib/hygiene/report.js";
import { formatHygieneReport } from "../lib/hygiene/format.js";
import { loadHygienePolicy } from "../lib/hygiene/policy.js";
import type { HygieneProbe, HygieneReport } from "../lib/hygiene/types.js";
import { cachesProbe } from "../lib/hygiene/probes/caches.js";
import { dockerProbe } from "../lib/hygiene/probes/docker.js";
import { xcodeProbe } from "../lib/hygiene/probes/xcode.js";
import { scratchProbe } from "../lib/hygiene/probes/scratch.js";
import { worktreesProbe } from "../lib/hygiene/probes/worktrees.js";

export interface HygieneArgs {
  due?: boolean;
  sizes?: boolean;
  categories?: string[];
  /** Test seam: override probes. */
  probes?: HygieneProbe[];
  /** Test seam: override repo discovery. */
  repoPaths?: string[];
}

export const HYGIENE_PROBES: HygieneProbe[] = [
  cachesProbe,
  dockerProbe,
  xcodeProbe,
  scratchProbe,
  worktreesProbe,
];

export function selectHygieneProbes(categories?: string[]): HygieneProbe[] {
  if (!categories || categories.length === 0) return [...HYGIENE_PROBES];
  const known = new Set<string>(HYGIENE_CATEGORY_ORDER);
  const wanted = new Set<string>();
  for (const raw of categories) {
    const name = raw.trim().toLowerCase();
    if (name.length === 0) continue;
    if (!known.has(name)) {
      throw new Error(`Unknown hygiene category "${raw}". Expected one of: ${HYGIENE_CATEGORY_ORDER.join(", ")}`);
    }
    wanted.add(name);
  }
  if (wanted.size === 0) return [...HYGIENE_PROBES];
  return HYGIENE_PROBES.filter((probe) => wanted.has(probe.id));
}

export async function collectRepoPaths(vaultPath: string, limit = 50): Promise<string[]> {
  let raw: string;
  try {
    raw = await readFile(join(vaultPath, "project-map.json"), "utf-8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT" && code !== "EACCES") {
      console.error(`[hygiene] cannot read project-map.json: ${code ?? String(err)}`);
    }
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("[hygiene] ignoring corrupt project-map.json");
    return [];
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return [];

  const seen = new Set<string>();
  const repoPaths: string[] = [];
  for (const dir of Object.keys(parsed as Record<string, unknown>)) {
    if (repoPaths.length >= limit) break;
    const absolute = resolve(dir);
    if (seen.has(absolute)) continue;
    try {
      const info = await stat(absolute);
      if (!info.isDirectory()) continue;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "ENOENT" && code !== "EACCES") {
        console.error(`[hygiene] cannot stat ${absolute}: ${code ?? String(err)}`);
      }
      continue;
    }
    seen.add(absolute);
    repoPaths.push(absolute);
  }
  return repoPaths;
}

export async function hygieneCommand(args: HygieneArgs, ctx: CommandContext): Promise<HygieneReport> {
  const policy = loadHygienePolicy();
  const probes = args.probes ?? selectHygieneProbes(args.categories);
  const repoPaths = args.repoPaths ?? (await collectRepoPaths(ctx.vaultPath));
  ctx.log.debug(
    `[hygiene] running ${probes.length} probe(s) across ${repoPaths.length} repo(s) (sizes=${args.sizes === true})`,
  );
  return buildHygieneReport({ probes, repoPaths, sizes: args.sizes === true, policy });
}

export function renderHygieneReport(report: HygieneReport, opts: { due?: boolean } = {}): string {
  return formatHygieneReport(report, { dueOnly: opts.due === true });
}
