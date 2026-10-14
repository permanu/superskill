// SPDX-License-Identifier: Apache-2.0
import { existsSync } from "node:fs";
import { basename, resolve, isAbsolute } from "node:path";
import { validateProjectSlug } from "../config.js";
import { getGitRoot, invalidateProjectMapCache } from "./project-detector.js";
import { readCoordinationFile, withCoordinationLock, writeCoordinationFile } from "./session-registry.js";

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

async function readMap(vaultPath: string): Promise<Record<string, string>> {
  const mapPath = resolve(vaultPath, "project-map.json");
  const raw = await readCoordinationFile(vaultPath, "project-map.json", 1024 * 1024);
  if (raw === null) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${mapPath} is not valid JSON; fix or delete it before registering.`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(`${mapPath} is not a valid project map; repair it before registering.`);
  const entries = Object.entries(parsed);
  if (entries.length > 10_000) throw new Error("Project map exceeds entry limit");
  const map: Record<string, string> = Object.create(null);
  for (const [key, value] of entries) {
    if (!isAbsolute(key) || key.length > 4096 || /[\x00-\x1f\x7f]/.test(key) || typeof value !== "string" || value.length > 128) throw new Error(`${mapPath} contains an invalid project mapping; repair it before registering.`);
    map[key] = validateProjectSlug(value);
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
  return withCoordinationLock(vaultPath, "coordination/locks/project-map.lock", async lock => {
    const map = await readMap(vaultPath);
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
      const content = `${JSON.stringify(sorted, null, 2)}\n`;
      if (Buffer.byteLength(content) > 1024 * 1024 || Object.keys(sorted).length > 10_000) throw new Error("Project map exceeds size limit");
      await writeCoordinationFile(vaultPath, "project-map.json", content, lock);
      invalidateProjectMapCache();
    }

    return { map_path: mapPath, key, slug: target, previous, changed };
  });
}
