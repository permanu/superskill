// SPDX-License-Identifier: Apache-2.0
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "fs";
import { removeLegacySetup } from "./legacy.js";
import type { DetectedClient, TeardownResult, TeardownOptions } from "./types.js";
import { readJsonConfig, updateJsonConfig, removeMcpEntry } from "./json-config.js";
import { removeTomlBlock } from "./toml-config.js";
import { removeMarkdownInstruction, removeMdcInstruction } from "./instructions.js";
import { removeSlashCommands } from "./commands.js";
import { CLIENT_REGISTRY } from "./clients.js";
import { detectClient } from "./detect.js";
import { isManagedLauncher } from "./launcher.js";

const MCP_NAMES = ["superskill", "obsidian-mcp", "obsidian-kb"];

export function teardownClient(
  detected: DetectedClient,
  options: { dryRun?: boolean } = {}
): TeardownResult {
  const { config, mcpConfigPath, instructionPath } = detected;
  const result: TeardownResult = {
    client: config.name,
    mcpRemoved: false,
    instructionRemoved: false,
  };

  try {
    if (config.configFormat === "json") {
      if (options.dryRun) {
        result.mcpRemoved = true;
      } else if (existsSync(mcpConfigPath)) {
        const existing = readJsonConfig(mcpConfigPath);
        if (existing === null) {
          result.error = `Invalid JSON in ${mcpConfigPath} — skipped`;
        } else {
          const root = existing[config.rootKey];
          const preserved: string[] = [];
          for (const name of MCP_NAMES) {
            const entry = typeof root === "object" && root !== null
              ? (root as Record<string, unknown>)[name]
              : undefined;
            if (entry !== undefined && !isManagedLauncher(entry)) preserved.push(name);
          }
          if (preserved.length > 0) result.preserved = preserved;
          const written = updateJsonConfig(mcpConfigPath, (current) => {
            let next = current;
            for (const name of MCP_NAMES) {
              const entry = next[config.rootKey]?.[name];
              if (entry === undefined || !isManagedLauncher(entry)) continue;
              const { config: cleaned, removed } = removeMcpEntry(next, config.rootKey, name);
              if (removed) next = cleaned;
            }
            return next === current ? null : next;
          });
          result.mcpRemoved = written;
        }
      }
    } else if (options.dryRun) {
      result.mcpRemoved = true;
    } else if (existsSync(mcpConfigPath)) {
      const content = readFileSync(mcpConfigPath, "utf-8");
      const { content: updated, removed } = removeTomlBlock(content);
      if (removed) {
        writeFileSync(mcpConfigPath, updated, "utf-8");
        result.mcpRemoved = true;
      }
    }

    if (config.instructionStrategy === "none") {
      // nothing
    } else if (options.dryRun) {
      result.instructionRemoved = true;
    } else if (config.instructionStrategy === "markdown-file" && instructionPath) {
      result.instructionRemoved = removeMarkdownInstruction(instructionPath);
    } else if (config.instructionStrategy === "mdc-file" && instructionPath) {
      result.instructionRemoved = removeMdcInstruction(instructionPath);
    } else if (config.instructionStrategy === "config-array" && instructionPath) {
      if (existsSync(mcpConfigPath)) {
        const existing = readJsonConfig(mcpConfigPath);
        if (existing === null) {
          result.error = `Invalid JSON in ${mcpConfigPath} — skipped instruction config`;
        } else {
          const instructions: string[] = Array.isArray(existing.instructions) ? existing.instructions : [];
          if (instructions.includes(instructionPath)) {
            updateJsonConfig(mcpConfigPath, (current) => {
              const list: string[] = Array.isArray(current.instructions) ? current.instructions : [];
              const filtered = list.filter((p) => p !== instructionPath);
              return filtered.length === list.length ? null : { ...current, instructions: filtered };
            });
          }
        }
      }
      if (existsSync(instructionPath)) {
        unlinkSync(instructionPath);
      }
      result.instructionRemoved = true;
    }

    if (!options.dryRun) {
      const legacy = removeLegacySetup(detected);
      if (legacy.preserved.length > 0) {
        result.preserved = [...(result.preserved ?? []), ...legacy.preserved];
      }
    }

    if (config.commandPaths) {
      if (options.dryRun) {
        result.slashCommandsRemoved = ["(dry-run)"];
      } else {
        const slash = removeSlashCommands(config);
        if (slash.removed.length > 0) result.slashCommandsRemoved = slash.removed;
      }
    }
  } catch (e: unknown) {
    result.error = (e as Error).message;
  }

  return result;
}

export async function teardownAll(
  options: TeardownOptions = {}
): Promise<TeardownResult[]> {
  const unknown = options.clients?.filter(slug => !CLIENT_REGISTRY.some(client => client.slug === slug));
  if (unknown?.length) throw new Error(`Unknown client(s): ${unknown.join(", ")}`);
  const results: TeardownResult[] = [];
  const targets = options.clients
    ? CLIENT_REGISTRY.filter((c) => options.clients!.includes(c.slug))
    : CLIENT_REGISTRY;

  for (const clientConfig of targets) {
    const detected = detectClient(clientConfig);
    if (!detected) continue;
    results.push(teardownClient(detected, { dryRun: options.dryRun }));
  }
  return results;
}
