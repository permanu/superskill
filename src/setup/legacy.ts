// SPDX-License-Identifier: Apache-2.0
import { existsSync } from "fs";
import { dirname, join } from "path";
import type { DetectedClient } from "./types.js";
import { readJsonConfig, removeMcpEntry, updateJsonConfig } from "./json-config.js";
import { isManagedLauncher } from "./launcher.js";
import { removeMarkdownInstruction } from "./instructions.js";

export interface LegacySetupResult {
  removed: string[];
  preserved: string[];
}

function legacyConfigPath(detected: DetectedClient): string | undefined {
  const relative = detected.config.slug === "windsurf" ? "mcp.json" : detected.config.slug === "continue" ? "../config.json" : undefined;
  if (!relative) return undefined;
  return join(dirname(detected.mcpConfigPath), relative);
}

export function legacyMcpEntry(detected: DetectedClient): Record<string, unknown> | undefined {
  const path = legacyConfigPath(detected);
  if (!path || !existsSync(path)) return undefined;
  const entry = readJsonConfig(path)?.mcpServers?.superskill;
  if (!isManagedLauncher(entry)) return undefined;
  const env = (entry as { env?: Record<string, unknown> }).env;
  return typeof env?.VAULT_PATH === "string" ? (entry as Record<string, unknown>) : undefined;
}

export function removeLegacySetup(detected: DetectedClient): LegacySetupResult {
  const { config, instructionPath } = detected;
  const result: LegacySetupResult = { removed: [], preserved: [] };
  const legacyPath = legacyConfigPath(detected);

  if (legacyPath && existsSync(legacyPath)) {
    const existing = readJsonConfig(legacyPath);
    const entry = existing?.mcpServers?.superskill;
    if (entry !== undefined) {
      if (isManagedLauncher(entry)) {
        const written = updateJsonConfig(legacyPath, (current) => {
          if (!isManagedLauncher(current.mcpServers?.superskill)) return null;
          const { config: cleaned, removed } = removeMcpEntry(current, "mcpServers", "superskill");
          return removed ? cleaned : null;
        });
        if (written) result.removed.push("legacy superskill entry");
      } else {
        result.preserved.push("legacy superskill entry (custom command)");
      }
    }
  }

  if (config.slug === "windsurf" && instructionPath) {
    removeMarkdownInstruction(join(dirname(instructionPath), "../rules/superskill.md"));
  }
  if (config.slug === "droid" && instructionPath) {
    removeMarkdownInstruction(join(dirname(instructionPath), "CLAUDE.md"));
  }

  return result;
}
