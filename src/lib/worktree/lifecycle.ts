import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { open, realpath } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { STATE_DIR_NAME } from "./paths.js";
import { isPathInside } from "./safety.js";
import { POLICY_SCHEMA_VERSION } from "./state.js";

const exec = promisify(execFile);

export interface WorktreeLifecycleAssessment {
  status: "available" | "not_repo" | "unavailable";
  worktreeCount: number | null;
  currentLinked: boolean | null;
  policyInstalled: boolean | null;
  safety: "not_assessed";
  nextActions: Array<{
    tool: "worktree_activate" | "worktree_env" | "worktree_audit" | "worktree_gc";
    reason: string;
    args?: Record<string, unknown>;
  }>;
  reason?: string;
}

async function git(cwd: string, args: string[]): Promise<string> {
  const result = await exec("git", args, {
    cwd,
    timeout: 1500,
    maxBuffer: 128 * 1024,
    encoding: "utf-8",
    env: { ...process.env, LC_ALL: "C", GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0" },
  });
  return result.stdout;
}

async function policyInstalled(commonDir: string): Promise<boolean | null> {
  let file;
  try {
    file = await open(join(commonDir, STATE_DIR_NAME, "policy.json"), constants.O_RDONLY | constants.O_NONBLOCK);
    if (!(await file.stat()).isFile()) return null;
    const buffer = Buffer.alloc(65537);
    const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
    if (bytesRead > 65536) return null;
    const value: unknown = JSON.parse(buffer.subarray(0, bytesRead).toString("utf-8"));
    if (!value || typeof value !== "object") return null;
    const policy = value as Record<string, unknown>;
    return policy.v === POLICY_SCHEMA_VERSION && typeof policy.repoId === "string" && Array.isArray(policy.stacks)
      && typeof policy.activation === "object" && policy.activation !== null && !Array.isArray(policy.activation)
      ? true : null;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code && code !== "ENOENT") console.error("[worktree-lifecycle] Policy read failed:", code);
    return code === "ENOENT" ? false : null;
  } finally {
    await file?.close();
  }
}

export async function assessWorktreeLifecycle(
  cwd: string,
  options: { phase?: "register" | "complete" | "activation" } = {},
): Promise<WorktreeLifecycleAssessment> {
  const result: WorktreeLifecycleAssessment = {
    status: "unavailable",
    worktreeCount: null,
    currentLinked: null,
    policyInstalled: null,
    safety: "not_assessed",
    nextActions: [],
  };
  try {
    const canonicalCwd = await realpath(cwd);
    const [listing, common] = await Promise.all([
      git(canonicalCwd, ["worktree", "list", "--porcelain", "-z"]),
      git(canonicalCwd, ["rev-parse", "--path-format=absolute", "--git-common-dir"]),
    ]);
    const paths = listing.split("\0").filter((field) => field.startsWith("worktree ")).map((field) => resolve(field.slice(9)));
    const current = paths.map((path, index) => ({ path, index }))
      .filter(({ path }) => path === canonicalCwd || isPathInside(canonicalCwd, path))
      .sort((a, b) => b.path.length - a.path.length)[0];
    if (!current || paths.length === 0 || !common.trim()) {
      return { ...result, reason: "Current checkout could not be matched to the Git worktree inventory." };
    }
    result.status = "available";
    result.worktreeCount = paths.length;
    result.currentLinked = current.index !== 0;
    result.policyInstalled = await policyInstalled(common.replace(/\r?\n$/, ""));
    if (result.policyInstalled === false) {
      result.nextActions.push({ tool: "worktree_activate", reason: "Shared-cache setup has not been activated for this repository." });
    } else if (result.policyInstalled === null) {
      result.reason = "Worktree policy could not be verified; inventory does not establish cache or cleanup safety.";
    }
    result.nextActions.push({ tool: "worktree_env", reason: "Resolve this checkout's cache environment before dependency installation or builds." });
    if (options.phase === "complete" && paths.length > 1) {
      result.nextActions.push(
        { tool: "worktree_audit", reason: "Multiple worktrees remain; review their state and cache duplication.", args: { sizes: false } },
        { tool: "worktree_gc", reason: "Preview managed-cache maintenance after this session; no worktree cleanup is authorized.", args: { apply: false } },
      );
    }
    return result;
  } catch (error) {
    const failed = error as NodeJS.ErrnoException & { stderr?: string };
    if (typeof failed.stderr === "string" && failed.stderr.includes("not a git repository")) {
      return { ...result, status: "not_repo" };
    }
    if (failed.code !== "ENOENT") console.error("[worktree-lifecycle] Inventory failed:", failed.code ?? "unknown");
    return { ...result, status: "unavailable", reason: "Worktree inventory unavailable; no maintenance action was taken." };
  }
}
