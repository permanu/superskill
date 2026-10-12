// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { pruneCommand, statsCommand } from "./prune.js";
import { createTestVault, createCommandContext } from "../test-helpers.js";
import { createFrontmatter, serializeFrontmatter } from "../lib/frontmatter.js";

vi.mock("../lib/knowledge-index.js", () => ({
  removeVaultFileFromIndex: vi.fn(),
  upsertVaultFile: vi.fn(),
}));

import { removeVaultFileFromIndex, upsertVaultFile } from "../lib/knowledge-index.js";

const mockedRemoveFromIndex = vi.mocked(removeVaultFileFromIndex);
const mockedUpsert = vi.mocked(upsertVaultFile);

function oldDateDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

describe("pruneCommand", () => {
  let cleanup: (() => Promise<void>) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (cleanup) await cleanup();
    cleanup = undefined;
  });

  async function setupProject() {
    const vault = await createTestVault({ project: "my-project" });
    cleanup = vault.cleanup;
    const ctx = createCommandContext(vault.vaultFs);

    const oldDate = oldDateDaysAgo(90);
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

  it("rejects negative and NaN retention values", async () => {
    const { ctx, sessionPath } = await setupProject();

    await expect(
      pruneCommand({ mode: "dry-run", project: "my-project", policy: { sessions: -1 } }, ctx)
    ).rejects.toThrow(/sessions/);
    await expect(
      pruneCommand({ mode: "dry-run", project: "my-project", policy: { doneTasks: Number.NaN } }, ctx)
    ).rejects.toThrow(/doneTasks/);
    await expect(
      pruneCommand({ mode: "dry-run", project: "my-project", policy: { learnings: -5 } }, ctx)
    ).rejects.toThrow(/learnings/);

    expect(await ctx.vaultFs.exists(sessionPath)).toBe(true);
  });

  it("keeps dry-run behavior unchanged", async () => {
    const { ctx, sessionPath } = await setupProject();

    const result = await pruneCommand({ mode: "dry-run", project: "my-project" }, ctx);

    expect(result[0].stats.total_archived).toBe(1);
    expect(result[0].stats.total_deleted).toBe(0);
    expect(await ctx.vaultFs.exists(sessionPath)).toBe(true);
    expect(mockedRemoveFromIndex).not.toHaveBeenCalled();
    expect(mockedUpsert).not.toHaveBeenCalled();
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

  it("prunes learnings, brainstorms, and adrs by age when enabled", async () => {
    const { ctx } = await setupProject();
    const old = oldDateDaysAgo(90);

    await ctx.vaultFs.write(
      "projects/my-project/learnings/001-old-learning.md",
      serializeFrontmatter(createFrontmatter({ type: "learning", status: "active", created: old, updated: old }), "\n# Old learning\n")
    );
    await ctx.vaultFs.write(
      "projects/my-project/brainstorms/old-topic.md",
      serializeFrontmatter(createFrontmatter({ type: "brainstorm", status: "active", created: old, updated: old }), "\n# Old brainstorm\n")
    );
    await ctx.vaultFs.write(
      "projects/my-project/decisions/001-old-adr.md",
      serializeFrontmatter(createFrontmatter({ type: "adr", status: "accepted", created: old, updated: old }), "\n# Old ADR\n")
    );

    const result = await pruneCommand(
      { mode: "archive", project: "my-project", policy: { learnings: 30, brainstorms: 30, adrs: 30 } },
      ctx
    );

    const archivedFrom = result[0].archived.map((entry) => entry.from);
    expect(archivedFrom).toContain("projects/my-project/learnings/001-old-learning.md");
    expect(archivedFrom).toContain("projects/my-project/brainstorms/old-topic.md");
    expect(archivedFrom).toContain("projects/my-project/decisions/001-old-adr.md");
    expect(result[0].stats.learnings_scanned).toBe(1);
    expect(await ctx.vaultFs.exists("projects/my-project/learnings/001-old-learning.md")).toBe(false);
    expect(await ctx.vaultFs.exists("projects/my-project/_archive/learnings/001-old-learning.md")).toBe(true);
    expect(await ctx.vaultFs.exists("projects/my-project/_archive/brainstorms/old-topic.md")).toBe(true);
    expect(await ctx.vaultFs.exists("projects/my-project/_archive/decisions/001-old-adr.md")).toBe(true);
  });

  it("disables learnings, brainstorms, and adrs pruning at the default retention of 0", async () => {
    const { ctx } = await setupProject();
    const old = oldDateDaysAgo(90);
    const learningPath = "projects/my-project/learnings/001-old-learning.md";
    await ctx.vaultFs.write(
      learningPath,
      serializeFrontmatter(createFrontmatter({ type: "learning", status: "active", created: old, updated: old }), "\n# Old learning\n")
    );

    const result = await pruneCommand({ mode: "delete", project: "my-project" }, ctx);

    expect(result[0].deleted).not.toContain(learningPath);
    expect(await ctx.vaultFs.exists(learningPath)).toBe(true);
  });

  it("removes archived files from the old index path and reindexes the new content", async () => {
    const { ctx, sessionPath } = await setupProject();

    const result = await pruneCommand({ mode: "archive", project: "my-project" }, ctx);
    const archivedPath = result[0].archived[0].to;

    expect(mockedRemoveFromIndex).toHaveBeenCalledWith(ctx.vaultPath, sessionPath);
    expect(mockedUpsert).toHaveBeenCalledWith(ctx.vaultPath, archivedPath, expect.stringContaining("# Old session"));
  });

  it("removes deleted files from the index", async () => {
    const { ctx, sessionPath } = await setupProject();

    await pruneCommand({ mode: "delete", project: "my-project" }, ctx);

    expect(mockedRemoveFromIndex).toHaveBeenCalledWith(ctx.vaultPath, sessionPath);
    expect(mockedUpsert).not.toHaveBeenCalled();
  });

  it("computes oldestFile from the actual frontmatter dates", async () => {
    const { ctx, sessionPath } = await setupProject();

    const stats = await statsCommand({ project: "my-project" }, ctx);

    expect(stats.oldestFile).toBe(sessionPath);
  });

  it("returns null oldestFile when the project has no dated files", async () => {
    const vault = await createTestVault({ project: "empty-project" });
    cleanup = vault.cleanup;
    const ctx = createCommandContext(vault.vaultFs);

    const stats = await statsCommand({ project: "empty-project" }, ctx);

    expect(stats.oldestFile).toBeNull();
  });
});
