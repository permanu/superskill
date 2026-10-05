// SPDX-License-Identifier: Apache-2.0
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";

export interface HygienePolicy {
  /** Age at which auto-tier caches become "due" (mirrors worktree-gc AUTO_MIN_AGE_DAYS). */
  cacheAutoMinAgeDays: number;
  /** Consent-tier caches below this size are not worth recommending. */
  cacheConsentMinBytes: number;
  /** Scratch dirs (owned) become due after this many hours idle. */
  scratchTtlHours: number;
  /** Unowned scratch dirs below this size are not listed. */
  scratchReviewMinBytes: number;
  /** Unreferenced docker volumes become due for review after this many days. */
  dockerMinAgeDays: number;
  /** DerivedData above this size is due for regeneration. */
  xcodeDerivedDataMinBytes: number;
  /** Clean, fully-pushed worktrees older than this are due for removal. */
  worktreeStaleMinAgeDays: number;
}

export const SCRATCH_MARKER = ".superskill-scratch.json";

export const DEFAULT_HYGIENE_POLICY: HygienePolicy = {
  cacheAutoMinAgeDays: 30,
  cacheConsentMinBytes: 1024 ** 3,
  scratchTtlHours: 72,
  scratchReviewMinBytes: 256 * 1024 ** 2,
  dockerMinAgeDays: 14,
  xcodeDerivedDataMinBytes: 5 * 1024 ** 3,
  worktreeStaleMinAgeDays: 14,
};

function envNumber(env: NodeJS.ProcessEnv, key: string, fallback: number): number {
  const raw = env[key];
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function loadHygienePolicy(env: NodeJS.ProcessEnv = process.env): HygienePolicy {
  return {
    ...DEFAULT_HYGIENE_POLICY,
    cacheAutoMinAgeDays: envNumber(env, "SUPERSKILL_HYGIENE_CACHE_AGE_DAYS", DEFAULT_HYGIENE_POLICY.cacheAutoMinAgeDays),
    scratchTtlHours: envNumber(env, "SUPERSKILL_HYGIENE_SCRATCH_TTL_HOURS", DEFAULT_HYGIENE_POLICY.scratchTtlHours),
    dockerMinAgeDays: envNumber(env, "SUPERSKILL_HYGIENE_DOCKER_AGE_DAYS", DEFAULT_HYGIENE_POLICY.dockerMinAgeDays),
  };
}

export function defaultScratchRoots(env: NodeJS.ProcessEnv = process.env): string[] {
  const candidates = [tmpdir(), "/tmp", join(homedir(), ".superskill", "scratch")];
  const extra = env.SUPERSKILL_SCRATCH_ROOTS;
  if (extra !== undefined) {
    for (const part of extra.split(":")) {
      const trimmed = part.trim();
      if (trimmed.length > 0) candidates.push(trimmed);
    }
  }
  const seen = new Set<string>();
  const roots: string[] = [];
  for (const candidate of candidates) {
    const absolute = resolve(candidate);
    if (seen.has(absolute)) continue;
    seen.add(absolute);
    roots.push(absolute);
  }
  return roots;
}
