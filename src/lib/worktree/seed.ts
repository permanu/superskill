// SPDX-License-Identifier: Apache-2.0
import { execFile } from "node:child_process";
import { lstat, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { platform } from "node:os";
import { join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import type { SeedSpec } from "../toolchains/index.js";
import { resolveProviders } from "../toolchains/index.js";
import { buildProviderContext } from "./context.js";
import { hashFile, isPathInside } from "./safety.js";
import {
  appendJournal,
  listingSignature,
  newJournalId,
  readManifest,
  verifyManifest,
  writeManifest,
  type ManifestEntry,
  type WorktreeManifest,
} from "./state.js";

const execFileAsync = promisify(execFile);

const MAX_DETAILED_FILES = 20000;
const HASH_CONCURRENCY = 32;
const MANIFEST_VERSION = 1;

export interface SeedResult {
  seeded: Array<{ relative: string; method: "reflink" | "copy"; files: number; bytes: number }>;
  skipped: Array<{ relative: string; reason: string }>;
  notes: string[];
}

interface WalkedFile {
  abs: string;
  rel: string;
  size: number;
  mtimeMs: number;
}

interface CopiedSeed {
  relative: string;
  dest: string;
  kind: "dir" | "file";
}

type PathState = "missing" | "present" | "unknown";

function toPosix(p: string): string {
  return p.split(sep).join("/");
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function errnoCode(err: unknown): string | undefined {
  return (err as NodeJS.ErrnoException).code;
}

async function samePath(a: string, b: string): Promise<boolean> {
  if (resolve(a) === resolve(b)) return true;
  try {
    const [ra, rb] = await Promise.all([realpath(a), realpath(b)]);
    return ra === rb;
  } catch {
    return false;
  }
}

async function pathState(path: string): Promise<PathState> {
  try {
    await lstat(path);
    return "present";
  } catch (err) {
    if (errnoCode(err) === "ENOENT") return "missing";
    console.error(`[worktree-seed] cannot stat ${path}: ${errnoCode(err) ?? errorMessage(err)}`);
    return "unknown";
  }
}

async function walkFiles(root: string, base: string = root): Promise<WalkedFile[]> {
  let info;
  try {
    info = await lstat(root);
  } catch (err) {
    if (errnoCode(err) === "ENOENT") return [];
    throw err;
  }
  if (info.isSymbolicLink()) return [];
  if (info.isFile()) {
    return [{ abs: root, rel: toPosix(relative(base, root)), size: info.size, mtimeMs: info.mtimeMs }];
  }
  if (!info.isDirectory()) return [];
  const files: WalkedFile[] = [];
  const entries = await readdir(root);
  for (const name of entries) {
    files.push(...(await walkFiles(join(root, name), base)));
  }
  return files;
}

async function chunked<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return out;
}

async function claimSeedLock(
  dest: string,
): Promise<{ ok: true; lockPath: string } | { ok: false; reason: string }> {
  const lockPath = `${dest}.superskill-lock`;
  try {
    await writeFile(lockPath, `${process.pid}\n`, { encoding: "utf-8", flag: "wx", mode: 0o600 });
    return { ok: true, lockPath };
  } catch (err) {
    const code = errnoCode(err);
    if (code === "EEXIST") return { ok: false, reason: "locked by another bootstrap" };
    return { ok: false, reason: `cannot create lock: ${code ?? errorMessage(err)}` };
  }
}

async function releaseSeedLock(lockPath: string): Promise<void> {
  try {
    await rm(lockPath, { force: true });
  } catch (err) {
    console.error(`[worktree-seed] cannot remove lock ${lockPath}: ${errnoCode(err) ?? errorMessage(err)}`);
  }
}

async function runCp(args: string[]): Promise<{ ok: boolean; error: string }> {
  try {
    await execFileAsync("cp", args, { maxBuffer: 4 * 1024 * 1024 });
    return { ok: true, error: "" };
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { stderr?: string };
    const detail = e.stderr && e.stderr.trim().length > 0 ? e.stderr.trim() : errorMessage(err);
    return { ok: false, error: detail };
  }
}

export async function copyTreeCoW(
  src: string,
  dest: string,
): Promise<{ method: "reflink" | "copy"; files: number; bytes: number }> {
  const os = platform();
  let method: "reflink" | "copy";
  if (os === "darwin") {
    const attempt = await runCp(["-Rc", src, dest]);
    if (attempt.ok) {
      method = "reflink";
    } else if ((await pathState(dest)) === "missing") {
      const fallback = await runCp(["-R", src, dest]);
      if (!fallback.ok) throw new Error(`cp failed: ${fallback.error}`);
      method = "copy";
    } else {
      throw new Error(`reflink failed and ${dest} already exists; left in place (${attempt.error})`);
    }
  } else if (os === "linux") {
    const attempt = await runCp(["-R", "--reflink=auto", src, dest]);
    if (attempt.ok) {
      method = "reflink";
    } else if ((await pathState(dest)) === "missing") {
      const fallback = await runCp(["-R", src, dest]);
      if (!fallback.ok) throw new Error(`cp failed: ${fallback.error}`);
      method = "copy";
    } else {
      throw new Error(`reflink failed and ${dest} already exists; left in place (${attempt.error})`);
    }
  } else {
    const fallback = await runCp(["-R", src, dest]);
    if (!fallback.ok) throw new Error(`cp failed: ${fallback.error}`);
    method = "copy";
  }
  let files = 0;
  let bytes = 0;
  try {
    const walked = await walkFiles(dest);
    files = walked.length;
    bytes = walked.reduce((sum, f) => sum + f.size, 0);
  } catch (err) {
    console.error(`[worktree-seed] copied ${src} to ${dest} but could not measure it: ${errorMessage(err)}`);
  }
  return { method, files, bytes };
}

async function updateSeedManifest(
  worktreeRoot: string,
  copied: CopiedSeed[],
  notes: string[],
): Promise<void> {
  const walked = new Map<string, WalkedFile[]>();
  let totalFiles = 0;
  for (const seed of copied) {
    let files: WalkedFile[] = [];
    try {
      files = await walkFiles(seed.dest);
    } catch (err) {
      console.error(`[worktree-seed] cannot walk ${seed.dest}: ${errorMessage(err)}`);
      notes.push(`manifest walk failed for ${seed.relative}: ${errorMessage(err)}`);
    }
    walked.set(seed.relative, files);
    totalFiles += files.length;
  }

  const entries: ManifestEntry[] = [];
  for (const seed of copied) {
    const files = walked.get(seed.relative) ?? [];
    if (totalFiles > MAX_DETAILED_FILES && seed.kind === "dir") {
      entries.push({
        path: `${toPosix(seed.relative).replace(/\/+$/, "")}/`,
        sha256: await listingSignature(seed.dest),
        size: 0,
      });
      continue;
    }
    const hashed = await chunked(files, HASH_CONCURRENCY, async (f): Promise<ManifestEntry> => {
      const { sha256, size } = await hashFile(f.abs);
      return { path: toPosix(relative(worktreeRoot, f.abs)), sha256, size };
    });
    entries.push(...hashed);
  }

  const existing = await readManifest(worktreeRoot, worktreeRoot);
  const merged = new Map<string, ManifestEntry>();
  for (const entry of existing?.files ?? []) merged.set(entry.path, entry);
  for (const entry of entries) merged.set(entry.path, entry);

  const manifest: WorktreeManifest = {
    v: MANIFEST_VERSION,
    worktree: worktreeRoot,
    createdAt: new Date().toISOString(),
    files: [...merged.values()].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)),
  };
  await writeManifest(worktreeRoot, manifest);
}

export async function seedWorktree(
  worktreeRoot: string,
  opts?: { dryRun?: boolean; tools?: string[] },
): Promise<SeedResult> {
  const dryRun = opts?.dryRun === true;
  const result: SeedResult = { seeded: [], skipped: [], notes: [] };

  const built = await buildProviderContext(worktreeRoot);
  let providers = await resolveProviders(built.ctx);
  if (opts?.tools && opts.tools.length > 0) {
    const wanted = new Set(opts.tools);
    const active = new Set(providers.map((p) => p.id));
    for (const tool of wanted) {
      if (!active.has(tool)) result.notes.push(`no active provider for tool "${tool}"`);
    }
    providers = providers.filter((p) => wanted.has(p.id));
  }

  const specs: SeedSpec[] = [];
  for (const provider of providers) {
    try {
      specs.push(...(await provider.seed(built.ctx)));
    } catch (err) {
      result.notes.push(`provider ${provider.id} seed spec failed: ${errorMessage(err)}`);
    }
  }
  if (specs.length === 0) {
    result.notes.push("no seed specs for this repo");
    return result;
  }

  if (await samePath(worktreeRoot, built.repoRoot)) {
    for (const spec of specs) {
      result.skipped.push({ relative: toPosix(spec.relative), reason: "main worktree" });
    }
    result.notes.push("current worktree is the main worktree; seeding skipped");
    return result;
  }

  const copied: CopiedSeed[] = [];
  for (const spec of specs) {
    const relativePath = toPosix(spec.relative);
    const sourceState = await pathState(spec.source);
    if (sourceState !== "present") {
      const reason =
        sourceState === "missing"
          ? `source missing: ${toPosix(spec.source)}`
          : `cannot stat source: ${toPosix(spec.source)}`;
      result.skipped.push({ relative: relativePath, reason });
      continue;
    }
    if (!isPathInside(spec.dest, worktreeRoot)) {
      result.skipped.push({ relative: relativePath, reason: "destination outside worktree" });
      continue;
    }
    const destState = await pathState(spec.dest);
    if (destState === "present") {
      result.skipped.push({ relative: relativePath, reason: "already present" });
      continue;
    }
    if (destState === "unknown") {
      result.skipped.push({ relative: relativePath, reason: `cannot stat destination: ${toPosix(spec.dest)}` });
      continue;
    }

    const plannedMethod: "reflink" | "copy" = spec.method === "copy" ? "copy" : "reflink";
    if (dryRun) {
      result.seeded.push({ relative: relativePath, method: plannedMethod, files: 0, bytes: 0 });
      result.notes.push(`dry run: would seed ${relativePath}`);
      continue;
    }

    const lock = await claimSeedLock(spec.dest);
    if (!lock.ok) {
      result.skipped.push({ relative: relativePath, reason: lock.reason });
      continue;
    }

    try {
      const copy = await copyTreeCoW(spec.source, spec.dest);
      result.seeded.push({ relative: relativePath, method: copy.method, files: copy.files, bytes: copy.bytes });
      copied.push({ relative: relativePath, dest: spec.dest, kind: spec.kind });
    } catch (err) {
      result.skipped.push({ relative: relativePath, reason: `copy failed: ${errorMessage(err)}` });
      if ((await pathState(spec.dest)) === "present") {
        result.notes.push(`partial copy left at ${toPosix(spec.dest)}; human intervention required`);
      }
    } finally {
      await releaseSeedLock(lock.lockPath);
    }
  }

  if (!dryRun && copied.length > 0) {
    try {
      await updateSeedManifest(worktreeRoot, copied, result.notes);
    } catch (err) {
      result.notes.push(`manifest write failed: ${errorMessage(err)}`);
    }
    try {
      await appendJournal(worktreeRoot, {
        id: newJournalId(),
        ts: new Date().toISOString(),
        action: "seed",
        paths: result.seeded.map((s) => s.relative),
        bytes: result.seeded.reduce((sum, s) => sum + s.bytes, 0),
        detail: `seeded ${result.seeded.length} path(s)`,
      });
    } catch (err) {
      result.notes.push(`journal append failed: ${errorMessage(err)}`);
    }
  }

  return result;
}

export async function verifySeededFiles(
  worktreeRoot: string,
  worktreePath?: string,
): Promise<{ modified: string[]; missing: string[]; intact: number } | null> {
  const target = worktreePath ?? worktreeRoot;
  const manifest = await readManifest(worktreeRoot, target);
  if (!manifest) return null;
  const result = await verifyManifest(manifest, { root: target });
  return { modified: result.modified, missing: result.missing, intact: result.intact.length };
}
