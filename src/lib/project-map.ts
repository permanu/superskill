// SPDX-License-Identifier: Apache-2.0
import { existsSync } from "node:fs";
import { readFile, rename, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { validateProjectSlug } from "../config.js";
import { getGitRoot, invalidateProjectMapCache } from "./project-detector.js";

/**
 * Registration maps a repo directory to a vault project slug so vault-backed
 * commands auto-detect without `-p`. The map is a locator index inside the
 * vault (project-map.json); project knowledge itself stays jailed under
 * projects/<slug>/ and the project graph stays repo-local + gitignored.
 */
export interface RegisterProjectResult {
  map_path: string;
  key: string;
  slug: string;
  previous: string | null;
  changed: boolean;
}

const INVALID_SLUG_CHARS = /[^a-z0-9._-]+/g;

export function deriveSlug(dirPath: string): string {
  return basename(dirPath)
    .toLowerCase()
    .replace(INVALID_SLUG_CHARS, "-")
    .replace(/^[^a-z0-9]+/, "")
    .replace(/[-.]+$/, "");
}

async function readMap(mapPath: string): Promise<Record<string, string>> {
  let raw: string;
  try {
    raw = await readFile(mapPath, "utf-8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw e;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${mapPath} is not valid JSON; fix or delete it before registering.`);
  }
  const map: Record<string, string> = {};
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "string") map[key] = value;
    }
  }
  return map;
}

/**
 * Register (or re-register) a directory in the vault's project map. Prefers
 * the git root as the key, keeps an existing slug unless one is passed
 * explicitly, and writes atomically. Never touches project knowledge.
 */
export async function registerProject(
  vaultPath: string,
  dirPath: string,
  slug?: string
): Promise<RegisterProjectResult> {
  if (!existsSync(vaultPath)) {
    throw new Error(`Vault not found at ${vaultPath}. Run \`superskill-cli onboard\` or set VAULT_PATH.`);
  }
  const resolved = resolve(dirPath);
  const gitRoot = await getGitRoot(resolved);
  const key = gitRoot ?? resolved;
  const mapPath = resolve(vaultPath, "project-map.json");
  const map = await readMap(mapPath);
  const previous = map[key] ?? null;

  let target: string;
  if (slug !== undefined) {
    target = validateProjectSlug(slug);
  } else if (previous !== null) {
    target = previous;
  } else {
    target = deriveSlug(key);
    if (target === "") {
      throw new Error(`Cannot derive a project slug from "${basename(key)}"; pass --slug <name>.`);
    }
    validateProjectSlug(target);
  }

  const changed = previous !== target;
  if (changed) {
    map[key] = target;
    const sorted = Object.fromEntries(Object.entries(map).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
    const tmp = `${mapPath}.tmp-${process.pid}`;
    await writeFile(tmp, `${JSON.stringify(sorted, null, 2)}\n`, "utf-8");
    await rename(tmp, mapPath);
    invalidateProjectMapCache();
  }

  return { map_path: mapPath, key, slug: target, previous, changed };
}
