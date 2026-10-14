// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, realpath, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { VaultFS } from "../lib/vault-fs.js";
import { createCommandContext } from "../test-helpers.js";
import { knowledgeVizCommand, resolveVizOpenTarget } from "./knowledge.js";

describe("resolveVizOpenTarget", () => {
  let vaultRoot: string;
  let vaultFs: VaultFS;
  let testHome: string;
  let originalHome: string | undefined;

  beforeEach(async () => {
    originalHome = process.env.HOME;
    const rawHome = join(tmpdir(), `knowledge-home-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(rawHome, { recursive: true });
    testHome = await realpath(rawHome);
    process.env.HOME = testHome;
    vaultRoot = join(homedir(), `.knowledge-vault-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(vaultRoot, { recursive: true });
    vaultFs = new VaultFS(vaultRoot);
  });

  afterEach(async () => {
    await rm(vaultRoot, { recursive: true, force: true });
    await rm(testHome, { recursive: true, force: true });
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
  });

  it("prefers the project context note when it exists", async () => {
    await mkdir(join(vaultRoot, "projects", "p"), { recursive: true });
    await writeFile(join(vaultRoot, "projects", "p", "context.md"), "# Context\n");
    await writeFile(join(vaultRoot, "projects", "p", "index.md"), "# Dashboard\n");
    await expect(
      resolveVizOpenTarget(vaultFs, "p", ["projects/p/architecture/high-level-architecture.md"]),
    ).resolves.toBe("projects/p/context.md");
  });

  it("prefers the generated dashboard when context.md is missing", async () => {
    await mkdir(join(vaultRoot, "projects", "p"), { recursive: true });
    await writeFile(join(vaultRoot, "projects", "p", "index.md"), "# Dashboard\n");
    await expect(
      resolveVizOpenTarget(vaultFs, "p", ["projects/p/architecture/high-level-architecture.md"]),
    ).resolves.toBe("projects/p/index.md");
  });

  it("falls back to the first generated note when context.md and index.md are missing", async () => {
    await expect(
      resolveVizOpenTarget(vaultFs, "p", ["projects/p/architecture/high-level-architecture.md"]),
    ).resolves.toBe("projects/p/architecture/high-level-architecture.md");
  });

  it("returns null when there is nothing to open", async () => {
    await expect(resolveVizOpenTarget(vaultFs, "p", [])).resolves.toBeNull();
  });

  it("refuses to scan a workspace mapped to another explicitly selected project", async () => {
    const workspacePath = join(testHome, "other-repo");
    await mkdir(workspacePath);
    await vaultFs.write("project-map.json", JSON.stringify({ [workspacePath]: "other" }));
    const ctx = createCommandContext(vaultFs, { projectSlug: "p", workspacePath });
    await expect(knowledgeVizCommand({ project: "p" }, ctx)).rejects.toThrow(/does not match/);
    expect(await vaultFs.exists("projects/p/index.md")).toBe(false);
  });

  it("does not allow an explicit project to override a denied context", async () => {
    const ctx = createCommandContext(vaultFs, { projectSlug: null, workspacePath: testHome });
    await expect(knowledgeVizCommand({ project: "p" }, ctx)).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
  });

  it("does not allow an explicit project to override the VaultFS project jail", async () => {
    const scoped = new VaultFS(vaultRoot, { projectSlug: "other" });
    const ctx = createCommandContext(scoped, { workspacePath: testHome });
    await expect(knowledgeVizCommand({ project: "p" }, ctx)).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
  });

  it("refuses an unmapped workspace before writing any generated notes", async () => {
    const workspacePath = join(testHome, "unmapped-repo");
    await mkdir(workspacePath);
    const ctx = createCommandContext(vaultFs, { projectSlug: "p", workspacePath });
    await expect(knowledgeVizCommand({ project: "p" }, ctx)).rejects.toThrow(/not mapped/);
    expect(await vaultFs.exists("projects/p/index.md")).toBe(false);
  });

  it("generates notes from the mapped workspace rather than process cwd", async () => {
    const workspacePath = join(testHome, "mapped-repo");
    await mkdir(workspacePath);
    await writeFile(join(workspacePath, "one.ts"), "export const one = 1;\n");
    await vaultFs.write("project-map.json", JSON.stringify({ [workspacePath]: "p" }));
    const ctx = createCommandContext(vaultFs, { projectSlug: "p", workspacePath });
    const result = await knowledgeVizCommand({ project: "p" }, ctx);
    expect(result.code_notes).toEqual({ written: 1, removed: 0, total: 1, skipped: 0 });
    expect(await vaultFs.read("projects/p/code/one.ts.md")).toContain("export const one = 1;");
  });
});
