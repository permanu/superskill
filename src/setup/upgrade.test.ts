import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { upgradeCommand } from "./upgrade.js";
import { CLIENT_REGISTRY } from "./clients.js";
import { detectClients } from "./detect.js";
import type { DetectedClient } from "./types.js";
import { MARKER_BEGIN_HTML, PREVIOUS_INSTRUCTION_TEXT } from "./types.js";

vi.mock("./detect.js", () => ({
  detectClients: vi.fn().mockReturnValue([]),
}));

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
beforeEach(() => {
  vi.mocked(detectClients).mockReturnValue([]);
});

function makeDetected(slug: string): DetectedClient {
  const root = mkdtempSync(join(tmpdir(), `upgrade-${slug}-`));
  roots.push(root);
  const source = CLIENT_REGISTRY.find((client) => client.slug === slug)!;
  return {
    config: source,
    mcpConfigPath: join(root, slug === "codex" ? "config.toml" : "config.json"),
    instructionPath: join(root, slug === "cursor" ? "superskill.mdc" : "AGENTS.md"),
  };
}

function use(clients: DetectedClient[]): void {
  vi.mocked(detectClients).mockReturnValue(clients);
}

describe("upgradeCommand", () => {
  it.each(["claude-code", "opencode"])("repairs an existing latest %s launcher without a shell PATH", async (slug) => {
    const detected = makeDetected(slug);
    const { rootKey, commandType, envKey } = detected.config;
    const launcher = commandType === "array"
      ? { command: ["npx", "-y", "--prefer-online", "superskill@latest"] }
      : { command: "npx", args: ["-y", "--prefer-online", "superskill@latest"] };
    writeFileSync(detected.mcpConfigPath, JSON.stringify({ [rootKey]: { superskill: { ...launcher, [envKey]: { VAULT_PATH: "/existing-vault", CUSTOM: "keep" } } } }));
    use([detected]);
    await upgradeCommand({ dryRun: true });
    expect(JSON.parse(readFileSync(detected.mcpConfigPath, "utf8"))[rootKey].superskill[envKey]).not.toHaveProperty("PATH");
    expect((await upgradeCommand({})).clients[0].action).toBe("updated");
    const upgraded = JSON.parse(readFileSync(detected.mcpConfigPath, "utf8"))[rootKey].superskill;
    expect(upgraded[envKey]).toEqual({ VAULT_PATH: "/existing-vault", CUSTOM: "keep", PATH: expect.any(String) });
    expect((await upgradeCommand({})).clients[0].action).toBe("unchanged");
    upgraded[envKey].PATH = "/custom/path";
    writeFileSync(detected.mcpConfigPath, JSON.stringify({ [rootKey]: { superskill: upgraded } }));
    await upgradeCommand({});
    expect(JSON.parse(readFileSync(detected.mcpConfigPath, "utf8"))[rootKey].superskill[envKey].PATH).toBe("/custom/path");
  });

  it("reports and reconciles launcher drift plus instruction refresh", async () => {
    const detected = makeDetected("claude-code");
    writeFileSync(
      detected.mcpConfigPath,
      JSON.stringify({ mcpServers: { superskill: { command: "npx", args: ["-y", "superskill"], env: { VAULT_PATH: "/vault" } } } }),
    );
    use([detected]);

    const dry = await upgradeCommand({ dryRun: true });
    expect(dry.clients).toHaveLength(1);
    expect(dry.clients[0].action).toBe("updated");
    expect(dry.clients[0].detail).toContain("would reconcile launcher");
    const unchangedOnDisk = JSON.parse(readFileSync(detected.mcpConfigPath, "utf-8"));
    expect(unchangedOnDisk.mcpServers.superskill.args).toEqual(["-y", "superskill"]);
    expect(existsSync(detected.instructionPath!)).toBe(false);

    const report = await upgradeCommand({});
    expect(report.clients[0].action).toBe("updated");
    expect(report.clients[0].detail).toContain("reconciled launcher");
    const upgraded = JSON.parse(readFileSync(detected.mcpConfigPath, "utf-8"));
    expect(upgraded.mcpServers.superskill.args).toEqual(["-y", "--prefer-online", "superskill@latest"]);
    expect(upgraded.mcpServers.superskill.env.VAULT_PATH).toBe("/vault");
    expect(readFileSync(detected.instructionPath!, "utf-8")).toContain(MARKER_BEGIN_HTML);

    const second = await upgradeCommand({});
    expect(second.clients[0].action).toBe("unchanged");
  });

  it("removes owned legacy entries while upgrading", async () => {
    const detected = makeDetected("claude-code");
    writeFileSync(
      detected.mcpConfigPath,
      JSON.stringify({
        mcpServers: {
          superskill: { command: "npx", args: ["-y", "--prefer-online", "superskill@latest"], env: { VAULT_PATH: "/vault" } },
          "obsidian-mcp": { command: "npx", args: ["-y", "superskill"] },
        },
      }),
    );
    use([detected]);
    const report = await upgradeCommand({});
    expect(report.clients[0].action).toBe("updated");
    expect(report.clients[0].detail).toContain("removed legacy entry obsidian-mcp");
    const config = JSON.parse(readFileSync(detected.mcpConfigPath, "utf-8"));
    expect(config.mcpServers["obsidian-mcp"]).toBeUndefined();
  });

  it.each([
    ["claude-code", { command: "npx", args: ["-y", "superskill@0.13.0"] }],
    ["claude-code", { command: "npx", args: ["-y", "superskill@1.2.3-beta.1"] }],
    ["claude-code", { command: "npx", args: ["-y", "superskill@next"] }],
    ["claude-code", { command: "npx", args: ["-y", "github:permanu/superskill#feature/ref"] }],
    ["claude-code", { command: "npx", args: ["-y", "superskill", "--custom", "value"] }],
    ["claude-code", { command: "superskill", args: ["--custom"] }],
    ["claude-code", { command: "/usr/local/bin/superskill" }],
    ["opencode", { command: ["npx", "-y", "superskill@0.13.0"] }],
    ["opencode", { command: ["npx", "-y", "superskill@1.2.3-beta.1"] }],
    ["opencode", { command: ["npx", "-y", "superskill@next"] }],
    ["opencode", { command: ["npx", "-y", "github:permanu/superskill#feature/ref"] }],
    ["opencode", { command: ["npx", "-y", "superskill", "--custom", "value"] }],
    ["opencode", { command: ["superskill", "--custom"] }],
    ["opencode", { command: ["/usr/local/bin/superskill"] }],
  ] as const)("preserves pinned, customized, and direct launchers byte-for-byte (%s)", async (slug, entry) => {
    const detected = makeDetected(slug);
    const rootKey = detected.config.rootKey;
    const envKey = detected.config.envKey;
    const configuredEntry = { ...entry, [envKey]: { VAULT_PATH: "/user/vault", EXTRA: "keep" } };
    const config = {
      [rootKey]: { superskill: configuredEntry, untouched: { keep: true } },
      ...(slug === "opencode" ? { instructions: [detected.instructionPath] } : {}),
    };
    const original = JSON.stringify(config);
    writeFileSync(detected.mcpConfigPath, original);
    use([detected]);

    await upgradeCommand({});

    expect(readFileSync(detected.mcpConfigPath, "utf-8")).toBe(original);
  });

  it("does not remove a pinned legacy alias just because it names this package", async () => {
    const detected = makeDetected("claude-code");
    const original = JSON.stringify({
      mcpServers: {
        superskill: { command: "npx", args: ["-y", "--prefer-online", "superskill@latest"] },
        "obsidian-mcp": { command: "npx", args: ["-y", "superskill@next"] },
      },
    });
    writeFileSync(detected.mcpConfigPath, original);
    use([detected]);

    await upgradeCommand({});

    const config = JSON.parse(readFileSync(detected.mcpConfigPath, "utf-8"));
    expect(config.mcpServers["obsidian-mcp"]).toEqual({ command: "npx", args: ["-y", "superskill@next"] });
  });

  it("upgrades the exact OpenCode array legacy launcher and preserves its environment", async () => {
    const detected = makeDetected("opencode");
    writeFileSync(detected.mcpConfigPath, JSON.stringify({
      mcp: {
        superskill: {
          command: ["npx", "-y", "superskill"],
          environment: { VAULT_PATH: "/user/vault", EXTRA: "keep" },
        },
      },
      instructions: [detected.instructionPath],
    }));
    use([detected]);

    const report = await upgradeCommand({});

    expect(report.clients[0].detail).toContain("reconciled launcher");
    const config = JSON.parse(readFileSync(detected.mcpConfigPath, "utf-8"));
    expect(config.mcp.superskill.command).toEqual(["npx", "-y", "--prefer-online", "superskill@latest"]);
    expect(config.mcp.superskill.environment).toEqual({ VAULT_PATH: "/user/vault", EXTRA: "keep", PATH: expect.any(String) });
  });

  it("normalizes an exact string-form legacy launcher for OpenCode without retaining stale args", async () => {
    const detected = makeDetected("opencode");
    writeFileSync(detected.mcpConfigPath, JSON.stringify({
      mcp: {
        superskill: {
          command: "npx",
          args: ["-y", "superskill"],
          environment: { VAULT_PATH: "/user/vault", EXTRA: "keep" },
        },
      },
      instructions: [detected.instructionPath],
    }));
    use([detected]);

    await upgradeCommand({});

    const config = JSON.parse(readFileSync(detected.mcpConfigPath, "utf-8"));
    expect(config.mcp.superskill.command).toEqual(["npx", "-y", "--prefer-online", "superskill@latest"]);
    expect(config.mcp.superskill).not.toHaveProperty("args");
    expect(config.mcp.superskill.environment).toEqual({ VAULT_PATH: "/user/vault", EXTRA: "keep", PATH: expect.any(String) });
  });

  it("preserves custom entries while still refreshing their instruction block", async () => {
    const detected = makeDetected("claude-code");
    const custom = JSON.stringify({ mcpServers: { superskill: { command: "custom-wrapper" } } });
    writeFileSync(detected.mcpConfigPath, custom);
    use([detected]);
    const report = await upgradeCommand({});
    expect(report.clients[0].action).toBe("updated");
    expect(report.clients[0].detail).toContain("refreshed instruction block");
    expect(readFileSync(detected.mcpConfigPath, "utf-8")).toBe(custom);
    expect(readFileSync(detected.instructionPath!, "utf-8")).toContain(MARKER_BEGIN_HTML);
  });

  it("converts unmarked legacy instruction files to the marked block", async () => {
    const detected = makeDetected("opencode");
    writeFileSync(
      detected.mcpConfigPath,
      JSON.stringify({
        mcp: { superskill: { command: "npx", args: ["-y", "--prefer-online", "superskill@latest"] } },
        instructions: [detected.instructionPath],
      }),
    );
    writeFileSync(detected.instructionPath!, `${PREVIOUS_INSTRUCTION_TEXT}\n`);
    use([detected]);
    const report = await upgradeCommand({});
    expect(report.clients[0].action).toBe("updated");
    expect(report.clients[0].detail).toContain("refreshed instruction block");
    const content = readFileSync(detected.instructionPath!, "utf-8");
    expect(content).toContain(MARKER_BEGIN_HTML);
    expect(content).not.toContain(PREVIOUS_INSTRUCTION_TEXT);
  });

  it("skips clients without an entry and unsupported clients", async () => {
    const missing = makeDetected("claude-code");
    writeFileSync(missing.mcpConfigPath, JSON.stringify({ mcpServers: {} }));
    const aider = makeDetected("aider");
    use([missing, aider]);
    const report = await upgradeCommand({});
    expect(report.clients[0].action).toBe("skipped");
    expect(report.clients[0].detail).toContain("no superskill MCP entry");
    expect(report.clients[1].action).toBe("skipped");
    expect(report.clients[1].detail).toContain("unsupported");
  });

  it("reports invalid JSON as an error", async () => {
    const detected = makeDetected("claude-code");
    writeFileSync(detected.mcpConfigPath, "{ broken");
    use([detected]);
    const report = await upgradeCommand({});
    expect(report.clients[0].action).toBe("error");
    expect(report.clients[0].detail).toContain("Invalid JSON");
  });

  it("upgrades an owned unmarked TOML launcher (Codex)", async () => {
    const detected = makeDetected("codex");
    writeFileSync(
      detected.mcpConfigPath,
      `[mcp_servers.superskill]\ncommand = "npx"\nargs = ["-y", "superskill"]\n\n[mcp_servers.superskill.env]\nVAULT_PATH = "/vault"\n`,
    );
    use([detected]);
    const dry = await upgradeCommand({ dryRun: true });
    expect(dry.clients[0].action).toBe("updated");
    expect(readFileSync(detected.mcpConfigPath, "utf-8")).toContain('args = ["-y", "superskill"]');

    const report = await upgradeCommand({});
    expect(report.clients[0].action).toBe("updated");
    const content = readFileSync(detected.mcpConfigPath, "utf-8");
    expect(content).toContain('args = ["-y", "--prefer-online", "superskill@latest"]');
    expect(content).toContain('VAULT_PATH = "/vault"');
  });

  it("returns an empty report when no clients are detected", async () => {
    const report = await upgradeCommand({ json: true });
    expect(report).toEqual({ clients: [] });
  });
});
