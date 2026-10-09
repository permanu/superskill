import { realpath, stat } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { validateProjectSlug } from "../config.js";
import { detectProject } from "./project-detector.js";

export class WorkspaceNotMappedError extends Error {
  constructor() {
    super("workspace_path is not mapped to a SuperSkill project; register the workspace first");
    this.name = "WorkspaceNotMappedError";
  }
}

const execFileAsync = promisify(execFile);

async function gitOutput(cwd: string, args: string[]): Promise<string | null> {
  try {
    return (await execFileAsync("git", args, { cwd, timeout: 3000, maxBuffer: 1024 * 1024 })).stdout;
  } catch {
    return null;
  }
}

async function mappedPrimaryProject(checkout: string, vaultPath: string): Promise<string | null> {
  const commonOutput = await gitOutput(checkout, ["rev-parse", "--path-format=absolute", "--git-common-dir"]);
  const worktrees = await gitOutput(checkout, ["worktree", "list", "--porcelain", "-z"]);
  if (!commonOutput || !worktrees) return null;
  const common = await realpath(commonOutput.trim());
  for (const record of worktrees.split("\0\0")) {
    const path = record.split("\0").find(line => line.startsWith("worktree "))?.slice(9);
    if (!path) continue;
    const dir = await gitOutput(path, ["rev-parse", "--absolute-git-dir"]);
    if (!dir) continue;
    if (await realpath(dir.trim()) !== common) continue;
    return detectProject(await realpath(path), vaultPath);
  }
  return null;
}

export async function resolveWorkspaceContext(
  vaultPath: string,
  workspacePath: string,
  explicitSlug?: string,
): Promise<{ workspacePath: string; projectSlug: string }> {
  if (typeof workspacePath !== "string" || !isAbsolute(workspacePath)) {
    throw new Error("workspace_path must be an absolute existing directory");
  }
  let canonical: string;
  try {
    canonical = await realpath(workspacePath);
    if (!(await stat(canonical)).isDirectory()) throw new Error("not a directory");
  } catch {
    throw new Error("workspace_path must be an absolute existing directory");
  }
  if (explicitSlug !== undefined && explicitSlug !== "") validateProjectSlug(explicitSlug);
  let projectSlug = await detectProject(canonical, vaultPath);
  const rootOutput = await gitOutput(canonical, ["rev-parse", "--show-toplevel"]);
  if (rootOutput) {
    const checkout = await realpath(rootOutput.trim());
    const checkoutProject = (checkout === canonical ? projectSlug : await detectProject(checkout, vaultPath)) ?? await mappedPrimaryProject(checkout, vaultPath);
    if (projectSlug && checkoutProject !== projectSlug) {
      throw new Error("workspace_path checkout root crosses a registered project boundary");
    }
    projectSlug = checkoutProject;
    canonical = checkout;
  }
  if (!projectSlug) throw new WorkspaceNotMappedError();
  validateProjectSlug(projectSlug);
  if (explicitSlug && explicitSlug !== projectSlug) {
    throw new Error(`Explicit project "${explicitSlug}" does not match workspace_path project "${projectSlug}"`);
  }
  return { workspacePath: canonical, projectSlug };
}
