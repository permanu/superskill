import { afterEach, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { assessWorktreeLifecycle } from "./lifecycle.js";

const exec = promisify(execFile);
const roots: string[] = [];
async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "lifecycle-"));
  roots.push(root);
  return root;
}
async function git(root: string, ...args: string[]): Promise<void> {
  await exec("git", ["-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", "-C", root, ...args]);
}
async function repo(): Promise<string> {
  const root = await fixture();
  await git(root, "init", "-q");
  await git(root, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "--allow-empty", "-qm", "initial");
  return root;
}
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe("assessWorktreeLifecycle", { timeout: 15000 }, () => {
  it("recognizes a nonrepository without writing anything", async () => {
    const root = await fixture();
    expect(await assessWorktreeLifecycle(root)).toMatchObject({ status: "not_repo", worktreeCount: null, nextActions: [], safety: "not_assessed" });
    expect(await readdir(root)).toEqual([]);
  });

  it("reports unavailable rather than no worktrees for an inaccessible cwd", async () => {
    const root = await fixture();
    expect(await assessWorktreeLifecycle(join(root, "missing"))).toMatchObject({ status: "unavailable", worktreeCount: null, nextActions: [] });
  });

  it("assesses main checkout without creating policy or inspecting cache contents", async () => {
    const root = await repo();
    const assessment = await assessWorktreeLifecycle(root, { phase: "activation" });
    expect(assessment).toMatchObject({ status: "available", worktreeCount: 1, currentLinked: false, policyInstalled: false, safety: "not_assessed" });
    expect(assessment.nextActions.map((action) => action.tool)).toEqual(["worktree_activate", "worktree_env"]);
    expect(await readdir(root)).toEqual([".git"]);
    await expect(readFile(join(root, ".git", "superskill", "policy.json"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("recognizes nested linked checkout and recommends read-only completion previews", async () => {
    const root = await repo();
    const holder = await fixture();
    const linked = join(holder, "linked");
    await git(root, "worktree", "add", "-qb", "feature", linked);
    const policyDir = join(root, ".git", "superskill");
    await mkdir(policyDir);
    await writeFile(join(policyDir, "policy.json"), JSON.stringify({ v: 1, repoId: "test", stacks: [], activation: { hooks: true, seed: true, install: false } }));
    await mkdir(join(linked, "nested"));
    const assessment = await assessWorktreeLifecycle(join(linked, "nested"), { phase: "complete" });
    expect(assessment).toMatchObject({ status: "available", worktreeCount: 2, currentLinked: true, policyInstalled: true, safety: "not_assessed" });
    expect(assessment.nextActions.map((action) => action.tool)).toEqual(["worktree_env", "worktree_audit", "worktree_gc"]);
    expect(assessment.nextActions.find((action) => action.tool === "worktree_gc")?.args).toEqual({ apply: false });
    expect(JSON.stringify(assessment)).not.toContain("remove");
  });

  it("does not advertise an invalid policy as installed", async () => {
    const root = await repo();
    await mkdir(join(root, ".git", "superskill"));
    await writeFile(join(root, ".git", "superskill", "policy.json"), "{invalid");
    expect(await assessWorktreeLifecycle(root)).toMatchObject({ status: "available", policyInstalled: null, safety: "not_assessed" });
  });
});
