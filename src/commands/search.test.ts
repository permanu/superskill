import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdir, writeFile, rm, symlink } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { searchCommand } from "./search.js";

import { searchText, searchStructured } from "../lib/search-engine.js";
import { VaultFS } from "../lib/vault-fs.js";
import type { CommandContext } from "../core/types.js";

function createCommandContext(vaultFs: VaultFS, overrides?: Partial<CommandContext>): CommandContext {
  return {
    vaultFs,
    vaultPath: vaultFs.root,
    sessionRegistry: {} as any,
    config: {} as any,
    log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    ...overrides,
  };
}

describe("searchCommand", () => {
  let vaultRoot: string;
  let vaultFs: VaultFS;
  let ctx: CommandContext;

  beforeEach(async () => {
    vaultRoot = join(homedir(), `.vault-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(vaultRoot, { recursive: true });
    vaultFs = new VaultFS(vaultRoot);
    ctx = createCommandContext(vaultFs, { projectSlug: "test" });
    await mkdir(join(vaultRoot, "projects/test"), { recursive: true });
  });

  afterEach(async () => {
    await rm(vaultRoot, { recursive: true, force: true });
  });

  it.each([false, true])("denies an unresolved project scope (structured=%s)", async (structured) => {
    await writeFile(join(vaultRoot, "projects/test/private.md"), "---\ntype: adr\n---\nprivate");
    const denied = createCommandContext(vaultFs, { projectSlug: null });
    await expect(searchCommand({ query: structured ? "type:adr" : "private", structured }, denied)).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    await expect(searchCommand({ query: "private", project: "test", structured }, denied)).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
  });

  it.each([-1, 0, 1.5, NaN, Infinity])("rejects invalid limit %s", async (limit) => {
    await expect(searchCommand({ query: "private", limit }, ctx)).rejects.toThrow("limit");
  });

  it("retains legacy unscoped text search", async () => {
    await writeFile(join(vaultRoot, "projects/test/note.md"), "legacy-marker");
    const results = await searchCommand({ query: "legacy-marker" }, createCommandContext(vaultFs));
    expect(results[0]?.path).toBe("projects/test/note.md");
  });

  it.each(["../test", "test/../../other", ""]) ("rejects invalid structured project %s", async (project) => {
    await expect(searchCommand({ query: "type:adr", structured: true, project }, createCommandContext(vaultFs))).rejects.toThrow();
  });

  it("rejects a structured search root symlink into another project", async () => {
    await mkdir(join(vaultRoot, "projects/other"), { recursive: true });
    await writeFile(join(vaultRoot, "projects/other/private.md"), "---\ntype: adr\n---\nprivate");
    await rm(join(vaultRoot, "projects/test"), { recursive: true });
    await symlink(join(vaultRoot, "projects/other"), join(vaultRoot, "projects/test"));
    const scoped = createCommandContext(new VaultFS(vaultRoot, { projectSlug: "test" }), { projectSlug: "test" });
    await expect(searchCommand({ query: "type:adr", structured: true }, scoped)).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
  });

  describe("text search", () => {
    it("performs text search", async () => {
      await writeFile(join(vaultRoot, "projects/test/note.md"), "# Test Note\n\nSearchable content here");
      const results = await searchCommand({ query: "Searchable", project: "test", limit: 10 }, ctx);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].path).toContain("note.md");
    });

    it("filters by project path", async () => {
      await mkdir(join(vaultRoot, "projects/other"), { recursive: true });
      await writeFile(join(vaultRoot, "projects/test/note.md"), "Searchable content");
      await writeFile(join(vaultRoot, "projects/other/note.md"), "Searchable content");
      const results = await searchCommand({ query: "Searchable", project: "test", limit: 10 }, ctx);
      expect(results.every((r) => r.path.includes("test"))).toBe(true);
    });
  });

  describe("structured search", () => {
    it("performs structured search", async () => {
      await writeFile(
        join(vaultRoot, "projects/test/doc.md"),
        "---\ntype: adr\nstatus: active\n---\n\nContent"
      );
      const results = await searchCommand({ query: "type:adr status:active", structured: true, project: "test", limit: 10 }, ctx);
      expect(results.length).toBeGreaterThan(0);
    });

    it("includes project filter in structured search", async () => {
      await mkdir(join(vaultRoot, "projects/other"), { recursive: true });
      await writeFile(
        join(vaultRoot, "projects/test/doc.md"),
        "---\ntype: adr\nstatus: active\n---\n\nContent"
      );
      await writeFile(
        join(vaultRoot, "projects/other/doc.md"),
        "---\ntype: adr\nstatus: active\n---\n\nContent"
      );
      const results = await searchCommand({ query: "type:adr", structured: true, project: "test", limit: 10 }, ctx);
      expect(results.every((r) => r.path.includes("test"))).toBe(true);
    });

    it("rejects a different project than the scoped context", async () => {
      await expect(
        searchCommand({ query: "type:adr", structured: true, project: "other", limit: 10 }, ctx),
      ).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    });
  });
});

