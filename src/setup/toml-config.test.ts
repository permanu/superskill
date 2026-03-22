import { describe, it, expect } from "vitest";
import { insertTomlBlock, removeTomlBlock } from "./toml-config.js";

const BLOCK = `[mcp_servers.superskill]
command = "npx"
args = ["-y", "superskill"]

[mcp_servers.superskill.env]
VAULT_PATH = "~/Vaults/ai"`;

describe("insertTomlBlock", () => {
  it("appends block with markers to empty content", () => {
    const result = insertTomlBlock("", BLOCK);
    expect(result).toContain("# superskill:start");
    expect(result).toContain("# superskill:end");
    expect(result).toContain('[mcp_servers.superskill]');
  });

  it("appends block to existing content", () => {
    const existing = '[other]\nkey = "value"\n';
    const result = insertTomlBlock(existing, BLOCK);
    expect(result).toContain('[other]');
    expect(result).toContain("# superskill:start");
  });

  it("returns null if block already exists (no force)", () => {
    const existing = "# superskill:start\nold block\n# superskill:end\n";
    expect(insertTomlBlock(existing, BLOCK, false)).toBeNull();
  });

  it("replaces existing block when force=true", () => {
    const existing = "# superskill:start\nold block\n# superskill:end\n";
    const result = insertTomlBlock(existing, BLOCK, true);
    expect(result).not.toBeNull();
    expect(result).not.toContain("old block");
    expect(result).toContain('[mcp_servers.superskill]');
  });
});

describe("removeTomlBlock", () => {
  it("removes block between markers", () => {
    const content = `[other]\nkey = "value"\n\n# superskill:start\n${BLOCK}\n# superskill:end\n`;
    const result = removeTomlBlock(content);
    expect(result.content).not.toContain("superskill");
    expect(result.content).toContain('[other]');
    expect(result.removed).toBe(true);
  });

  it("returns removed=false when no markers found", () => {
    const content = '[other]\nkey = "value"\n';
    const result = removeTomlBlock(content);
    expect(result.removed).toBe(false);
    expect(result.content).toBe(content);
  });
});
