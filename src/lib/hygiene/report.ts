// SPDX-License-Identifier: Apache-2.0
import type { HygienePolicy } from "./policy.js";
import { mapBounded, probeDeadline } from "./budget.js";
import type {
  HygieneCategory,
  HygieneCategoryTotal,
  HygieneItem,
  HygieneProbe,
  HygieneReport,
  HygieneSkip,
  HygieneTotals,
} from "./types.js";

export const HYGIENE_CATEGORY_ORDER: HygieneCategory[] = [
  "caches",
  "worktrees",
  "docker",
  "xcode",
  "scratch",
];

export interface BuildHygieneReportOptions {
  probes: HygieneProbe[];
  repoPaths: string[];
  sizes: boolean;
  policy: HygienePolicy;
  now?: number;
  generatedAt?: string;
  deadline?: number;
  activeWorktreePaths?: string[];
}

function describeError(reason: unknown): string {
  if (reason instanceof Error && reason.message.length > 0) return reason.message;
  return String(reason);
}

function knownBytesOf(bytes: number | null): number | null {
  return bytes !== null && Number.isFinite(bytes) && bytes >= 0 ? bytes : null;
}

function sortItems(items: HygieneItem[]): HygieneItem[] {
  return [...items].sort((a, b) => {
    if (a.due !== b.due) return a.due ? -1 : 1;
    const aBytes = knownBytesOf(a.bytes);
    const bBytes = knownBytesOf(b.bytes);
    if (aBytes !== bBytes) {
      if (aBytes === null) return 1;
      if (bBytes === null) return -1;
      return bBytes - aBytes;
    }
    return a.title.localeCompare(b.title);
  });
}

function buildTotals(items: HygieneItem[]): HygieneTotals {
  const byCategory = {} as Record<HygieneCategory, HygieneCategoryTotal>;
  for (const category of HYGIENE_CATEGORY_ORDER) {
    byCategory[category] = { itemCount: 0, dueCount: 0, knownBytes: 0, dueBytes: 0 };
  }
  const totals: HygieneTotals = { itemCount: 0, dueCount: 0, knownBytes: 0, dueBytes: 0, byCategory };

  for (const item of items) {
    const bucket = byCategory[item.category];
    const bytes = knownBytesOf(item.bytes);
    bucket.itemCount += 1;
    totals.itemCount += 1;
    if (item.due) {
      bucket.dueCount += 1;
      totals.dueCount += 1;
    }
    if (bytes !== null) {
      bucket.knownBytes += bytes;
      totals.knownBytes += bytes;
      if (item.due) {
        bucket.dueBytes += bytes;
        totals.dueBytes += bytes;
      }
    }
  }
  return totals;
}

export async function buildHygieneReport(opts: BuildHygieneReportOptions): Promise<HygieneReport> {
  const now = opts.now ?? Date.now();
  const deadline = probeDeadline(opts.deadline);
  const settled = await mapBounded(opts.probes, async (probe) => {
    try {
      if (Date.now() >= deadline) return { status: "fulfilled" as const, value: { category: probe.id, label: probe.id, items: [], skipped: { probe: probe.id, reason: "report time budget reached" } } };
      return { status: "fulfilled" as const, value: await probe.run({ repoPaths: opts.repoPaths.slice(0, 50), sizes: opts.sizes, policy: opts.policy, now, deadline, activeWorktreePaths: opts.activeWorktreePaths }) };
    } catch (reason) {
      return { status: "rejected" as const, reason };
    }
  }, { concurrency: 2 });

  const items: HygieneItem[] = [];
  const skipped: HygieneSkip[] = [];
  settled.forEach((outcome, index) => {
    const probe = opts.probes[index];
    if (outcome.status === "rejected") {
      skipped.push({ probe: probe.id, reason: describeError(outcome.reason) });
      return;
    }
    if (outcome.value.skipped !== null) skipped.push(outcome.value.skipped);
    items.push(...outcome.value.items);
  });

  return {
    generatedAt: opts.generatedAt ?? new Date(now).toISOString(),
    repoPaths: opts.repoPaths,
    items: sortItems(items),
    totals: buildTotals(items),
    skipped,
  };
}
