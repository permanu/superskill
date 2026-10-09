import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const git = promisify(execFile);
import { invalidateProjectMapCache } from "./project-detector.js";
import { resolveWorkspaceContext } from "./workspace-context.js";

describe("explicit workspace context", () => {
  let root: string;
  let workspace: string;
  beforeEach(async () => {
    root = await realpath(await mkdtemp(join(tmpdir(), "workspace-context-")));
    workspace = join(root, "repo");
    await mkdir(workspace);
    await writeFile(join(root, "project-map.json"), JSON.stringify({ [workspace]: "repo" }));
    invalidateProjectMapCache();
  });
  afterEach(async () => { invalidateProjectMapCache(); await rm(root, { recursive: true, force: true }); });

  it("resolves the canonical workspace and its mapped project without changing cwd", async () => {
    const cwd = process.cwd();
    await symlink(workspace, join(root, "alias"));
    expect(await resolveWorkspaceContext(root, join(root, "alias"))).toEqual({ workspacePath: workspace, projectSlug: "repo" });
    expect(process.cwd()).toBe(cwd);
  });
  it("accepts matching explicit project and mapped subdirectories", async () => {
    await mkdir(join(workspace, "src"));
    expect(await resolveWorkspaceContext(root, join(workspace, "src"), "repo")).toEqual({ workspacePath: join(workspace, "src"), projectSlug: "repo" });
  });
  it("rejects relative, empty, missing and non-directory workspaces", async () => {
    for (const path of ["repo", "", join(root, "missing"), join(root, "project-map.json")]) {
      await expect(resolveWorkspaceContext(root, path)).rejects.toThrow(/workspace_path/);
    }
  });
  it("rejects unmapped workspaces and mismatched explicit projects", async () => {
    await mkdir(join(root, "unknown"));
    await expect(resolveWorkspaceContext(root, join(root, "unknown"), "repo")).rejects.toThrow(/not mapped/);
    await expect(resolveWorkspaceContext(root, workspace, "another")).rejects.toThrow(/does not match/);
    await expect(resolveWorkspaceContext(root, workspace, "bad/slug")).rejects.toThrow(/Invalid project slug/);
  });
  it("resolves an arbitrary linked checkout through verified Git primary identity", async () => {
    await git("git", ["init", workspace]);
    await mkdir(join(workspace, "src"));
    await writeFile(join(workspace, "src", "main.ts"), "export {};\n");
    await git("git", ["add", "."], { cwd: workspace });
    await git("git", ["-c", "user.name=Test", "-c", "user.email=test@example.test", "-c", "commit.gpgsign=false", "commit", "--no-verify", "-m", "fixture"], { cwd: workspace });
    const linked = join(root, "arbitrary-sibling");
    await git("git", ["worktree", "add", "-b", "fixture-linked", linked], { cwd: workspace });
    expect(await resolveWorkspaceContext(root, join(linked, "src"), "repo")).toEqual({ workspacePath: linked, projectSlug: "repo" });
    await writeFile(join(root, "project-map.json"), JSON.stringify({ [join(workspace, "src")]: "nested", [workspace]: "repo" }));
    invalidateProjectMapCache();
    await expect(resolveWorkspaceContext(root, join(workspace, "src"), "nested")).rejects.toThrow(/boundary/);
  });

});
