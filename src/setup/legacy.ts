import { existsSync } from "fs";
import { dirname, join } from "path";
import type { DetectedClient } from "./types.js";
import { readJsonConfig, removeMcpEntry, writeJsonConfig } from "./json-config.js";
import { removeMarkdownInstruction } from "./instructions.js";

export function legacyMcpEntry(detected: DetectedClient): Record<string, unknown> | undefined {
  const relative = detected.config.slug === "windsurf" ? "mcp.json" : detected.config.slug === "continue" ? "../config.json" : undefined;
  if (!relative) return undefined;
  const path = join(dirname(detected.mcpConfigPath), relative);
  if (!existsSync(path)) return undefined;
  const entry = readJsonConfig(path)?.mcpServers?.superskill;
  return entry?.command === "npx" && JSON.stringify(entry.args) === JSON.stringify(["-y", "superskill"]) && typeof entry.env?.VAULT_PATH === "string" ? entry : undefined;
}

export function removeLegacySetup(detected: DetectedClient): void {
  const { config, mcpConfigPath, instructionPath } = detected;
  const relative = config.slug === "windsurf" ? "mcp.json" : config.slug === "continue" ? "../config.json" : undefined;
  if (relative) {
    const legacyPath = join(dirname(mcpConfigPath), relative);
    if (existsSync(legacyPath)) {
      const existing = readJsonConfig(legacyPath);
      const entry = existing?.mcpServers?.superskill;
      if (entry?.command === "npx" && JSON.stringify(entry.args) === JSON.stringify(["-y", "superskill"]) && typeof entry.env?.VAULT_PATH === "string") {
        const cleaned = removeMcpEntry(existing!, "mcpServers", "superskill");
        writeJsonConfig(legacyPath, cleaned.config);
      }
    }
  }
  if (config.slug === "windsurf" && instructionPath) {
    removeMarkdownInstruction(join(dirname(instructionPath), "../rules/superskill.md"));
  }
  if (config.slug === "droid" && instructionPath) {
    removeMarkdownInstruction(join(dirname(instructionPath), "CLAUDE.md"));
  }
}
