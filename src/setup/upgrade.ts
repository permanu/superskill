// SPDX-License-Identifier: Apache-2.0
import { existsSync } from "fs";
import { assertSafeSetupPath, readSetupText, writeSetupText } from "./file-safety.js";
import { detectClients } from "./detect.js";
import type { DetectedClient } from "./types.js";
import { readJsonConfig, updateJsonConfig, removeMcpEntry } from "./json-config.js";
import { isManagedLauncher, isLatestLauncher, isOurTool, renderLauncher } from "./launcher.js";
import { buildLauncher, buildTomlBlock } from "./configure.js";
import { reconcileTomlBlock } from "./toml-config.js";
import {
  planMarkdownInstruction,
  planMdcInstruction,
  writeMarkdownInstruction,
  writeMdcInstruction,
} from "./instructions.js";

export interface UpgradeReport {
  clients: Array<{ client: string; action: "updated" | "unchanged" | "skipped" | "error"; detail?: string }>;
}

type ClientReport = UpgradeReport["clients"][number];

type LauncherResult =
  | { kind: "ok"; changes: string[] }
  | { kind: "skipped"; detail: string }
  | { kind: "error"; detail: string };

const LEGACY_NAMES = ["obsidian-mcp", "obsidian-kb"];

function reconcileJsonLauncher(
  detected: DetectedClient,
  dryRun: boolean
): LauncherResult {
  const { config, mcpConfigPath } = detected;
  const existing = readJsonConfig(mcpConfigPath);
  if (existing === null) {
    return { kind: "error", detail: `Invalid JSON in ${mcpConfigPath}` };
  }
  const entry = existing[config.rootKey]?.superskill;
  if (entry === undefined) {
    return { kind: "skipped", detail: "no superskill MCP entry (run setup)" };
  }
  if (!isOurTool(entry)) {
    return { kind: "skipped", detail: "custom superskill entry preserved" };
  }
  if (!isManagedLauncher(entry)) {
    return { kind: "skipped", detail: "pinned or customized superskill launcher preserved" };
  }
  const changes: string[] = [];
  const launcher = buildLauncher(config.commandType);
  if (!isLatestLauncher(entry)) {
    const desired = `${renderLauncher(config.commandType)}`;
    changes.push(`${dryRun ? "would reconcile" : "reconciled"} launcher to ${desired}`);
    if (!dryRun) {
      updateJsonConfig(mcpConfigPath, (current) => {
        const target = current[config.rootKey]?.superskill;
        if (target === undefined || !isManagedLauncher(target)) return null;
        const nextEntry = { ...target, command: launcher.command };
        if (launcher.args) nextEntry.args = launcher.args;
        else delete nextEntry.args;
        return { ...current, [config.rootKey]: { ...current[config.rootKey], superskill: nextEntry } };
      });
    }
  }
  const legacyOwned = LEGACY_NAMES.filter((name) => isManagedLauncher(existing[config.rootKey]?.[name]));
  if (legacyOwned.length > 0) {
    changes.push(`${dryRun ? "would remove" : "removed"} legacy entr${legacyOwned.length === 1 ? "y" : "ies"} ${legacyOwned.join(", ")}`);
    if (!dryRun) {
      updateJsonConfig(mcpConfigPath, (current) => {
        let next = current;
        for (const name of LEGACY_NAMES) {
          if (!isManagedLauncher(next[config.rootKey]?.[name])) continue;
          const { config: cleaned, removed } = removeMcpEntry(next, config.rootKey, name);
          if (removed) next = cleaned;
        }
        return next === current ? null : next;
      });
    }
  }
  return { kind: "ok", changes };
}

function reconcileTomlLauncher(detected: DetectedClient, dryRun: boolean): LauncherResult {
  const { mcpConfigPath } = detected;
  if (!existsSync(mcpConfigPath)) return { kind: "skipped", detail: "no config file" };
  const content = readSetupText(mcpConfigPath)!;
  const updated = reconcileTomlBlock(content, buildTomlBlock("~"));
  if (updated === null || updated === content) {
    const referenced = /\[mcp_servers\.superskill(?:\.env)?\]/.test(content);
    return referenced ? { kind: "ok", changes: [] } : { kind: "skipped", detail: "no superskill MCP entry (run setup)" };
  }
  if (!dryRun) writeSetupText(mcpConfigPath, updated, content);
  return { kind: "ok", changes: [`${dryRun ? "would reconcile" : "reconciled"} TOML launcher`] };
}

function reconcileInstructions(detected: DetectedClient, dryRun: boolean): string[] {
  const { config, instructionPath } = detected;
  const changes: string[] = [];
  if (!instructionPath) return changes;

  if (config.instructionStrategy === "markdown-file") {
    const status = dryRun
      ? planMarkdownInstruction(instructionPath)
      : writeMarkdownInstruction(instructionPath);
    if (status !== "exists") changes.push(`${dryRun ? "would refresh" : "refreshed"} instruction block`);
  } else if (config.instructionStrategy === "mdc-file") {
    const status = dryRun
      ? planMdcInstruction(instructionPath)
      : writeMdcInstruction(instructionPath);
    if (status !== "exists") changes.push(`${dryRun ? "would refresh" : "refreshed"} instruction block`);
  } else if (config.instructionStrategy === "config-array") {
    const existing = readJsonConfig(detected.mcpConfigPath);
    const list: string[] = existing !== null && Array.isArray(existing.instructions) ? existing.instructions : [];
    const arrayMissing = !list.includes(instructionPath);
    const status = dryRun
      ? planMarkdownInstruction(instructionPath)
      : writeMarkdownInstruction(instructionPath);
    if (arrayMissing) {
      if (!dryRun) {
        updateJsonConfig(detected.mcpConfigPath, (current) => {
          const currentList: string[] = Array.isArray(current.instructions) ? current.instructions : [];
          if (currentList.includes(instructionPath)) return null;
          return { ...current, instructions: [...currentList, instructionPath] };
        });
      }
      changes.push(`${dryRun ? "would add" : "added"} instruction path to config`);
    }
    if (status !== "exists") changes.push(`${dryRun ? "would refresh" : "refreshed"} instruction block`);
  }
  return changes;
}

function upgradeClient(detected: DetectedClient, dryRun: boolean): ClientReport {
  const { config } = detected;
  try {
    if (config.support === "unsupported") {
      return {
        client: config.name,
        action: "skipped",
        detail: config.supportNote ?? "Native MCP setup is unsupported",
      };
    }
    assertSafeSetupPath(detected.mcpConfigPath);
    if (detected.instructionPath) assertSafeSetupPath(detected.instructionPath);

    const launcherResult = config.configFormat === "json"
      ? reconcileJsonLauncher(detected, dryRun)
      : reconcileTomlLauncher(detected, dryRun);

    if (launcherResult.kind === "error") {
      return { client: config.name, action: "error", detail: launcherResult.detail };
    }
    if (launcherResult.kind === "skipped" && launcherResult.detail.startsWith("no ")) {
      return { client: config.name, action: "skipped", detail: launcherResult.detail };
    }

    const changes = [
      ...(launcherResult.kind === "ok" ? launcherResult.changes : []),
      ...reconcileInstructions(detected, dryRun),
    ];
    if (changes.length === 0) {
      return launcherResult.kind === "ok"
        ? { client: config.name, action: "unchanged" }
        : { client: config.name, action: "skipped", detail: launcherResult.detail };
    }
    return { client: config.name, action: "updated", detail: changes.join("; ") };
  } catch (e: unknown) {
    return { client: config.name, action: "error", detail: (e as Error).message };
  }
}

export async function upgradeCommand(args: { dryRun?: boolean; json?: boolean }): Promise<UpgradeReport> {
  const report: UpgradeReport = { clients: [] };
  const dryRun = args.dryRun === true;
  for (const detected of detectClients()) {
    report.clients.push(upgradeClient(detected, dryRun));
  }
  return report;
}
