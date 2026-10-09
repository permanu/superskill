// SPDX-License-Identifier: Apache-2.0
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from "fs";
import { dirname } from "path";

export function readJsonConfig(filePath: string): Record<string, any> | null {
  if (!existsSync(filePath)) return {};
  try {
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeJsonConfig(filePath: string, config: Record<string, any>): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  if (existsSync(filePath)) {
    copyFileSync(filePath, `${filePath}.bak.superskill`);
  }
  writeFileSync(filePath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

export function addMcpEntry(
  config: Record<string, any>,
  rootKey: string,
  serverName: string,
  entry: Record<string, any>,
  force = false
): { config: Record<string, any>; alreadyExists: boolean } {
  const result = { ...config };
  if (!result[rootKey]) result[rootKey] = {};

  if (result[rootKey][serverName] && !force) {
    const existing = result[rootKey][serverName];
    const oldArgs = JSON.stringify(["-y", "superskill"]);
    const latestArgs = JSON.stringify(["-y", "--prefer-online", "superskill@latest"]);
    let upgraded: Record<string, any> | undefined;
    if (serverName === "superskill" && existing.command === "npx" && entry.command === "npx" && JSON.stringify(existing.args) === oldArgs && JSON.stringify(entry.args) === latestArgs && typeof existing.env?.VAULT_PATH === "string") {
      upgraded = { ...existing, args: entry.args };
    } else if (serverName === "superskill" && JSON.stringify(existing.command) === JSON.stringify(["npx", "-y", "superskill"]) && JSON.stringify(entry.command) === JSON.stringify(["npx", "-y", "--prefer-online", "superskill@latest"]) && existing.args === undefined && typeof existing.environment?.VAULT_PATH === "string") {
      upgraded = { ...existing, command: entry.command };
    }
    if (!upgraded) return { config: result, alreadyExists: true };
    return { config: { ...result, [rootKey]: { ...result[rootKey], [serverName]: upgraded } }, alreadyExists: false };
  }

  result[rootKey] = { ...result[rootKey], [serverName]: entry };
  return { config: result, alreadyExists: false };
}

export function removeMcpEntry(
  config: Record<string, any>,
  rootKey: string,
  serverName: string
): { config: Record<string, any>; removed: boolean } {
  if (!config[rootKey] || !config[rootKey][serverName]) {
    return { config, removed: false };
  }
  const result = { ...config, [rootKey]: { ...config[rootKey] } };
  delete result[rootKey][serverName];
  return { config: result, removed: true };
}
