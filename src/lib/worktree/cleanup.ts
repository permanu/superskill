import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { lstat, mkdir, open, readFile, realpath, rename, rmdir, unlink } from "node:fs/promises";
import { hostname } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const operations = ["MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "rebase-merge", "rebase-apply", "BISECT_LOG", "sequencer", "index.lock"];
const LOCK_STALE_MS = 60_000;
const RECENT_COMPLETION_MS = 60_000;

export interface CleanupSession {
  id: string;
  status: string;
  workspace_path?: string;
  project?: string | null;
  completed_at?: string | null;
  pid?: number;
  host?: string;
}

export interface CleanupResult {
  removed: string[];
  archives?: Array<{ worktree: string; path: string }>;
  kept: Array<{ path: string; reason: string }>;
  errors: Array<{ path: string; reason: string }>;
}

interface Worktree {
  path: string;
  branch?: string;
  locked: boolean;
  prunable: boolean;
  bare: boolean;
}

async function git(cwd: string, args: string[]): Promise<string> {
  return (await exec("git", args, {
    cwd,
    timeout: 5000,
    maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0" },
  })).stdout;
}

async function worktrees(cwd: string): Promise<Worktree[]> {
  const records: Worktree[] = [];
  let current: Worktree | undefined;
  for (const field of (await git(cwd, ["worktree", "list", "--porcelain", "-z"])).split("\0")) {
    if (field.startsWith("worktree ")) {
      current = { path: field.slice(9), locked: false, prunable: false, bare: false };
      records.push(current);
    } else if (current && field.startsWith("branch ")) current.branch = field.slice(7);
    else if (current && (field === "locked" || field.startsWith("locked "))) current.locked = true;
    else if (current && (field === "prunable" || field.startsWith("prunable "))) current.prunable = true;
    else if (current && field === "bare") current.bare = true;
  }
  return records;
}

async function canonical(path: string): Promise<string> {
  try { return await realpath(path); }
  catch (error: any) {
    if (error.code === "ENOENT") return resolve(path);
    throw error;
  }
}

async function exists(path: string): Promise<boolean> {
  try { await lstat(path); return true; }
  catch (error: any) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function commonDir(cwd: string): Promise<string> {
  return realpath((await git(cwd, ["rev-parse", "--path-format=absolute", "--git-common-dir"])).trim());
}

async function proof(path: string, common: string, allowMetadata = true): Promise<string | null> {
  if (await commonDir(path) !== common) return "repository boundary changed";
  if (await canonical((await git(path, ["rev-parse", "--show-toplevel"])).trim()) !== path) return "worktree root changed";
  if ((await git(path, ["rev-parse", "--symbolic-full-name", "HEAD"])).trim() === "refs/heads/main") return "main worktree is protected";
  const gitDir = (await git(path, ["rev-parse", "--absolute-git-dir"])).trim();
  for (const operation of operations) if (await exists(join(gitDir, operation))) return `Git operation in progress: ${operation}`;
  const flags = await git(path, ["ls-files", "-v", "-z"]);
  if (flags.split("\0").some((entry) => /^[a-zS] /.test(entry))) return "tracked content is hidden by assume-unchanged or skip-worktree flags";
  const files = await git(path, ["ls-files", "--stage", "-z"]);
  if (files.split("\0").some((entry) => entry.startsWith("160000 ")) || await exists(join(path, ".gitmodules"))) return "contains submodules";
  const metadata = join(path, ".superskill");
  if (await exists(metadata)) {
    const info = await lstat(metadata);
    if (!info.isDirectory() || info.isSymbolicLink()) return "SuperSkill metadata root is not a regular directory";
    if (files.split("\0").some((entry) => /\t\.superskill(?:\/|$)/.test(entry))) return "SuperSkill metadata contains tracked files";
  }
  const status = (await git(path, ["status", "--porcelain=v1", "-z", "--untracked-files=all", "--ignored", "--ignore-submodules=none"])).split("\0").filter(Boolean);
  if (status.some((entry) => !allowMetadata || !/^!! \.superskill(?:\/.*)?$/.test(entry))) return "tracked, untracked or ignored content is present";
  let main: string;
  try { main = (await git(path, ["rev-parse", "--verify", "refs/heads/main^{commit}"])).trim(); }
  catch { return "local refs/heads/main is unavailable"; }
  const head = (await git(path, ["rev-parse", "--verify", "HEAD^{commit}"])).trim();
  try {
    await git(path, ["merge-base", "--is-ancestor", head, main]);
    return null;
  } catch (error: any) {
    if (error.code !== 1) throw error;
  }
  const headTree = (await git(path, ["rev-parse", `${head}^{tree}`])).trim();
  const mainTree = (await git(path, ["rev-parse", `${main}^{tree}`])).trim();
  return headTree === mainTree ? null : "HEAD is not merged into local main and complete trees differ";
}

async function archiveMetadata(path: string, common: string): Promise<string | undefined> {
  const metadata = join(path, ".superskill");
  if (!await exists(metadata)) return undefined;
  const info = await lstat(metadata);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("SuperSkill metadata root changed before archival");
  let parent = common;
  for (const segment of ["superskill", "worktree-archives"]) {
    parent = join(parent, segment);
    try { await mkdir(parent, { mode: 0o700 }); }
    catch (error: any) { if (error.code !== "EEXIST") throw error; }
    const entry = await lstat(parent);
    if (!entry.isDirectory() || entry.isSymbolicLink() || await realpath(parent) !== parent) throw new Error(`Archive directory is unsafe: ${parent}`);
  }
  const container = join(parent, randomUUID());
  await mkdir(container, { mode: 0o700 });
  const destination = join(container, ".superskill");
  await rename(metadata, destination);
  return destination;
}

async function restoreMetadata(path: string, archive: string, identity: { dev: number; ino: number }): Promise<void> {
  const root = await lstat(path);
  if (!root.isDirectory() || root.isSymbolicLink() || root.dev !== identity.dev || root.ino !== identity.ino) throw new Error("worktree directory changed");
  const destination = join(path, ".superskill");
  await mkdir(destination, { mode: 0o700 });
  try { await rename(archive, destination); }
  catch (error) {
    try { await rmdir(destination); }
    catch (cleanupError) { console.error("[worktree-cleanup] Could not remove empty restoration reservation:", cleanupError); }
    throw error;
  }
}

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

function lockIsStale(raw: string, mtimeMs: number): boolean {
  let body: { pid?: unknown; createdAt?: unknown } | null = null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") body = parsed;
  } catch {
    body = null;
  }
  if (body && Number.isInteger(body.pid) && (body.pid as number) > 0) {
    return !processAlive(body.pid as number);
  }
  const baseline = typeof body?.createdAt === "number" ? body.createdAt : mtimeMs;
  return Date.now() - baseline > LOCK_STALE_MS;
}

function lockToken(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return typeof (parsed as { token?: unknown }).token === "string" ? (parsed as { token: string }).token : null;
  } catch {
    return null;
  }
}

async function removeStaleLock(path: string): Promise<boolean> {
  let raw: string;
  try { raw = await readFile(path, "utf-8"); }
  catch { return false; }
  let mtimeMs: number;
  try { mtimeMs = (await lstat(path)).mtimeMs; }
  catch { return false; }
  if (!lockIsStale(raw, mtimeMs)) return false;
  let before;
  try { before = await lstat(path); }
  catch { return false; }
  let current: string;
  try { current = await readFile(path, "utf-8"); }
  catch { return false; }
  if (current !== raw) return false;
  try {
    const after = await lstat(path);
    if (after.ino !== before.ino || after.dev !== before.dev) return false;
    await unlink(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return true;
    console.error("[worktree-cleanup] Failed to remove stale cleanup lock:", (error as Error).message);
    return false;
  }
  console.error(`[worktree-cleanup] Recovered stale cleanup lock: ${path}`);
  return true;
}

function completedLongEnoughAgo(session: CleanupSession): boolean {
  if (typeof session.completed_at !== "string") return false;
  const time = Date.parse(session.completed_at);
  return !Number.isNaN(time) && Date.now() - time >= RECENT_COMPLETION_MS;
}

function sessionProcessAlive(session: CleanupSession): boolean {
  if (typeof session.pid !== "number" || !Number.isInteger(session.pid) || session.pid <= 0) return false;
  if (session.host !== hostname()) return false;
  try {
    process.kill(session.pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

async function acquireLock(common: string): Promise<{ owned: () => Promise<boolean>; release: () => Promise<void> }> {
  const path = join(common, "superskill-worktree-cleanup.lock");
  const token = randomUUID();
  const body = JSON.stringify({ pid: process.pid, createdAt: Date.now(), token });
  const deadline = Date.now() + 1000;
  for (;;) {
    let handle;
    try { handle = await open(path, "wx", 0o600); }
    catch (error: any) {
      if (error.code !== "EEXIST") throw error;
      if (await removeStaleLock(path)) continue;
      if (Date.now() >= deadline) throw new Error(`Cleanup is locked: ${path}`);
      await new Promise((done) => setTimeout(done, Math.min(25, Math.max(1, deadline - Date.now()))));
      continue;
    }
    try {
      await handle.writeFile(body);
    } catch (error) {
      try {
        const original = await handle.stat();
        const current = await lstat(path);
        if (original.ino === current.ino && original.dev === current.dev) await unlink(path);
      } catch (cleanupError) {
        console.error("[worktree-cleanup] Failed to clear an unwritten cleanup lock:", cleanupError);
      }
      try { await handle.close(); }
      catch (closeError) { console.error("[worktree-cleanup] Failed to close a lock handle after a write failure:", closeError); }
      throw error;
    }
    try {
      await handle.close();
    } catch (error) {
      console.error("[worktree-cleanup] Failed to close the cleanup lock handle:", error instanceof Error ? error.message : String(error));
    }
    const owned = async () => {
      try { return !(await lstat(path)).isSymbolicLink() && lockToken(await readFile(path, "utf-8")) === token; }
      catch (error: any) { if (error.code === "ENOENT") return false; throw error; }
    };
    return { owned, release: async () => { if (await owned()) await unlink(path); } };
  }
}

export async function cleanupCompletedWorktrees(
  cwd: string,
  sessions: CleanupSession[],
  options: { currentSessionId?: string } = {},
): Promise<CleanupResult> {
  const result: CleanupResult = { removed: [], archives: [], kept: [], errors: [] };
  let lock: Awaited<ReturnType<typeof acquireLock>> | undefined;
  try {
    const common = await commonDir(cwd);
    const current = await canonical((await git(cwd, ["rev-parse", "--show-toplevel"])).trim());
    lock = await acquireLock(common);
    const records = await worktrees(cwd);
    const primary = records[0] ? await canonical(records[0].path) : null;
    const completedByPath = new Map<string, CleanupSession[]>();
    const active = new Set<string>();
    for (const session of sessions) {
      if (!session.workspace_path) continue;
      const path = await canonical(session.workspace_path);
      if (session.status === "completed") {
        const owners = completedByPath.get(path);
        if (owners) owners.push(session);
        else completedByPath.set(path, [session]);
      }
      if (session.status !== "completed" || session.id === options.currentSessionId) active.add(path);
    }
    const deadline = Date.now() + 30000;
    for (const record of records.slice(0, 256)) {
      const path = await canonical(record.path);
      let archive: string | undefined;
      let identity: { dev: number; ino: number } | undefined;
      try {
        let reason: string | null = null;
        if (Date.now() >= deadline) reason = "cleanup time budget reached; retry later";
        else if (path === current) reason = "current worktree; switch to main and retry cleanup";
        else if (path === primary || record.branch === "refs/heads/main" || record.bare) reason = "primary or main worktree is protected";
        else if (!completedByPath.has(path)) reason = "no completed-session workspace provenance";
        else if (active.has(path)) reason = "workspace belongs to an active or current session";
        else if (record.locked || record.prunable) reason = "worktree is locked or prunable";
        else {
          const owners = completedByPath.get(path)!;
          if (!owners.every(completedLongEnoughAgo)) reason = "owning session completed less than 60s ago; retry later";
          else if (owners.some(sessionProcessAlive)) reason = "owning session process is still running on this host";
          else reason = await proof(path, common);
        }
        if (reason) { result.kept.push({ path, reason }); continue; }
        const refreshed = (await worktrees(cwd)).find((item) => resolve(item.path) === resolve(record.path));
        if (!refreshed || refreshed.locked || refreshed.prunable || refreshed.bare || refreshed.branch === "refs/heads/main" || await canonical(record.path) !== path) {
          result.kept.push({ path, reason: "worktree registration or path changed during verification" });
          continue;
        }
        reason = await proof(path, common);
        if (reason) { result.kept.push({ path, reason }); continue; }
        if (!await lock.owned()) throw new Error("Cleanup lock ownership changed");
        identity = await lstat(path);
        archive = await archiveMetadata(path, common);
        if (archive) result.archives!.push({ worktree: path, path: archive });
        reason = await proof(path, common, false);
        if (reason) { result.kept.push({ path, reason }); continue; }
        if (!await lock.owned()) throw new Error("Cleanup lock ownership changed");
        await git(cwd, ["worktree", "remove", "--", record.path]);
        result.removed.push(path);
      } catch (error) {
        result.errors.push({ path, reason: error instanceof Error ? error.message : String(error) });
      } finally {
        if (archive && identity && !result.removed.includes(path)) {
          try {
            await restoreMetadata(path, archive, identity);
            result.archives = result.archives!.filter((entry) => entry.path !== archive);
          } catch (error) {
            result.errors.push({ path, reason: `Metadata preserved at ${archive}; restoration refused: ${error instanceof Error ? error.message : String(error)}` });
          }
        }
      }
    }
    for (const record of records.slice(256)) result.kept.push({ path: record.path, reason: "cleanup worktree limit reached" });
  } catch (error) {
    result.errors.push({ path: cwd, reason: error instanceof Error ? error.message : String(error) });
  } finally {
    if (lock) {
      try { await lock.release(); }
      catch (error) { result.errors.push({ path: cwd, reason: error instanceof Error ? error.message : String(error) }); }
    }
  }
  return result;
}
