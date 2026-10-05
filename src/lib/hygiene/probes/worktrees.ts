// SPDX-License-Identifier: Apache-2.0
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { basename, resolve } from "node:path";
import { promisify } from "node:util";
import { probeDirSize } from "../../worktree/audit.js";
import { hashId } from "../../worktree/paths.js";
import { isPathInside } from "../../worktree/safety.js";
import { quoteShell } from "../shell.js";
import type {
  HygieneItem,
  HygieneProbe,
  HygieneProbeOptions,
  HygieneProbeResult,
} from "../types.js";

const execFileAsync = promisify(execFile);

const REPO_CAP = 50;
const LIVE_ITEM_CAP = 100;
const ITEM_CAP = 120;
const MAX_BUFFER = 16 * 1024 * 1024;
const REV_PARSE_TIMEOUT_MS = 5000;
const LIST_TIMEOUT_MS = 10_000;
const WORKTREE_TIMEOUT_MS = 15_000;
const MS_PER_DAY = 86_400_000;

export type WorktreeExec = (
  cmd: string,
  args: string[],
  opts: { timeout: number; maxBuffer: number },
) => Promise<{ stdout: string; stderr?: string }>;

export interface WorktreesProbeDeps {
  exec?: WorktreeExec;
}

export interface ParsedWorktree {
  path: string;
  head?: string;
  branch?: string;
  detached: boolean;
  locked: boolean;
  prunable: boolean;
}

interface GitRun {
  ok: boolean;
  stdout: string;
  stderr: string;
  code?: string | number;
  killed: boolean;
}

interface LiveProbe {
  dirtyFiles: number | null;
  unpushed: number | null;
  ageDays: number | null;
  ignoredFiles: number | null;
}

const defaultExec: WorktreeExec = async (cmd, args, opts) => {
  const result = await execFileAsync(cmd, args, {
    ...opts,
    encoding: "utf-8",
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0" },
  });
  return { stdout: result.stdout, stderr: result.stderr };
};

function toText(value: string | Buffer | undefined): string {
  if (value === undefined) return "";
  return typeof value === "string" ? value : value.toString("utf-8");
}

async function runGit(exec: WorktreeExec, args: string[], timeout: number): Promise<GitRun> {
  try {
    const result = await exec("git", args, { timeout, maxBuffer: MAX_BUFFER });
    return { ok: true, stdout: result.stdout ?? "", stderr: result.stderr ?? "", killed: false };
  } catch (err) {
    const error = err as {
      code?: string | number;
      killed?: boolean;
      stdout?: string | Buffer;
      stderr?: string | Buffer;
    };
    return {
      ok: false,
      stdout: toText(error.stdout),
      stderr: toText(error.stderr),
      code: error.code,
      killed: error.killed === true,
    };
  }
}

function isSilentCode(code: string | number | undefined): boolean {
  return code === "ENOENT" || code === "ENOTDIR" || code === "EACCES";
}

function failureDetail(run: GitRun): string {
  if (run.killed) return "timed out";
  if (typeof run.code === "number") return `exit ${run.code}`;
  if (typeof run.code === "string") return run.code;
  return "unknown error";
}

function logWorktreeGitFailure(subcommand: string, path: string, run: GitRun): void {
  if (run.ok || isSilentCode(run.code)) return;
  if (typeof run.code === "number") {
    console.error(`[hygiene-worktrees] git ${subcommand} failed in ${path} (exit ${run.code})`);
    return;
  }
  console.error(`[hygiene-worktrees] git ${subcommand} failed in ${path}: ${failureDetail(run)}`);
}

function logCommandFailure(context: string, run: GitRun): void {
  if (run.ok || isSilentCode(run.code)) return;
  console.error(`[hygiene-worktrees] ${context}: ${failureDetail(run)}`);
}

function errorDetail(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function countNonEmptyLines(output: string): number {
  let count = 0;
  for (const line of output.split("\n")) {
    if (line.trim().length > 0) count += 1;
  }
  return count;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function parseWorktreeListPorcelain(stdout: string): ParsedWorktree[] {
  const entries: ParsedWorktree[] = [];
  let current: ParsedWorktree | null = null;
  const flush = (): void => {
    if (current) {
      entries.push(current);
      current = null;
    }
  };
  for (const raw of stdout.split("\n")) {
    const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
    if (line.trim().length === 0) {
      flush();
      continue;
    }
    if (line.startsWith("worktree ")) {
      flush();
      current = {
        path: line.slice("worktree ".length),
        detached: false,
        locked: false,
        prunable: false,
      };
      continue;
    }
    if (current === null) continue;
    if (line.startsWith("HEAD ")) {
      current.head = line.slice("HEAD ".length);
    } else if (line.startsWith("branch ")) {
      current.branch = line.slice("branch ".length);
    } else if (line === "detached") {
      current.detached = true;
    } else if (line === "locked" || line.startsWith("locked ")) {
      current.locked = true;
    } else if (line === "prunable" || line.startsWith("prunable ")) {
      current.prunable = true;
    }
  }
  flush();
  return entries;
}

export function parsePruneDryRun(stdout: string, stderr?: string): string[] {
  const paths: string[] = [];
  const seen = new Set<string>();
  for (const raw of `${stdout}\n${stderr ?? ""}`.split("\n")) {
    const line = raw.trim();
    if (!line.startsWith("Removing ")) continue;
    const rest = line.slice("Removing ".length).trim();
    if (rest.length === 0) continue;
    const colon = rest.indexOf(": ");
    const reported = (colon === -1 ? rest : rest.slice(0, colon)).trim();
    if (reported.length === 0) continue;
    const path =
      reported.startsWith('"') && reported.endsWith('"') && reported.length > 1
        ? reported.slice(1, -1)
        : reported;
    if (seen.has(path)) continue;
    seen.add(path);
    paths.push(path);
  }
  return paths;
}

async function probeLiveWorktree(
  exec: WorktreeExec,
  opts: HygieneProbeOptions,
  path: string,
): Promise<LiveProbe> {
  const [status, unpushed, log, clean] = await Promise.all([
    runGit(exec, ["-C", path, "status", "--porcelain"], WORKTREE_TIMEOUT_MS),
    runGit(exec, ["-C", path, "rev-list", "--count", "HEAD", "--not", "--remotes"], WORKTREE_TIMEOUT_MS),
    runGit(exec, ["-C", path, "log", "-1", "--format=%ct"], WORKTREE_TIMEOUT_MS),
    runGit(exec, ["-C", path, "clean", "-nxd"], WORKTREE_TIMEOUT_MS),
  ]);
  logWorktreeGitFailure("status", path, status);
  logWorktreeGitFailure("rev-list", path, unpushed);
  logWorktreeGitFailure("log", path, log);
  logWorktreeGitFailure("clean", path, clean);

  const dirtyFiles = status.ok ? countNonEmptyLines(status.stdout) : null;
  const parsedUnpushed = unpushed.ok ? Number.parseInt(unpushed.stdout.trim(), 10) : Number.NaN;
  const parsedSeconds = log.ok ? Number.parseInt(log.stdout.trim(), 10) : Number.NaN;
  return {
    dirtyFiles,
    unpushed: Number.isFinite(parsedUnpushed) ? parsedUnpushed : null,
    ageDays: Number.isFinite(parsedSeconds)
      ? round1((opts.now - parsedSeconds * 1000) / MS_PER_DAY)
      : null,
    ignoredFiles: clean.ok ? countNonEmptyLines(clean.stdout) : null,
  };
}

function buildLiveItem(
  opts: HygieneProbeOptions,
  repo: string,
  wt: ParsedWorktree,
  probe: LiveProbe,
  bytes: number | null,
): HygieneItem {
  const tempDir = isPathInside(wt.path, tmpdir());
  const branch = wt.branch?.replace(/^refs\/heads\//, "") ?? "";
  const label = branch.length > 0 ? branch : basename(wt.path);
  const minAge = opts.policy.worktreeStaleMinAgeDays;
  const due =
    !tempDir &&
    probe.dirtyFiles === 0 &&
    probe.unpushed === 0 &&
    probe.ageDays !== null &&
    probe.ageDays >= minAge &&
    !wt.locked &&
    probe.ignoredFiles === 0;

  let reason: string;
  if (tempDir) reason = "lives under a temp dir; harness may own it";
  else if (wt.locked) reason = "locked";
  else if (probe.dirtyFiles === null) reason = "status unavailable";
  else if (probe.dirtyFiles > 0) reason = "has uncommitted changes";
  else if (probe.unpushed === null) reason = "unpushed commit count unavailable";
  else if (probe.unpushed > 0) reason = `has ${probe.unpushed} unpushed commit(s)`;
  else if (probe.ageDays === null) reason = "age unavailable";
  else if (probe.ageDays < minAge) reason = `younger than ${minAge}d`;
  else if (probe.ignoredFiles === null) {
    reason = `clean, fully pushed, idle ${probe.ageDays}d; ignored-file check unavailable`;
  } else if (probe.ignoredFiles > 0) {
    reason = "contains ignored/untracked files that removal would delete";
  } else reason = `clean, fully pushed, idle ${probe.ageDays}d`;

  return {
    id: `worktrees:${hashId(wt.path)}`,
    category: "worktrees",
    title: `Stale worktree ${label}`,
    path: wt.path,
    bytes,
    ageDays: probe.ageDays,
    tier: tempDir ? "review" : "consent",
    due,
    reason,
    plan: due ? `git -C ${quoteShell(repo)} worktree remove ${quoteShell(wt.path)}` : null,
    meta: {
      repo,
      branch,
      dirtyFiles: probe.dirtyFiles ?? "unavailable",
      unpushed: probe.unpushed ?? "unknown",
      ignoredFiles: probe.ignoredFiles ?? "unavailable",
      tempDir,
    },
  };
}

function buildPrunableItem(repo: string, count: number): HygieneItem {
  return {
    id: `worktrees:prunable:${hashId(repo)}`,
    category: "worktrees",
    title: `Prunable worktree registrations — ${basename(repo)}`,
    path: `${repo}/.git`,
    bytes: 0,
    ageDays: null,
    tier: "consent",
    due: true,
    reason: `${count} stale registration(s); directories already gone and only git metadata remains`,
    plan: `git -C ${quoteShell(repo)} worktree prune`,
    meta: { repo, count },
  };
}

export async function runWorktreesProbe(
  opts: HygieneProbeOptions,
  deps: WorktreesProbeDeps = {},
): Promise<HygieneProbeResult> {
  const exec = deps.exec ?? defaultExec;
  const items: HygieneItem[] = [];
  const seen = new Set<string>();
  const repos: string[] = [];
  for (const raw of opts.repoPaths) {
    const repo = resolve(raw);
    if (seen.has(repo)) continue;
    seen.add(repo);
    repos.push(repo);
    if (repos.length >= REPO_CAP) break;
  }

  let liveCount = 0;
  for (const repo of repos) {
    if (items.length >= ITEM_CAP) break;
    try {
      const inside = await runGit(
        exec,
        ["-C", repo, "rev-parse", "--is-inside-work-tree"],
        REV_PARSE_TIMEOUT_MS,
      );
      if (!inside.ok || inside.stdout.trim() !== "true") continue;

      const prune = await runGit(
        exec,
        ["-C", repo, "worktree", "prune", "--dry-run", "-v"],
        LIST_TIMEOUT_MS,
      );
      if (!prune.ok) logCommandFailure(`git worktree prune --dry-run failed in ${repo}`, prune);
      const prunable = prune.ok ? parsePruneDryRun(prune.stdout, prune.stderr) : [];
      if (prunable.length > 0 && items.length < ITEM_CAP) {
        items.push(buildPrunableItem(repo, prunable.length));
      }

      if (liveCount >= LIVE_ITEM_CAP || items.length >= ITEM_CAP) continue;
      const list = await runGit(exec, ["-C", repo, "worktree", "list", "--porcelain"], LIST_TIMEOUT_MS);
      if (!list.ok) {
        logCommandFailure(`git worktree list failed in ${repo}`, list);
        continue;
      }
      for (const wt of parseWorktreeListPorcelain(list.stdout).slice(1)) {
        if (items.length >= ITEM_CAP || liveCount >= LIVE_ITEM_CAP) break;
        if (wt.prunable) continue;
        const probe = await probeLiveWorktree(exec, opts, wt.path);
        const bytes = opts.sizes ? await probeDirSize(wt.path) : null;
        items.push(buildLiveItem(opts, repo, wt, probe, bytes));
        liveCount += 1;
      }
    } catch (err) {
      console.error(`[hygiene-worktrees] repo ${repo} failed: ${errorDetail(err)}`);
    }
  }

  return { category: "worktrees", label: "Git worktrees", items, skipped: null };
}

export const worktreesProbe: HygieneProbe = {
  id: "worktrees",
  run: (opts) => runWorktreesProbe(opts),
};
