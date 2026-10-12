// SPDX-License-Identifier: Apache-2.0
import {
  closeSync,
  copyFileSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeSync,
} from "fs";
import { randomBytes } from "crypto";
import { dirname } from "path";

const MAX_WRITE_ATTEMPTS = 3;

export function readJsonConfig(filePath: string): Record<string, any> | null {
  if (!existsSync(filePath)) return {};
  try {
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readRaw(filePath: string): string | null {
  try {
    return readFileSync(filePath, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function parseForWrite(filePath: string, raw: string): Record<string, any> {
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    return parsed as Record<string, any>;
  } catch {
    throw new Error(`[json-config] Refusing to overwrite unparseable JSON: ${filePath}`);
  }
}

function serialize(config: Record<string, any>): string {
  return JSON.stringify(config, null, 2) + "\n";
}

function targetMode(filePath: string): number {
  try {
    return statSync(filePath).mode & 0o777;
  } catch {
    return 0o600;
  }
}

function cleanupTmp(tmpPath: string): void {
  try {
    unlinkSync(tmpPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(`[json-config] Could not remove temp file ${tmpPath}: ${(error as Error).message}`);
    }
  }
}

function writeTmp(filePath: string, content: string): string {
  const tmpPath = `${filePath}.tmp-${process.pid}-${randomBytes(4).toString("hex")}`;
  const fd = openSync(tmpPath, "wx", targetMode(filePath));
  try {
    writeSync(fd, content);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  return tmpPath;
}

function rotateBackup(filePath: string, before: string | null, content: string): void {
  if (before === null || before === content) return;
  const backupPath = `${filePath}.bak.superskill`;
  if (readRaw(backupPath) === before) return;
  copyFileSync(filePath, backupPath);
}

function atomicWriteJson(
  filePath: string,
  apply: (current: Record<string, any>) => Record<string, any> | null,
  retryable: boolean
): boolean {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt += 1) {
    const before = readRaw(filePath);
    const current = before === null ? {} : parseForWrite(filePath, before);
    const next = apply(current);
    if (next === null) return false;
    const content = serialize(next);
    if (before === content) return false;

    const tmpPath = writeTmp(filePath, content);
    try {
      const after = readRaw(filePath);
      if (after !== before) {
        if (!retryable) {
          throw new Error(`[json-config] ${filePath} changed during write; concurrent changes were left intact`);
        }
        cleanupTmp(tmpPath);
        continue;
      }
      rotateBackup(filePath, before, content);
      renameSync(tmpPath, filePath);
      return true;
    } catch (error) {
      cleanupTmp(tmpPath);
      throw error;
    }
  }
  throw new Error(`[json-config] ${filePath} kept changing during write; gave up after ${MAX_WRITE_ATTEMPTS} attempts`);
}

export function writeJsonConfig(filePath: string, config: Record<string, any>): void {
  atomicWriteJson(filePath, () => config, false);
}

export function updateJsonConfig(
  filePath: string,
  mutate: (config: Record<string, any>) => Record<string, any> | null
): boolean {
  return atomicWriteJson(filePath, mutate, true);
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
