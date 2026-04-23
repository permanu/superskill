// SPDX-License-Identifier: AGPL-3.0-or-later

import { readFile, writeFile, mkdir, rename, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";

export interface SkillMeta {
  installs: number;
  stars: number;
  fetched_at: number;
}

let cacheDirOverride: string | null = null;

export function setGlobalCacheDir(dir: string | null): void {
  cacheDirOverride = dir;
}

function getCacheBase(): string {
  return cacheDirOverride ?? join(homedir(), ".superskill", "skills");
}

function skillDir(owner: string, repo: string, skill: string): string {
  return join(getCacheBase(), owner, repo, skill);
}

export async function ensureGlobalCacheDir(): Promise<string> {
  const dir = getCacheBase();
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  return dir;
}

export async function isSkillCached(
  owner: string,
  repo: string,
  skill: string,
): Promise<boolean> {
  const mdPath = join(skillDir(owner, repo, skill), "SKILL.md");
  try {
    await stat(mdPath);
    return true;
  } catch {
    return false;
  }
}

export async function getCachedSkill(
  owner: string,
  repo: string,
  skill: string,
): Promise<string | null> {
  const mdPath = join(skillDir(owner, repo, skill), "SKILL.md");
  try {
    return await readFile(mdPath, "utf-8");
  } catch {
    return null;
  }
}

export async function getSkillMeta(
  owner: string,
  repo: string,
  skill: string,
): Promise<SkillMeta | null> {
  const metaPath = join(skillDir(owner, repo, skill), "meta.json");
  try {
    const raw = await readFile(metaPath, "utf-8");
    return JSON.parse(raw) as SkillMeta;
  } catch {
    return null;
  }
}

export async function cacheSkill(
  owner: string,
  repo: string,
  skill: string,
  content: string,
  meta: SkillMeta,
): Promise<void> {
  const dir = skillDir(owner, repo, skill);
  try {
    await mkdir(dir, { recursive: true });
    const mdTmp = join(dir, `SKILL.md.tmp-${Date.now()}`);
    await writeFile(mdTmp, content, "utf-8");
    await rename(mdTmp, join(dir, "SKILL.md"));
    const metaTmp = join(dir, `meta.json.tmp-${Date.now()}`);
    await writeFile(
      metaTmp,
      JSON.stringify(meta, null, 2),
      "utf-8",
    );
    await rename(metaTmp, join(dir, "meta.json"));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      `[global-cache] cacheSkill failed for ${owner}/${repo}/${skill}: ${msg}`,
    );
  }
}
