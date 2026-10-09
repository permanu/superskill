import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestContext } from "../test-helpers.js";
import type { CommandContext } from "../core/types.js";
import { envFactsCommand, credRefsCommand, rollbackCommand } from "./snapshot.js";
import { extractCommand } from "./extract.js";
import { writeCommand } from "./write.js";
import { snapshotVersion } from "../lib/versioning.js";
import { specCommand } from "./spec.js";
import { linkCommand } from "./link.js";

describe("concurrent vault commands", () => {
  let ctx: CommandContext;
  let cleanup: () => Promise<void>;
  beforeEach(async () => { ({ ctx, cleanup } = await createTestContext({ project: "test-project", setupProject: true })); });
  afterEach(async () => { await cleanup(); });

  it("retains distinct environment facts", async () => {
    await Promise.all(Array.from({ length: 6 }, (_, i) => envFactsCommand({ action: "add", key: `key-${i}`, value: `value-${i}`, project: "test-project" }, ctx)));
    expect((await envFactsCommand({ action: "list", project: "test-project" }, ctx)).facts).toHaveLength(6);
  });

  it("retains distinct credential references", async () => {
    await Promise.all(Array.from({ length: 6 }, (_, i) => credRefsCommand({ action: "add", name: `ref-${i}`, location: `docs/ref-${i}`, project: "test-project" }, ctx)));
    expect((await credRefsCommand({ action: "list", project: "test-project" }, ctx)).references).toHaveLength(6);
  });

  it("retains distinct rollback points", async () => {
    await Promise.all(Array.from({ length: 6 }, (_, i) => rollbackCommand({ action: "add", commit_hash: `commit-${i}`, purpose: `Purpose ${i}`, project: "test-project" }, ctx)));
    expect((await rollbackCommand({ action: "list", project: "test-project" }, ctx)).checkpoints).toHaveLength(6);
  });

  it("assigns unique captures for concurrent extraction of the same title", async () => {
    await ctx.vaultFs.write("source.md", "source");
    const results = await Promise.all(Array.from({ length: 6 }, (_, i) => extractCommand({ source: "source.md", items: [{ type: "learning", title: "Same title", content: `Discovery ${i}` }], project: "test-project" }, ctx)));
    expect(new Set(results.map((result) => result.extracted[0].path)).size).toBe(6);
  });

  it("assigns unique concurrent spec and version numbers", async () => {
    const specs = await Promise.all(Array.from({ length: 6 }, () => specCommand({ action: "create", title: "Shared spec", project: "test-project" }, ctx)));
    expect(new Set(specs.map((spec) => spec.spec_id)).size).toBe(6);
    const versions = await Promise.all(Array.from({ length: 6 }, (_, i) => snapshotVersion(ctx.vaultFs, ctx.vaultPath, "projects/test-project/note.md", `Revision ${i}`)));
    expect(versions.every((version) => version !== null)).toBe(true);
    expect(new Set(versions.map((version) => version!.version_number)).size).toBe(6);
  });

  it("retains concurrent append and link mutations", async () => {
    const path = "projects/test-project/note.md";
    await ctx.vaultFs.write(path, "# Note\n");
    await Promise.all(Array.from({ length: 5 }, (_, i) => [
      writeCommand({ path, content: `Entry ${i}` }, ctx),
      linkCommand({ source: path, target: `target-${i}.md` }, ctx),
    ]).flat());
    const content = await ctx.vaultFs.read(path);
    for (let i = 0; i < 5; i++) {
      expect(content).toContain(`Entry ${i}`);
      expect(content).toContain(`[[target-${i}]]`);
    }
  });
});
