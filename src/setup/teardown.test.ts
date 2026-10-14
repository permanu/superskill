import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { teardownClient, teardownAll } from "./teardown.js";
import { CLIENT_REGISTRY } from "./clients.js";
import { detectClient } from "./detect.js";
import type { DetectedClient } from "./types.js";

vi.mock("./detect.js", () => ({
  detectClient: vi.fn().mockReturnValue(null),
}));

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(detectClient).mockReturnValue(null);
});

function makeDetected(slug: string): DetectedClient {
  const root = mkdtempSync(join(tmpdir(), `teardown-${slug}-`));
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

describe("teardownClient", () => {
  it("removes the owned JSON MCP entry and the markdown instruction block", () => {
    const detected = makeDetected("claude-code");
    writeFileSync(
      detected.mcpConfigPath,
      JSON.stringify({ other: 42, mcpServers: { superskill: { command: "npx", args: ["-y", "superskill"] }, keep: { command: "keep" } } }),
    );
    writeFileSync(detected.instructionPath!, "# Personal\n\n<!-- superskill:start -->\nold\n<!-- superskill:end -->\n");

    const result = teardownClient(detected);
    expect(result.error).toBeUndefined();
    expect(result.mcpRemoved).toBe(true);
    expect(result.instructionRemoved).toBe(true);
    const config = JSON.parse(readFileSync(detected.mcpConfigPath, "utf-8"));
    expect(config.mcpServers.superskill).toBeUndefined();
    expect(config.mcpServers.keep).toEqual({ command: "keep" });
    expect(config.other).toBe(42);
    expect(readFileSync(detected.instructionPath!, "utf-8")).toBe("# Personal\n");
  });

  it("preserves foreign superskill entries and reports them", () => {
    const detected = makeDetected("claude-code");
    writeFileSync(
      detected.mcpConfigPath,
      JSON.stringify({ mcpServers: { superskill: { command: "custom-wrapper", args: ["--mine"] } } }),
    );
    const result = teardownClient(detected);
    expect(result.mcpRemoved).toBe(false);
    expect(result.preserved).toEqual(["superskill"]);
    expect(JSON.parse(readFileSync(detected.mcpConfigPath, "utf-8")).mcpServers.superskill.command).toBe("custom-wrapper");
  });

  it("preserves a foreign legacy-named entry while removing an owned one", () => {
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
    const result = teardownClient(detected);
    expect(result.mcpRemoved).toBe(true);
    expect(result.preserved).toEqual(["obsidian-kb"]);
    const config = JSON.parse(readFileSync(detected.mcpConfigPath, "utf-8"));
    expect(config.mcpServers["obsidian-mcp"]).toBeUndefined();
    expect(config.mcpServers["obsidian-kb"]).toBeDefined();
  });

  it("handles missing config and dry run", () => {
    const detected = makeDetected("claude-code");
    const missing = teardownClient(detected);
    expect(missing.mcpRemoved).toBe(false);
    expect(missing.instructionRemoved).toBe(false);

    const dry = teardownClient(detected, { dryRun: true });
    expect(dry.mcpRemoved).toBe(true);
    expect(dry.instructionRemoved).toBe(true);
    expect(existsSync(detected.mcpConfigPath)).toBe(false);
  });

  it("reports unparseable JSON instead of clobbering it", () => {
    const detected = makeDetected("claude-code");
    writeFileSync(detected.mcpConfigPath, "{ broken");
    const result = teardownClient(detected);
    expect(result.error).toContain("Invalid JSON");
    expect(readFileSync(detected.mcpConfigPath, "utf-8")).toBe("{ broken");
  });

  it("removes the owned TOML block (Codex)", () => {
    const detected = makeDetected("codex");
    writeFileSync(
      detected.mcpConfigPath,
      `model = "preserved"\n\n# superskill:start\n[mcp_servers.superskill]\ncommand = "npx"\nargs = ["-y", "superskill"]\n# superskill:end\n`,
    );
    const result = teardownClient(detected);
    expect(result.mcpRemoved).toBe(true);
    const content = readFileSync(detected.mcpConfigPath, "utf-8");
    expect(content).toContain('model = "preserved"');
    expect(content).not.toContain("superskill");
  });

  it("removes an owned unmarked TOML table and leaves foreign tables alone", () => {
    const detected = makeDetected("codex");
    writeFileSync(
      detected.mcpConfigPath,
      `[mcp_servers.superskill]\ncommand = "npx"\nargs = ["-y", "superskill"]\n`,
    );
    expect(teardownClient(detected).mcpRemoved).toBe(true);
    expect(readFileSync(detected.mcpConfigPath, "utf-8")).not.toContain("superskill");

    writeFileSync(
      detected.mcpConfigPath,
      `[mcp_servers.superskill]\ncommand = "npx"\nargs = ["-y", "someone-elses-server"]\n`,
    );
    const foreign = teardownClient(detected);
    expect(foreign.mcpRemoved).toBe(false);
    expect(readFileSync(detected.mcpConfigPath, "utf-8")).toContain("someone-elses-server");
  });

  it("preserves an unmarked user mdc instruction (Cursor)", () => {
    const detected = makeDetected("cursor");
    writeFileSync(detected.instructionPath!, "---\nalwaysApply: true\n---\n");
    const result = teardownClient(detected);
    expect(result.instructionRemoved).toBe(false);
    expect(readFileSync(detected.instructionPath!, "utf-8")).toBe("---\nalwaysApply: true\n---\n");
  });

  it("removes the config-array instruction path without deleting user notes (OpenCode)", () => {
    const detected = makeDetected("opencode");
    writeFileSync(detected.mcpConfigPath, JSON.stringify({ instructions: [detected.instructionPath, "/other/path"] }));
    writeFileSync(detected.instructionPath!, "notes");
    const result = teardownClient(detected);
    expect(result.instructionRemoved).toBe(false);
    expect(JSON.parse(readFileSync(detected.mcpConfigPath, "utf-8")).instructions).toEqual(["/other/path"]);
    expect(readFileSync(detected.instructionPath!, "utf-8")).toBe("notes");
  });

  it("leaves the config array alone when the instruction path is not listed", () => {
    const detected = makeDetected("opencode");
    writeFileSync(detected.mcpConfigPath, JSON.stringify({ instructions: ["/other/path"] }));
    const before = readFileSync(detected.mcpConfigPath, "utf-8");
    teardownClient(detected);
    expect(readFileSync(detected.mcpConfigPath, "utf-8")).toBe(before);
  });

  it("handles none instruction strategy", () => {
    const detected = makeDetected("claude-desktop");
    const result = teardownClient(detected);
    expect(result.instructionRemoved).toBe(false);
  });

  it("reports slash commands as a dry-run marker", () => {
    const detected = makeDetected("opencode");
    const result = teardownClient(detected, { dryRun: true });
    expect(result.slashCommandsRemoved).toEqual(["(dry-run)"]);
  });

  it("removes an owned legacy setup entry from a legacy config file", () => {
    const detected = makeDetected("continue");
    detected.mcpConfigPath = join(dirname(detected.mcpConfigPath), "continue", "mcpServers", "superskill.json");
    const legacy = join(dirname(detected.mcpConfigPath), "../config.json");
    mkdirSync(dirname(legacy), { recursive: true });
    writeFileSync(legacy, JSON.stringify({ other: 42, mcpServers: { superskill: { command: "npx", args: ["-y", "superskill"], env: { VAULT_PATH: "/v" } } } }));
    teardownClient(detected);
    expect(JSON.parse(readFileSync(legacy, "utf-8"))).toEqual({ other: 42, mcpServers: {} });
  });
});

describe("teardownAll", () => {
  it("returns empty array when no clients detected", async () => {
    const results = await teardownAll();
    expect(results).toEqual([]);
  });

  it("scopes teardown to the requested client slugs", async () => {
    vi.mocked(detectClient).mockReturnValue(makeDetected("codex"));

    const results = await teardownAll({ clients: ["codex"] });

    expect(results).toHaveLength(1);
    expect(vi.mocked(detectClient).mock.calls).toHaveLength(1);
    expect(vi.mocked(detectClient).mock.calls[0][0].slug).toBe("codex");
  });
});
