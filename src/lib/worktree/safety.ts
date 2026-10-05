// SPDX-License-Identifier: Apache-2.0
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { createReadStream, existsSync, realpathSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const GIT_TIMEOUT_MS = 5000;
const GIT_MAX_BUFFER = 16 * 1024 * 1024;
const IGNORED_FILE_CAP = 200;

export interface WorktreeInfo {
  path: string;
  head: string | null;
  branch: string | null;
  detached: boolean;
  bare: boolean;
  locked: boolean;
  lockReason: string | null;
  prunable: boolean;
  prunableReason: string | null;
}

export interface WorktreeSafetyVerdict {
  worktree: string;
  dirty: boolean;
  untracked: boolean;
  ignoredFiles: string[];
  ignoredTruncated: boolean;
  unpushedCommits: number;
  stashCount: number;
  inProgressOps: string[];
  locked: boolean;
  hasSubmodules: boolean;
  safeToReclaimLocalCaches: boolean;
  reasons: string[];
}

export const NEVER_TOUCH_RULES: string[] = [
  "Never remove, prune, or move worktrees.",
  "Never touch dirty, untracked, or ignored files that are not recorded in a manifest.",
  "Stashes are repo-global: a stash created in another worktree belongs to the same repository.",
  "Never delete unpushed commits (commits not present on any remote).",
  "Never run git clean, git reset, or git checkout -f.",
  "Never touch .env files, databases, or patch files.",
  "When state is unknown, keep it: skipping is always safer than deleting.",
];

const GIT_OPERATION_PATHS: Array<{ name: string; op: string }> = [
  { name: "MERGE_HEAD", op: "merge" },
  { name: "CHERRY_PICK_HEAD", op: "cherry-pick" },
  { name: "REVERT_HEAD", op: "revert" },
  { name: "rebase-merge", op: "rebase-merge" },
  { name: "rebase-apply", op: "rebase-apply" },
  { name: "BISECT_LOG", op: "bisect" },
];

interface GitResult {
  ok: boolean;
  stdout: string;
  code?: string | number;
}

async function git(cwd: string, args: string[]): Promise<GitResult> {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd,
      timeout: GIT_TIMEOUT_MS,
      maxBuffer: GIT_MAX_BUFFER,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0" },
    });
    return { ok: true, stdout };
  } catch (err) {
    const error = err as NodeJS.ErrnoException & { killed?: boolean; signal?: string | null };
    if (error.code === "ENOENT" || error.code === "EACCES" || error.killed) {
      const reason =
        error.code === "ENOENT"
          ? "git not found"
          : error.code === "EACCES"
            ? "permission denied"
            : (error.signal ?? "killed");
      console.error(`[worktree-safety] git ${args[0] ?? ""} failed in ${cwd}: ${reason}`);
    }
    return { ok: false, stdout: "", code: error.code };
  }
}

function porcelainFields(output: string): string[] {
  return output.split("\0").filter((field) => field.length > 0);
}

function samePath(a: string, b: string): boolean {
  const resolvedA = resolve(a);
  const resolvedB = resolve(b);
  if (resolvedA === resolvedB) return true;
  try {
    return realpathSync(resolvedA) === realpathSync(resolvedB);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      console.error(`[worktree-safety] cannot resolve ${resolvedA} / ${resolvedB}: ${code ?? String(err)}`);
    }
    return false;
  }
}

export async function listWorktrees(repoRoot: string): Promise<WorktreeInfo[]> {
  const result = await git(repoRoot, ["worktree", "list", "--porcelain", "-z"]);
  if (!result.ok) {
    if (result.code !== "ENOENT") {
      console.error(
        `[worktree-safety] git worktree list failed in ${repoRoot}: ${result.code ?? "unknown"}`,
      );
    }
    return [];
  }
  const worktrees: WorktreeInfo[] = [];
  let current: WorktreeInfo | null = null;
  for (const field of porcelainFields(result.stdout)) {
    const space = field.indexOf(" ");
    const key = space === -1 ? field : field.slice(0, space);
    const value = space === -1 ? "" : field.slice(space + 1);
    if (key === "worktree") {
      if (current) worktrees.push(current);
      current = {
        path: value,
        head: null,
        branch: null,
        detached: false,
        bare: false,
        locked: false,
        lockReason: null,
        prunable: false,
        prunableReason: null,
      };
      continue;
    }
    if (!current) continue;
    switch (key) {
      case "HEAD":
        current.head = value.length > 0 ? value : null;
        break;
      case "branch":
        current.branch = value.length > 0 ? value : null;
        break;
      case "detached":
        current.detached = true;
        break;
      case "bare":
        current.bare = true;
        break;
      case "locked":
        current.locked = true;
        current.lockReason = value.length > 0 ? value : null;
        break;
      case "prunable":
        current.prunable = true;
        current.prunableReason = value.length > 0 ? value : null;
        break;
    }
  }
  if (current) worktrees.push(current);
  return worktrees;
}

export async function auditWorktreeSafety(worktreePath: string): Promise<WorktreeSafetyVerdict> {
  const [trackedStatus, allStatus, ignoredResult, unpushedResult, stashResult, worktrees] = await Promise.all([
    git(worktreePath, ["status", "--porcelain", "-z", "--untracked-files=no"]),
    git(worktreePath, ["status", "--porcelain", "-z", "-uall", "--ignored=no"]),
    git(worktreePath, ["ls-files", "-o", "-i", "--exclude-standard", "-z"]),
    git(worktreePath, ["rev-list", "--all", "--not", "--remotes", "--count"]),
    git(worktreePath, ["stash", "list"]),
    listWorktrees(worktreePath),
  ]);

  const statusReadable = trackedStatus.ok && allStatus.ok && ignoredResult.ok;
  const dirty = trackedStatus.ok && porcelainFields(trackedStatus.stdout).length > 0;
  const untracked = allStatus.ok && porcelainFields(allStatus.stdout).some((entry) => entry.startsWith("??"));

  const allIgnored = ignoredResult.ok ? porcelainFields(ignoredResult.stdout) : [];
  const ignoredTruncated = allIgnored.length > IGNORED_FILE_CAP;
  const ignoredFiles = allIgnored.slice(0, IGNORED_FILE_CAP);

  const parsedUnpushed = Number.parseInt(unpushedResult.stdout.trim(), 10);
  const unpushedCommits = unpushedResult.ok && Number.isFinite(parsedUnpushed) ? parsedUnpushed : 0;

  const stashCount = stashResult.ok
    ? stashResult.stdout.split("\n").filter((line) => line.trim().length > 0).length
    : 0;

  const operationChecks = await Promise.all(
    GIT_OPERATION_PATHS.map(async ({ name, op }): Promise<string | null> => {
      const resolved = await git(worktreePath, ["rev-parse", "--git-path", name]);
      if (!resolved.ok) return null;
      const raw = resolved.stdout.trim();
      if (raw.length === 0) return null;
      const abs = isAbsolute(raw) ? raw : resolve(worktreePath, raw);
      return existsSync(abs) ? op : null;
    }),
  );
  const inProgressOps = operationChecks.filter((op): op is string => op !== null);

  const info = worktrees.find((wt) => samePath(wt.path, worktreePath)) ?? null;
  const locked = info?.locked ?? false;

  const hasGitmodules = existsSync(join(worktreePath, ".gitmodules"));
  const submoduleResult = hasGitmodules ? await git(worktreePath, ["submodule", "status"]) : null;
  const hasSubmodules = hasGitmodules && submoduleResult !== null && submoduleResult.stdout.trim().length > 0;

  const safeToReclaimLocalCaches =
    statusReadable &&
    !dirty &&
    !untracked &&
    ignoredFiles.length === 0 &&
    !ignoredTruncated &&
    inProgressOps.length === 0 &&
    !hasSubmodules;

  const reasons: string[] = [];
  if (!statusReadable) reasons.push("worktree status could not be read; treat as unsafe");
  if (!ignoredResult.ok) reasons.push("ignored-file listing failed; treat as unsafe");
  if (dirty) reasons.push("tracked changes present (dirty worktree)");
  if (untracked) reasons.push("untracked non-ignored files present");
  if (ignoredFiles.length > 0) {
    reasons.push(`ignored files present: ${ignoredFiles.length}${ignoredTruncated ? "+ (truncated)" : ""}`);
  }
  if (unpushedCommits > 0) reasons.push(`unpushed commits: ${unpushedCommits}`);
  if (stashCount > 0) {
    reasons.push(`stashes present: ${stashCount} (stashes are repo-global and shared across worktrees)`);
  }
  if (inProgressOps.length > 0) reasons.push(`in-progress operations: ${inProgressOps.join(", ")}`);
  if (locked) reasons.push(`worktree locked${info?.lockReason ? `: ${info.lockReason}` : ""}`);
  if (hasSubmodules) reasons.push("submodules present");
  reasons.push(`never-touch: ${NEVER_TOUCH_RULES.join("; ")}`);

  return {
    worktree: worktreePath,
    dirty,
    untracked,
    ignoredFiles,
    ignoredTruncated,
    unpushedCommits,
    stashCount,
    inProgressOps,
    locked,
    hasSubmodules,
    safeToReclaimLocalCaches,
    reasons,
  };
}

export function isPathInside(child: string, parent: string): boolean {
  const rel = relative(resolve(parent), resolve(child));
  return rel.length > 0 && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

export async function hashFile(path: string): Promise<{ sha256: string; size: number }> {
  const hash = createHash("sha256");
  let size = 0;
  for await (const chunk of createReadStream(path)) {
    const buffer = chunk as Buffer;
    hash.update(buffer);
    size += buffer.length;
  }
  return { sha256: hash.digest("hex"), size };
}
