import { describe, it, expect } from "vitest";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { findSystemChrome, verifyVizHtml } from "./qa-browser.js";
import { writeKnowledgeGraphFiles } from "./knowledge-viz.js";
import { KnowledgeIndex } from "./knowledge-index.js";

describe("qa-browser", () => {
  it("finds Chrome on this Mac", () => {
    const chrome = findSystemChrome();
    expect(chrome).toBeTruthy();
  });

  it("clicks Vault memory in the generated HTML and reads the panel", async () => {
    if (!findSystemChrome()) return;
    const dir = join(tmpdir(), `qa-${Date.now()}`);
    const vault = join(dir, "vault");
    await mkdir(join(vault, "projects", "demo"), { recursive: true });
    const idx = KnowledgeIndex.openForProject(vault, "demo");
    idx.upsert({
      path: "projects/demo/context.md",
      type: "context",
      title: "Demo",
      body: "hello from vault",
      related: [],
    });
    idx.close();
    const { html } = writeKnowledgeGraphFiles(vault, "demo");
    const abs = join(vault, html);
    const qa = await verifyVizHtml(abs);
    expect(qa.skipped).toBeUndefined();
    expect(qa.ok).toBe(true);
    expect(qa.title).toBe("SuperSkill");
    expect(qa.nodes).toContain("Vault memory");
    expect(qa.afterClick.toLowerCase()).toMatch(/vault|note/);
    expect(qa.afterBack).toBe("SuperSkill");
    await rm(dir, { recursive: true, force: true });
  }, 60_000);
});
