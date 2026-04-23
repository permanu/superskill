// SPDX-License-Identifier: AGPL-3.0-or-later

import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import type { AuditResult } from "../graph/schema.js";
import { fetchSkillPage, type SkillPageData } from "./client.js";

export interface CachedAudit extends AuditResult {
  fetched_at: number;
  skill_id: string;
}

const DEFAULT_STALE_MS = 86_400_000;

// Module-level override for test isolation. Not thread-safe — only used in tests.

let cacheDirOverride: string | null = null;

export function setAuditCacheDir(dir: string | null): void {
  cacheDirOverride = dir;
}

function getCacheBase(): string {
  return cacheDirOverride ?? join(homedir(), ".superskill", "audits");
}

function parseSkillId(
  skillId: string,
): { owner: string; repo: string; skill: string } | null {
  const match = skillId.match(/^([^/]+)\/([^@]+)@(.+)$/);
  if (!match) return null;
  return { owner: match[1], repo: match[2], skill: match[3] };
}

function resolveAuditPath(skillId: string): string {
  const parsed = parseSkillId(skillId);
  if (parsed) {
    return join(
      getCacheBase(),
      parsed.owner,
      parsed.repo,
      `${parsed.skill}.json`,
    );
  }
  return join(getCacheBase(), "unknown", `${skillId}.json`);
}

export async function ensureAuditDir(): Promise<string> {
  const dir = getCacheBase();
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  return dir;
}

export function isStale(
  data: CachedAudit,
  maxAgeMs: number = DEFAULT_STALE_MS,
): boolean {
  return Date.now() - data.fetched_at > maxAgeMs;
}

export async function getAudit(
  skillId: string,
): Promise<CachedAudit | null> {
  const filePath = resolveAuditPath(skillId);
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as CachedAudit;
  } catch {
    return null;
  }
}

export async function setAudit(
  skillId: string,
  data: CachedAudit,
): Promise<void> {
  const filePath = resolveAuditPath(skillId);
  const dir = dirname(filePath);
  try {
    await mkdir(dir, { recursive: true });
    const tmpPath = filePath + `.tmp-${Date.now()}`;
    await writeFile(tmpPath, JSON.stringify(data, null, 2), "utf-8");
    await rename(tmpPath, filePath);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[skills-sh] setAudit failed for ${skillId}: ${msg}`);
  }
}

export async function refreshAudit(
  skillId: string,
): Promise<CachedAudit | null> {
  const result = await refreshAuditWithMeta(skillId);
  return result?.audit ?? null;
}

export async function refreshAuditWithMeta(
  skillId: string,
): Promise<{ audit: CachedAudit; page: SkillPageData } | null> {
  const parsed = parseSkillId(skillId);
  if (!parsed) {
    console.error(
      `[skills-sh] refreshAudit: invalid skillId format: ${skillId}`,
    );
    return null;
  }
  const pageData = await fetchSkillPage(
    parsed.owner,
    parsed.repo,
    parsed.skill,
  );
  if (!pageData) return null;
  const audit: CachedAudit = {
    gen: pageData.audits.gen,
    socket: pageData.audits.socket,
    snyk: pageData.audits.snyk,
    fetched_at: Date.now(),
    skill_id: skillId,
  };
  await setAudit(skillId, audit);
  return { audit, page: pageData };
}
