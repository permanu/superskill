import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { readJsonConfig, writeJsonConfig, addMcpEntry, removeMcpEntry } from "./json-config.js";
import { writeMarkdownInstruction, removeMarkdownInstruction } from "./instructions.js";
import { insertTomlBlock, removeTomlBlock } from "./toml-config.js";

describe("setup/teardown integration", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "superskill-setup-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("writes and removes JSON MCP entry", () => {
    const configPath = join(tempDir, "config.json");
    writeFileSync(configPath, '{"existing": true}', "utf-8");

    // Add
    const config = readJsonConfig(configPath);
    const merged = addMcpEntry(config!, "mcpServers", "superskill", {
      command: "npx",
      args: ["-y", "superskill"],
    });
    writeJsonConfig(configPath, merged.config);

    const after = JSON.parse(readFileSync(configPath, "utf-8"));
    expect(after.existing).toBe(true);
    expect(after.mcpServers["superskill"].command).toBe("npx");

    // Backup should exist
    expect(existsSync(`${configPath}.bak.superskill`)).toBe(true);

    // Remove
    const { config: cleaned, removed } = removeMcpEntry(after, "mcpServers", "superskill");
    writeJsonConfig(configPath, cleaned);
    expect(removed).toBe(true);

    const final = JSON.parse(readFileSync(configPath, "utf-8"));
    expect(final.mcpServers["superskill"]).toBeUndefined();
    expect(final.existing).toBe(true);
  });

  it("writes and removes markdown instruction block", () => {
    const mdPath = join(tempDir, "CLAUDE.md");
    writeFileSync(mdPath, "# Existing content\n", "utf-8");

    // Add
    const status = writeMarkdownInstruction(mdPath);
    expect(status).toBe("appended");

    const content = readFileSync(mdPath, "utf-8");
    expect(content).toContain("# Existing content");
    expect(content).toContain("<!-- superskill:start -->");
    expect(content).toContain("vault_project_context");

    // Idempotent
    expect(writeMarkdownInstruction(mdPath)).toBe("exists");

    // Remove
    expect(removeMarkdownInstruction(mdPath)).toBe(true);
    const cleaned = readFileSync(mdPath, "utf-8");
    expect(cleaned).toContain("# Existing content");
    expect(cleaned).not.toContain("superskill");

    // Remove again — nothing to do
    expect(removeMarkdownInstruction(mdPath)).toBe(false);
  });

  it("writes and removes TOML block", () => {
    const block = '[mcp_servers.superskill]\ncommand = "npx"';

    // Insert
    const result = insertTomlBlock("", block);
    expect(result).toContain("# superskill:start");

    // Idempotent
    expect(insertTomlBlock(result!, block)).toBeNull();

    // Remove
    const { content, removed } = removeTomlBlock(result!);
    expect(removed).toBe(true);
    expect(content).not.toContain("superskill");
  });
});
