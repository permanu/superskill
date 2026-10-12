import { afterEach, describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { buildMcpEntry, configureClient } from "./configure.js";
import { CLIENT_REGISTRY } from "./clients.js";
import type { DetectedClient } from "./types.js";
import { INSTRUCTION_TEXT, MARKER_BEGIN_HTML, MARKER_END_HTML } from "./types.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function makeDetected(slug: string): DetectedClient {
  const root = mkdtempSync(join(tmpdir(), `configure-${slug}-`));
  roots.push(root);
  const source = CLIENT_REGISTRY.find((client) => client.slug === slug)!;
  const commands = join(root, "commands");
  const config = {
    ...source,
    commandPaths: source.commandPaths ? { darwin: commands, linux: commands, win32: commands } : undefined,
  };
  return {
    config,
    mcpConfigPath: join(root, "config.json"),
    instructionPath: join(root, slug === "cursor" ? "superskill.mdc" : "AGENTS.md"),
  };
}

describe("buildMcpEntry", () => {
  it("builds string command entry for standard clients", () => {
    const entry = buildMcpEntry("string", "env", "~/Vaults/ai");
    expect(entry).toEqual({
      command: "npx",
      args: ["-y", "--prefer-online", "superskill@latest"],
      env: { VAULT_PATH: "~/Vaults/ai" },
    });
  });

  it("builds array command entry for OpenCode", () => {
    const entry = buildMcpEntry("array", "environment", "~/Vaults/ai", { type: "local" });
    expect(entry).toEqual({
      type: "local",
      command: ["npx", "-y", "--prefer-online", "superskill@latest"],
      environment: { VAULT_PATH: "~/Vaults/ai" },
    });
  });
});

describe("configureClient", () => {
  it("configures JSON client with MCP entry and markdown instruction", () => {
    const detected = makeDetected("claude-code");
    const result = configureClient(detected, "/vault");
    expect(result.error).toBeUndefined();
    expect(result.mcpConfigured).toBe(true);
    expect(result.instructionConfigured).toBe(true);
    const config = JSON.parse(readFileSync(detected.mcpConfigPath, "utf-8"));
    expect(config.mcpServers.superskill.env.VAULT_PATH).toBe("/vault");
    expect(readFileSync(detected.instructionPath!, "utf-8")).toContain(MARKER_BEGIN_HTML);
  });

  it("is idempotent and reports unchanged on the second run", () => {
    const detected = makeDetected("claude-code");
    configureClient(detected, "/vault");
    const configBefore = readFileSync(detected.mcpConfigPath, "utf-8");
    const instructionBefore = readFileSync(detected.instructionPath!, "utf-8");
    const result = configureClient(detected, "/vault");
    expect(result.mcpConfigured).toBe(false);
    expect(result.instructionConfigured).toBe(false);
    expect(result.skipped).toContain("MCP entry already exists");
    expect(result.skipped).toContain("Instruction already exists");
    expect(readFileSync(detected.mcpConfigPath, "utf-8")).toBe(configBefore);
    expect(readFileSync(detected.instructionPath!, "utf-8")).toBe(instructionBefore);
  });

  it.each([{ dryRun: true }, { check: true }])("reports truthful read-only drift with %o", options => {
    const detected = makeDetected("claude-code");
    const first = configureClient(detected, "/vault", options);
    expect(first.mcpConfigured).toBe(true);
    expect(first.instructionConfigured).toBe(true);
    expect(existsSync(detected.mcpConfigPath)).toBe(false);
    expect(existsSync(detected.instructionPath!)).toBe(false);

    configureClient(detected, "/vault");
    const second = configureClient(detected, "/vault", options);
    expect(second.mcpConfigured).toBe(false);
    expect(second.instructionConfigured).toBe(false);
    expect(second.skipped).toContain("MCP entry already exists");
    expect(second.skipped).toContain("Instruction already exists");
  });

  it("reports would-change for a stale managed launcher without writing", () => {
    const detected = makeDetected("claude-code");
    writeFileSync(
      detected.mcpConfigPath,
      JSON.stringify({ mcpServers: { superskill: { command: "npx", args: ["-y", "superskill"], env: { VAULT_PATH: "/vault" } } } }),
    );
    const before = readFileSync(detected.mcpConfigPath, "utf-8");
    const result = configureClient(detected, "/vault", { check: true });
    expect(result.mcpConfigured).toBe(true);
    expect(readFileSync(detected.mcpConfigPath, "utf-8")).toBe(before);
    configureClient(detected, "/vault");
    const upgraded = JSON.parse(readFileSync(detected.mcpConfigPath, "utf-8"));
    expect(upgraded.mcpServers.superskill.args).toEqual(["-y", "--prefer-online", "superskill@latest"]);
  });

  it("returns error for invalid JSON without touching the file", () => {
    const detected = makeDetected("claude-code");
    writeFileSync(detected.mcpConfigPath, "{ broken");
    const result = configureClient(detected, "/vault");
    expect(result.error).toContain("Invalid JSON");
    expect(readFileSync(detected.mcpConfigPath, "utf-8")).toBe("{ broken");
  });

  it("removes an owned legacy obsidian entry but preserves a foreign one", () => {
    const detected = makeDetected("claude-code");
    writeFileSync(
      detected.mcpConfigPath,
      JSON.stringify({
        mcpServers: {
          "obsidian-mcp": { command: "npx", args: ["-y", "superskill"] },
          "obsidian-kb": { command: "npx", args: ["-y", "obsidian-kb"] },
        },
      }),
    );
    const result = configureClient(detected, "/vault");
    const config = JSON.parse(readFileSync(detected.mcpConfigPath, "utf-8"));
    expect(config.mcpServers["obsidian-mcp"]).toBeUndefined();
    expect(config.mcpServers["obsidian-kb"]).toEqual({ command: "npx", args: ["-y", "obsidian-kb"] });
    expect(result.preserved).toContain("obsidian-kb (not superskill-managed)");
  });

  it("configures TOML client (Codex) and escapes the vault path", () => {
    const detected = makeDetected("codex");
    const path = '~/Vaults/a"b\\c\n[mcp_servers.injected]\u007f';
    const result = configureClient(detected, path);
    expect(result.mcpConfigured).toBe(true);
    const content = readFileSync(detected.mcpConfigPath, "utf-8");
    expect(content).toContain("# superskill:start");
    expect(content).toContain('[mcp_servers.superskill]');
    const encoded = content.split("\n").find((line) => line.startsWith("VAULT_PATH = "))!.slice("VAULT_PATH = ".length);
    expect(JSON.parse(encoded)).toBe(path);
    expect(encoded).not.toContain("\u007f");

    const repeat = configureClient(detected, path);
    expect(repeat.mcpConfigured).toBe(false);
    expect(repeat.skipped).toContain("already exists");
  });

  it("configures mdc-file strategy (Cursor) and preserves user content on re-run", () => {
    const detected = makeDetected("cursor");
    const result = configureClient(detected, "/vault");
    expect(result.instructionConfigured).toBe(true);
    const written = readFileSync(detected.instructionPath!, "utf-8");
    expect(written).toContain("alwaysApply: true");
    expect(written).toContain(MARKER_BEGIN_HTML);

    const withUserNote = `${written.trimEnd()}\n\nMy personal cursor rule.\n`;
    writeFileSync(detected.instructionPath!, withUserNote);
    const again = configureClient(detected, "/vault");
    expect(again.instructionConfigured).toBe(false);
    expect(readFileSync(detected.instructionPath!, "utf-8")).toBe(withUserNote);
  });

  it("configures config-array strategy (OpenCode) with markers and user-content preservation", () => {
    const detected = makeDetected("opencode");
    const result = configureClient(detected, "/vault");
    expect(result.instructionConfigured).toBe(true);
    const config = JSON.parse(readFileSync(detected.mcpConfigPath, "utf-8"));
    expect(config.instructions).toEqual([detected.instructionPath]);
    const written = readFileSync(detected.instructionPath!, "utf-8");
    expect(written).toContain(MARKER_BEGIN_HTML);
    expect(written).toContain(INSTRUCTION_TEXT);

    const withUserNote = `${written.trimEnd()}\n\nMy personal opencode notes.\n`;
    writeFileSync(detected.instructionPath!, withUserNote);
    const again = configureClient(detected, "/vault");
    expect(again.instructionConfigured).toBe(false);
    expect(again.skipped).toContain("Instruction already exists");
    expect(readFileSync(detected.instructionPath!, "utf-8")).toBe(withUserNote);
  });

  it("handles none instruction strategy", () => {
    const detected = makeDetected("claude-desktop");
    const result = configureClient(detected, "/vault");
    expect(result.mcpConfigured).toBe(true);
    expect(result.instructionConfigured).toBe(false);
  });

  it("rejects unsupported native clients", () => {
    const detected = makeDetected("aider");
    const result = configureClient(detected, "/vault");
    expect(result.mcpConfigured).toBe(false);
    expect(result.error).toContain("superskill-cli");
    expect(existsSync(detected.mcpConfigPath)).toBe(false);
  });

  it("preserves foreign entries in the same root key", () => {
    const detected = makeDetected("claude-code");
    writeFileSync(
      detected.mcpConfigPath,
      JSON.stringify({ mcpServers: { other: { command: "other-server" } } }),
    );
    configureClient(detected, "/vault");
    const config = JSON.parse(readFileSync(detected.mcpConfigPath, "utf-8"));
    expect(config.mcpServers.other).toEqual({ command: "other-server" });
    expect(config.mcpServers.superskill).toBeDefined();
    expect(readFileSync(detected.instructionPath!, "utf-8")).toContain(MARKER_END_HTML);
  });
});
