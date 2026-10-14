// SPDX-License-Identifier: Apache-2.0
import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, readdir, rename, unlink } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { ensureSafeDirectory, physicalPathInside, readRegularText, repoStateDir, worktreeKey } from "./paths.js";
import { hashFile, isPathInside } from "./safety.js";

export const POLICY_SCHEMA_VERSION = 1;

export interface WorktreePolicy {
  v: number;
  repoId: string;
  remoteHash: string | null;
  repoRoot: string;
  createdAt: string;
  updatedAt: string;
  stacks: string[];
  tools: string[];
  flags: Record<string, string>;
  hosts: string[];
  activation: { hooks: boolean; seed: boolean; install: boolean };
}

export interface HookState {
  v: number;
  kind: "block" | "husky" | "lefthook" | "precommit";
  fingerprint: string;
  backupPath?: string | null;
  installedAt: string;
}

export interface ManifestEntry {
  path: string;
  sha256: string;
  size: number;
}

export interface WorktreeManifest {
  v: number;
  worktree: string;
  createdAt: string;
  files: ManifestEntry[];
}

export interface JournalEntry {
  id: string;
  ts: string;
  action: "quarantine" | "purge" | "restore" | "install" | "uninstall" | "seed";
  paths: string[];
  bytes: number;
  detail?: string;
}

const POLICY_FILE = "policy.json";
const HOOK_STATE_FILE = "hook.state";
const JOURNAL_FILE = "journal.jsonl";
const MANIFESTS_DIR = "manifests";
const STATE_FILE_MODE = 0o600;
const VERIFY_CONCURRENCY = 16;
const HOOK_KINDS = new Set(["block", "husky", "lefthook", "precommit"]);

async function statePath(worktreeRoot: string, ...parts: string[]): Promise<string> {
  const root = await repoStateDir(worktreeRoot);
  const path = join(root, ...parts);
  try {
    if (!await physicalPathInside(path, dirname(root))) {
      await lstat(dirname(root));
      throw new Error(`Unsafe repository state path: ${path}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return path;
}

async function ensureStateDir(dir: string): Promise<void> {
  await ensureSafeDirectory(dir);
}

async function atomicWrite(filePath: string, content: string, worktreeRoot: string): Promise<void> {
  const boundary = dirname(await repoStateDir(worktreeRoot));
  if (!await physicalPathInside(filePath, boundary)) throw new Error(`Unsafe repository state path: ${filePath}`);
  const dir = dirname(filePath);
  await ensureStateDir(dir);
  const tmpPath = join(
    dir,
    `.${basename(filePath)}.tmp-${process.pid}-${Date.now().toString(36)}-${randomUUID()}`,
  );
  let identity: { dev: number; ino: number } | undefined;
  try {
    const file = await open(tmpPath, "wx", STATE_FILE_MODE);
    try {
      identity = await file.stat();
      await file.writeFile(content, "utf-8");
      await file.sync();
    } finally { await file.close(); }
    if (!await physicalPathInside(filePath, boundary)) throw new Error(`Repository state ancestry changed: ${filePath}`);
    await rename(tmpPath, filePath);
  } catch (err) {
    try {
      if (identity && await physicalPathInside(tmpPath, boundary)) {
        const current = await lstat(tmpPath);
        if (current.dev === identity.dev && current.ino === identity.ino) await unlink(tmpPath);
      }
    } catch (cleanupErr) {
      const code = (cleanupErr as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        console.error(
          `[worktree-state] failed to remove temp file ${tmpPath}: ${code ?? String(cleanupErr)}`,
        );
      }
    }
    throw err;
  }
}

async function readText(filePath: string): Promise<string | null> {
  try {
    return await readRegularText(filePath, 16 * 1024 * 1024);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      console.error(`[worktree-state] cannot read ${filePath}: ${code ?? String(err)}`);
    }
    return null;
  }
}

async function readJson<T>(filePath: string): Promise<T | null> {
  const raw = await readText(filePath);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    console.error(`[worktree-state] ignoring corrupt JSON at ${filePath}`);
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isWorktreePolicy(value: unknown): value is WorktreePolicy {
  if (!isRecord(value)) return false;
  return (
    value.v === POLICY_SCHEMA_VERSION &&
    typeof value.repoId === "string" &&
    Array.isArray(value.stacks) &&
    isRecord(value.activation)
  );
}

function isHookState(value: unknown): value is HookState {
  if (!isRecord(value)) return false;
  return (
    typeof value.v === "number" &&
    typeof value.kind === "string" &&
    HOOK_KINDS.has(value.kind) &&
    typeof value.fingerprint === "string" &&
    typeof value.installedAt === "string"
  );
}

export async function readPolicy(worktreeRoot: string): Promise<WorktreePolicy | null> {
  const filePath = await statePath(worktreeRoot, POLICY_FILE);
  const parsed = await readJson<unknown>(filePath);
  if (parsed === null) return null;
  if (!isWorktreePolicy(parsed)) {
    console.error(`[worktree-state] ignoring invalid policy at ${filePath}`);
    return null;
  }
  return parsed;
}

export async function writePolicy(worktreeRoot: string, policy: WorktreePolicy): Promise<void> {
  const filePath = await statePath(worktreeRoot, POLICY_FILE);
  await atomicWrite(filePath, `${JSON.stringify(policy, null, 2)}\n`, worktreeRoot);
}

export async function readHookState(worktreeRoot: string): Promise<HookState | null> {
  const filePath = await statePath(worktreeRoot, HOOK_STATE_FILE);
  const parsed = await readJson<unknown>(filePath);
  if (parsed === null) return null;
  if (!isHookState(parsed)) {
    console.error(`[worktree-state] ignoring invalid hook state at ${filePath}`);
    return null;
  }
  return parsed;
}

export async function writeHookState(worktreeRoot: string, state: HookState): Promise<void> {
  const filePath = await statePath(worktreeRoot, HOOK_STATE_FILE);
  await atomicWrite(filePath, `${JSON.stringify(state, null, 2)}\n`, worktreeRoot);
}

export async function clearHookState(worktreeRoot: string): Promise<void> {
  const filePath = await statePath(worktreeRoot, HOOK_STATE_FILE);
  try {
    const info = await lstat(filePath);
    if (!info.isFile() || info.isSymbolicLink() || !await readHookState(worktreeRoot)) throw new Error(`Unrecognized hook state preserved: ${filePath}`);
    await unlink(filePath);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return;
    console.error(`[worktree-state] failed to clear ${filePath}: ${code ?? String(err)}`);
    throw err;
  }
}

async function manifestPath(worktreeRoot: string, worktreePath: string): Promise<string> {
  return statePath(worktreeRoot, MANIFESTS_DIR, `${worktreeKey(worktreePath)}.json`);
}

export async function readManifest(
  worktreeRoot: string,
  worktreePath: string,
): Promise<WorktreeManifest | null> {
  const path = await manifestPath(worktreeRoot, worktreePath);
  const value = await readJson<unknown>(path);
  if (value === null) return null;
  if (!isWorktreeManifest(value) || resolve(value.worktree) !== resolve(worktreePath)) {
    console.error(`[worktree-state] unrecognized manifest preserved at ${path}`);
    return null;
  }
  return value;
}

export async function writeManifest(worktreeRoot: string, manifest: WorktreeManifest): Promise<void> {
  if (!isWorktreeManifest(manifest)) throw new Error("Invalid worktree manifest");
  const filePath = await manifestPath(worktreeRoot, manifest.worktree);
  await atomicWrite(filePath, `${JSON.stringify(manifest, null, 2)}\n`, worktreeRoot);
}

function isWorktreeManifest(value: unknown): value is WorktreeManifest {
  return isRecord(value) && value.v === 1 && typeof value.worktree === "string" && resolve(value.worktree) === value.worktree
    && typeof value.createdAt === "string" && Number.isFinite(Date.parse(value.createdAt)) && Array.isArray(value.files)
    && value.files.every((entry) => isRecord(entry) && typeof entry.path === "string" && entry.path.length > 0
      && !entry.path.includes("\\") && isPathInside(resolve(value.worktree as string, entry.path), value.worktree as string)
      && entry.path.replace(/\/$/, "") === toPosix(relative(value.worktree as string, resolve(value.worktree as string, entry.path)))
      && typeof entry.sha256 === "string" && /^[0-9a-f]{64}$/.test(entry.sha256)
      && typeof entry.size === "number" && Number.isSafeInteger(entry.size) && entry.size >= 0);
}

interface ListingEntry {
  rel: string;
  size: number;
  mtimeMs: number;
}

function toPosix(p: string): string {
  return p.split(sep).join("/");
}

async function walkListing(root: string, dir: string, files: ListingEntry[]): Promise<void> {
  const names = await readdir(dir);
  for (const name of names) {
    const abs = join(dir, name);
    const info = await lstat(abs);
    if (info.isSymbolicLink()) continue;
    if (info.isDirectory()) {
      await walkListing(root, abs, files);
      continue;
    }
    if (!info.isFile()) continue;
    files.push({ rel: toPosix(relative(root, abs)), size: info.size, mtimeMs: info.mtimeMs });
  }
}

export async function listingSignature(dir: string): Promise<string> {
  const root = resolve(dir);
  const info = await lstat(root);
  if (info.isSymbolicLink() || !info.isDirectory()) {
    throw new Error(`not a directory: ${root}`);
  }
  const files: ListingEntry[] = [];
  await walkListing(root, root, files);
  const lines = files.map((file) => `${file.rel}:${file.size}:${file.mtimeMs}`).sort();
  return createHash("sha256").update(lines.join("\n")).digest("hex");
}

async function chunked<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return out;
}

export async function verifyManifest(
  manifest: WorktreeManifest,
  opts?: { root?: string },
): Promise<{ modified: string[]; missing: string[]; intact: string[] }> {
  const root = resolve(opts?.root ?? manifest.worktree);
  const outcomes = await chunked(
    manifest.files,
    VERIFY_CONCURRENCY,
    async (entry): Promise<{ status: "modified" | "missing" | "intact"; path: string }> => {
      const abs = resolve(root, entry.path);
      if (!isPathInside(abs, root) || !await physicalPathInside(abs, root)) {
        console.error(`[worktree-state] manifest entry escapes root: ${entry.path}`);
        return { status: "modified", path: entry.path };
      }
      if (entry.path.endsWith("/")) {
        try {
          const listing = await listingSignature(abs);
          if (listing === entry.sha256) return { status: "intact", path: entry.path };
          return { status: "modified", path: entry.path };
        } catch (err) {
          const code = (err as NodeJS.ErrnoException).code;
          if (code === "ENOENT") return { status: "missing", path: entry.path };
          console.error(`[worktree-state] cannot verify ${abs}: ${code ?? String(err)}`);
          return { status: "modified", path: entry.path };
        }
      }
      try {
        const { sha256, size } = await hashFile(abs);
        if (sha256 === entry.sha256 && size === entry.size) return { status: "intact", path: entry.path };
        return { status: "modified", path: entry.path };
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === "ENOENT") return { status: "missing", path: entry.path };
        console.error(`[worktree-state] cannot verify ${abs}: ${code ?? String(err)}`);
        return { status: "modified", path: entry.path };
      }
    },
  );
  const result: { modified: string[]; missing: string[]; intact: string[] } = {
    modified: [],
    missing: [],
    intact: [],
  };
  for (const outcome of outcomes) {
    result[outcome.status].push(outcome.path);
  }
  return result;
}

export function newJournalId(now: Date = new Date()): string {
  const prefix = now.toISOString().replace(/:/g, "-");
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

export async function appendJournal(worktreeRoot: string, entry: JournalEntry): Promise<void> {
  const dir = await repoStateDir(worktreeRoot);
  await ensureStateDir(dir);
  const path = await statePath(worktreeRoot, JOURNAL_FILE);
  const file = await open(path, constants.O_WRONLY | constants.O_APPEND | constants.O_CREAT | (constants.O_NOFOLLOW ?? 0) | constants.O_NONBLOCK, STATE_FILE_MODE);
  try {
    if (!(await file.stat()).isFile()) throw new Error(`Journal is not a regular file: ${path}`);
    await file.writeFile(`${JSON.stringify(entry)}\n`);
  } finally { await file.close(); }
}

export async function readJournal(worktreeRoot: string): Promise<JournalEntry[]> {
  const filePath = await statePath(worktreeRoot, JOURNAL_FILE);
  const raw = await readText(filePath);
  if (raw === null) return [];
  const entries: JournalEntry[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const value: unknown = JSON.parse(trimmed);
      if (!isRecord(value) || typeof value.id !== "string" || typeof value.ts !== "string"
        || !["quarantine", "purge", "restore", "install", "uninstall", "seed"].includes(value.action as string)
        || !Array.isArray(value.paths) || !value.paths.every((path) => typeof path === "string")
        || typeof value.bytes !== "number" || !Number.isFinite(value.bytes) || value.bytes < 0) throw new Error("Invalid journal entry");
      entries.push(value as unknown as JournalEntry);
    } catch {
      console.error(`[worktree-state] ignoring corrupt journal line in ${filePath}`);
    }
  }
  return entries;
}
