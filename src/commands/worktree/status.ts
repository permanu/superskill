// SPDX-License-Identifier: Apache-2.0
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { basename, isAbsolute, resolve } from "node:path";
import { promisify } from "node:util";
import type { CommandContext } from "../../core/types.js";
import { auditRepo } from "../../lib/worktree/audit.js";
import { formatBytes } from "./audit.js";

const execFileAsync = promisify(execFile);
const HOOK_MARKER = "superskill worktree-start";
const GIT_TIMEOUT_MS = 5000;

export interface WorktreeStatusArgs {
  json?: boolean;
  budget?: string;
}

export interface WorktreeStatusResult {
  repoId: string;
  repoRoot: string;
  stacks: string[];
  worktrees: Array<{ path: string; name: string; safe: boolean; reasons: string[] }>;
  cache: { dirs: number; bytes: number | null };
  policy: { installed: boolean; hookInstalled: boolean | null; hosts: string[] };
  budget: { limitBytes: number; usedBytes: number | null; exceeded: boolean } | null;
  notes: string[];
}

export function parseSize(input: string): number | null {
  const match = /^\s*(\d+(?:\.\d+)?)\s*([kmgt]?)(?:i?b)?\s*$/i.exec(input);
  if (!match) return null;
  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value)) return null;
  const unit = match[2].toLowerCase();
  const multiplier =
    unit === "k" ? 1024 : unit === "m" ? 1024 ** 2 : unit === "g" ? 1024 ** 3 : unit === "t" ? 1024 ** 4 : 1;
  return Math.round(value * multiplier);
}

async function checkHookInstalled(worktreeRoot: string): Promise<boolean | null> {
  let stdout: string;
  try {
    const result = await execFileAsync("git", ["rev-parse", "--git-path", "hooks/post-checkout"], {
      cwd: worktreeRoot,
      timeout: GIT_TIMEOUT_MS,
      encoding: "utf-8",
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0" },
    });
    stdout = result.stdout;
  } catch (err) {
    const code = String((err as NodeJS.ErrnoException).code ?? "");
    if (code !== "ENOENT" && code !== "128") {
      console.error(`[worktree-status] cannot resolve hook path in ${worktreeRoot}: ${code || String(err)}`);
    }
    return null;
  }

  const candidates = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (candidates.length === 0) return false;

  let unreadable = false;
  for (const candidate of candidates) {
    const hookPath = isAbsolute(candidate) ? candidate : resolve(worktreeRoot, candidate);
    try {
      const content = await readFile(hookPath, "utf-8");
      if (content.includes(HOOK_MARKER)) return true;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") continue;
      console.error(`[worktree-status] cannot read hook ${hookPath}: ${code ?? String(err)}`);
      unreadable = true;
    }
  }
  return unreadable ? null : false;
}

function resolveBudget(
  raw: string | undefined,
  usedBytes: number | null,
): WorktreeStatusResult["budget"] {
  if (raw === undefined || raw.trim() === "") return null;
  const limitBytes = parseSize(raw);
  if (limitBytes === null) return null;
  return { limitBytes, usedBytes, exceeded: usedBytes !== null && usedBytes > limitBytes };
}

export async function worktreeStatusCommand(
  args: WorktreeStatusArgs,
  ctx: CommandContext,
): Promise<WorktreeStatusResult> {
  const audit = await auditRepo((ctx.workspacePath ?? process.cwd()), { includeSizes: true });
  const hookInstalled = await checkHookInstalled(audit.mainWorktree);

  const worktrees = audit.worktrees.map((entry) => ({
    path: entry.info.path,
    name: basename(entry.info.path),
    safe: entry.verdict.safeToReclaimLocalCaches,
    reasons: entry.verdict.reasons,
  }));
  const dirs = audit.worktrees.reduce((sum, entry) => sum + entry.cacheDirs.length, 0);
  const cache = { dirs, bytes: audit.summary.cacheBytes };
  const policy = {
    installed: audit.policy !== null,
    hookInstalled,
    hosts: audit.policy?.hosts ?? [],
  };
  const budget = resolveBudget(args.budget, cache.bytes);

  const notes = [...audit.notes];
  if (args.budget !== undefined && args.budget.trim() !== "" && budget === null) {
    notes.push(`invalid budget value: ${args.budget}`);
  }
  if (budget?.exceeded) {
    notes.push(`cache usage ${formatBytes(cache.bytes)} exceeds budget ${formatBytes(budget.limitBytes)}`);
  }

  ctx.log.debug(`[worktree-status] audited ${worktrees.length} worktree(s) in ${audit.repoRoot}`);
  return {
    repoId: audit.repoId,
    repoRoot: audit.repoRoot,
    stacks: audit.stacks,
    worktrees,
    cache,
    policy,
    budget,
    notes,
  };
}

function hookLabel(hookInstalled: boolean | null): string {
  if (hookInstalled === null) return "unknown";
  return hookInstalled ? "installed" : "not installed";
}

export function renderWorktreeStatus(result: WorktreeStatusResult): string {
  const lines: string[] = [];
  lines.push(`Worktree status: ${result.repoId}`);
  lines.push(`  repo root: ${result.repoRoot}`);
  lines.push(`  stacks: ${result.stacks.join(", ") || "unknown"}`);
  lines.push("");
  lines.push(`Worktrees (${result.worktrees.length}):`);
  if (result.worktrees.length === 0) lines.push("  (none)");
  for (const entry of result.worktrees) {
    lines.push(`  ${entry.safe ? "[safe]" : "[unsafe]"} ${entry.path} (${entry.name})`);
    for (const reason of entry.reasons) lines.push(`    - ${reason}`);
  }
  lines.push("");
  lines.push(`Cache: ${result.cache.dirs} dir(s), ${formatBytes(result.cache.bytes)}`);
  lines.push(
    `Policy: ${result.policy.installed ? "installed" : "not installed"}; ` +
      `hook: ${hookLabel(result.policy.hookInstalled)}; ` +
      `hosts: ${result.policy.hosts.join(", ") || "none"}`,
  );
  if (result.budget) {
    const exceeded = result.budget.exceeded ? " — budget exceeded" : "";
    lines.push(
      `Budget: limit ${formatBytes(result.budget.limitBytes)}, used ${formatBytes(result.budget.usedBytes)}${exceeded}`,
    );
  } else {
    lines.push("Budget: none");
  }
  if (result.notes.length > 0) {
    lines.push("");
    lines.push("Notes:");
    for (const note of result.notes) lines.push(`  - ${note}`);
  }
  return lines.join("\n");
}
