import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { readCommand, listCommand } from "./read.js";
import { VaultFS } from "../lib/vault-fs.js";

describe("readCommand", () => {
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

  describe("readCommand", () => {
    it("reads existing file", async () => {
      await vaultFs.write("test.md", "content");
      const result = await readCommand(vaultFs, "test.md");
      expect(result).toBe("content");
    });
  });

  describe("listCommand", () => {
    it("lists directory contents", async () => {
      await vaultFs.write("test.md", "content");
      await mkdir(join(vaultRoot, "subdir"));
        await vaultFs.write("subdir/child.md", "child");
        const result = await listCommand(vaultFs, ".", 2);
        expect(result).toContain("./test.md");
        expect(result).toContain("./subdir/child.md");
      });
  });
});
