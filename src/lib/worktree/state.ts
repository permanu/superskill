// SPDX-License-Identifier: Apache-2.0
import { createHash, randomUUID } from "node:crypto";
import { appendFile, lstat, mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { repoStateDir, worktreeKey } from "./paths.js";
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
const STATE_DIR_MODE = 0o700;
const STATE_FILE_MODE = 0o600;
const VERIFY_CONCURRENCY = 16;
const HOOK_KINDS = new Set(["block", "husky", "lefthook", "precommit"]);

async function statePath(worktreeRoot: string, ...parts: string[]): Promise<string> {
  return join(await repoStateDir(worktreeRoot), ...parts);
}

async function ensureStateDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true, mode: STATE_DIR_MODE });
}

async function atomicWrite(filePath: string, content: string): Promise<void> {
  const dir = dirname(filePath);
  await ensureStateDir(dir);
  const tmpPath = join(
    dir,
    `.${basename(filePath)}.tmp-${process.pid}-${Date.now().toString(36)}-${randomUUID()}`,
  );
  try {
    await writeFile(tmpPath, content, { encoding: "utf-8", mode: STATE_FILE_MODE });
    await rename(tmpPath, filePath);
  } catch (err) {
    try {
      await rm(tmpPath, { force: true });
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
    return await readFile(filePath, "utf-8");
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
  await atomicWrite(filePath, `${JSON.stringify(policy, null, 2)}\n`);
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
  await atomicWrite(filePath, `${JSON.stringify(state, null, 2)}\n`);
}

export async function clearHookState(worktreeRoot: string): Promise<void> {
  const filePath = await statePath(worktreeRoot, HOOK_STATE_FILE);
  try {
    await rm(filePath, { force: true });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
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
  return readJson<WorktreeManifest>(await manifestPath(worktreeRoot, worktreePath));
}

export async function writeManifest(worktreeRoot: string, manifest: WorktreeManifest): Promise<void> {
  const filePath = await manifestPath(worktreeRoot, manifest.worktree);
  await atomicWrite(filePath, `${JSON.stringify(manifest, null, 2)}\n`);
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
      if (!isPathInside(abs, root)) {
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
  await appendFile(join(dir, JOURNAL_FILE), `${JSON.stringify(entry)}\n`, {
    encoding: "utf-8",
    mode: STATE_FILE_MODE,
  });
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
      entries.push(JSON.parse(trimmed) as JournalEntry);
    } catch {
      console.error(`[worktree-state] ignoring corrupt journal line in ${filePath}`);
    }
  }
  return entries;
}
