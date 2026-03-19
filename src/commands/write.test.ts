import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { writeCommand } from "./write.js";
import { VaultFS } from "../lib/vault-fs.js";

describe("writeCommand", () => {
  let vaultRoot: string;
  let vaultFs: VaultFS;

  beforeEach(async () => {
    vaultRoot = join(homedir(), `.vault-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(vaultRoot, { recursive: true });
    vaultFs = new VaultFS(vaultRoot);
  });

  afterEach(async () => {
    await rm(vaultRoot, { recursive: true, force: true });
  });

  describe("append mode (default)", () => {
    it("creates new file with frontmatter", async () => {
    const result = await writeCommand(vaultFs, "new.md", "content", { mode: "append" });
    expect(result.written).toBe(true);
    expect(result.path).toBe("new.md");
    const content = await vaultFs.read("new.md");
    expect(content).toContain("content");
  });

  it("appends to existing file", async () => {
    await vaultFs.write("existing.md", "---\ncreated: 2024-01-01\n---\n\nInitial content");
    const result = await writeCommand(vaultFs, "existing.md", "appended", { mode: "append" });
    expect(result.written).toBe(true);
    const content = await vaultFs.read("existing.md");
    expect(content).toContain("Initial content");
    expect(content).toContain("appended");
  });

  it("merges frontmatter on append", async () => {
    await vaultFs.write("fm.md", "---\ntags: [a]\n---\n\nBody");
    const result = await writeCommand(vaultFs, "fm.md", "new content", { 
      mode: "append", 
      frontmatter: { status: "new-status" }
    });
    const content = await vaultFs.read("fm.md");
    expect(content).toContain("status: new-status");
  });
  });

  describe("prepend mode", () => {
    it("prepends content to existing file", async () => {
    await vaultFs.write("prepend.md", "---\ntitle: Test\n---\n\nOriginal body");
    const result = await writeCommand(vaultFs, "prepend.md", "New top content", { mode: "prepend" });
    expect(result.written).toBe(true);
    const content = await vaultFs.read("prepend.md");
    expect(content).toContain("New top content");
    expect(content).toContain("Original body");
  });
  });

  describe("overwrite mode", () => {
    it("creates file with frontmatter", async () => {
    const result = await writeCommand(vaultFs, "overwrite.md", "content", { mode: "overwrite" });
    expect(result.written).toBe(true);
    const content = await vaultFs.read("overwrite.md");
    expect(content).toContain("content");
  });

  it("creates file with custom frontmatter", async () => {
    const result = await writeCommand(vaultFs, "custom.md", "content", { 
      mode: "overwrite", 
      frontmatter: { status: "custom", tags: ["test"] }
    });
    expect(result.written).toBe(true);
    const content = await vaultFs.read("custom.md");
    expect(content).toContain("status: custom");
    expect(content).toContain("tags:");
  });
  });
});
