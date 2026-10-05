// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from "vitest";
import { createScopedCtx } from "./app-context.js";

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
});
