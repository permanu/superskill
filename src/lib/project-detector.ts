// SPDX-License-Identifier: Apache-2.0
import { realpath, lstat } from "fs/promises";
import { resolve, isAbsolute, relative } from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { coordinationPath, readCoordinationFile } from "./session-registry.js";

const execFileAsync = promisify(execFile);

interface ProjectMap {
  [cwdPath: string]: string;
}

interface CacheEntry {
  map: ProjectMap;
  time: number;
  vaultPath: string;
  identity: string;
}

const CACHE_TTL_MS = 60_000; // 1 minute

let cache: CacheEntry | null = null;

export function invalidateProjectMapCache(): void {
  cache = null;
}

function setCache(entry: CacheEntry): void {
  cache = entry;
}

function getCache(vaultPath: string, identity: string): ProjectMap | null {
  const now = Date.now();
  if (cache && cache.vaultPath === vaultPath && cache.identity === identity && now - cache.time < CACHE_TTL_MS) {
    return cache.map;
  }
  return null;
}

/**
 * Load the project map from the vault. Cache is keyed by vaultPath.
 */
async function loadProjectMap(vaultPath: string): Promise<ProjectMap> {
  const mapPath = resolve(vaultPath, "project-map.json");
  try {
    const abs = await coordinationPath(vaultPath, "project-map.json");
    const info = await lstat(abs);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error(`Unsafe project map file: ${mapPath}`);
    if (info.size > 1024 * 1024) throw new Error("Project map exceeds byte limit");
    const identity = `${info.dev}:${info.ino}`;
    const cached = getCache(vaultPath, identity);
    if (cached) return cached;
    const raw = await readCoordinationFile(vaultPath, "project-map.json", 1024 * 1024);
    if (raw === null) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    if (Object.keys(parsed).length > 10_000) throw new Error("Project map exceeds entry limit");
    const map: ProjectMap = Object.create(null);
    for (const [key, value] of Object.entries(parsed)) {
      if (isAbsolute(key) && key.length <= 4096 && !/[\x00-\x1f\x7f]/.test(key) && typeof value === "string" && value.length <= 128 && /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value) && !value.includes("..")) {
        map[resolve(key)] = value;
      }
    }
    setCache({ map, time: Date.now(), vaultPath, identity });
    return map;
  } catch (e: any) {
    if (e?.code === "EACCES") {
      console.error(`[project-detector] Permission denied reading ${mapPath}`);
    } else if (e?.code !== "ENOENT" && !(e instanceof SyntaxError)) {
      throw e;
    }
    return {};
  }
}

/**
 * Strip worktree suffixes from a path.
 */
function stripWorktreeSuffix(cwd: string): string {
  // Pattern: /path/to/project/.worktrees/feat-name
  const worktreeMatch = cwd.match(/^(.+?)\/\.worktrees\/[^/]+/);
  if (worktreeMatch) return worktreeMatch[1];

  // Pattern: /path/to/project/.claude/worktrees/feat/name
  const claudeWorktreeMatch = cwd.match(/^(.+?)\/\.claude\/worktrees\/.+/);
  if (claudeWorktreeMatch) return claudeWorktreeMatch[1];

  // Pattern: /path/to/project/.claude-worktrees/name
  const oldWorktreeMatch = cwd.match(/^(.+?)\/\.claude-worktrees\/[^/]+/);
  if (oldWorktreeMatch) return oldWorktreeMatch[1];

  return cwd;
}

/**
 * Try to detect git root of current directory (async, non-blocking).
 */
export async function getGitRoot(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      timeout: 3000,
      maxBuffer: 16 * 1024,
    });
    const root = stdout.trim();
    return isAbsolute(root) ? resolve(root) : null;
  } catch {
    return null;
  }
}

/**
 * Detect the project slug from a working directory.
 *
 * Strategy:
 * 1. Strip worktree suffixes from cwd
 * 2. Try exact match in project-map.json
 * 3. Try matching cwd as a subdirectory of a mapped path
 * 4. Try git root as a mapped path
 * 5. Return null if no match
 */
export async function detectProject(cwd: string, vaultPath: string): Promise<string | null> {
  const map = await loadProjectMap(vaultPath);
  const normalizedCwd = resolve(cwd);
  const entries = Object.entries(map).sort(([a], [b]) => b.length - a.length);
  for (const [path, slug] of entries) {
    const rel = relative(path, normalizedCwd);
    if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) return slug;
  }
  const cleanCwd = stripWorktreeSuffix(normalizedCwd);

  // Exact match
  if (map[cleanCwd]) return map[cleanCwd];

  // Subdirectory match
  for (const [path, slug] of entries) {
    const rel = relative(path, cleanCwd);
    if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) {
      return slug;
    }
  }

  // Git root match
  const gitRoot = await getGitRoot(cwd);
  if (gitRoot) {
    const cleanGitRoot = stripWorktreeSuffix(gitRoot);
    if (map[cleanGitRoot]) return map[cleanGitRoot];

    for (const [path, slug] of entries) {
      const rel = relative(path, cleanGitRoot);
      if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) {
        return slug;
      }
    }
  }

  try {
    const canonicalCwd = await realpath(cwd);
    for (const [path, slug] of entries) {
      let canonicalMapped: string;
      try { canonicalMapped = await realpath(path); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("[project-detector] Could not resolve mapped project:", (error as Error).message);
        continue;
      }
      const rel = relative(canonicalMapped, canonicalCwd);
      if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) return slug;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("[project-detector] Could not resolve project directory:", (error as Error).message);
  }

  return null;
}
