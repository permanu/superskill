import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { captureCommand } from "./capture.js";
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
    vi.restoreAllMocks();
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

  it.each([
    null,
    { type: "learning", title: 7, content: "body" },
    { type: "learning", title: " ", content: "body" },
    { type: "learning", title: "Bad", content: { text: "body" } },
    { type: "learning", title: "Bad", content: "body", tags: ["ok", 7] },
    { type: "learning", title: "Bad", content: "body", confidence: "certain" },
  ])("prevalidates the full batch shape before writing: %j", async (invalid) => {
    await expect(captureCommand({ project: slug, items: [
      { type: "learning", title: "Valid", content: "body" },
      invalid as never,
    ] }, ctx)).rejects.toThrow(/capture item 2/i);
    expect(await vaultFs.exists(`projects/${slug}/learnings`)).toBe(false);
  });

  it("rejects non-array items and preflights secrets before any numbered claims", async () => {
    await expect(captureCommand({ project: slug, items: {} as never }, ctx)).rejects.toThrow(/items must be an array/i);
    await expect(captureCommand({ project: slug, items: [
      { type: "learning", title: "Valid", content: "body" },
      { type: "learning", title: "Sensitive", content: `ghp_${"A".repeat(36)}` },
    ] }, ctx)).rejects.toMatchObject({ code: "SECRET_REJECTED" });
    expect(await vaultFs.exists(`projects/${slug}/learnings`)).toBe(false);
  });

  it("reports completed captures when a later write fails", async () => {
    const claim = numbering.claimNumberedFile;
    vi.spyOn(numbering, "claimNumberedFile").mockImplementationOnce(claim).mockRejectedValueOnce(new Error("disk full"));
    const first = { path: `projects/${slug}/learnings/001-first.md`, type: "learning", title: "First" };
    await expect(captureCommand({ project: slug, items: [
      { type: "learning", title: "First", content: "first body" },
      { type: "learning", title: "Second", content: "second body" },
    ] }, ctx)).rejects.toMatchObject({ captured: [first], failed_index: 1, message: expect.stringContaining(first.path) });
    expect(await vaultFs.read(first.path)).toContain("first body");
    expect(await vaultFs.exists(`projects/${slug}/learnings/002-second.md`)).toBe(false);
  });

  it("retains permission-denied errors when a requested project is outside the jail", async () => {
    ctx.vaultFs = new VaultFS(vaultRoot, { projectSlug: "other-project" });
    await expect(captureCommand({ project: slug, items: [{ type: "learning", title: "Denied", content: "body" }] }, ctx)).rejects.toMatchObject({ code: "PERMISSION_DENIED", captured: [] });
    expect(await vaultFs.exists(`projects/${slug}/learnings`)).toBe(false);
  });
});
