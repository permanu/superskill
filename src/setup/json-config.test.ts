import { describe, it, expect, vi, beforeEach } from "vitest";
import { readJsonConfig, writeJsonConfig, addMcpEntry, removeMcpEntry } from "./json-config.js";
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from "fs";

vi.mock("fs", () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
  copyFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

const mockRead = vi.mocked(readFileSync);
const mockWrite = vi.mocked(writeFileSync);
const mockExists = vi.mocked(existsSync);
const mockCopy = vi.mocked(copyFileSync);
const mockMkdir = vi.mocked(mkdirSync);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("readJsonConfig", () => {
  it("returns parsed JSON when file exists", () => {
    mockExists.mockReturnValue(true);
    mockRead.mockReturnValue('{"mcpServers":{}}');
    expect(readJsonConfig("/path/config.json")).toEqual({ mcpServers: {} });
  });

  it("returns empty object when file does not exist", () => {
    mockExists.mockReturnValue(false);
    expect(readJsonConfig("/path/config.json")).toEqual({});
  });

  it("returns null when file has invalid JSON", () => {
    mockExists.mockReturnValue(true);
    mockRead.mockReturnValue("not json");
    expect(readJsonConfig("/path/config.json")).toBeNull();
  });
});

describe("writeJsonConfig", () => {
  it("creates backup before writing", () => {
    mockExists.mockReturnValue(true);
    writeJsonConfig("/path/config.json", { key: "value" });
    expect(mockCopy).toHaveBeenCalledWith(
      "/path/config.json",
      "/path/config.json.bak.superskill"
    );
  });

  it("creates parent directory if missing", () => {
    mockExists.mockReturnValue(false);
    writeJsonConfig("/path/to/config.json", { key: "value" });
    expect(mockMkdir).toHaveBeenCalled();
  });

  it("writes formatted JSON", () => {
    mockExists.mockReturnValue(false);
    writeJsonConfig("/path/config.json", { key: "value" });
    const written = mockWrite.mock.calls[0][1] as string;
    expect(JSON.parse(written)).toEqual({ key: "value" });
  });
});

describe("addMcpEntry", () => {
  it("adds entry under correct root key", () => {
    const config = { mcpServers: {} };
    const result = addMcpEntry(config, "mcpServers", "superskill", { command: "npx" });
    expect(result.alreadyExists).toBe(false);
    expect(result.config.mcpServers["superskill"]).toEqual({ command: "npx" });
  });

  it("creates root key if missing", () => {
    const config = {};
    const result = addMcpEntry(config, "mcpServers", "superskill", { command: "npx" });
    expect(result.config.mcpServers["superskill"]).toEqual({ command: "npx" });
  });

  it("preserves existing entries", () => {
    const config = { mcpServers: { other: { command: "other" } } };
    const result = addMcpEntry(config, "mcpServers", "superskill", { command: "npx" });
    expect(result.config.mcpServers.other).toEqual({ command: "other" });
    expect(result.config.mcpServers["superskill"]).toEqual({ command: "npx" });
  });

  it("returns alreadyExists=true when entry present and force=false", () => {
    const config = { mcpServers: { "superskill": { command: "old" } } };
    const result = addMcpEntry(config, "mcpServers", "superskill", { command: "npx" }, false);
    expect(result.alreadyExists).toBe(true);
    expect(result.config.mcpServers["superskill"]).toEqual({ command: "old" });
  });
});

describe("removeMcpEntry", () => {
  it("removes the entry", () => {
    const config = { mcpServers: { "superskill": { command: "npx" }, other: { command: "x" } } };
    const result = removeMcpEntry(config, "mcpServers", "superskill");
    expect(result.config.mcpServers["superskill"]).toBeUndefined();
    expect(result.config.mcpServers.other).toEqual({ command: "x" });
    expect(result.removed).toBe(true);
  });

  it("returns removed=false when entry not found", () => {
    const config = { mcpServers: {} };
    const result = removeMcpEntry(config, "mcpServers", "superskill");
    expect(result.removed).toBe(false);
  });
});


describe("managed launcher upgrades", () => {
  const latest = { command: "npx", args: ["-y", "--prefer-online", "superskill@latest"], env: { VAULT_PATH: "/new" } };
  it("upgrades old generated launcher while preserving vault and custom settings", () => {
    const old = { command: "npx", args: ["-y", "superskill"], env: { VAULT_PATH: "/existing", EXTRA: "keep" }, timeout: 123 };
    const result = addMcpEntry({ mcpServers: { superskill: old, other: { command: "keep" } } }, "mcpServers", "superskill", latest);
    expect(result.alreadyExists).toBe(false);
    expect(result.config.mcpServers.superskill).toEqual({ ...old, args: latest.args });
    expect(result.config.mcpServers.other.command).toBe("keep");
  });
  it("upgrades the generated OpenCode command array only", () => {
    const old = { type: "local", command: ["npx", "-y", "superskill"], environment: { VAULT_PATH: "/existing", EXTRA: "keep" } };
    const next = { type: "local", command: ["npx", "-y", "--prefer-online", "superskill@latest"], environment: { VAULT_PATH: "/new" } };
    const result = addMcpEntry({ mcp: { superskill: old } }, "mcp", "superskill", next);
    expect(result.alreadyExists).toBe(false);
    expect(result.config.mcp.superskill).toEqual({ ...old, command: next.command });
  });
  it.each([
    { command: "superskill", env: { VAULT_PATH: "/existing" } },
    { command: "npx", args: ["-y", "superskill@0.9.0"], env: { VAULT_PATH: "/existing" } },
    { command: "npx", args: ["-y", "superskill", "--custom"], env: { VAULT_PATH: "/existing" } },
    { command: "npx", args: ["-y", "superskill"] },
  ])("preserves custom or pinned launchers", old => {
    const result = addMcpEntry({ mcpServers: { superskill: old } }, "mcpServers", "superskill", latest);
    expect(result.alreadyExists).toBe(true);
    expect(result.config.mcpServers.superskill).toEqual(old);
  });
});
