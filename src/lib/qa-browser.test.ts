import { describe, it, expect } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
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
    await writeFile(join(dir, "main.ts"), "export const answer = 42;");
    const { html } = await writeKnowledgeGraphFiles(vault, "demo", { codeRoot: dir });
    const abs = join(vault, html);
    const qa = await verifyVizHtml(abs);
    expect(qa.skipped).toBeUndefined();
    expect(qa.ok).toBe(true);
    expect(qa.title).toBe("demo");
    expect(qa.nodes).toContain("main.ts");
    expect(qa.afterClick.toLowerCase()).toMatch(/main.ts|source/);
    expect(qa.afterBack).toBe("demo");
    await rm(dir, { recursive: true, force: true });
  }, 60_000);
});
