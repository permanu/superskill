// SPDX-License-Identifier: Apache-2.0
import type { HygienePolicy } from "./policy.js";

export type HygieneCategory = "caches" | "worktrees" | "docker" | "xcode" | "scratch";

export type HygieneRiskTier = "auto" | "consent" | "review";

export interface HygieneItem {
  id: string;
  category: HygieneCategory;
  title: string;
  path: string | null;
  bytes: number | null;
  ageDays: number | null;
  tier: HygieneRiskTier;
  due: boolean;
  reason: string;
  plan: string | null;
  meta: Record<string, string | number | boolean>;
}

export interface HygieneSkip {
  probe: HygieneCategory;
  reason: string;
}

export interface HygieneProbeResult {
  category: HygieneCategory;
  label: string;
  items: HygieneItem[];
  skipped: HygieneSkip | null;
}

export interface HygieneProbeOptions {
  /** Absolute repo roots to consider (from the vault project map). */
  repoPaths: string[];
  /** When false, probes must avoid expensive recursive size measurements. */
  sizes: boolean;
  policy: HygienePolicy;
  /** Injected clock (ms since epoch) for deterministic tests. */
  now: number;
}

export interface HygieneProbe {
  id: HygieneCategory;
  run(opts: HygieneProbeOptions): Promise<HygieneProbeResult>;
}

export interface HygieneCategoryTotal {
  itemCount: number;
  dueCount: number;
  knownBytes: number;
  dueBytes: number;
}

export interface HygieneTotals extends HygieneCategoryTotal {
  byCategory: Record<HygieneCategory, HygieneCategoryTotal>;
}

export interface HygieneReport {
  generatedAt: string;
  repoPaths: string[];
  items: HygieneItem[];
  totals: HygieneTotals;
  skipped: HygieneSkip[];
}
