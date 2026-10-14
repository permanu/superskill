import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { lstat, mkdir, open, readdir, realpath, rename, unlink } from "node:fs/promises";
import { hostname } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { ensureSafeDirectory, physicalPathInside, readRegularText } from "./paths.js";

const exec = promisify(execFile);
const operations = ["MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "rebase-merge", "rebase-apply", "BISECT_LOG", "sequencer", "index.lock"];
const RECENT_COMPLETION_MS = 60_000;
const SESSION_GRACE_MS = 30 * 60_000;

export interface CleanupWorkspaceIdentity {
  head: string;
  gitDir: string;
  gitDirDev: number;
  gitDirIno: number;
  gitDirBirthtimeMs: number;
  rootDev: number;
  rootIno: number;
  rootBirthtimeMs: number;
}

export interface CleanupSession {
  id: string;
  status: string;
  workspace_path?: string;
  project?: string | null;
  completed_at?: string | null;
  pid?: number;
  host?: string;
  started_at?: string;
  last_heartbeat?: string;
  expired_at?: string;
  lease_expires_at?: string;
  workspace_identity?: CleanupWorkspaceIdentity;
}

export interface CleanupOptions {
  currentSessionId?: string;
  readSessions?: () => Promise<CleanupSession[]>;
  withSessionLease?: <T>(callback: (sessions: CleanupSession[]) => Promise<T>) => Promise<T>;
  dryRun?: boolean;
}

export interface CleanupRecovery {
  worktree: string;
  path: string;
  manifest: string;
  rescueRef: string;
  head: string;
  state: "prepared" | "quarantined";
}

export interface CleanupResult {
  removed: string[];
  archives?: Array<{ worktree: string; path: string }>;
  kept: Array<{ path: string; reason: string }>;
  errors: Array<{ path: string; reason: string }>;
  quarantined?: CleanupRecovery[];
  recoveries?: CleanupRecovery[];
}

interface Worktree {
  path: string;
  branch?: string;
  locked: boolean;
  prunable: boolean;
  bare: boolean;
  head?: string;
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
    else if (current && field.startsWith("HEAD ")) current.head = field.slice(5);
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

export async function captureCleanupWorkspaceIdentity(path: string): Promise<CleanupWorkspaceIdentity> {
  const root = await realpath(path);
  if (await realpath((await git(root, ["rev-parse", "--show-toplevel"])).trim()) !== root) throw new Error("Workspace is not a worktree root");
  const gitDir = await realpath((await git(root, ["rev-parse", "--absolute-git-dir"])).trim());
  const [rootInfo, adminInfo, head] = await Promise.all([
    lstat(root), lstat(gitDir), git(root, ["rev-parse", "--verify", "HEAD^{commit}"]),
  ]);
  return {
    head: head.trim(), gitDir, gitDirDev: adminInfo.dev, gitDirIno: adminInfo.ino,
    gitDirBirthtimeMs: adminInfo.birthtimeMs, rootDev: rootInfo.dev, rootIno: rootInfo.ino,
    rootBirthtimeMs: rootInfo.birthtimeMs,
  };
}

function sameIdentity(a: CleanupWorkspaceIdentity | undefined, b: CleanupWorkspaceIdentity): boolean {
  return !!a && Object.keys(b).every((key) => a[key as keyof CleanupWorkspaceIdentity] === b[key as keyof CleanupWorkspaceIdentity]);
}

async function defaultBranch(cwd: string): Promise<string> {
  let configured = "";
  try { configured = (await git(cwd, ["config", "--get", "superskill.defaultBranch"])).trim(); }
  catch (error: any) { if (error.code !== 1) throw error; }
  if (!configured) {
    try {
      const remote = (await git(cwd, ["symbolic-ref", "--quiet", "refs/remotes/origin/HEAD"])).trim();
      if (!remote.startsWith("refs/remotes/origin/")) throw new Error("Default branch symbolic ref is invalid");
      configured = remote.slice("refs/remotes/origin/".length);
    } catch (error: any) { if (error.code !== 1) throw error; }
  }
  if (configured) {
    const ref = configured.startsWith("refs/heads/") ? configured : `refs/heads/${configured}`;
    await git(cwd, ["check-ref-format", ref]);
    await git(cwd, ["rev-parse", "--verify", `${ref}^{commit}`]);
    return ref;
  }
  const candidates: string[] = [];
  for (const name of ["main", "master", "trunk"]) {
    const ref = `refs/heads/${name}`;
    try { await git(cwd, ["show-ref", "--verify", "--quiet", ref]); candidates.push(ref); }
    catch (error: any) { if (error.code !== 1) throw error; }
  }
  if (candidates.length !== 1) throw new Error("Local default branch is unavailable or ambiguous; configure superskill.defaultBranch");
  return candidates[0];
}

async function proof(path: string, common: string, baseRef: string): Promise<string | null> {
  if (await commonDir(path) !== common) return "repository boundary changed";
  if (await canonical((await git(path, ["rev-parse", "--show-toplevel"])).trim()) !== path) return "worktree root changed";
  if ((await git(path, ["rev-parse", "--symbolic-full-name", "HEAD"])).trim() === baseRef) return "default-branch worktree is protected";
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
  if (status.some((entry) => !/^!! \.superskill(?:\/.*)?$/.test(entry))) return "tracked, untracked or ignored content is present";
  let main: string;
  try { main = (await git(path, ["rev-parse", "--verify", `${baseRef}^{commit}`])).trim(); }
  catch { return `local ${baseRef} is unavailable`; }
  const head = (await git(path, ["rev-parse", "--verify", "HEAD^{commit}"])).trim();
  try {
    await git(path, ["merge-base", "--is-ancestor", head, main]);
    return null;
  } catch (error: any) {
    if (error.code !== 1) throw error;
  }
  const headTree = (await git(path, ["rev-parse", `${head}^{tree}`])).trim();
  const mainTree = (await git(path, ["rev-parse", `${main}^{tree}`])).trim();
  return headTree === mainTree ? null : `HEAD is not merged into local ${baseRef} and complete trees differ`;
}

async function writeRecovery(recovery: CleanupRecovery, identity: CleanupWorkspaceIdentity, owners: CleanupSession[]): Promise<void> {
  const common = await realpath(join(dirname(recovery.manifest), "..", "..", ".."));
  if (!await physicalPathInside(recovery.manifest, common)) throw new Error("Recovery manifest ancestry changed");
  const tmp = `${recovery.manifest}.${randomUUID()}.tmp`;
  const handle = await open(tmp, "wx", 0o600);
  try {
    await handle.writeFile(JSON.stringify({ v: 1, kind: "superskill-worktree-recovery", ...recovery, identity, sessions: owners.map((owner) => owner.id) }));
    await handle.sync();
  } finally { await handle.close(); }
  await rename(tmp, recovery.manifest);
  const directory = await open(dirname(recovery.manifest), "r");
  try { await directory.sync(); }
  finally { await directory.close(); }
}

async function readRecoveries(common: string): Promise<CleanupRecovery[]> {
  const root = join(common, "superskill", "worktree-archives");
  if (!await physicalPathInside(root, common) || !await exists(root)) return [];
  const recovered: CleanupRecovery[] = [];
  for (const entry of (await readdir(root, { withFileTypes: true })).slice(0, 256)) {
    if (!entry.isDirectory() || !/^[0-9a-f-]{36}$/.test(entry.name)) continue;
    const manifest = join(root, entry.name, "recovery.json");
    if (!await physicalPathInside(manifest, common)) continue;
    try {
      const info = await lstat(manifest);
      if (!info.isFile() || info.size > 65536) continue;
      const value = JSON.parse(await readRegularText(manifest, 65536));
      if (value.v !== 1 || value.kind !== "superskill-worktree-recovery" || value.manifest !== manifest
        || value.path !== join(root, entry.name, "worktree") || typeof value.worktree !== "string"
        || resolve(value.worktree) !== value.worktree || !/^[0-9a-f]{40,64}$/.test(value.head)
        || value.rescueRef !== `refs/superskill/worktree-rescue/${entry.name}`
        || !["prepared", "quarantined"].includes(value.state)) continue;
      recovered.push({ worktree: value.worktree, path: value.path, manifest, rescueRef: value.rescueRef, head: value.head, state: value.state });
    } catch (error: any) {
      if (error.code !== "ENOENT") console.error("[worktree-cleanup] Recovery manifest could not be read:", manifest, error.message);
    }
  }
  return recovered;
}

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

function lockIsStale(raw: string): boolean {
  let body: { pid?: unknown; host?: unknown; token?: unknown } | null = null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") body = parsed;
  } catch {
    body = null;
  }
  if (body?.host === hostname() && typeof body.token === "string" && Number.isInteger(body.pid) && (body.pid as number) > 0) {
    return !processAlive(body.pid as number);
  }
  return false;
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
  try { raw = await readRegularText(path, 4096); }
  catch { return false; }
  let initial;
  try { initial = await lstat(path); }
  catch { return false; }
  if (!initial.isFile() || initial.isSymbolicLink() || !lockIsStale(raw)) return false;
  let before;
  try { before = await lstat(path); }
  catch { return false; }
  let current: string;
  try { current = await readRegularText(path, 4096); }
  catch { return false; }
  if (current !== raw) return false;
  try {
    const after = await lstat(path);
    if (after.ino !== before.ino || after.dev !== before.dev || after.ino !== initial.ino || after.dev !== initial.dev) return false;
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
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

function graceExpired(session: CleanupSession): boolean {
  const times = [session.completed_at, session.expired_at, session.lease_expires_at, session.last_heartbeat, session.started_at]
    .filter((value): value is string => typeof value === "string").map(Date.parse);
  return times.length > 0 && times.every(Number.isFinite) && Date.now() - Math.max(...times) >= SESSION_GRACE_MS;
}

async function sessionProof(path: string, sessions: CleanupSession[], identity: CleanupWorkspaceIdentity, currentSessionId?: string): Promise<{ reason: string | null; owners: CleanupSession[] }> {
  const matching: CleanupSession[] = [];
  for (const session of sessions) if (session.workspace_path && await canonical(session.workspace_path) === path) matching.push(session);
  const owners = matching.filter((session) => session.status === "completed");
  let reason: string | null = null;
  if (matching.some((session) => session.id === currentSessionId || (session.status !== "completed" && session.status !== "expired"))) reason = "workspace belongs to an active or current session";
  else if (matching.some((session) => sessionProcessAlive(session))) reason = "owning session process is still running on this host";
  else if (matching.some((session) => session.status === "expired" && !graceExpired(session))) reason = "expired session remains within the safe lease grace period";
  else if (owners.length === 0) reason = "no completed-session workspace provenance";
  else if (!owners.every(completedLongEnoughAgo)) reason = "owning session completed less than 60s ago; retry later";
  else if (owners.some((session) => (session.host !== undefined && session.host !== hostname() || session.pid !== undefined && session.host === undefined) && !graceExpired(session))) reason = "owning session may still be live on another host; safe grace period has not elapsed";
  else if (!owners.every((session) => sameIdentity(session.workspace_identity, identity))) reason = "completed-session HEAD or worktree administration identity is missing or changed";
  else if (owners.some((session) => session.started_at !== undefined && (!Number.isFinite(Date.parse(session.started_at)) || Date.parse(session.started_at) > Date.parse(session.completed_at!) || identity.gitDirBirthtimeMs > Date.parse(session.started_at) + 1000))) reason = "session timing does not establish ownership of this worktree registration";
  return { reason, owners };
}

async function acquireLock(common: string): Promise<{ owned: () => Promise<boolean>; release: () => Promise<void> }> {
  const path = join(common, "superskill-worktree-cleanup.lock");
  const token = randomUUID();
  const body = JSON.stringify({ pid: process.pid, host: hostname(), createdAt: Date.now(), token });
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
    const identity = await handle.stat();
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
      try {
        const current = await lstat(path);
        return current.isFile() && !current.isSymbolicLink() && current.dev === identity.dev && current.ino === identity.ino && lockToken(await readRegularText(path, 4096)) === token;
      }
      catch (error: any) { if (error.code === "ENOENT") return false; throw error; }
    };
    return { owned, release: async () => { if (await owned()) await unlink(path); } };
  }
}

export async function cleanupCompletedWorktrees(
  cwd: string,
  sessions: CleanupSession[],
  options: CleanupOptions = {},
): Promise<CleanupResult> {
  const result: CleanupResult = { removed: [], archives: [], quarantined: [], recoveries: [], kept: [], errors: [] };
  let lock: Awaited<ReturnType<typeof acquireLock>> | undefined;
  try {
    const common = await commonDir(cwd);
    const current = await canonical((await git(cwd, ["rev-parse", "--show-toplevel"])).trim());
    if (!options.dryRun) lock = await acquireLock(common);
    result.recoveries = await readRecoveries(common);
    const records = await worktrees(cwd);
    const primary = records[0] ? await canonical(records[0].path) : null;
    const baseRef = await defaultBranch(cwd);
    const deadline = Date.now() + 30000;
    for (const record of records.slice(0, 256)) {
      const path = await canonical(record.path);
      let recovery: CleanupRecovery | undefined;
      try {
        let reason: string | null = null;
        if (Date.now() >= deadline) reason = "cleanup time budget reached; retry later";
        else if (path === current) reason = "current worktree; switch to the primary checkout and retry cleanup";
        else if (path === primary || record.branch === baseRef || record.bare) reason = `primary or default-branch ${baseRef} worktree is protected`;
        else if (record.locked || record.prunable) reason = "worktree is locked or prunable";
        else if (await physicalPathInside(path, common)) reason = "recovery worktrees inside the Git directory are protected";
        if (reason) { result.kept.push({ path, reason }); continue; }
        const identity = await captureCleanupWorkspaceIdentity(path);
        let ownership = await sessionProof(path, sessions, identity, options.currentSessionId);
        reason = ownership.reason ?? await proof(path, common, baseRef);
        if (reason) { result.kept.push({ path, reason }); continue; }
        const refreshed = (await worktrees(cwd)).find((item) => resolve(item.path) === resolve(record.path));
        if (!refreshed || refreshed.locked || refreshed.prunable || refreshed.bare || refreshed.branch !== record.branch || refreshed.head !== record.head || await canonical(record.path) !== path) {
          result.kept.push({ path, reason: "worktree registration or path changed during verification" });
          continue;
        }
        reason = await proof(path, common, baseRef);
        if (reason) { result.kept.push({ path, reason }); continue; }
        if (options.dryRun) { result.kept.push({ path, reason: "dry run: would preserve this worktree in recoverable quarantine; automatic deletion is disabled" }); continue; }
        if (!options.withSessionLease) { result.kept.push({ path, reason: "live session registry maintenance lease is unavailable; relocation refused" }); continue; }
        const id = randomUUID();
        const container = join(common, "superskill", "worktree-archives", id);
        if (!await physicalPathInside(container, common)) throw new Error("Archive directory is unsafe");
        await ensureSafeDirectory(dirname(container));
        await mkdir(container, { mode: 0o700 });
        recovery = { worktree: path, path: join(container, "worktree"), manifest: join(container, "recovery.json"), rescueRef: `refs/superskill/worktree-rescue/${id}`, head: identity.head, state: "prepared" };
        await writeRecovery(recovery, identity, ownership.owners);
        result.recoveries!.push(recovery);
        await git(cwd, ["update-ref", recovery.rescueRef, identity.head, "0".repeat(identity.head.length)]);
        if (options.readSessions) {
          ownership = await sessionProof(path, await options.readSessions(), identity, options.currentSessionId);
          if (ownership.reason) throw new Error(ownership.reason);
        }
        const prepared = recovery;
        ownership = await options.withSessionLease(async sessions => {
          const leasedOwnership = await sessionProof(path, sessions, identity, options.currentSessionId);
          if (leasedOwnership.reason) throw new Error(leasedOwnership.reason);
          if (!sameIdentity(identity, await captureCleanupWorkspaceIdentity(path))) throw new Error("Worktree identity changed before quarantine");
          const latest = (await worktrees(cwd)).find((item) => resolve(item.path) === path);
          if (!latest || latest.locked || latest.prunable || latest.bare || latest.head !== record.head || latest.branch !== record.branch) throw new Error("Worktree registration changed before quarantine");
          if (!await lock!.owned()) throw new Error("Cleanup lock ownership changed");
          await git(cwd, ["worktree", "move", "--", path, prepared.path]);
          await git(cwd, ["worktree", "lock", "--reason", `SuperSkill recovery manifest: ${prepared.manifest}`, "--", prepared.path]);
          return leasedOwnership;
        });
        recovery.state = "quarantined";
        await writeRecovery(recovery, identity, ownership.owners);
        result.quarantined!.push(recovery);
        if (await exists(join(recovery.path, ".superskill"))) result.archives!.push({ worktree: path, path: join(recovery.path, ".superskill") });
        result.kept.push({ path, reason: `Worktree preserved at ${recovery.path}; recovery manifest: ${recovery.manifest}; automatic deletion is disabled` });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result.errors.push({ path, reason: recovery ? `${message}; worktree data was not deleted; inspect ${recovery.worktree} and ${recovery.path}; recovery manifest: ${recovery.manifest}; rescue ref: ${recovery.rescueRef}` : message });
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
