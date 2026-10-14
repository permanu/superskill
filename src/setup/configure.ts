// SPDX-License-Identifier: Apache-2.0
import { existsSync } from "fs";
import { assertSafeSetupPath, readSetupText, writeSetupText } from "./file-safety.js";
import { legacyMcpEntry, removeLegacySetup } from "./legacy.js";
import type { DetectedClient, SetupResult } from "./types.js";
import {
  readJsonConfig,
  updateJsonConfig,
  addMcpEntry,
  removeMcpEntry,
} from "./json-config.js";
import { isManagedLauncher, isOurTool, LATEST_ARGS, LATEST_ARRAY } from "./launcher.js";
import { insertTomlBlock } from "./toml-config.js";
import {
  planMarkdownInstruction,
  planMdcInstruction,
  writeMarkdownInstruction,
  writeMdcInstruction,
} from "./instructions.js";
import { installSlashCommands } from "./commands.js";

const LEGACY_NAMES = ["obsidian-mcp", "obsidian-kb"];

export function buildLauncher(commandType: "string" | "array"): { command: string | string[]; args?: string[] } {
  if (commandType === "array") return { command: [...LATEST_ARRAY] };
  return { command: "npx", args: [...LATEST_ARGS] };
}

export function buildMcpEntry(
  commandType: "string" | "array",
  envKey: string,
  vaultPath: string,
  extraFields?: Record<string, unknown>
): Record<string, unknown> {
  const base: Record<string, unknown> = { ...extraFields };
  const launcher = buildLauncher(commandType);
  base.command = launcher.command;
  if (launcher.args) base.args = launcher.args;
  base[envKey] = { VAULT_PATH: vaultPath };
  return base;
}

export function buildTomlBlock(vaultPath: string): string {
  return `[mcp_servers.superskill]
command = "npx"
args = ["-y", "--prefer-online", "superskill@latest"]

[mcp_servers.superskill.env]
VAULT_PATH = ${JSON.stringify(vaultPath).replace(/\x7f/g, "\\u007f")}`;
}

function appendSkip(current: string | undefined, message: string): string {
  return current ? `${current}; ${message}` : message;
}

function legacyEntryNames(existing: Record<string, any>, rootKey: string): { owned: string[]; preserved: string[]; foreign: string[] } {
  const owned: string[] = [];
  const preserved: string[] = [];
  const foreign: string[] = [];
  const root = existing[rootKey];
  if (typeof root !== "object" || root === null) return { owned, preserved, foreign };
  for (const name of LEGACY_NAMES) {
    const entry = (root as Record<string, unknown>)[name];
    if (entry === undefined) continue;
    if (isManagedLauncher(entry)) owned.push(name);
    else if (isOurTool(entry)) preserved.push(name);
    else foreign.push(name);
  }
  return { owned, preserved, foreign };
}

export function configureClient(
  detected: DetectedClient,
  vaultPath: string,
  options: { dryRun?: boolean; check?: boolean; force?: boolean } = {}
): SetupResult {
  const { config, mcpConfigPath, instructionPath } = detected;
  const readOnly = options.dryRun === true || options.check === true;
  const force = options.force === true;
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
    assertSafeSetupPath(mcpConfigPath);
    if (instructionPath) assertSafeSetupPath(instructionPath);
    if (config.configFormat === "json" && existsSync(mcpConfigPath)) {
      const existing = readJsonConfig(mcpConfigPath);
      if (existing === null) {
        result.error = `Invalid JSON in ${mcpConfigPath} — skipped`;
        return result;
      }
      if (config.instructionStrategy === "config-array" && existing.instructions !== undefined && !Array.isArray(existing.instructions)) {
        result.error = `Invalid instructions array in ${mcpConfigPath} — skipped`;
        return result;
      }
      const { owned, preserved, foreign } = legacyEntryNames(existing, config.rootKey);
      if (foreign.length > 0) result.preserved = foreign.map((name) => `${name} (not superskill-managed)`);
      if (preserved.length > 0) {
        result.preserved = [...(result.preserved ?? []), ...preserved.map((name) => `${name} (pinned or customized launcher)`)];
      }
      if (!readOnly && owned.length > 0) {
        try {
          updateJsonConfig(mcpConfigPath, (current) => {
            let next = current;
            for (const name of owned) {
              if (!isManagedLauncher(next[config.rootKey]?.[name])) continue;
              const { config: cleaned, removed } = removeMcpEntry(next, config.rootKey, name);
              if (removed) next = cleaned;
            }
            return next === current ? null : next;
          });
        } catch (e) {
          console.error(`[setup] legacy entry migration skipped for ${config.name}: ${(e as Error).message}`);
        }
      }
    }

    if (config.configFormat === "json") {
      const existing = readJsonConfig(mcpConfigPath);
      if (existing === null) {
        result.error = `Invalid JSON in ${mcpConfigPath} — skipped`;
        return result;
      }
      const entryFor = (current: Record<string, any>): Record<string, any> => {
        let entry = buildMcpEntry(config.commandType, config.envKey, vaultPath, config.extraFields);
        if (!current[config.rootKey]?.superskill && !force) {
          const legacy = legacyMcpEntry(detected);
          if (legacy) entry = { ...legacy, command: entry.command, args: entry.args };
        }
        return entry;
      };
      if (readOnly) {
        const merged = addMcpEntry(existing, config.rootKey, "superskill", entryFor(existing), force);
        if (merged.alreadyExists) {
          result.skipped = appendSkip(result.skipped, "MCP entry already exists");
        } else {
          result.mcpConfigured = true;
        }
      } else {
        let alreadyExists = false;
        const written = updateJsonConfig(mcpConfigPath, (current) => {
          const merged = addMcpEntry(current, config.rootKey, "superskill", entryFor(current), force);
          alreadyExists = merged.alreadyExists;
          return merged.alreadyExists ? null : merged.config;
        });
        if (alreadyExists || !written) {
          result.skipped = appendSkip(result.skipped, "MCP entry already exists");
        } else {
          result.mcpConfigured = true;
        }
      }
    } else {
      const original = readSetupText(mcpConfigPath);
      const content = original ?? "";
      const updated = insertTomlBlock(content, buildTomlBlock(vaultPath), force);
      if (updated === null || updated === content) {
        result.skipped = appendSkip(result.skipped, "MCP entry already exists");
      } else if (readOnly) {
        result.mcpConfigured = true;
      } else {
        writeSetupText(mcpConfigPath, updated, original);
        result.mcpConfigured = true;
      }
    }

    if (config.instructionStrategy === "none") {
      // nothing to do
    } else if (config.instructionStrategy === "markdown-file" && instructionPath) {
      const status = readOnly
        ? planMarkdownInstruction(instructionPath, force)
        : writeMarkdownInstruction(instructionPath, force);
      result.instructionConfigured = status !== "exists";
      if (status === "exists") {
        result.skipped = appendSkip(result.skipped, "Instruction already exists");
      }
    } else if (config.instructionStrategy === "mdc-file" && instructionPath) {
      const status = readOnly
        ? planMdcInstruction(instructionPath, force)
        : writeMdcInstruction(instructionPath, force);
      result.instructionConfigured = status !== "exists";
      if (status === "exists") {
        result.skipped = appendSkip(result.skipped, "Instruction already exists");
      }
    } else if (config.instructionStrategy === "config-array" && instructionPath) {
      const existing = readJsonConfig(mcpConfigPath);
      if (existing === null) {
        result.error = (result.error ? result.error + "; " : "") +
          `Invalid JSON in ${mcpConfigPath} — skipped instruction config`;
        return result;
      }
      const instructions: string[] = Array.isArray(existing.instructions) ? existing.instructions : [];
      const arrayMissing = !instructions.includes(instructionPath);
      if (readOnly) {
        const status = planMarkdownInstruction(instructionPath, force);
        result.instructionConfigured = arrayMissing || status !== "exists";
      } else {
        if (arrayMissing) {
          updateJsonConfig(mcpConfigPath, (current) => {
            const list: string[] = Array.isArray(current.instructions) ? current.instructions : [];
            if (list.includes(instructionPath)) return null;
            return { ...current, instructions: [...list, instructionPath] };
          });
        }
        const status = writeMarkdownInstruction(instructionPath, force);
        result.instructionConfigured = arrayMissing || status !== "exists";
      }
      if (!result.instructionConfigured) {
        result.skipped = appendSkip(result.skipped, "Instruction already exists");
      }
    }

    if (!readOnly) {
      const legacy = removeLegacySetup(detected);
      if (legacy.preserved.length > 0) {
        result.preserved = [...(result.preserved ?? []), ...legacy.preserved];
      }
    }

    if (config.commandPaths) {
      const slash = installSlashCommands(config, { dryRun: readOnly });
      if (slash.installed.length > 0) {
        result.slashCommandsInstalled = slash.installed;
      }
      if (slash.skipped.length > 0) {
        result.skipped = appendSkip(result.skipped, `commands kept: ${slash.skipped.join(", ")}`);
      }
    }
  } catch (e: unknown) {
    result.error = (e as Error).message;
  }

  return result;
}
