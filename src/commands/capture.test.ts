import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { captureCommand } from "./capture.js";
import { VaultFS } from "../lib/vault-fs.js";
import { KnowledgeIndex } from "../lib/knowledge-index.js";
import type { CommandContext } from "../core/types.js";

function createContext(vaultFs: VaultFS): CommandContext {
  return {
    vaultFs,
    vaultPath: vaultFs.root,
    sessionRegistry: {} as any,
    config: {} as any,
    log: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
  };
}

describe("captureCommand", () => {
  const slug = "capture-test";
  let vaultRoot: string;
  let vaultFs: VaultFS;
  let ctx: CommandContext;

  beforeEach(async () => {
    vaultRoot = join(tmpdir(), `capture-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(join(vaultRoot, "projects", slug), { recursive: true });
    vaultFs = new VaultFS(vaultRoot);
    ctx = createContext(vaultFs);
  });

  afterEach(async () => {
    await rm(vaultRoot, { recursive: true, force: true });
  });

  it("rejects unknown item types before writing any directory", async () => {
    await expect(
      captureCommand({ items: [{ type: "junk", title: "Junk", content: "no" }], project: slug }, ctx),
    ).rejects.toThrow(/Unknown capture type "junk"\. Allowed types: adr, decision, learning, task, brainstorm, incident, pattern, evaluation, research, prd, spec, rfc, vision, strategy, roadmap, competitive-analysis/);
    expect(await vaultFs.exists(`projects/${slug}/junk`)).toBe(false);
  });

  it("validates every item before writing any file", async () => {
    await expect(
      captureCommand(
        {
          items: [
            { type: "research", title: "Fine", content: "ok" },
            { type: "bogus", title: "Bad", content: "no" },
          ],
          project: slug,
        },
        ctx,
      ),
    ).rejects.toThrow(/Unknown capture type "bogus"/);
    expect(await vaultFs.exists(`projects/${slug}/research`)).toBe(false);
  });

  it("syncs successful captures into the knowledge index", async () => {
    const result = await captureCommand(
      { items: [{ type: "learning", title: "Captured insight", content: "Capturedneedle content here" }], project: slug },
      ctx,
    );
    expect(result.captured).toHaveLength(1);
    expect(result.captured[0].path).toBe(`projects/${slug}/learnings/001-captured-insight.md`);

    const idx = KnowledgeIndex.openForProject(vaultRoot, slug);
    try {
      expect(idx.search("Capturedneedle").map((hit) => hit.path)).toContain(result.captured[0].path);
      expect(idx.filesCount()).toBe(1);
    } finally {
      idx.close();
    }
  });
});
