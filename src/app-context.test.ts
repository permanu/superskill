// SPDX-License-Identifier: Apache-2.0
import { afterEach, describe, it, expect, vi } from "vitest";
import { createScopedCtx } from "./app-context.js";
import * as workspace from "./lib/workspace-context.js";
import * as projectDetector from "./lib/project-detector.js";

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

});
