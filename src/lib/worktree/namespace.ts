// SPDX-License-Identifier: Apache-2.0
import { lstat, mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import {
  cacheNamespace,
  platformCacheRoot,
  resolveRepoIdentity,
  worktreeKey,
} from "./paths.js";

const MARKERS_DIR_NAME = ".worktrees";

export interface NamespaceMigration {
  migrated: boolean;
  legacyRepoId: string | null;
  repoId: string;
  note: string | null;
}

export interface NamespaceUpkeep {
  migrated: boolean;
  notes: string[];
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function errnoCode(err: unknown): string | undefined {
  return (err as NodeJS.ErrnoException).code;
}

async function isRealDirectory(path: string): Promise<boolean> {
  try {
    const info = await lstat(path);
    return info.isDirectory() && !info.isSymbolicLink();
  } catch (err) {
    const code = errnoCode(err);
    if (code !== "ENOENT" && code !== "EACCES" && code !== "ENOTDIR") {
      console.error(`[worktree-namespace] cannot stat ${path}: ${code ?? String(err)}`);
    }
    return false;
  }
}

export interface NamespaceIdentity {
  repoId: string;
  legacyRepoId: string | null;
}

export async function migrateLegacyNamespace(
  identity: NamespaceIdentity,
  opts: { cacheRoot?: string; dryRun?: boolean } = {},
): Promise<NamespaceMigration> {
  const result: NamespaceMigration = {
    migrated: false,
    legacyRepoId: identity.legacyRepoId,
    repoId: identity.repoId,
    note: null,
  };
  if (identity.legacyRepoId === null || identity.legacyRepoId === identity.repoId) return result;
  const root = resolve(opts.cacheRoot ?? platformCacheRoot());
  const legacyDir = join(root, identity.legacyRepoId);
  const targetDir = join(root, identity.repoId);
  if (!(await isRealDirectory(legacyDir))) return result;
  if (await isRealDirectory(targetDir)) {
    result.note = `legacy cache namespace ${identity.legacyRepoId} kept: ${identity.repoId} already exists`;
    return result;
  }
  if (opts.dryRun === true) {
    result.note = `legacy cache namespace ${identity.legacyRepoId} would migrate to ${identity.repoId}`;
    return result;
  }
  try {
    await rename(legacyDir, targetDir);
    result.migrated = true;
    result.note = `migrated cache namespace ${identity.legacyRepoId} -> ${identity.repoId}`;
  } catch (err) {
    result.note = `legacy cache namespace migration failed: ${errnoCode(err) ?? errorMessage(err)}`;
    console.error(`[worktree-namespace] cannot rename ${legacyDir} -> ${targetDir}: ${errorMessage(err)}`);
  }
  return result;
}

function markersDir(cacheNs: string): string {
  return join(cacheNs, MARKERS_DIR_NAME);
}

function markerPath(cacheNs: string, key: string): string {
  return join(markersDir(cacheNs), key);
}

async function atomicWriteMarker(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const tmp = join(dirname(path), `.${basename(path)}.tmp-${process.pid}-${Date.now().toString(36)}`);
  try {
    await writeFile(tmp, content, { encoding: "utf-8", mode: 0o600 });
    await rename(tmp, path);
  } catch (err) {
    await rm(tmp, { force: true }).catch((cleanupErr: unknown) => {
      const code = errnoCode(cleanupErr);
      if (code !== "ENOENT") {
        console.error(`[worktree-namespace] cannot remove temp marker ${tmp}: ${code ?? String(cleanupErr)}`);
      }
    });
    throw err;
  }
}

export async function recordWorktreeMarker(
  cacheNs: string,
  key: string,
  worktreeRoot: string,
): Promise<void> {
  const path = markerPath(cacheNs, key);
  const content = `${resolve(worktreeRoot)}\n`;
  try {
    const existing = await readFile(path, "utf-8");
    if (existing === content) return;
  } catch (err) {
    const code = errnoCode(err);
    if (code !== "ENOENT" && code !== "EACCES" && code !== "ENOTDIR") {
      console.error(`[worktree-namespace] cannot read marker ${path}: ${code ?? String(err)}`);
    }
  }
  await atomicWriteMarker(path, content);
}

export async function readWorktreeMarkers(repoDir: string): Promise<Map<string, string>> {
  const markers = new Map<string, string>();
  const dir = markersDir(repoDir);
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch (err) {
    const code = errnoCode(err);
    if (code !== "ENOENT" && code !== "ENOTDIR" && code !== "EACCES") {
      console.error(`[worktree-namespace] cannot read markers dir ${dir}: ${code ?? String(err)}`);
    }
    return markers;
  }
  for (const entry of entries) {
    if (entry.startsWith(".")) continue;
    try {
      const raw = await readFile(join(dir, entry), "utf-8");
      const value = raw.trim();
      if (value.length > 0) markers.set(entry, value);
    } catch (err) {
      const code = errnoCode(err);
      if (code !== "ENOENT" && code !== "EISDIR" && code !== "EACCES") {
        console.error(`[worktree-namespace] cannot read marker ${entry}: ${code ?? String(err)}`);
      }
    }
  }
  return markers;
}

export async function markerTargetMissing(worktreePath: string): Promise<boolean> {
  try {
    await stat(worktreePath);
    return false;
  } catch (err) {
    const code = errnoCode(err);
    if (code === "ENOENT" || code === "ENOTDIR") return true;
    if (code !== "EACCES") {
      console.error(`[worktree-namespace] cannot stat marker target ${worktreePath}: ${code ?? String(err)}`);
    }
    return false;
  }
}

export async function namespaceUpkeep(
  worktreeRoot: string,
  opts: { dryRun?: boolean; cacheRoot?: string } = {},
): Promise<NamespaceUpkeep> {
  const notes: string[] = [];
  let migrated = false;
  try {
    const identity = await resolveRepoIdentity(worktreeRoot);
    const migration = await migrateLegacyNamespace(identity, opts);
    migrated = migration.migrated;
    if (migration.note !== null) notes.push(migration.note);
    if (opts.dryRun !== true) {
      const cacheNs = opts.cacheRoot
        ? join(resolve(opts.cacheRoot), identity.repoId)
        : cacheNamespace(identity.repoId);
      await recordWorktreeMarker(cacheNs, worktreeKey(worktreeRoot), worktreeRoot);
    }
  } catch (err) {
    notes.push(`namespace upkeep failed: ${errorMessage(err)}`);
    console.error(`[worktree-namespace] upkeep failed in ${worktreeRoot}: ${errorMessage(err)}`);
  }
  return { migrated, notes };
}
