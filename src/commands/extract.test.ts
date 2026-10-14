import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractCommand } from "./extract.js";
import { VaultFS } from "../lib/vault-fs.js";
import { KnowledgeIndex } from "../lib/knowledge-index.js";
import type { CommandContext } from "../core/types.js";
import * as numbering from "../lib/auto-number.js";

function createContext(vaultFs: VaultFS): CommandContext {
  return {
    vaultFs,
    vaultPath: vaultFs.root,
    sessionRegistry: {} as any,
    config: {} as any,
    log: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
  };
}

describe("extractCommand", () => {
  const slug = "extract-test";
  let vaultRoot: string;
  let vaultFs: VaultFS;
  let ctx: CommandContext;

  beforeEach(async () => {
    vaultRoot = join(tmpdir(), `extract-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(join(vaultRoot, "projects", slug), { recursive: true });
    vaultFs = new VaultFS(vaultRoot);
    ctx = createContext(vaultFs);
    await vaultFs.write(`projects/${slug}/source.md`, "# Source\n\nOrigin note");
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(vaultRoot, { recursive: true, force: true });
  });

  it("rejects unknown item types before writing any directory", async () => {
    await expect(
      extractCommand(
        { source: `projects/${slug}/source.md`, items: [{ type: "junk", title: "Junk", content: "no" }], project: slug },
        ctx,
      ),
    ).rejects.toThrow(/Unknown extract type "junk"\. Allowed types: adr, decision, learning, task, brainstorm, incident, pattern, evaluation/);
    expect(await vaultFs.exists(`projects/${slug}/junk`)).toBe(false);
  });

  it("validates every item before writing any file", async () => {
    await expect(
      extractCommand(
        {
          source: `projects/${slug}/source.md`,
          items: [
            { type: "learning", title: "Fine", content: "ok" },
            { type: "bogus", title: "Bad", content: "no" },
          ],
          project: slug,
        },
        ctx,
      ),
    ).rejects.toThrow(/Unknown extract type "bogus"/);
    expect(await vaultFs.exists(`projects/${slug}/learnings`)).toBe(false);
  });

  it("syncs successful extractions into the knowledge index", async () => {
    const result = await extractCommand(
      {
        source: `projects/${slug}/source.md`,
        items: [{ type: "learning", title: "Indexed insight", content: "Extractneedle content here" }],
        project: slug,
      },
      ctx,
    );
    expect(result.extracted).toHaveLength(1);
    expect(result.extracted[0].path).toBe(`projects/${slug}/learnings/001-indexed-insight.md`);

    const idx = KnowledgeIndex.openForProject(vaultRoot, slug);
    try {
      expect(idx.search("Extractneedle").map((hit) => hit.path)).toContain(result.extracted[0].path);
      expect(idx.filesCount()).toBe(2);
    } finally {
      idx.close();
    }
  });

  it.each([
    null,
    { type: "learning", title: 7, content: "body" },
    { type: "learning", title: " ", content: "body" },
    { type: "learning", title: "Bad", content: null },
  ])("prevalidates every item shape before extracting: %j", async (invalid) => {
    await expect(extractCommand({ project: slug, source: `projects/${slug}/source.md`, items: [
      { type: "learning", title: "Valid", content: "body" },
      invalid as never,
    ] }, ctx)).rejects.toThrow(/extract item 2/i);
    expect(await vaultFs.exists(`projects/${slug}/learnings`)).toBe(false);
    expect(await vaultFs.read(`projects/${slug}/source.md`)).toBe("# Source\n\nOrigin note");
  });

  it("does not silently expand extraction's supported content types", async () => {
    await expect(extractCommand({ project: slug, source: `projects/${slug}/source.md`, items: [
      { type: "research", title: "Research", content: "body" },
    ] }, ctx)).rejects.toThrow(/Unknown extract type/);
  });

  it("preflights every item for secrets before any numbered claims", async () => {
    await expect(extractCommand({ project: slug, source: `projects/${slug}/source.md`, items: [
      { type: "learning", title: "Valid", content: "body" },
      { type: "learning", title: "Sensitive", content: `ghp_${"A".repeat(36)}` },
    ] }, ctx)).rejects.toMatchObject({ code: "SECRET_REJECTED" });
    expect(await vaultFs.exists(`projects/${slug}/learnings`)).toBe(false);
  });

  it("reports completed extractions when a later write fails", async () => {
    const claim = numbering.claimNumberedFile;
    vi.spyOn(numbering, "claimNumberedFile").mockImplementationOnce(claim).mockRejectedValueOnce(new Error("disk full"));
    const first = { path: `projects/${slug}/learnings/001-first.md`, type: "learning", title: "First" };
    await expect(extractCommand({ project: slug, source: `projects/${slug}/source.md`, items: [
      { type: "learning", title: "First", content: "first body" },
      { type: "learning", title: "Second", content: "second body" },
    ] }, ctx)).rejects.toMatchObject({ extracted: [first], failed_index: 1, message: expect.stringContaining(first.path) });
    expect(await vaultFs.read(first.path)).toContain("first body");
    expect(await vaultFs.read(`projects/${slug}/source.md`)).toBe("# Source\n\nOrigin note");
  });
});
