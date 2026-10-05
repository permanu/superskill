// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, afterEach } from "vitest";
import { pruneCommand } from "./prune.js";
import { createTestVault, createCommandContext } from "../test-helpers.js";
import { createFrontmatter, serializeFrontmatter } from "../lib/frontmatter.js";

describe("pruneCommand", () => {
  let cleanup: (() => Promise<void>) | undefined;

  afterEach(async () => {
    if (cleanup) await cleanup();
    cleanup = undefined;
  });

  async function setupProject() {
    const vault = await createTestVault({ project: "my-project" });
    cleanup = vault.cleanup;
    const ctx = createCommandContext(vault.vaultFs);

    const oldDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const sessionPath = "projects/my-project/sessions/2025-01-01-claude-aabbccdd.md";
    await ctx.vaultFs.write(
      sessionPath,
      serializeFrontmatter(
        createFrontmatter({ type: "session", status: "completed", completed_at: oldDate, created: oldDate }),
        "\n# Old session\n"
      )
    );

    return { ctx, sessionPath };
  }

  it("throws Unknown retention mode for an invalid mode and deletes nothing", async () => {
    const { ctx, sessionPath } = await setupProject();

    await expect(pruneCommand({ mode: "dryrun" as any, project: "my-project" }, ctx)).rejects.toThrow(
      "Unknown retention mode"
    );
    await expect(pruneCommand({ mode: "" as any, project: "my-project" }, ctx)).rejects.toThrow(
      "Unknown retention mode"
    );

    expect(await ctx.vaultFs.exists(sessionPath)).toBe(true);
  });

  it("keeps dry-run behavior unchanged", async () => {
    const { ctx, sessionPath } = await setupProject();

    const result = await pruneCommand({ mode: "dry-run", project: "my-project" }, ctx);

    expect(result[0].stats.total_archived).toBe(1);
    expect(result[0].stats.total_deleted).toBe(0);
    expect(await ctx.vaultFs.exists(sessionPath)).toBe(true);
  });

  it("keeps archive behavior unchanged", async () => {
    const { ctx, sessionPath } = await setupProject();

    const result = await pruneCommand({ mode: "archive", project: "my-project" }, ctx);

    expect(result[0].archived).toHaveLength(1);
    expect(result[0].archived[0].to).toContain("_archive");
    expect(await ctx.vaultFs.exists(sessionPath)).toBe(false);
  });

  it("keeps delete behavior unchanged", async () => {
    const { ctx, sessionPath } = await setupProject();

    const result = await pruneCommand({ mode: "delete", project: "my-project" }, ctx);

    expect(result[0].deleted).toContain(sessionPath);
    expect(await ctx.vaultFs.exists(sessionPath)).toBe(false);
  });
});
