// SPDX-License-Identifier: Apache-2.0
import { randomUUID } from "node:crypto";
import { link, lstat, open, readdir, rename, unlink } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import {
  cacheNamespace,
  ensureSafeDirectory,
  physicalPathInside,
  platformCacheRoot,
  readRegularText,
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
  if (![identity.repoId, identity.legacyRepoId].every((id) => /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(id))) {
    result.note = "unsafe cache namespace identity; migration refused";
    return result;
  }
  const root = resolve(opts.cacheRoot ?? platformCacheRoot());
  const legacyDir = join(root, identity.legacyRepoId);
  const targetDir = join(root, identity.repoId);
  if (!(await isRealDirectory(legacyDir))) return result;
  if (!await physicalPathInside(legacyDir, root) || !await physicalPathInside(targetDir, root)) {
    result.note = "unsafe cache namespace path; migration refused";
    return result;
  }
  let targetExists = false;
  try { await lstat(targetDir); targetExists = true; }
  catch (error) { if (errnoCode(error) !== "ENOENT") throw error; }
  if (targetExists) {
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

async function atomicWriteMarker(path: string, content: string, cacheNs: string): Promise<void> {
  await ensureSafeDirectory(dirname(cacheNs));
  if (!await physicalPathInside(path, dirname(cacheNs))) throw new Error(`Unsafe marker path: ${path}`);
  await ensureSafeDirectory(dirname(path));
  const tmp = join(dirname(path), `.${basename(path)}.tmp-${process.pid}-${randomUUID()}`);
  let identity: { dev: number; ino: number } | undefined;
  try {
    const file = await open(tmp, "wx", 0o600);
    try {
      identity = await file.stat();
      await file.writeFile(content, "utf-8");
      await file.sync();
    } finally { await file.close(); }
    if (!await physicalPathInside(path, dirname(cacheNs))) throw new Error(`Marker ancestry changed: ${path}`);
    try { await link(tmp, path); }
    catch (error) { if (errnoCode(error) !== "EEXIST" || await readRegularText(path, 4096) !== content) throw error; }
  } finally {
    try {
      if (identity && await physicalPathInside(tmp, dirname(cacheNs))) {
        const current = await lstat(tmp);
        if (current.dev === identity.dev && current.ino === identity.ino) await unlink(tmp);
      }
    } catch (cleanupErr) {
      const code = errnoCode(cleanupErr);
      if (code !== "ENOENT") {
        console.error(`[worktree-namespace] cannot remove temp marker ${tmp}: ${code ?? String(cleanupErr)}`);
      }
    }
  }
}

export async function recordWorktreeMarker(
  cacheNs: string,
  key: string,
  worktreeRoot: string,
): Promise<void> {
  if (key !== worktreeKey(worktreeRoot)) throw new Error("Marker key does not match its worktree path");
  const path = markerPath(cacheNs, key);
  const content = `${resolve(worktreeRoot)}\n`;
  try {
    await lstat(dirname(cacheNs));
    if (!await physicalPathInside(path, dirname(cacheNs))) throw new Error(`Unsafe marker path: ${path}`);
  } catch (error) { if (errnoCode(error) !== "ENOENT") throw error; }
  try {
    const existing = await readRegularText(path, 4096);
    if (existing === content) return;
    throw new Error(`Unrecognized worktree marker preserved: ${path}`);
  } catch (err) {
    const code = errnoCode(err);
    if (code !== "ENOENT") throw err;
  }
  await atomicWriteMarker(path, content, cacheNs);
}

export async function readWorktreeMarkers(repoDir: string): Promise<Map<string, string>> {
  const markers = new Map<string, string>();
  const dir = markersDir(repoDir);
  if (!await physicalPathInside(dir, repoDir)) return markers;
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
    if (!/^[0-9a-f]{16}$/.test(entry)) continue;
    try {
      const raw = await readRegularText(join(dir, entry), 4096);
      const value = raw.trim();
      if (resolve(value) === value && raw === `${value}\n` && worktreeKey(value) === entry) markers.set(entry, value);
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
    await lstat(worktreePath);
    return false;
  } catch (err) {
    const code = errnoCode(err);
    if (code === "ENOENT") return true;
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
