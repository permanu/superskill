// SPDX-License-Identifier: Apache-2.0
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import { legacyMcpEntry, removeLegacySetup } from "./legacy.js";
import type { DetectedClient, SetupResult } from "./types.js";
import { INSTRUCTION_TEXT } from "./types.js";
import { readJsonConfig, writeJsonConfig, addMcpEntry, removeMcpEntry } from "./json-config.js";
import { insertTomlBlock } from "./toml-config.js";
import {
  writeMarkdownInstruction,
  writeMdcInstruction,
} from "./instructions.js";
import { installSlashCommands } from "./commands.js";

export function buildMcpEntry(
  commandType: "string" | "array",
  envKey: string,
  vaultPath: string,
  extraFields?: Record<string, unknown>
): Record<string, unknown> {
  const base: Record<string, unknown> = { ...extraFields };

  if (commandType === "array") {
    base.command = ["npx", "-y", "--prefer-online", "superskill@latest"];
  } else {
    base.command = "npx";
    base.args = ["-y", "--prefer-online", "superskill@latest"];
  }

  base[envKey] = { VAULT_PATH: vaultPath };
  return base;
}

function buildTomlBlock(vaultPath: string): string {
  return `[mcp_servers.superskill]
command = "npx"
args = ["-y", "--prefer-online", "superskill@latest"]

[mcp_servers.superskill.env]
VAULT_PATH = ${JSON.stringify(vaultPath).replace(/\x7f/g, "\\u007f")}`;
}

export function configureClient(
  detected: DetectedClient,
  vaultPath: string,
  options: { dryRun?: boolean; force?: boolean } = {}
): SetupResult {
  const { config, mcpConfigPath, instructionPath } = detected;
  const result: SetupResult = {
    client: config.name,
    mcpConfigured: false,
    instructionConfigured: false,
  };

  if (config.support === "unsupported") {
    result.error = config.supportNote ?? "Native MCP setup is unsupported. Use superskill-cli instead.";
    return result;
  }

  try {
    // 0. Migrate: remove old obsidian-mcp / obsidian-kb entries
    const LEGACY_NAMES = ["obsidian-mcp", "obsidian-kb"];
    if (!options.dryRun && config.configFormat === "json" && existsSync(mcpConfigPath)) {
      try {
        let migrated = readJsonConfig(mcpConfigPath);
        if (migrated) {
          let anyLegacyRemoved = false;
          for (const oldName of LEGACY_NAMES) {
            const result = removeMcpEntry(migrated, config.rootKey, oldName);
            if (result?.removed) { migrated = result.config; anyLegacyRemoved = true; }
          }
          if (anyLegacyRemoved) writeJsonConfig(mcpConfigPath, migrated);
        }
      } catch { /* migration is best-effort */ }
    }

    // 1. Configure MCP entry
    if (config.configFormat === "json") {
      if (options.dryRun) {
        result.mcpConfigured = true;
      } else {
        const existing = readJsonConfig(mcpConfigPath);
        if (existing === null) {
          result.error = `Invalid JSON in ${mcpConfigPath} — skipped`;
          return result;
        }
        let entry = buildMcpEntry(
          config.commandType,
          config.envKey,
          vaultPath,
          config.extraFields
        );
        if (!existing[config.rootKey]?.superskill && !options.force) {
          const legacy = legacyMcpEntry(detected);
          if (legacy) entry = { ...legacy, command: entry.command, args: entry.args };
        }
        const merged = addMcpEntry(
          existing,
          config.rootKey,
          "superskill",
          entry,
          options.force
        );
        if (merged.alreadyExists) {
          result.skipped = "MCP entry already exists";
        } else {
          writeJsonConfig(mcpConfigPath, merged.config);
          result.mcpConfigured = true;
        }
      }
    } else {
      // TOML (Codex)
      if (options.dryRun) {
        result.mcpConfigured = true;
      } else {
        const content = existsSync(mcpConfigPath)
          ? readFileSync(mcpConfigPath, "utf-8")
          : "";
        const block = buildTomlBlock(vaultPath);
        const updated = insertTomlBlock(content, block, options.force);
        if (updated === null) {
          result.skipped = "MCP entry already exists";
        } else {
          const dir = dirname(mcpConfigPath);
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          writeFileSync(mcpConfigPath, updated, "utf-8");
          result.mcpConfigured = true;
        }
      }
    }

    // 2. Configure instruction
    if (config.instructionStrategy === "none") {
      // nothing to do
    } else if (options.dryRun) {
      result.instructionConfigured = true;
    } else if (config.instructionStrategy === "markdown-file" && instructionPath) {
      const status = writeMarkdownInstruction(instructionPath, options.force);
      result.instructionConfigured = status !== "exists";
      if (status === "exists") {
        result.skipped = (result.skipped ? result.skipped + "; " : "") + "Instruction already exists";
      }
    } else if (config.instructionStrategy === "mdc-file" && instructionPath) {
      writeMdcInstruction(instructionPath);
      result.instructionConfigured = true;
    } else if (config.instructionStrategy === "config-array" && instructionPath) {
      // OpenCode: add instruction file path to config + write instruction file
      const configPath = detected.mcpConfigPath;
      const existing = readJsonConfig(configPath);
      if (existing === null) {
        result.error = (result.error ? result.error + "; " : "") +
          `Invalid JSON in ${configPath} — skipped instruction config`;
        return result;
      }
      const instructions: string[] = existing.instructions ?? [];
      if (!instructions.includes(instructionPath)) {
        existing.instructions = [...instructions, instructionPath];
        writeJsonConfig(configPath, existing);
      }
      // Write the instruction file itself
      const dir = dirname(instructionPath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(instructionPath, INSTRUCTION_TEXT + "\n", "utf-8");
      result.instructionConfigured = true;
    }

    if (!options.dryRun) removeLegacySetup(detected);

    // 3. Install host-native slash commands (/review, /worktree, /superskill)
    if (config.commandPaths) {
      const slash = installSlashCommands(config, { dryRun: options.dryRun });
      if (slash.installed.length > 0) {
        result.slashCommandsInstalled = slash.installed;
      }
      if (slash.skipped.length > 0) {
        result.skipped = (result.skipped ? result.skipped + "; " : "") + `commands kept: ${slash.skipped.join(", ")}`;
      }
    }
  } catch (e: unknown) {
    result.error = (e as Error).message;
  }

  return result;
}
