import { describe, it, expect } from "vitest";
import { insertTomlBlock, removeTomlBlock, reconcileTomlBlock } from "./toml-config.js";

const BLOCK = `[mcp_servers.superskill]
command = "npx"
args = ["-y", "superskill"]

[mcp_servers.superskill.env]
VAULT_PATH = "~/Vaults/ai"`;

const LATEST_BLOCK = BLOCK.replace('["-y", "superskill"]', '["-y", "--prefer-online", "superskill@latest"]');

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

describe("unmarked superskill tables", () => {
  it("upgrades an owned old launcher in place and preserves VAULT_PATH and other env", () => {
    const existing = `[mcp_servers.superskill]\ncommand = "npx"\nargs = ["-y", "superskill"]\n\n[mcp_servers.superskill.env]\nVAULT_PATH = "/custom/vault"\nEXTRA = "keep"\n`;
    const result = insertTomlBlock(existing, LATEST_BLOCK);
    expect(result).toContain('args = ["-y", "--prefer-online", "superskill@latest"]');
    expect(result).toContain('VAULT_PATH = "/custom/vault"');
    expect(result).toContain('EXTRA = "keep"');
    expect(result).not.toContain("# superskill:start");
  });

  it("returns null when an owned unmarked table is already current", () => {
    expect(insertTomlBlock(`[mcp_servers.superskill]\ncommand = "npx"\nargs = ["-y", "--prefer-online", "superskill@latest"]\n`, LATEST_BLOCK)).toBeNull();
  });

  it("preserves foreign unmarked tables and never appends a duplicate", () => {
    const foreign = `[mcp_servers.superskill]\ncommand = "npx"\nargs = ["-y", "someone-elses-server"]\n\n[mcp_servers.superskill.env]\nVAULT_PATH = "/theirs"\n`;
    expect(insertTomlBlock(foreign, LATEST_BLOCK)).toBeNull();
  });

  it("preserves a pinned owned launcher without force but normalizes with force", () => {
    const pinned = `[mcp_servers.superskill]\ncommand = "npx"\nargs = ["-y", "superskill@0.9.0"]\n`;
    expect(insertTomlBlock(pinned, LATEST_BLOCK)).toBeNull();
    const forced = insertTomlBlock(pinned, LATEST_BLOCK, true);
    expect(forced).toContain('args = ["-y", "--prefer-online", "superskill@latest"]');
  });

  it("normalizes a global binary command with force only", () => {
    const global = `[mcp_servers.superskill]\ncommand = "superskill"\n`;
    expect(insertTomlBlock(global, LATEST_BLOCK)).toBeNull();
    const forced = insertTomlBlock(global, LATEST_BLOCK, true);
    expect(forced).toContain('command = "npx"');
    expect(forced).toContain('args = ["-y", "--prefer-online", "superskill@latest"]');
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

  it("removes an owned unmarked table and its env subsection", () => {
    const content = `[other]\nkey = "value"\n\n[${"mcp_servers.superskill"}]\ncommand = "npx"\nargs = ["-y", "superskill"]\n\n[${"mcp_servers.superskill"}.env]\nVAULT_PATH = "/v"\n`;
    const result = removeTomlBlock(content);
    expect(result.removed).toBe(true);
    expect(result.content).not.toContain("superskill");
    expect(result.content).toContain('[other]');
  });

  it("preserves foreign unmarked tables", () => {
    const content = `[mcp_servers.superskill]\ncommand = "npx"\nargs = ["-y", "someone-elses-server"]\n`;
    const result = removeTomlBlock(content);
    expect(result.removed).toBe(false);
    expect(result.content).toBe(content);
  });
});

describe("managed TOML launcher upgrades", () => {
  const latest = LATEST_BLOCK.replace('~/Vaults/ai', "/new");
  it("replaces only the old launcher args and preserves existing vault/environment/outside bytes", () => {
    const existing = `# before\n\n# superskill:start\n${BLOCK}\nEXTRA = "keep"\n# superskill:end\n\n# after\n`;
    expect(insertTomlBlock(existing, latest)).toBe(existing.replace('["-y", "superskill"]', '["-y", "--prefer-online", "superskill@latest"]'));
  });
  it.each([
    BLOCK.replace('"superskill"', '"superskill@0.9.0"'),
    BLOCK.replace('"npx"', '"/custom/superskill"'),
    BLOCK.replace('["-y", "superskill"]', '["-y", "superskill", "--custom"]'),
  ])("preserves customized managed launchers", body => {
    expect(insertTomlBlock(`# superskill:start\n${body}\n# superskill:end\n`, latest)).toBeNull();
  });
  it("does not append duplicate superskill tables to unmanaged config", () => {
    const foreign = BLOCK.replace('"superskill"', '"someone-elses-server"');
    expect(insertTomlBlock(foreign, latest)).toBeNull();
  });
});

describe("reconcileTomlBlock", () => {
  it("upgrades owned marked and unmarked tables", () => {
    const marked = `# superskill:start\n${BLOCK}\n# superskill:end\n`;
    const upgraded = reconcileTomlBlock(marked, LATEST_BLOCK);
    expect(upgraded).toContain('["-y", "--prefer-online", "superskill@latest"]');
    const unmarked = `[mcp_servers.superskill]\ncommand = "npx"\nargs = ["-y", "superskill"]\n`;
    expect(reconcileTomlBlock(unmarked, LATEST_BLOCK)).toContain('["-y", "--prefer-online", "superskill@latest"]');
  });

  it("never appends to a config without a superskill table", () => {
    expect(reconcileTomlBlock('[other]\nkey = 1\n', LATEST_BLOCK)).toBeNull();
  });

  it("returns null for a foreign unmarked table", () => {
    expect(reconcileTomlBlock(`[mcp_servers.superskill]\ncommand = "npx"\nargs = ["-y", "someone-elses-server"]\n`, LATEST_BLOCK)).toBeNull();
  });
});
