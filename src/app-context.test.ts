// SPDX-License-Identifier: Apache-2.0
import { afterEach, describe, it, expect, vi } from "vitest";
import { createScopedCtx } from "./app-context.js";
import * as workspace from "./lib/workspace-context.js";
import * as projectDetector from "./lib/project-detector.js";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

afterEach(() => vi.restoreAllMocks());

describe("createScopedCtx", () => {
  it("fails closed when project resolution fails", async () => {
    const ctx = await createScopedCtx("invalid/slug");

    expect(ctx.projectSlug).toBeNull();
    expect(ctx.vaultFs.projectSlug).toBeNull();
    await expect(ctx.vaultFs.read("projects/other/context.md")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    await expect(ctx.vaultFs.read("project-map.json")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
  });

  it("scopes the vault to the resolved project slug", async () => {
    const ctx = await createScopedCtx("my-project");

    expect(ctx.projectSlug).toBe("my-project");
    expect(ctx.vaultFs.projectSlug).toBe("my-project");
    await expect(ctx.vaultFs.read("projects/other/context.md")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
  });

  it("returns the unscoped vault for tools that do not resolve a project", async () => {
    const ctx = await createScopedCtx(undefined, "skill_remove");

    expect(ctx.projectSlug).toBeUndefined();
    expect(ctx.vaultFs.projectSlug).toBeUndefined();
  });

  it("uses explicit workspace resolution to scope the vault and carry workspace context", async () => {
    const resolver = vi.spyOn(workspace, "resolveWorkspaceContext").mockResolvedValue({ workspacePath: "/canonical/repo", projectSlug: "workspace-project" });
    const ctx = await createScopedCtx("workspace-project", "superskill", "/alias/repo");
    expect(resolver).toHaveBeenCalledWith(ctx.vaultPath, "/alias/repo", "workspace-project");
    expect(ctx.workspacePath).toBe("/canonical/repo");
    expect(ctx.projectSlug).toBe("workspace-project");
    expect(ctx.vaultFs.projectSlug).toBe("workspace-project");
  });

  it("rejects explicit workspace resolution failures without falling back to cwd", async () => {
    vi.spyOn(workspace, "resolveWorkspaceContext").mockRejectedValue(new Error("workspace_path is not mapped"));
    await expect(createScopedCtx(undefined, "superskill", "/unmapped")).rejects.toThrow(/not mapped/);
  });

  it.each(["knowledge_viz", "graph_traverse", "superskill", "watchdog"])("validates explicit project against cwd for %s", async (tool) => {
    const resolver = vi.spyOn(workspace, "resolveWorkspaceContext").mockRejectedValue(new Error("Explicit project does not match workspace_path project"));
    await expect(createScopedCtx("other-project", tool)).rejects.toThrow(/does not match/);
    expect(resolver).toHaveBeenCalledWith(expect.any(String), process.cwd(), "other-project");
  });

  it("carries the canonical workspace for an explicit workspace-backed project", async () => {
    vi.spyOn(workspace, "resolveWorkspaceContext").mockResolvedValue({ workspacePath: "/canonical/checkout", projectSlug: "my-project" });
    expect(await createScopedCtx("my-project", "knowledge_viz")).toMatchObject({ projectSlug: "my-project", workspacePath: "/canonical/checkout" });
  });

  it("preserves explicit project read-only access without borrowing cwd source", async () => {
    const resolver = vi.spyOn(workspace, "resolveWorkspaceContext");
    const ctx = await createScopedCtx("my-project", "project_context");
    expect(ctx.projectSlug).toBe("my-project");
    expect(ctx.workspacePath).toBeUndefined();
    expect(resolver).not.toHaveBeenCalled();
  });

  it("retains unscoped tool access with an explicitly validated workspace", async () => {
    vi.spyOn(workspace, "resolveWorkspaceContext").mockResolvedValue({ workspacePath: "/canonical/repo", projectSlug: "workspace-project" });
    const ctx = await createScopedCtx(undefined, "skill_remove", "/alias/repo");
    expect(ctx.workspacePath).toBe("/canonical/repo");
    expect(ctx.vaultFs.projectSlug).toBeUndefined();
  });

  it("attaches the canonical checkout root for automatically detected project contexts", async () => {
    vi.spyOn(projectDetector, "detectProject").mockResolvedValue("detected");
    const resolver = vi.spyOn(workspace, "resolveWorkspaceContext").mockResolvedValue({ workspacePath: "/canonical/checkout", projectSlug: "detected" });
    const ctx = await createScopedCtx(undefined, "superskill");
    expect(resolver).toHaveBeenCalledWith(ctx.vaultPath, process.cwd(), "detected");
    expect(ctx.projectSlug).toBe("detected");
    expect(ctx.workspacePath).toBe("/canonical/checkout");
  });

  it("resolves unmapped linked CWD through Git identity and fails closed on boundary errors", async () => {
    vi.spyOn(projectDetector, "detectProject").mockResolvedValue(null);
    const resolver = vi.spyOn(workspace, "resolveWorkspaceContext").mockResolvedValue({ workspacePath: "/linked/checkout", projectSlug: "primary-project" });
    const linked = await createScopedCtx(undefined, "superskill");
    expect(linked.projectSlug).toBe("primary-project");
    expect(linked.workspacePath).toBe("/linked/checkout");
    resolver.mockRejectedValue(new workspace.WorkspaceNotMappedError());
    expect((await createScopedCtx(undefined, "superskill")).projectSlug).toBeNull();
    resolver.mockRejectedValue(new Error("workspace_path checkout root crosses a registered project boundary"));
    await expect(createScopedCtx(undefined, "superskill")).rejects.toThrow(/boundary/);
  });

  it("binds real watchdog MCP contexts to the checkout without restricting explicit read-only project context", async () => {
    const root = await realpath(await mkdtemp(join(tmpdir(), "watchdog-mcp-scope-")));
    const vault = join(root, "vault");
    const alpha = join(root, "alpha");
    const beta = join(root, "beta");
    try {
      for (const dir of [vault, alpha, beta]) await mkdir(dir);
      for (const dir of [alpha, beta]) await promisify(execFile)("git", ["init", "-q", dir]);
      await mkdir(join(alpha, "src"));
      const sessions = join(root, ".local", "share", "opencode", "storage", "session", "beta");
      await mkdir(sessions, { recursive: true });
      await writeFile(join(sessions, "ses_beta.json"), JSON.stringify({ id: "ses_beta", directory: beta, time: { created: 1000, updated: 2000 } }));
      await writeFile(join(vault, "project-map.json"), JSON.stringify({ [alpha]: "alpha", [beta]: "beta" }));
      vi.stubEnv("HOME", root);
      vi.stubEnv("VAULT_PATH", vault);
      vi.stubEnv("SUPERSKILL_OPENCODE_DATA", join(root, ".local", "share", "opencode"));
      vi.stubEnv("SUPERSKILL_CLAUDE_PROJECTS", join(root, "claude"));
      vi.stubEnv("SUPERSKILL_CODEX_SESSIONS", join(root, "codex"));
      const cwd = vi.spyOn(process, "cwd").mockReturnValue(join(alpha, "src"));
      vi.resetModules();
      const scoped = await import("./app-context.js");
      await expect(scoped.createScopedCtx("beta", "watchdog")).rejects.toThrow(/does not match/);
      const current = await scoped.createScopedCtx("alpha", "watchdog");
      expect(current).toMatchObject({ projectSlug: "alpha", workspacePath: alpha });
      expect(current.vaultFs.projectSlug).toBe("alpha");
      const readOnly = await scoped.createScopedCtx("beta", "project_context");
      expect(readOnly.projectSlug).toBe("beta");
      expect(readOnly.workspacePath).toBeUndefined();
      cwd.mockReturnValue(root);
      const unresolved = await scoped.createScopedCtx(undefined, "watchdog");
      expect(unresolved.projectSlug).toBeNull();
      expect(unresolved.vaultFs.projectSlug).toBeNull();
      const { watchdogCommand } = await import("./commands/watchdog.js");
      const unconfirmed = await watchdogCommand({ action: "dig", scope: "window", tool: "opencode", count: 1, persist: false }, unresolved);
      if (unconfirmed.action !== "dig") throw new Error("expected dig");
      expect(unconfirmed.report.sessions).toBe(0);
      const confirmed = await watchdogCommand({ action: "dig", scope: "window", tool: "opencode", count: 1, allProjects: true, confirm: true, persist: false }, current);
      if (confirmed.action !== "dig") throw new Error("expected dig");
      expect(confirmed.report.sessions).toBe(1);
    } finally {
      vi.restoreAllMocks();
      vi.unstubAllEnvs();
      vi.resetModules();
      await rm(root, { recursive: true, force: true });
    }
  });

});
