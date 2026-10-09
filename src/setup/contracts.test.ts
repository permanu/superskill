import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join, dirname } from "path";
import { Command } from "commander";
import { CLIENT_REGISTRY } from "./clients.js";
import { configureClient } from "./configure.js";
import { teardownClient } from "./teardown.js";
import { registerSetupCommands } from "./index.js";

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

function fixture(slug: string) {
  const root = mkdtempSync(join(tmpdir(), "superskill-client-contract-"));
  roots.push(root);
  const source = CLIENT_REGISTRY.find(c => c.slug === slug)!;
  const commands = join(root, "commands");
  const config = { ...source, commandPaths: source.commandPaths ? { darwin: commands, linux: commands, win32: commands } : undefined };
  return { config, mcpConfigPath: join(root, "config"), instructionPath: join(root, "instructions.md") };
}

describe("documented harness contracts", () => {
  it.each(CLIENT_REGISTRY.filter(c => c.slug !== "aider").map(c => c.slug))("%s preserves unrelated config across setup, repeat and teardown", slug => {
    const detected = fixture(slug);
    const { config, mcpConfigPath } = detected;
    mkdirSync(dirname(mcpConfigPath), { recursive: true });
    const existing = config.configFormat === "json" ? JSON.stringify({ unrelated: 42, [config.rootKey]: { other: { command: "other" } } }) : 'model = "preserved"\n';
    writeFileSync(mcpConfigPath, existing);
    expect(configureClient(detected, "/tmp/vault with spaces").error).toBeUndefined();
    const first = readFileSync(mcpConfigPath, "utf8");
    expect(configureClient(detected, "/tmp/vault with spaces").error).toBeUndefined();
    expect(readFileSync(mcpConfigPath, "utf8")).toBe(first);
    if (config.configFormat === "json") {
      const entry = JSON.parse(first)[config.rootKey].superskill;
      expect(entry[config.envKey].VAULT_PATH).toBe("/tmp/vault with spaces");
      if (slug === "crush") expect(entry.type).toBe("stdio");
      if (slug === "opencode") expect(entry).toMatchObject({ type: "local", command: ["npx", "-y", "--prefer-online", "superskill@latest"] });
    }
    expect(teardownClient(detected).error).toBeUndefined();
    const final = readFileSync(mcpConfigPath, "utf8");
    if (config.configFormat === "json") {
      expect(JSON.parse(final)[config.rootKey]).toEqual({ other: { command: "other" } });
      expect(JSON.parse(final).unrelated).toBe(42);
    } else expect(final).toContain('model = "preserved"');
    expect(teardownClient(detected).error).toBeUndefined();
    expect(readFileSync(mcpConfigPath, "utf8")).toBe(final);
  });

  it("uses documented corrected paths", () => {
    const entry = (slug: string) => CLIENT_REGISTRY.find(c => c.slug === slug)!;
    expect(entry("windsurf").mcpConfigPaths.darwin).toBe("~/.codeium/windsurf/mcp_config.json");
    expect(entry("windsurf").instructionPaths?.darwin).toBe("~/.codeium/windsurf/memories/global_rules.md");
    expect(entry("continue").mcpConfigPaths.darwin).toBe("~/.continue/mcpServers/superskill.json");
    expect(entry("droid").instructionPaths?.darwin).toBe("~/.factory/AGENTS.md");
  });

  it.each([false, true])("rejects unsupported native Aider setup, including dry run=%s", dryRun => {
    const detected = fixture("aider");
    const result = configureClient(detected, "/tmp/vault", { dryRun });
    expect(result.mcpConfigured).toBe(false);
    expect(result.error).toContain("superskill-cli");
    expect(existsSync(detected.mcpConfigPath)).toBe(false);
  });

  it.each(["windsurf", "continue"])("%s migrates only a generated legacy MCP entry", slug => {
    const detected = fixture(slug);
    if (slug === "continue") detected.mcpConfigPath = join(dirname(detected.mcpConfigPath), "mcpServers", "superskill.json");
    const legacy = join(dirname(detected.mcpConfigPath), slug === "continue" ? "../config.json" : "mcp.json");
    mkdirSync(dirname(legacy), { recursive: true });
    writeFileSync(legacy, JSON.stringify({ other: 42, mcpServers: { superskill: { command: "npx", args: ["-y", "superskill"], env: { VAULT_PATH: "/existing-vault", CUSTOM: "keep" } }, unrelated: { command: "keep" } } }));
    expect(configureClient(detected, "/tmp/vault").error).toBeUndefined();
    expect(JSON.parse(readFileSync(detected.mcpConfigPath, "utf8")).mcpServers.superskill.env).toEqual({ VAULT_PATH: "/existing-vault", CUSTOM: "keep" });
    expect(JSON.parse(readFileSync(legacy, "utf8"))).toEqual({ other: 42, mcpServers: { unrelated: { command: "keep" } } });
    writeFileSync(legacy, JSON.stringify({ mcpServers: { superskill: { command: "custom-wrapper" } } }));
    configureClient(detected, "/tmp/vault");
    expect(JSON.parse(readFileSync(legacy, "utf8")).mcpServers.superskill.command).toBe("custom-wrapper");
  });

  it("removes only the managed Droid legacy instruction block", () => {
    const detected = fixture("droid");
    const legacy = join(dirname(detected.instructionPath!), "CLAUDE.md");
    writeFileSync(legacy, "# Personal guidance\n<!-- superskill:start -->\nold guidance\n<!-- superskill:end -->\n");
    expect(configureClient(detected, "/tmp/vault").error).toBeUndefined();
    expect(readFileSync(legacy, "utf8")).toBe("# Personal guidance\n");
    expect(readFileSync(detected.instructionPath!, "utf8")).toContain("superskill:start");
  });

  it("rejects unknown setup client before writing anything", async () => {
    const program = new Command().exitOverride();
    registerSetupCommands(program);
    await expect(program.parseAsync(["node", "cli", "setup", "--clients", "typo-client", "--dry-run"])).rejects.toThrow("Unknown client");
  });
});
