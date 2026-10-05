// SPDX-License-Identifier: Apache-2.0

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CampaignPlan, CampaignState, PlanBatch, StateEntry } from "./queue.js";
import type { ScannedRule } from "./status.js";

export interface PrefixCount {
  disk: number;
  verified: number;
}

export function countPrefixes(rules: readonly ScannedRule[]): Map<string, PrefixCount> {
  const counts = new Map<string, PrefixCount>();
  for (const rule of rules) {
    const key = `${rule.lang}/${rule.prefix}`;
    const entry = counts.get(key) ?? { disk: 0, verified: 0 };
    entry.disk += 1;
    if (rule.status === "verified") entry.verified += 1;
    counts.set(key, entry);
  }
  return counts;
}

/** Parse `## <prefix> - <title> (<n>)` section headers from a pack's INDEX.md. */
export async function loadPrefixTitles(
  catalogRulesDir: string,
  langs: readonly string[]
): Promise<Map<string, string>> {
  const titles = new Map<string, string>();
  for (const lang of langs) {
    let text: string;
    try {
      text = await readFile(join(catalogRulesDir, lang, "INDEX.md"), "utf-8");
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") console.error(`[rules-reconcile] cannot read ${lang}/INDEX.md: ${code}`);
      continue;
    }
    for (const line of text.split("\n")) {
      const match = /^##\s+([a-z][a-z0-9-]*)\s+-\s+(.+?)\s+\(\d+\)\s*$/.exec(line);
      if (match) titles.set(`${lang}/${match[1]}`, match[2]);
    }
  }
  return titles;
}

export interface PlanRevision {
  plan: CampaignPlan;
  /** Batch ids appended for delivered prefixes the plan did not list. */
  added: string[];
}

/**
 * Align a provisional plan with what the catalog actually delivered: append a
 * batch for every verified on-disk prefix the plan does not cover, and reset
 * each language target to its delivered verified count. Pure; idempotent.
 */
export function revisePlan(
  plan: CampaignPlan,
  rules: readonly ScannedRule[],
  titles: ReadonlyMap<string, string>,
  revisedAt: string
): PlanRevision {
  const counts = countPrefixes(rules);
  const planned = new Set(plan.batches.map((batch) => batch.id));
  const additions: PlanBatch[] = [];
  for (const [key, count] of counts) {
    if (count.verified === 0 || planned.has(key)) continue;
    const slash = key.indexOf("/");
    const lang = key.slice(0, slash);
    const prefix = key.slice(slash + 1);
    additions.push({
      id: key,
      lang,
      prefix,
      title: titles.get(key) ?? prefix,
      target: count.verified,
      status: "pending",
      updated: null,
    });
  }
  additions.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const languages = plan.languages.map((language) => ({
    ...language,
    target: rules.filter((rule) => rule.lang === language.lang && rule.status === "verified").length,
  }));

  const batches = [...plan.batches, ...additions];
  const targetTotal = batches.reduce((acc, batch) => acc + batch.target, 0);

  return {
    plan: {
      ...plan,
      revision: (plan.revision ?? 1) + (additions.length > 0 ? 1 : 0),
      revised: revisedAt,
      revision_note:
        plan.revision_note ??
        "Batches reconciled to the delivered catalog; per-language targets reset to delivered verified counts.",
      languages,
      batches,
      targetTotal,
    },
    added: additions.map((batch) => batch.id),
  };
}

export interface ReconcileOptions {
  now?: Date;
  /** Preserve existing workstream entries (batches are derived from the catalog). */
  workstreams?: Record<string, StateEntry>;
}

/**
 * Derive batch state from the catalog: a planned batch with verified content is
 * `done`; one whose prefix the pack no longer uses is `superseded`.
 */
export function reconcileState(
  plan: CampaignPlan,
  rules: readonly ScannedRule[],
  options: ReconcileOptions = {}
): CampaignState {
  const counts = countPrefixes(rules);
  const at = (options.now ?? new Date()).toISOString();
  const batches: Record<string, StateEntry> = {};
  for (const batch of plan.batches) {
    const count = counts.get(batch.id);
    if (count && count.verified > 0) {
      batches[batch.id] = {
        status: "done",
        owner: null,
        updated: at,
        claimed_at: null,
        completed_at: at,
        note: `reconciled from catalog: ${count.verified} verified rule(s) (planned target ${batch.target})`,
      };
    } else {
      batches[batch.id] = {
        status: "superseded",
        owner: null,
        updated: at,
        claimed_at: null,
        completed_at: at,
        note: `no verified rules on disk for prefix '${batch.prefix}'; dropped or renamed during authoring`,
      };
    }
  }
  return { version: 1, updated: at, batches, workstreams: options.workstreams ?? {} };
}
