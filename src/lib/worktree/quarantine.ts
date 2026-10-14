// SPDX-License-Identifier: Apache-2.0
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { chmod, lstat, mkdir, open, readdir, realpath, rename, rm } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { promisify } from "node:util";
import { physicalPathInside, platformCacheRoot, repoStateDir } from "./paths.js";
import { isPathInside, listWorktrees } from "./safety.js";
import { appendJournal, newJournalId } from "./state.js";

const execFileAsync = promisify(execFile);

const MANIFEST_FILE = "manifest.json";
const QUARANTINE_DIR_NAME = "_quarantine";
const SAFE_ID_PATTERN = /^[0-9A-Za-z][0-9A-Za-z._:-]*$/;
const DU_TIMEOUT_MS = 30_000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MANIFEST_MAX_BYTES = 1024 * 1024;
const ENTRY_CAP = 200;
const IDENTITY_TIMEOUT_MS = 3000;

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

export interface QuarantineDirectoryIdentity {
  path: string;
  dev: string;
  ino: string;
  birthtimeNs: string;
}

export interface LocalWorktreeIdentity {
  v: 1;
  root: QuarantineDirectoryIdentity;
  gitDir: QuarantineDirectoryIdentity;
  commonDir: QuarantineDirectoryIdentity;
}

export interface QuarantineManifest {
  v: number;
  journalId: string;
  ts: string;
  repoRoot: string;
  sourceRoot?: string;
  scope?: "cache" | "worktree";
  localIdentity?: LocalWorktreeIdentity;
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
  worktreeRoot?: string;
}

export interface PurgeOptions {
  journalId?: string;
  olderThanDays: number;
  cacheRoot?: string;
  apply: boolean;
  /** Optional; when present a "purge" journal entry is appended to the repo state. */
  repoRoot?: string;
  worktreeRoot?: string;
}

export interface RestoreOptions {
  cacheRoot?: string;
  worktreeRoot?: string;
  apply?: boolean;
}

export interface RestoreResult {
  restored: string[];
  skipped: Array<{ path: string; reason: string }>;
  planned?: string[];
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

export async function isPhysicallyContained(path: string, root: string, allowMissing = false): Promise<boolean> {
  try {
    if (!allowMissing) await lstat(path);
    return await physicalPathInside(path, root);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT" && code !== "ENOTDIR") {
      console.error(`[worktree-quarantine] containment check failed for ${path}: ${code ?? String(err)}`);
    }
    return false;
  }
}

async function quarantineScope(opts: { cacheRoot?: string; worktreeRoot?: string }) {
  const local = opts.worktreeRoot !== undefined;
  const sourceRoot = local ? resolve(opts.worktreeRoot!) : effectiveCacheRoot(opts.cacheRoot);
  const storageRoot = local ? resolve(await repoStateDir(sourceRoot)) : sourceRoot;
  return {
    local,
    sourceRoot,
    storageRoot,
    anchor: local ? dirname(storageRoot) : storageRoot,
    quarantineRoot: join(storageRoot, local ? "quarantine" : QUARANTINE_DIR_NAME),
  };
}

async function directoryIdentity(path: string): Promise<QuarantineDirectoryIdentity> {
  const canonical = await realpath(path);
  const info = await lstat(canonical, { bigint: true });
  if (!info.isDirectory() || info.ino <= 0n || info.birthtimeNs <= 0n) throw new Error(`directory instance identity is unavailable: ${path}`);
  return { path: canonical, dev: info.dev.toString(), ino: info.ino.toString(), birthtimeNs: info.birthtimeNs.toString() };
}

function sameDirectoryIdentity(a: QuarantineDirectoryIdentity, b: QuarantineDirectoryIdentity): boolean {
  return a.path === b.path && a.dev === b.dev && a.ino === b.ino && a.birthtimeNs === b.birthtimeNs;
}

export async function captureLocalWorktreeIdentity(worktreeRoot: string): Promise<LocalWorktreeIdentity | null> {
  try {
    const root = await directoryIdentity(worktreeRoot);
    const { stdout } = await execFileAsync("git", ["rev-parse", "--path-format=absolute", "--show-toplevel", "--absolute-git-dir", "--git-common-dir"], {
      cwd: root.path,
      timeout: IDENTITY_TIMEOUT_MS,
      maxBuffer: 64 * 1024,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0" },
    });
    const paths = stdout.trimEnd().split("\n");
    if (paths.length !== 3 || paths.some((path) => !absoluteNormalized(path)) || await realpath(paths[0]) !== root.path) return null;
    const [gitDir, commonDir] = await Promise.all([directoryIdentity(paths[1]), directoryIdentity(paths[2])]);
    if (!sameDirectoryIdentity(root, await directoryIdentity(worktreeRoot))) return null;
    return { v: 1, root, gitDir, commonDir };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT" && code !== "ENOTDIR") console.error(`[worktree-quarantine] cannot verify local worktree identity for ${worktreeRoot}: ${code ?? String(err)}`);
    return null;
  }
}

async function localIdentityMatches(identity: LocalWorktreeIdentity | undefined, worktreeRoot: string, commonRoot: string): Promise<boolean> {
  if (identity === undefined) return false;
  try {
    if (!sameDirectoryIdentity(identity.commonDir, await directoryIdentity(commonRoot))) return false;
    const current = await captureLocalWorktreeIdentity(worktreeRoot);
    return current !== null && sameDirectoryIdentity(identity.root, current.root) && sameDirectoryIdentity(identity.gitDir, current.gitDir) && sameDirectoryIdentity(identity.commonDir, current.commonDir);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT" && code !== "ENOTDIR") console.error(`[worktree-quarantine] local worktree identity check failed: ${code ?? String(err)}`);
    return false;
  }
}

async function writeRecoveryManifest(dir: string, manifest: QuarantineManifest): Promise<void> {
  const temp = join(dir, `.manifest-${randomUUID()}.tmp`);
  const file = await open(temp, "wx", 0o600);
  try {
    await file.writeFile(`${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
    await file.sync();
  } finally {
    await file.close();
  }
  await rename(temp, join(dir, MANIFEST_FILE));
  const directory = await open(dir, "r");
  try {
    await directory.sync();
  } finally {
    await directory.close();
  }
}

export async function assertSafePurgePath(
  target: string,
  cacheRoot: string,
  journalId?: string,
): Promise<boolean> {
  const root = effectiveCacheRoot(cacheRoot);
  const quarantineRoot = quarantineRootOf(root);
  if (dirname(resolve(target)) !== quarantineRoot) return false;
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

  return isPhysicallyContained(target, root);
}

export async function duBytes(path: string, timeout = DU_TIMEOUT_MS): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync("du", ["-sk", path], { timeout: Math.max(1, timeout), maxBuffer: 1024 * 1024 });
    const first = stdout.trim().split(/\s+/)[0];
    const kb = Number.parseInt(first ?? "", 10);
    if (!Number.isFinite(kb) || kb < 0) return null;
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
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return candidate;
        throw err;
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
  const scope = await quarantineScope(opts);
  const cacheRoot = scope.sourceRoot;
  const quarantineRoot = scope.quarantineRoot;
  const journalId = opts.journalId ?? newJournalId();
  if (!SAFE_ID_PATTERN.test(journalId)) {
    throw new Error(`refusing unsafe quarantine journal id: ${journalId}`);
  }
  const ts = new Date().toISOString();
  const quarantineDir = join(quarantineRoot, journalId);
  const moved: Array<{ from: string; to: string; bytes: number }> = [];
  const skipped: Array<{ path: string; reason: string }> = [];
  const planned: Array<{ path: string; target: string; name: string; bytes: number }> = [];
  const plannedTargets = new Set<string>([join(quarantineDir, MANIFEST_FILE)]);
  let localIdentity: LocalWorktreeIdentity | undefined;

  if (scope.local) {
    try {
      const identity = await captureLocalWorktreeIdentity(cacheRoot);
      const repositoryCommon = await directoryIdentity(dirname(await repoStateDir(repoRoot)));
      if (identity === null || !sameDirectoryIdentity(identity.commonDir, repositoryCommon) || !sameDirectoryIdentity(identity.commonDir, await directoryIdentity(scope.anchor))) {
        throw new Error("local worktree instance or common Git directory is unverified");
      }
      localIdentity = identity;
    } catch (err) {
      skipped.push(...paths.map((path) => ({ path: resolve(path), reason: `local quarantine requires verified instance identity; nothing moved; manual review required: ${err instanceof Error ? err.message : String(err)}` })));
      return { journalId, moved, skipped, quarantineDir };
    }
  }

  let quarantineContained = false;
  try {
    if (!scope.local) await mkdir(cacheRoot, { recursive: true, mode: 0o700 });
    if (!(await isPhysicallyContained(quarantineRoot, scope.anchor, true))) {
      throw new Error(`quarantine root escapes cache root ${scope.storageRoot}`);
    }
    await mkdir(quarantineRoot, { recursive: true, mode: 0o700 });
    await chmod(quarantineRoot, 0o700);
    await mkdir(quarantineDir, { mode: 0o700 });
    quarantineContained = await isPhysicallyContained(quarantineDir, scope.anchor);
  } catch (err) {
    skipped.push(...paths.map((path) => ({ path: resolve(path), reason: `quarantine unavailable: ${err instanceof Error ? err.message : String(err)}` })));
    return { journalId, moved, skipped, quarantineDir };
  }

  const deadline = Date.now() + DU_TIMEOUT_MS;
  for (const raw of paths.slice(0, ENTRY_CAP)) {
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
    if (scope.local && (path === join(cacheRoot, ".git") || isPathInside(path, join(cacheRoot, ".git")))) {
      skipped.push({ path, reason: "refusing worktree metadata" });
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
    if (!(await isPhysicallyContained(path, cacheRoot))) {
      skipped.push({ path, reason: `resolves outside cache root ${cacheRoot}` });
      continue;
    }

    const name = basename(path);
    if (name.length === 0) {
      skipped.push({ path, reason: "no basename" });
      continue;
    }

    const target = await uniqueDestination(quarantineDir, name, plannedTargets);
    if (!(await isPhysicallyContained(target, scope.anchor, true))) {
      skipped.push({ path, reason: `destination escapes quarantine root ${quarantineRoot}` });
      continue;
    }
    if (planned.some((entry) => path === entry.path || isPathInside(path, entry.path) || isPathInside(entry.path, path))) {
      skipped.push({ path, reason: "overlaps another selected path" });
      continue;
    }
    const bytes = Date.now() < deadline ? (await duBytes(path, deadline - Date.now())) ?? 0 : 0;
    planned.push({ path, target, name, bytes });
    plannedTargets.add(target);
  }
  skipped.push(...paths.slice(ENTRY_CAP).map((path) => ({ path, reason: "quarantine candidate cap reached" })));

  if (planned.length > 0) {
    const manifest: QuarantineManifest = {
      v: 1,
      journalId,
      ts,
      repoRoot: resolve(repoRoot),
      sourceRoot: cacheRoot,
      scope: scope.local ? "worktree" : "cache",
      ...(localIdentity ? { localIdentity } : {}),
      entries: planned.map((entry) => ({
        original: entry.path,
        quarantined: entry.target,
        basename: entry.name,
        bytes: entry.bytes,
      })),
    };
    try {
      await writeRecoveryManifest(quarantineDir, manifest);
    } catch (err) {
      console.error(
        `[worktree-quarantine] failed to write manifest in ${quarantineDir}: ${(err as NodeJS.ErrnoException).code ?? String(err)}`,
      );
      skipped.push(...planned.map((entry) => ({ path: entry.path, reason: "recovery manifest could not be written; nothing moved" })));
      return { journalId, moved, skipped, quarantineDir };
    }
  }

  for (const entry of planned) {
    try {
      if (scope.local && !(await localIdentityMatches(localIdentity, cacheRoot, scope.anchor))) {
        skipped.push({ path: entry.path, reason: "local worktree instance changed before move; manual review required" });
        break;
      }
      if (!(await isPhysicallyContained(entry.path, cacheRoot)) || !(await isPhysicallyContained(entry.target, scope.anchor, true))) {
        skipped.push({ path: entry.path, reason: "containment changed before move" });
        continue;
      }
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
      detail: scope.local ? "worktree-local" : `quarantineDir=${quarantineDir} moved=${moved.length} skipped=${skipped.length}`,
    });
  } catch (err) {
    console.error(
      `[worktree-quarantine] failed to append journal entry: ${(err as NodeJS.ErrnoException).code ?? String(err)}`,
    );
  }

  return { journalId, moved, skipped, quarantineDir };
}

export async function purgeQuarantine(opts: PurgeOptions): Promise<PurgeResult> {
  const scope = await quarantineScope(opts);
  const cacheRoot = scope.sourceRoot;
  const quarantineRoot = scope.quarantineRoot;
  const purgeJournalId = opts.journalId ?? newJournalId();
  const ts = new Date().toISOString();
  const purged: string[] = [];
  const skipped: Array<{ path: string; reason: string }> = [];
  let bytes = 0;

  if (!Number.isFinite(opts.olderThanDays) || opts.olderThanDays < 0) {
    return { journalId: purgeJournalId, purged, skipped: [{ path: quarantineRoot, reason: "invalid retention age" }], bytes };
  }
  const repository = opts.repoRoot ?? opts.worktreeRoot;
  const trusted = repository !== undefined ? await trustedRepoRoots(repository) : [];

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

  const deadline = Date.now() + DU_TIMEOUT_MS;
  for (const entry of selected.slice(0, ENTRY_CAP)) {
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
    if (!(await isPhysicallyContained(dir, scope.anchor)) || !SAFE_ID_PATTERN.test(entry.name)) {
      skipped.push({ path: dir, reason: "failed purge safety guard" });
      continue;
    }
    const manifest = await readManifest(dir);
    if (manifest === null || !(await manifestTrusted(manifest, scope, trusted))) {
      skipped.push({ path: dir, reason: "manifest missing, invalid, or untrusted; manual review required" });
      continue;
    }
    const sourceRoot = scope.local ? manifest.sourceRoot! : cacheRoot;
    if (manifest.entries.some((item) => entryPathProblem(item, dir, sourceRoot, quarantineRoot) !== null)) {
      skipped.push({ path: dir, reason: "manifest paths are invalid; manual review required" });
      continue;
    }
    let contained = true;
    for (const item of manifest.entries) {
      if (!(await isPhysicallyContained(item.original, sourceRoot, true)) || !(await isPhysicallyContained(item.quarantined, scope.anchor, true))) {
        contained = false;
        break;
      }
    }
    if (!contained) {
      skipped.push({ path: dir, reason: "manifest path ancestry is untrusted; manual review required" });
      continue;
    }
    const names = await readdir(dir);
    const known = new Set([MANIFEST_FILE, ...manifest.entries.map((item) => basename(item.quarantined))]);
    if (names.some((name) => !known.has(name))) {
      skipped.push({ path: dir, reason: "unrecorded contents; manual review required" });
      continue;
    }
    const ageDays = Math.max(0, (Date.now() - Math.max(info.mtimeMs, Date.parse(manifest.ts))) / DAY_MS);
    if (ageDays < opts.olderThanDays) {
      skipped.push({
        path: dir,
        reason: `too young (${ageDays.toFixed(1)}d < ${opts.olderThanDays}d)`,
      });
      continue;
    }
    if (Date.now() >= deadline) {
      skipped.push({ path: dir, reason: "purge scan time budget reached" });
      break;
    }
    const dirBytes = (await duBytes(dir, deadline - Date.now())) ?? 0;
    if (!opts.apply) {
      purged.push(dir);
      bytes += dirBytes;
      continue;
    }
    try {
      if (!(await isPhysicallyContained(dir, scope.anchor))) throw new Error("containment changed before purge");
      if (scope.local && !(await manifestTrusted(manifest, scope, trusted))) {
        skipped.push({ path: dir, reason: "local worktree instance changed before purge; manual review required" });
        continue;
      }
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function absoluteNormalized(value: unknown): value is string {
  return typeof value === "string" && isAbsolute(value) && resolve(value) === value && !value.includes("\0");
}

function isDirectoryIdentity(value: unknown): value is QuarantineDirectoryIdentity {
  if (!isRecord(value) || !absoluteNormalized(value.path)) return false;
  const decimal = /^(0|[1-9][0-9]{0,39})$/;
  return typeof value.dev === "string" && decimal.test(value.dev) && typeof value.ino === "string" && decimal.test(value.ino) && value.ino !== "0" && typeof value.birthtimeNs === "string" && decimal.test(value.birthtimeNs) && value.birthtimeNs !== "0";
}

function isLocalIdentity(value: unknown): value is LocalWorktreeIdentity {
  return isRecord(value) && value.v === 1 && isDirectoryIdentity(value.root) && isDirectoryIdentity(value.gitDir) && isDirectoryIdentity(value.commonDir);
}

export async function readQuarantineManifest(quarantineDir: string): Promise<QuarantineManifest | null> {
  try {
    const directory = await lstat(quarantineDir);
    if (!directory.isDirectory() || directory.isSymbolicLink() || (directory.mode & 0o077) !== 0 || (process.getuid && directory.uid !== process.getuid())) return null;
    const file = await open(join(quarantineDir, MANIFEST_FILE), constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOFOLLOW);
    let raw: string;
    try {
      const info = await file.stat();
      if (!info.isFile() || info.size > MANIFEST_MAX_BYTES || (info.mode & 0o077) !== 0 || (process.getuid && info.uid !== process.getuid())) return null;
      const buffer = Buffer.alloc(info.size + 1);
      const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
      if (bytesRead !== info.size) return null;
      raw = buffer.subarray(0, bytesRead).toString("utf-8");
    } finally {
      await file.close();
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.v !== 1 || parsed.journalId !== basename(quarantineDir) || !SAFE_ID_PATTERN.test(String(parsed.journalId))) return null;
    if (typeof parsed.ts !== "string" || !Number.isFinite(Date.parse(parsed.ts)) || Date.parse(parsed.ts) < 0 || Date.parse(parsed.ts) > Date.now()) return null;
    if (new Date(parsed.ts).toISOString() !== parsed.ts || !absoluteNormalized(parsed.repoRoot)) return null;
    if (parsed.scope !== undefined && parsed.scope !== "cache" && parsed.scope !== "worktree") return null;
    if (parsed.sourceRoot !== undefined && !absoluteNormalized(parsed.sourceRoot)) return null;
    if (parsed.localIdentity !== undefined && !isLocalIdentity(parsed.localIdentity)) return null;
    if (!Array.isArray(parsed.entries) || parsed.entries.length > ENTRY_CAP) return null;
    const originals = new Set<string>();
    const destinations = new Set<string>();
    for (const entry of parsed.entries) {
      if (!isRecord(entry) || !absoluteNormalized(entry.original) || !absoluteNormalized(entry.quarantined)) return null;
      if (typeof entry.basename !== "string" || entry.basename !== basename(entry.original)) return null;
      if (typeof entry.bytes !== "number" || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0) return null;
      if (originals.has(entry.original) || destinations.has(entry.quarantined)) return null;
      originals.add(entry.original);
      destinations.add(entry.quarantined);
    }
    return parsed as unknown as QuarantineManifest;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      console.error(`[worktree-quarantine] cannot read manifest in ${quarantineDir}: ${code ?? String(err)}`);
    }
    return null;
  }
}

const readManifest = readQuarantineManifest;

async function trustedRepoRoots(repoRoot: string): Promise<string[]> {
  const roots = [resolve(repoRoot), ...(await listWorktrees(repoRoot)).slice(0, ENTRY_CAP).map((entry) => resolve(entry.path))];
  return [...new Set(await Promise.all(roots.map(realpathSafe)))];
}

async function manifestTrusted(
  manifest: QuarantineManifest,
  scope: Awaited<ReturnType<typeof quarantineScope>>,
  trusted: string[],
): Promise<boolean> {
  if ((manifest.scope === "worktree") !== scope.local) return false;
  if (trusted.length > 0 && !trusted.includes(await realpathSafe(manifest.repoRoot))) return false;
  if (!scope.local) return manifest.sourceRoot === undefined || resolve(manifest.sourceRoot) === scope.sourceRoot;
  return manifest.sourceRoot !== undefined && trusted.includes(await realpathSafe(manifest.sourceRoot)) && await localIdentityMatches(manifest.localIdentity, manifest.sourceRoot, scope.anchor);
}

function entryPathProblem(entry: QuarantineManifestEntry, dir: string, root: string, quarantineRoot: string): string | null {
  if (!isPathInside(entry.original, root)) return `outside cache root ${root}`;
  if (entry.original === quarantineRoot || isPathInside(entry.original, quarantineRoot) || isPathInside(quarantineRoot, entry.original)) return "manifest original overlaps quarantine metadata";
  if (dirname(entry.quarantined) !== dir || basename(entry.quarantined) === MANIFEST_FILE) return "manifest entry escapes the quarantine dir";
  if (entry.original === join(root, ".git") || isPathInside(entry.original, join(root, ".git"))) return "manifest original overlaps worktree metadata";
  return null;
}

export async function restoreQuarantine(
  repoRoot: string,
  journalId: string,
  opts: RestoreOptions = {},
): Promise<RestoreResult> {
  const scope = await quarantineScope(opts);
  const quarantineDir = join(scope.quarantineRoot, journalId);
  const restored: string[] = [];
  const planned: string[] = [];
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
  const trusted = await trustedRepoRoots(repoRoot);
  if (!(await isPhysicallyContained(quarantineDir, scope.anchor)) || !(await manifestTrusted(manifest, scope, trusted))) {
    skipped.push({ path: quarantineDir, reason: "quarantine manifest, storage, or local instance is untrusted; manual review required" });
    return { restored, skipped };
  }
  const cacheRoot = scope.local ? manifest.sourceRoot! : scope.sourceRoot;

  let bytes = 0;
  for (const entry of manifest.entries) {
    const target = resolve(entry.original);
    const source = resolve(entry.quarantined);
    const pathProblem = entryPathProblem(entry, quarantineDir, cacheRoot, scope.quarantineRoot);
    if (pathProblem !== null) {
      skipped.push({ path: target, reason: pathProblem });
      continue;
    }
    try {
      await lstat(target);
      skipped.push({ path: target, reason: "target already exists" });
      continue;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        skipped.push({ path: target, reason: `cannot stat target: ${(err as NodeJS.ErrnoException).code ?? String(err)}` });
        continue;
      }
    }
    try {
      await lstat(source);
    } catch {
      skipped.push({ path: target, reason: "quarantined entry missing" });
      continue;
    }

    if (!(await isPhysicallyContained(source, scope.anchor)) || !(await isPhysicallyContained(target, cacheRoot, true))) {
      skipped.push({ path: target, reason: "source or target ancestor fails physical containment" });
      continue;
    }
    if (opts.apply === false) {
      planned.push(target);
      continue;
    }

    try {
      if (scope.local && !(await manifestTrusted(manifest, scope, trusted))) {
        skipped.push({ path: target, reason: "local worktree instance changed before restore; manual review required" });
        break;
      }
      await mkdir(dirname(target), { recursive: true, mode: 0o700 });
      if (!(await isPhysicallyContained(source, scope.anchor)) || !(await isPhysicallyContained(target, cacheRoot, true))) throw new Error("containment changed before restore");
      if (scope.local && !(await manifestTrusted(manifest, scope, trusted))) {
        skipped.push({ path: target, reason: "local worktree instance changed before restore; manual review required" });
        break;
      }
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

  return { restored, skipped, ...(opts.apply === false ? { planned } : {}) };
}
