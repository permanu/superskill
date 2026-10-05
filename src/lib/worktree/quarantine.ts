// SPDX-License-Identifier: Apache-2.0
import { execFile } from "node:child_process";
import { lstat, mkdir, readFile, readdir, realpath, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { platformCacheRoot } from "./paths.js";
import { isPathInside } from "./safety.js";
import { appendJournal, newJournalId } from "./state.js";

const execFileAsync = promisify(execFile);

const MANIFEST_FILE = "manifest.json";
const QUARANTINE_DIR_NAME = "_quarantine";
const SAFE_ID_PATTERN = /^[0-9A-Za-z][0-9A-Za-z._:-]*$/;
const DU_TIMEOUT_MS = 30_000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface QuarantineResult {
  journalId: string;
  moved: Array<{ from: string; to: string; bytes: number }>;
  skipped: Array<{ path: string; reason: string }>;
  quarantineDir: string;
}

export interface QuarantineManifestEntry {
  original: string;
  quarantined: string;
  basename: string;
  bytes: number;
}

export interface QuarantineManifest {
  v: number;
  journalId: string;
  ts: string;
  repoRoot: string;
  entries: QuarantineManifestEntry[];
}

export interface PurgeResult {
  journalId: string;
  purged: string[];
  skipped: Array<{ path: string; reason: string }>;
  bytes: number;
}

export interface QuarantineOptions {
  journalId?: string;
  cacheRoot?: string;
}

export interface PurgeOptions {
  journalId?: string;
  olderThanDays: number;
  cacheRoot?: string;
  apply: boolean;
  /** Optional; when present a "purge" journal entry is appended to the repo state. */
  repoRoot?: string;
}

export interface RestoreOptions {
  cacheRoot?: string;
}

export interface RestoreResult {
  restored: string[];
  skipped: Array<{ path: string; reason: string }>;
}

export function effectiveCacheRoot(cacheRoot?: string): string {
  return resolve(cacheRoot ?? platformCacheRoot());
}

function quarantineRootOf(cacheRoot: string): string {
  return join(cacheRoot, QUARANTINE_DIR_NAME);
}

async function realpathSafe(path: string): Promise<string> {
  try {
    return await realpath(path);
  } catch {
    return path;
  }
}

/**
 * The single permission check for permanent deletion. True only for a
 * non-reserved journal directory directly under `<cacheRoot>/_quarantine/`,
 * with both the quarantine root and the target resolving inside the cache
 * root and the target being a real (non-symlink) directory.
 * `rm` in this module is never called without this returning true.
 */
export async function assertSafePurgePath(
  target: string,
  cacheRoot: string,
  journalId?: string,
): Promise<boolean> {
  const root = effectiveCacheRoot(cacheRoot);
  const quarantineRoot = quarantineRootOf(root);
  if (!isPathInside(target, quarantineRoot)) return false;
  const id = basename(resolve(target));
  if (!SAFE_ID_PATTERN.test(id)) return false;
  if (journalId !== undefined && id !== journalId) return false;

  let info;
  try {
    info = await lstat(target);
  } catch {
    return false;
  }
  if (info.isSymbolicLink() || !info.isDirectory()) return false;

  const realRoot = await realpathSafe(root);
  const realQ = await realpathSafe(quarantineRoot);
  if (!isPathInside(realQ, realRoot)) return false;
  const realTarget = await realpathSafe(target);
  return realTarget !== realQ && isPathInside(realTarget, realQ);
}

export async function duBytes(path: string): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync("du", ["-sk", path], { timeout: DU_TIMEOUT_MS });
    const first = stdout.trim().split(/\s+/)[0];
    const kb = Number.parseInt(first ?? "", 10);
    if (!Number.isFinite(kb)) return null;
    return kb * 1024;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT" && code !== "EACCES") {
      console.error(`[worktree-quarantine] du -sk ${path} failed: ${code ?? String(err)}`);
    }
    return null;
  }
}

async function uniqueDestination(dir: string, name: string, taken: Set<string>): Promise<string> {
  let candidate = join(dir, name);
  let index = 1;
  for (;;) {
    if (!taken.has(candidate)) {
      try {
        await lstat(candidate);
      } catch {
        return candidate;
      }
    }
    index += 1;
    if (index > 1000) return join(dir, `${name}-${Date.now().toString(36)}`);
    candidate = join(dir, `${name}-${index}`);
  }
}

export async function quarantinePaths(
  repoRoot: string,
  paths: string[],
  opts: QuarantineOptions = {},
): Promise<QuarantineResult> {
  const cacheRoot = effectiveCacheRoot(opts.cacheRoot);
  const quarantineRoot = quarantineRootOf(cacheRoot);
  const journalId = opts.journalId ?? newJournalId();
  if (!SAFE_ID_PATTERN.test(journalId)) {
    throw new Error(`refusing unsafe quarantine journal id: ${journalId}`);
  }
  const ts = new Date().toISOString();
  const quarantineDir = join(quarantineRoot, journalId);
  const moved: Array<{ from: string; to: string; bytes: number }> = [];
  const skipped: Array<{ path: string; reason: string }> = [];
  const planned: Array<{ path: string; target: string; name: string; bytes: number }> = [];
  const plannedTargets = new Set<string>();

  let quarantineRootIsSymlink = false;
  try {
    quarantineRootIsSymlink = (await lstat(quarantineRoot)).isSymbolicLink();
  } catch {
    quarantineRootIsSymlink = false;
  }
  if (!quarantineRootIsSymlink) {
    await mkdir(quarantineDir, { recursive: true, mode: 0o700 });
  }
  const realRoot = await realpathSafe(cacheRoot);
  const realQ = await realpathSafe(quarantineRoot);
  const quarantineContained =
    !quarantineRootIsSymlink &&
    isPathInside(realQ, realRoot) &&
    isPathInside(await realpathSafe(quarantineDir), realQ);

  for (const raw of paths) {
    const path = resolve(raw);

    if (!quarantineContained) {
      skipped.push({ path, reason: `quarantine root escapes cache root ${cacheRoot}` });
      continue;
    }
    if (!isPathInside(path, cacheRoot)) {
      skipped.push({ path, reason: `outside cache root ${cacheRoot}` });
      continue;
    }
    if (path === quarantineRoot || isPathInside(path, quarantineRoot)) {
      skipped.push({ path, reason: "refusing to quarantine the quarantine root" });
      continue;
    }

    let info;
    try {
      info = await lstat(path);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      skipped.push({
        path,
        reason: code === "ENOENT" ? "does not exist" : `lstat failed: ${code ?? String(err)}`,
      });
      continue;
    }
    if (info.isSymbolicLink()) {
      skipped.push({ path, reason: "symlink" });
      continue;
    }
    if (!isPathInside(await realpathSafe(path), realRoot)) {
      skipped.push({ path, reason: `resolves outside cache root ${cacheRoot}` });
      continue;
    }

    const name = basename(path);
    if (name.length === 0) {
      skipped.push({ path, reason: "no basename" });
      continue;
    }

    const target = await uniqueDestination(quarantineDir, name, plannedTargets);
    if (!isPathInside(await realpathSafe(dirname(target)), realQ)) {
      skipped.push({ path, reason: `destination escapes quarantine root ${quarantineRoot}` });
      continue;
    }
    const bytes = (await duBytes(path)) ?? 0;
    planned.push({ path, target, name, bytes });
    plannedTargets.add(target);
  }

  if (planned.length > 0) {
    const manifest: QuarantineManifest = {
      v: 1,
      journalId,
      ts,
      repoRoot,
      entries: planned.map((entry) => ({
        original: entry.path,
        quarantined: entry.target,
        basename: entry.name,
        bytes: entry.bytes,
      })),
    };
    try {
      await writeFile(join(quarantineDir, MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`, {
        encoding: "utf-8",
        mode: 0o600,
      });
    } catch (err) {
      console.error(
        `[worktree-quarantine] failed to write manifest in ${quarantineDir}: ${(err as NodeJS.ErrnoException).code ?? String(err)}`,
      );
    }
  }

  for (const entry of planned) {
    try {
      await rename(entry.path, entry.target);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      skipped.push({
        path: entry.path,
        reason:
          code === "EXDEV"
            ? "cross-device rename not supported (never copy+delete)"
            : `rename failed: ${code ?? String(err)}`,
      });
      continue;
    }
    moved.push({ from: entry.path, to: entry.target, bytes: entry.bytes });
  }

  const bytes = moved.reduce((sum, entry) => sum + entry.bytes, 0);
  try {
    await appendJournal(repoRoot, {
      id: journalId,
      ts,
      action: "quarantine",
      paths: moved.map((entry) => entry.from),
      bytes,
      detail: `quarantineDir=${quarantineDir} moved=${moved.length} skipped=${skipped.length}`,
    });
  } catch (err) {
    console.error(
      `[worktree-quarantine] failed to append journal entry: ${(err as NodeJS.ErrnoException).code ?? String(err)}`,
    );
  }

  return { journalId, moved, skipped, quarantineDir };
}

export async function purgeQuarantine(opts: PurgeOptions): Promise<PurgeResult> {
  const cacheRoot = effectiveCacheRoot(opts.cacheRoot);
  const quarantineRoot = quarantineRootOf(cacheRoot);
  const purgeJournalId = opts.journalId ?? newJournalId();
  const ts = new Date().toISOString();
  const purged: string[] = [];
  const skipped: Array<{ path: string; reason: string }> = [];
  let bytes = 0;

  if (opts.journalId !== undefined && !SAFE_ID_PATTERN.test(opts.journalId)) {
    skipped.push({ path: join(quarantineRoot, opts.journalId), reason: "invalid journal id" });
    return { journalId: purgeJournalId, purged, skipped, bytes };
  }

  let entries;
  try {
    entries = await readdir(quarantineRoot, { withFileTypes: true });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      console.error(`[worktree-quarantine] cannot read ${quarantineRoot}: ${code ?? String(err)}`);
    }
    return { journalId: purgeJournalId, purged: [], skipped: [], bytes: 0 };
  }

  const selected =
    opts.journalId !== undefined ? entries.filter((entry) => entry.name === opts.journalId) : entries;
  if (opts.journalId !== undefined && selected.length === 0) {
    skipped.push({ path: join(quarantineRoot, opts.journalId), reason: "journal not found" });
  }

  for (const entry of selected) {
    const dir = join(quarantineRoot, entry.name);
    if (entry.name.startsWith("_")) {
      skipped.push({ path: dir, reason: "reserved path" });
      continue;
    }
    let info;
    try {
      info = await lstat(dir);
    } catch (err) {
      skipped.push({
        path: dir,
        reason: `lstat failed: ${(err as NodeJS.ErrnoException).code ?? String(err)}`,
      });
      continue;
    }
    if (info.isSymbolicLink() || !info.isDirectory()) {
      skipped.push({ path: dir, reason: "not a directory" });
      continue;
    }
    if (!(await assertSafePurgePath(dir, cacheRoot, opts.journalId))) {
      skipped.push({ path: dir, reason: "failed purge safety guard" });
      continue;
    }
    const ageDays = Math.max(0, (Date.now() - info.mtimeMs) / DAY_MS);
    if (ageDays < opts.olderThanDays) {
      skipped.push({
        path: dir,
        reason: `too young (${ageDays.toFixed(1)}d < ${opts.olderThanDays}d)`,
      });
      continue;
    }
    const dirBytes = (await duBytes(dir)) ?? 0;
    if (!opts.apply) {
      purged.push(dir);
      bytes += dirBytes;
      continue;
    }
    try {
      await rm(dir, { recursive: true, force: true });
      purged.push(dir);
      bytes += dirBytes;
    } catch (err) {
      skipped.push({
        path: dir,
        reason: `rm failed: ${(err as NodeJS.ErrnoException).code ?? String(err)}`,
      });
    }
  }

  if (opts.apply && purged.length > 0 && opts.repoRoot !== undefined) {
    try {
      await appendJournal(opts.repoRoot, {
        id: newJournalId(),
        ts,
        action: "purge",
        paths: purged,
        bytes,
        detail: `olderThanDays=${opts.olderThanDays} requested=${opts.journalId ?? "*"}`,
      });
    } catch (err) {
      console.error(
        `[worktree-quarantine] failed to append purge journal entry: ${(err as NodeJS.ErrnoException).code ?? String(err)}`,
      );
    }
  }

  return { journalId: purgeJournalId, purged, skipped, bytes };
}

async function readManifest(quarantineDir: string): Promise<QuarantineManifest | null> {
  try {
    const raw = await readFile(join(quarantineDir, MANIFEST_FILE), "utf-8");
    const parsed = JSON.parse(raw) as QuarantineManifest;
    if (!parsed || !Array.isArray(parsed.entries)) return null;
    return parsed;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      console.error(`[worktree-quarantine] cannot read manifest in ${quarantineDir}: ${code ?? String(err)}`);
    }
    return null;
  }
}

export async function restoreQuarantine(
  repoRoot: string,
  journalId: string,
  opts: RestoreOptions = {},
): Promise<RestoreResult> {
  const cacheRoot = effectiveCacheRoot(opts.cacheRoot);
  const quarantineDir = join(quarantineRootOf(cacheRoot), journalId);
  const restored: string[] = [];
  const skipped: Array<{ path: string; reason: string }> = [];

  if (!SAFE_ID_PATTERN.test(journalId)) {
    skipped.push({ path: quarantineDir, reason: "invalid journal id" });
    return { restored, skipped };
  }

  const manifest = await readManifest(quarantineDir);
  if (manifest === null) {
    skipped.push({ path: quarantineDir, reason: "manifest missing or unreadable" });
    return { restored, skipped };
  }

  let bytes = 0;
  for (const entry of manifest.entries) {
    const target = resolve(entry.original);
    const source = resolve(entry.quarantined);
    if (!isPathInside(target, cacheRoot)) {
      skipped.push({ path: target, reason: `outside cache root ${cacheRoot}` });
      continue;
    }
    if (!isPathInside(source, quarantineDir)) {
      skipped.push({ path: target, reason: "manifest entry escapes the quarantine dir" });
      continue;
    }
    try {
      await lstat(target);
      skipped.push({ path: target, reason: "target already exists" });
      continue;
    } catch {
      // target absent; restore below
    }
    try {
      await lstat(source);
    } catch {
      skipped.push({ path: target, reason: "quarantined entry missing" });
      continue;
    }

    try {
      await mkdir(dirname(target), { recursive: true, mode: 0o700 });
      await rename(source, target);
      restored.push(target);
      bytes += entry.bytes;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      skipped.push({
        path: target,
        reason:
          code === "EXDEV"
            ? "cross-device rename not supported (never copy+delete)"
            : `rename failed: ${code ?? String(err)}`,
      });
    }
  }

  if (restored.length > 0) {
    try {
      await appendJournal(repoRoot, {
        id: newJournalId(),
        ts: new Date().toISOString(),
        action: "restore",
        paths: restored,
        bytes,
        detail: `restored from quarantine ${journalId}`,
      });
    } catch (err) {
      console.error(
        `[worktree-quarantine] failed to append restore journal entry: ${(err as NodeJS.ErrnoException).code ?? String(err)}`,
      );
    }
  }

  return { restored, skipped };
}
