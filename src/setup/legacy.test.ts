import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { legacyMcpEntry, removeLegacySetup } from "./legacy.js";
import { CLIENT_REGISTRY } from "./clients.js";
import type { DetectedClient } from "./types.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function detectedWithLegacyConfig(): { detected: DetectedClient; legacyPath: string } {
  const root = mkdtempSync(join(tmpdir(), "legacy-launcher-"));
  roots.push(root);
  const config = CLIENT_REGISTRY.find(client => client.slug === "windsurf")!;
  const detected: DetectedClient = { config, mcpConfigPath: join(root, "current.json") };
  return { detected, legacyPath: join(root, "mcp.json") };
}

describe("legacy launcher migration", () => {
  it("recognizes but preserves a pinned legacy entry instead of migrating or removing it", () => {
    const { detected, legacyPath } = detectedWithLegacyConfig();
    const original = JSON.stringify({ mcpServers: { superskill: {
      command: "npx",
      args: ["-y", "superskill@next"],
      env: { VAULT_PATH: "/user/vault" },
    } } });
    writeFileSync(legacyPath, original);

    expect(legacyMcpEntry(detected)).toBeUndefined();
    expect(removeLegacySetup(detected).preserved).toContain("legacy superskill entry (pinned or customized launcher)");
    expect(readFileSync(legacyPath, "utf8")).toBe(original);
  });

  it("migrates and removes only the recognized unversioned legacy launcher", () => {
    const { detected, legacyPath } = detectedWithLegacyConfig();
    const entry = { command: "npx", args: ["-y", "superskill"], env: { VAULT_PATH: "/user/vault" } };
    writeFileSync(legacyPath, JSON.stringify({ mcpServers: { superskill: entry } }));

    expect(legacyMcpEntry(detected)).toEqual(entry);
    expect(removeLegacySetup(detected).removed).toContain("legacy superskill entry");
    expect(JSON.parse(readFileSync(legacyPath, "utf8")).mcpServers.superskill).toBeUndefined();
  });
});
