// SPDX-License-Identifier: Apache-2.0

import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, statSync, type Dir, type Stats } from "node:fs";
import { createRequire } from "node:module";
import { lstat, mkdir, open, opendir, readdir, readFile, realpath, rm, stat } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { CommandContext } from "../core/types.js";
import { detectProject, getGitRoot } from "../lib/project-detector.js";
import { probeTool } from "../rules/harness/common.js";
import { rulesCatalogRoot } from "../rules/loader.js";
import { validateCatalogCached } from "../rules/validation-cache.js";
import { getTimeAgo } from "../lib/time-utils.js";
import { detectClients } from "../setup/detect.js";
import { readSetupText } from "../setup/file-safety.js";
import { isLatestLauncher, isManagedLauncher, isOurTool } from "../setup/launcher.js";
import type { DetectedClient } from "../setup/types.js";
import { isTelemetryEnabled, telemetryPaths } from "../telemetry/recorder.js";
import { readTelemetryEvents } from "../telemetry/report.js";
import { isHookInstalled } from "../lib/worktree/hooks.js";
import { platformCacheRoot } from "../lib/worktree/paths.js";
import { readPolicy } from "../lib/worktree/state.js";
import { VaultError, type VaultFS } from "../lib/vault-fs.js";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const INDEX_FILENAME = ".knowledge-index.sqlite";
const EXPECTED_INDEX_USER_VERSION = 1;
const STALE_LOCK_MS = 5 * 60 * 1000;

export type CheckStatus = "ok" | "warn" | "fail" | "skip";

export interface DoctorCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  hint?: string;
}

export interface DoctorResult {
  version: string;
  healthy: boolean;
  summary: Record<CheckStatus, number>;
  checks: DoctorCheck[];
}

export interface DoctorOptions {
  /** Skip the catalog schema validation (slower). */
  skipCatalog?: boolean;
  /** Skip toolchain probes. */
  skipToolchains?: boolean;
}

function check(
  id: string,
  label: string,
  status: CheckStatus,
  detail: string,
  hint?: string
): DoctorCheck {
  return hint === undefined ? { id, label, status, detail } : { id, label, status, detail, hint };
}

export function summarizeChecks(checks: readonly DoctorCheck[]): Record<CheckStatus, number> {
  const summary: Record<CheckStatus, number> = { ok: 0, warn: 0, fail: 0, skip: 0 };
  for (const entry of checks) summary[entry.status] += 1;
  return summary;
}

function packageRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../..");
}

function packageVersion(): string {
  try {
    return (require("../../package.json") as { version: string }).version;
  } catch {
    return "unknown";
  }
}

export async function inspectInstall(root: string, version: string): Promise<{ installedAt: Date | null; check: DoctorCheck }> {
  try {
    const installedAt = (await stat(join(root, "package.json"))).mtime;
    if (!Number.isFinite(installedAt.getTime())) throw new Error("invalid package modification time");
    return { installedAt, check: check("install", "Install", "ok", `superskill ${version} at ${root} (installed ${installedAt.toISOString()})`) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { installedAt: null, check: check("install", "Install", "warn", `superskill ${version} at ${root} (install time unknown: ${message})`) };
  }
}

export async function vaultWritableCheck(vaultFs: VaultFS): Promise<DoctorCheck> {
  const probe = `doctor-probe-${randomUUID()}.tmp`;
  const content = `doctor write probe ${randomUUID()}`;
  let failure: string | undefined;
  let collision = false;
  try {
    await vaultFs.createExclusive(probe, content);
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
    collision = (error as NodeJS.ErrnoException | null)?.code === "EEXIST";
  } finally {
    if (!collision) {
      try {
        if (await vaultFs.read(probe) === content) await vaultFs.delete(probe);
        else failure = `${failure ? `${failure}; ` : ""}probe ownership changed; kept ${probe}`;
      } catch (error) {
        if (!(error instanceof VaultError && error.code === "FILE_NOT_FOUND")) {
          const message = error instanceof Error ? error.message : String(error);
          failure = `${failure ? `${failure}; ` : ""}probe cleanup failed: ${message}`;
        }
      }
    }
  }
  return failure === undefined
    ? check("vault-writable", "Vault write access", "ok", "private write probe succeeded and was removed")
    : check("vault-writable", "Vault write access", "fail", failure, "check vault permissions; doctor never removes existing notes or locks");
}

export async function scanVaultMutationLocks(
  vaultFs: VaultFS,
  maxEntries = 500,
  options: { maxDepth?: number; timeoutMs?: number } = {},
): Promise<{ paths: string[]; scanned: number; truncated: boolean; errors: string[]; assessed: boolean }> {
  const paths: string[] = [];
  const errors: string[] = [];
  let scanned = 0;
  let truncated = false;
  const maxDepth = options.maxDepth ?? 6;
  const timeoutMs = options.timeoutMs ?? 1000;
  const deadline = performance.now() + timeoutMs;
  const timeout = () => Object.assign(new Error("vault mutation-lock scan time budget reached"), { code: "DOCTOR_SCAN_TIMEOUT" });
  const report = (error: unknown): void => {
    if ((error as NodeJS.ErrnoException | null)?.code === "DOCTOR_SCAN_TIMEOUT") truncated = true;
    if (errors.length < 8) errors.push(error instanceof Error ? error.message : String(error));
    else truncated = true;
  };
  const close = async (directory: Dir): Promise<void> => {
    try {
      await directory.close();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ERR_DIR_CLOSED") report(error);
    }
  };
  const bounded = async <T>(operation: () => Promise<T>, late?: (value: T) => Promise<void>): Promise<T> => {
    const remaining = deadline - performance.now();
    if (remaining <= 0) throw timeout();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const pending = operation();
    try {
      return await Promise.race([
        pending,
        new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(timeout()), remaining); }),
      ]);
    } catch (error) {
      if ((error as NodeJS.ErrnoException | null)?.code === "DOCTOR_SCAN_TIMEOUT" && late !== undefined) {
        void pending.then(late).catch((lateError: unknown) => report(lateError));
      }
      throw error;
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  };
  try {
    if (!Number.isInteger(maxEntries) || maxEntries < 1 || maxEntries > 10000 || !Number.isInteger(maxDepth) || maxDepth < 0 || maxDepth > 32 || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 10000) {
      throw new Error("invalid vault mutation-lock scan budget");
    }
    const scope = typeof vaultFs.projectSlug === "string" ? `projects/${vaultFs.projectSlug}` : ".";
    await bounded(() => vaultFs.verifyNoSymlinkEscape(scope));
    const configured = resolve(vaultFs.root);
    const configuredInfo = await bounded(() => lstat(configured));
    if (configuredInfo.isSymbolicLink() || !configuredInfo.isDirectory()) throw new Error("vault mutation-lock scan root is not a real directory (symlinks are not followed)");
    const root = await bounded(() => realpath(configured));
    const rootInfo = await bounded(() => lstat(root));
    const same = (first: Stats, second: Stats): boolean => first.dev === second.dev && first.ino === second.ino;
    if (!same(configuredInfo, rootInfo)) throw new Error("vault mutation-lock scan root changed during canonicalization");
    const inside = (path: string): boolean => {
      const rel = relative(root, path);
      return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${sep}`));
    };
    const inspect = async (path: string): Promise<Stats> => {
      if (!inside(path) || !same(rootInfo, await bounded(() => lstat(root)))) throw new Error("vault mutation-lock scan root changed or path escaped");
      const before = await bounded(() => lstat(path));
      if (before.isSymbolicLink()) throw new Error(`symlink not inspected: ${relative(root, path)}`);
      if (await bounded(() => realpath(path)) !== path) throw new Error(`non-canonical path not inspected: ${relative(root, path)}`);
      const after = await bounded(() => lstat(path));
      if (after.isSymbolicLink() || !same(before, after)) throw new Error(`path changed while inspecting: ${relative(root, path)}`);
      return after;
    };
    const pending = [{ path: resolve(root, vaultFs.jailPath(scope)), depth: 0 }];
    while (pending.length > 0) {
      if (scanned >= maxEntries) { truncated = true; break; }
      const current = pending.shift()!;
      let directory: Dir | undefined;
      try {
        const before = await inspect(current.path);
        if (!before.isDirectory()) throw new Error(`scan directory changed: ${relative(root, current.path)}`);
        directory = await bounded(() => opendir(current.path, { bufferSize: 16 }), close);
        if (!same(before, await inspect(current.path))) throw new Error(`scan directory changed: ${relative(root, current.path)}`);
        for (;;) {
          if (scanned >= maxEntries) { truncated = true; break; }
          const entry = await bounded(() => directory!.read());
          if (entry === null) break;
          scanned += 1;
          const path = join(current.path, entry.name);
          try {
            if (entry.name.toLowerCase() === "personal") throw new Error(`personal metadata not inspected: ${relative(root, path)}`);
            const info = await inspect(path);
            if (/^\..+\.lock$/.test(entry.name)) {
              if (!info.isFile()) throw new Error(`non-file lock not inspected: ${relative(root, path)}`);
              paths.push(relative(root, path).split(sep).join("/"));
            } else if (info.isDirectory()) {
              if (current.depth < maxDepth) pending.push({ path, depth: current.depth + 1 });
              else { truncated = true; report(new Error(`vault mutation-lock scan depth budget reached: ${relative(root, path)}`)); }
            }
          } catch (error) {
            report(error);
            if ((error as NodeJS.ErrnoException | null)?.code === "DOCTOR_SCAN_TIMEOUT") throw error;
          }
        }
        const after = await inspect(current.path);
        if (!same(before, after) || before.mtimeMs !== after.mtimeMs) throw new Error(`directory changed during scan: ${relative(root, current.path)}`);
      } catch (error) {
        report(error);
        if ((error as NodeJS.ErrnoException | null)?.code === "DOCTOR_SCAN_TIMEOUT") break;
      } finally {
        if (directory !== undefined) {
          const closing = close(directory);
          try { await bounded(() => closing); } catch (error) { report(error); }
        }
      }
    }
  } catch (error) {
    report(error);
  }
  return { paths: paths.sort(), scanned, truncated, errors, assessed: !truncated && errors.length === 0 };
}

export function versionParity(root: string, packageVersion: string): { status: CheckStatus; detail: string } {
  const sources: Array<{ label: string; version: string }> = [
    { label: "package.json", version: packageVersion },
  ];
  const missing: string[] = [];

  const pluginPath = join(root, ".claude-plugin", "plugin.json");
  try {
    const plugin = JSON.parse(readFileSync(pluginPath, "utf-8")) as { version?: unknown };
    if (typeof plugin.version === "string") sources.push({ label: "plugin.json", version: plugin.version });
    else missing.push("plugin.json has no version");
  } catch {
    missing.push("plugin.json not readable");
  }

  const marketplacePath = join(root, ".claude-plugin", "marketplace.json");
  try {
    const marketplace = JSON.parse(readFileSync(marketplacePath, "utf-8")) as {
      metadata?: { version?: unknown };
      plugins?: Array<{ version?: unknown }>;
    };
    let found = false;
    if (typeof marketplace.metadata?.version === "string") {
      sources.push({ label: "marketplace.json metadata", version: marketplace.metadata.version });
      found = true;
    }
    for (const [index, plugin] of (marketplace.plugins ?? []).entries()) {
      if (typeof plugin.version === "string") {
        sources.push({ label: `marketplace.json plugins[${index}]`, version: plugin.version });
        found = true;
      }
    }
    if (!found) missing.push("marketplace.json has no version");
  } catch {
    missing.push("marketplace.json not readable");
  }

  const mismatched = sources.filter((entry) => entry.version !== packageVersion);
  if (mismatched.length > 0) {
    return {
      status: "fail",
      detail: mismatched.map((entry) => `${entry.label} ${entry.version}`).join(", ") + ` != package.json ${packageVersion}`,
    };
  }
  if (missing.length > 0) {
    return { status: "warn", detail: missing.join("; ") };
  }
  return { status: "ok", detail: `${sources.length} source(s) all at ${packageVersion}` };
}

export interface LauncherStaleness {
  stale: string[];
  current: number;
  custom: string[];
  foreign: string[];
  missing: string[];
  unreadable: string[];
}

type LauncherEntryResult =
  | { kind: "entry"; entry: unknown; autoUpgradeSupported: boolean }
  | { kind: "missing" }
  | { kind: "unreadable" };

function stripTomlComment(value: string): string {
  let quote: "\"" | "'" | null = null;
  let escaped = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote === "\"") {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === "\"") quote = null;
    } else if (quote === "'") {
      if (character === "'") quote = null;
    } else if (character === "\"" || character === "'") {
      quote = character;
    } else if (character === "#") {
      return value.slice(0, index).trimEnd();
    }
  }
  return value.trimEnd();
}

function parseTomlString(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) return trimmed.slice(1, -1);
  try {
    const parsed: unknown = JSON.parse(trimmed);
    return typeof parsed === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function parseTomlValue(value: string): unknown {
  const trimmed = stripTomlComment(value).trim();
  const string = parseTomlString(trimmed);
  if (string !== null) return string;
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return undefined;
  const values: string[] = [];
  let index = 1;
  while (index < trimmed.length - 1) {
    while (/\s/.test(trimmed[index] ?? "")) index += 1;
    if (index >= trimmed.length - 1) break;
    const quote = trimmed[index];
    if (quote !== "\"" && quote !== "'") return undefined;
    const start = index;
    index += 1;
    let escaped = false;
    while (index < trimmed.length - 1) {
      const character = trimmed[index];
      if (quote === "\"" && escaped) escaped = false;
      else if (quote === "\"" && character === "\\") escaped = true;
      else if (character === quote) break;
      index += 1;
    }
    if (index >= trimmed.length - 1) return undefined;
    const parsed = parseTomlString(trimmed.slice(start, index + 1));
    if (parsed === null) return undefined;
    values.push(parsed);
    index += 1;
    while (/\s/.test(trimmed[index] ?? "")) index += 1;
    if (trimmed[index] === ",") index += 1;
    else if (index < trimmed.length - 1) return undefined;
  }
  return values;
}

function tomlArrayComplete(value: string): boolean {
  let quote: "\"" | "'" | null = null;
  let escaped = false;
  let depth = 0;
  for (const character of value) {
    if (quote === "\"") {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === "\"") quote = null;
    } else if (quote === "'") {
      if (character === "'") quote = null;
    } else if (character === "\"" || character === "'") {
      quote = character;
    } else if (character === "[") depth += 1;
    else if (character === "]") depth -= 1;
  }
  return depth === 0;
}

function tomlUpgradeArraySupported(value: string | undefined): boolean {
  if (value === undefined || !/^\[[^\]]*\]$/.test(value.trim())) return false;
  try {
    const parsed: unknown = JSON.parse(value.trim().replace(/,\s*\]/g, "]"));
    return Array.isArray(parsed) && parsed.every((token) => typeof token === "string");
  } catch {
    return false;
  }
}

function tomlUpgradeStringSupported(value: string | undefined): boolean {
  return value !== undefined && value.trim().startsWith("\"") && parseTomlString(value) !== null;
}

function readTomlLauncherEntry(text: string): LauncherEntryResult {
  const lines = text.split(/\r?\n/);
  const header = lines.findIndex((line) => /^\s*\[mcp_servers\.superskill\]\s*(?:#.*)?$/.test(line));
  if (header === -1) return { kind: "missing" };
  const entry: Record<string, unknown> = {};
  const sourceValues: Record<string, string> = {};
  let autoUpgradeSupported = true;
  for (let index = header + 1; index < lines.length; index += 1) {
    if (/^\s*\[/.test(lines[index])) break;
    const assignment = /^\s*(command|args)\s*=\s*(.*?)\s*$/.exec(lines[index]);
    if (!assignment) continue;
    const key = assignment[1];
    if (Object.hasOwn(sourceValues, key)) return { kind: "unreadable" };
    const original = assignment[2];
    let value = stripTomlComment(original).trim();
    if (value !== original.trim()) autoUpgradeSupported = false;
    if (value.startsWith("[") && !tomlArrayComplete(value)) {
      autoUpgradeSupported = false;
      while (!tomlArrayComplete(value) && index + 1 < lines.length && !/^\s*\[/.test(lines[index + 1])) {
        index += 1;
        const next = stripTomlComment(lines[index]).trim();
        if (next !== lines[index].trim()) autoUpgradeSupported = false;
        value += ` ${next}`;
      }
    }
    const parsed = parseTomlValue(value);
    if (parsed === undefined) return { kind: "unreadable" };
    sourceValues[key] = value;
    entry[key] = parsed;
  }
  if (typeof entry.command !== "string" && (!Array.isArray(entry.command) || !entry.command.every((token) => typeof token === "string"))) return { kind: "unreadable" };
  if (entry.args !== undefined && (!Array.isArray(entry.args) || !entry.args.every((token) => typeof token === "string"))) return { kind: "unreadable" };
  const commandSupported = tomlUpgradeStringSupported(sourceValues.command) || tomlUpgradeArraySupported(sourceValues.command);
  const argsSupported = entry.args === undefined || tomlUpgradeArraySupported(sourceValues.args);
  return { kind: "entry", entry, autoUpgradeSupported: autoUpgradeSupported && commandSupported && argsSupported };
}

function readLauncherEntry(client: DetectedClient): LauncherEntryResult {
  try {
    const text = readSetupText(client.mcpConfigPath);
    if (text === null) return { kind: "missing" };
    if (client.config.configFormat === "toml") return readTomlLauncherEntry(text);
    const parsed: unknown = JSON.parse(text);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return { kind: "unreadable" };
    const root = (parsed as Record<string, unknown>)[client.config.rootKey];
    if (root === undefined) return { kind: "missing" };
    if (root === null || typeof root !== "object" || Array.isArray(root)) return { kind: "unreadable" };
    const entry = (root as Record<string, unknown>).superskill;
    return entry === undefined ? { kind: "missing" } : { kind: "entry", entry, autoUpgradeSupported: true };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | null)?.code;
    console.error(`[doctor] launcher probe failed for ${client.config.name}${typeof code === "string" ? ` (${code})` : ""}`);
    return { kind: "unreadable" };
  }
}

export function launcherStaleness(clients: DetectedClient[]): LauncherStaleness {
  const stale: string[] = [];
  const custom: string[] = [];
  const foreign: string[] = [];
  const missing: string[] = [];
  const unreadable: string[] = [];
  let current = 0;
  for (const client of clients) {
    const result = readLauncherEntry(client);
    if (result.kind === "missing") {
      missing.push(client.config.name);
      continue;
    }
    if (result.kind === "unreadable") {
      unreadable.push(client.config.name);
      continue;
    }
    if (!isOurTool(result.entry)) foreign.push(client.config.name);
    else if (!isManagedLauncher(result.entry) || (!result.autoUpgradeSupported && !isLatestLauncher(result.entry))) custom.push(client.config.name);
    else if (isLatestLauncher(result.entry)) current += 1;
    else stale.push(client.config.name);
  }
  return { stale, current, custom, foreign, missing, unreadable };
}

function boundedClientNames(names: string[]): string {
  return `${names.slice(0, 3).join(", ")}${names.length > 3 ? ", …" : ""}`;
}

export function launcherStatusCheck(launchers: LauncherStaleness): DoctorCheck {
  if (launchers.stale.length === 0 && launchers.current === 0 && launchers.custom.length === 0 && launchers.foreign.length === 0 && launchers.missing.length === 0 && launchers.unreadable.length === 0) {
    return check("launchers", "Launcher staleness", "skip", "no detected MCP clients");
  }

  const details: string[] = [];
  if (launchers.current > 0) details.push(`${launchers.current} canonical latest launcher(s) current`);
  if (launchers.custom.length > 0) details.push(`${boundedClientNames(launchers.custom)} pinned/custom configuration(s) preserved`);
  if (launchers.stale.length > 0) details.push(`${boundedClientNames(launchers.stale)} use an upgradeable unversioned legacy launcher`);
  if (launchers.missing.length > 0) details.push(`${boundedClientNames(launchers.missing)} missing the expected superskill server entry`);
  if (launchers.foreign.length > 0) details.push(`${boundedClientNames(launchers.foreign)} have foreign launcher entries; never replaced automatically`);
  if (launchers.unreadable.length > 0) details.push(`${boundedClientNames(launchers.unreadable)} have unreadable launcher configuration`);

  const hints: string[] = [];
  if (launchers.stale.length > 0) hints.push("run `superskill upgrade` to reconcile eligible legacy launchers");
  if (launchers.missing.length > 0) hints.push("run `superskill-cli setup --dry-run` then `setup` to add missing entries");
  const needsAttention = launchers.stale.length > 0 || launchers.missing.length > 0 || launchers.foreign.length > 0 || launchers.unreadable.length > 0;
  return check("launchers", "Launcher staleness", needsAttention ? "warn" : "ok", details.join("; "), hints.length > 0 ? hints.join("; ") : undefined);
}

export function backupResidue(clients: DetectedClient[]): string[] {
  const residues: string[] = [];
  for (const client of clients) {
    const backup = `${client.mcpConfigPath}.bak.superskill`;
    if (existsSync(backup)) residues.push(backup);
  }
  return residues;
}

function lockAge(path: string): number | null {
  try {
    return Date.now() - statSync(path).mtimeMs;
  } catch {
    return null;
  }
}

export interface McpProcess {
  pid: string;
  started: Date;
  command: string;
}

/** Parse `ps -axo lstart=,pid=,command=` output for running MCP servers. */
function isMcpCommand(command: string, root: string): boolean {
  const tokens = [...command.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map((match) => match[1] ?? match[2] ?? match[3]);
  const executable = basename(tokens[0] ?? "");
  if (executable === "superskill" || executable === "superskill-cli") return tokens.length === 1;
  if (!/^(?:node(?:js)?|node\d+)$/.test(executable)) return false;
  let index = 1;
  const valuedOptions = new Set(["--import", "--require", "-r", "--loader", "--experimental-loader"]);
  while (index < tokens.length && tokens[index].startsWith("-")) {
    if (/^(?:-[ep]|--(?:eval|print|test)(?:=|$))/.test(tokens[index])) return false;
    index += valuedOptions.has(tokens[index]) ? 2 : 1;
  }
  let entry = tokens[index] ?? "";
  let args = tokens.slice(index + 1);
  for (const file of ["dist/main.js", "dist/mcp-server.js", "src/main.ts", "src/mcp-server.ts"]) {
    const known = join(root, file);
    const remainder = tokens.slice(index).join(" ");
    if (remainder === known || remainder.startsWith(`${known} `)) {
      entry = known;
      args = remainder.slice(known.length).trim().split(/\s+/).filter(Boolean);
      break;
    }
  }
  if (basename(entry) === "superskill" || basename(entry) === "superskill-cli") return args.length === 0;
  const knownEntry = ["dist/main.js", "dist/mcp-server.js", "src/main.ts", "src/mcp-server.ts"].some((file) => entry === join(root, file));
  const packageEntry = /\/node_modules\/superskill(?:-cli)?\/(?:dist|src)\/(?:main|mcp-server)\.(?:js|ts)$/.test(entry);
  if (!knownEntry && !packageEntry) return false;
  return /\/mcp-server\.(?:js|ts)$/.test(entry) || args.length === 0;
}

export function parseMcpProcesses(psOutput: string, root = packageRoot()): McpProcess[] {
  const out: McpProcess[] = [];
  for (const line of psOutput.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "") continue;
    const tokens = trimmed.split(/\s+/);
    if (tokens.length < 7) continue;
    if (!/^[1-9]\d*$/.test(tokens[5])) continue;
    const command = /^(?:\S+\s+){6}(.+)$/.exec(trimmed)?.[1] ?? "";
    if (!isMcpCommand(command, root)) continue;
    const started = new Date(tokens.slice(0, 5).join(" "));
    if (Number.isNaN(started.getTime())) continue;
    out.push({ pid: tokens[5], started, command });
  }
  return out;
}

async function listMcpProcesses(): Promise<McpProcess[]> {
  if (process.platform === "win32") return [];
  try {
    const { stdout } = await execFileAsync("ps", ["-axo", "lstart=,pid=,command="], { timeout: 3000 });
    return parseMcpProcesses(stdout);
  } catch {
    return [];
  }
}

async function git(cwd: string, args: string[]): Promise<{ code: number; stdout: string }> {
  try {
    const { stdout } = await execFileAsync("git", args, { cwd, timeout: 3000 });
    return { code: 0, stdout };
  } catch (e) {
    const err = e as { code?: unknown; stdout?: string };
    return { code: typeof err.code === "number" ? err.code : 1, stdout: err.stdout ?? "" };
  }
}

const TOOLCHAIN_PROBES: ReadonlyArray<{ lang: string; cmd: string; args: string[] }> = [
  { lang: "rust", cmd: "rustc", args: ["--version"] },
  { lang: "rust", cmd: "cargo", args: ["--version"] },
  { lang: "typescript", cmd: "tsc", args: ["--version"] },
  { lang: "python", cmd: "python3", args: ["--version"] },
  { lang: "go", cmd: "go", args: ["version"] },
  { lang: "swift", cmd: "swiftc", args: ["--version"] },
  { lang: "java", cmd: "javac", args: ["--version"] },
  { lang: "c", cmd: "clang", args: ["--version"] },
  { lang: "cpp", cmd: "clang++", args: ["--version"] },
];

/**
 * Worktree-cache checks: shared policy, guarded post-checkout hook, and the
 * report-only default of `worktree gc`. Best-effort — a repo that never ran
 * activation simply gets the hint.
 */
export async function worktreeDoctorChecks(cwd: string): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];

  const policy = await readPolicy(cwd);
  checks.push(
    policy !== null
      ? check("worktree-policy", "Worktree policy", "ok", `active (repo ${policy.repoId})`)
      : check(
          "worktree-policy",
          "Worktree policy",
          "warn",
          "no shared worktree-cache policy in this repo",
          "run the `worktree_activate` MCP tool (or `superskill-cli worktree activate`); nothing is deleted"
        )
  );

  let hookInstalled = false;
  try {
    hookInstalled = await isHookInstalled(cwd);
  } catch (e) {
    console.error(`[doctor] worktree hook probe failed: ${(e as Error).message}`);
  }
  checks.push(
    hookInstalled
      ? check("worktree-hook", "Worktree hook", "ok", "guarded post-checkout bootstrap hook installed")
      : check(
          "worktree-hook",
          "Worktree hook",
          "warn",
          "post-checkout bootstrap hook not installed",
          "`worktree_activate` installs it; existing hooks are preserved and nothing is deleted"
        )
  );

  const cacheRoot = platformCacheRoot();
  let cacheWritable = false;
  let cacheError: string | undefined;
  const probe = join(cacheRoot, `.doctor-probe-${randomUUID()}`);
  let probeCreated = false;
  try {
    await mkdir(cacheRoot, { recursive: true, mode: 0o700 });
    const handle = await open(probe, "wx", 0o600);
    probeCreated = true;
    try {
      await handle.writeFile("probe");
    } finally {
      await handle.close();
    }
    cacheWritable = true;
  } catch (e) {
    cacheError = (e as Error).message;
    console.error(`[doctor] cache-root probe failed: ${cacheError}`);
  } finally {
    if (probeCreated) {
      try {
        await rm(probe);
      } catch (error) {
        cacheWritable = false;
        cacheError = `probe cleanup failed: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  }

  const cacheIssues: string[] = [];
  if (policy === null) cacheIssues.push("no shared policy");
  if (!hookInstalled) cacheIssues.push("no post-checkout hook");
  if (!cacheWritable) cacheIssues.push(`cache root not writable (${cacheError})`);
  checks.push(
    cacheIssues.length === 0
      ? check(
          "worktree-caches",
          "Worktree caches",
          "ok",
          `shared cache writable at ${cacheRoot}; \`worktree gc\` is report-only by default (deletion requires explicit flags)`
        )
      : check(
          "worktree-caches",
          "Worktree caches",
          "warn",
          cacheIssues.join("; "),
          "run the `worktree_activate` MCP tool to install policy + hook, and check permissions on the cache root"
        )
  );

  return checks;
}

/**
 * One-shot health check across every layer: runtime, install vs running MCP
 * servers, vault + mapping, project graph isolation (must stay gitignored and
 * project-local), rules catalog, compile toolchains, telemetry, MCP clients.
 */
export async function doctorCommand(
  args: Record<string, unknown>,
  ctx: CommandContext,
  options: DoctorOptions = {}
): Promise<DoctorResult> {
  const checks: DoctorCheck[] = [];
  const version = packageVersion();

  const [nodeMajor = 0, nodeMinor = 0] = process.versions.node
    .split(".")
    .map((part) => Number.parseInt(part, 10));
  const nodeOk = nodeMajor > 22 || (nodeMajor === 22 && nodeMinor >= 13);
  checks.push(
    nodeOk
      ? check("node", "Node runtime", "ok", `v${process.versions.node}`)
      : check(
          "node",
          "Node runtime",
          "fail",
          `v${process.versions.node} (requires >= 22.13)`,
          "superskill needs Node >= 22.13 for `node:sqlite`; upgrade Node"
        )
  );

  const root = packageRoot();
  const install = await inspectInstall(root, version);
  const installedAt = install.installedAt;
  checks.push(install.check);

  const parity = versionParity(root, version);
  checks.push(
    check(
      "version-parity",
      "Version parity",
      parity.status,
      parity.detail,
      parity.status === "fail" ? "bump package.json, .claude-plugin/plugin.json and marketplace.json together (npm run check:versions)" : undefined
    )
  );

  const processes = await listMcpProcesses();
  if (processes.length === 0) {
    checks.push(check("mcp-freshness", "MCP server freshness", "skip", "no running superskill MCP server found"));
  } else if (installedAt === null) {
    checks.push(check("mcp-freshness", "MCP server freshness", "warn", `${processes.length} server(s); freshness unknown because install metadata is unavailable`));
  } else {
    const stale = processes.filter((entry) => entry.started.getTime() < installedAt.getTime());
    checks.push(
      stale.length > 0
        ? check(
            "mcp-freshness",
            "MCP server freshness",
            "warn",
            `${processes.length} running, ${stale.length} started before the current install`,
            "restart your AI clients so they spawn the updated MCP server"
          )
        : check("mcp-freshness", "MCP server freshness", "ok", `${processes.length} server(s), all started after the current install`)
    );
  }

  const vaultPath = ctx.vaultPath;
  const vaultExists = existsSync(vaultPath);
  if (!vaultExists) {
    checks.push(check("vault", "Vault", "fail", `${vaultPath} not found`, "run `superskill-cli onboard` or set VAULT_PATH"));
  } else {
    const insideGit = await git(vaultPath, ["rev-parse", "--is-inside-work-tree"]);
    if (insideGit.code === 0 && insideGit.stdout.trim() === "true") {
      checks.push(
        check("vault", "Vault", "fail", `${vaultPath} is inside a git work tree`, "project knowledge must never be committed or shared; move the vault outside any repo")
      );
    } else {
      let projectCount = 0;
      try {
        projectCount = (await readdir(join(vaultPath, "projects"), { withFileTypes: true })).filter((entry) => entry.isDirectory()).length;
      } catch {
        projectCount = 0;
      }
      checks.push(check("vault", "Vault", "ok", `${vaultPath} (${projectCount} project(s), not a git work tree)`));
    }
  }
  checks.push(vaultExists
    ? await vaultWritableCheck(ctx.vaultFs)
    : check("vault-writable", "Vault write access", "skip", "no vault"));

  let mappedSlug: string | null = null;
  if (!vaultExists) {
    checks.push(check("project-map", "Project mapping", "skip", "no vault"));
  } else {
    const mapPath = join(vaultPath, "project-map.json");
    if (!existsSync(mapPath)) {
      checks.push(
        check("project-map", "Project mapping", "warn", "project-map.json does not exist", "run `superskill-cli register` (or `skill init`), or pass -p <slug>")
      );
    } else {
      mappedSlug = await detectProject(process.cwd(), vaultPath);
      checks.push(
        mappedSlug !== null
          ? check("project-map", "Project mapping", "ok", `${process.cwd()} -> ${mappedSlug}`)
          : check("project-map", "Project mapping", "warn", `no mapping for ${process.cwd()}`, "run `superskill-cli register` (or `skill init`)")
      );
    }
  }

  const projectDir = (await getGitRoot(process.cwd())) ?? process.cwd();
  const graphPath = join(projectDir, ".superskill", "graph.json");
  if (!existsSync(graphPath)) {
    checks.push(check("graph", "Project graph", "warn", `no .superskill/graph.json in ${projectDir}`, "run `superskill-cli skill init` in this repo"));
  } else {
    let detail = graphPath;
    try {
      const parsed = JSON.parse(await readFile(graphPath, "utf-8")) as {
        nodes?: Array<{ type?: string; stack?: string[]; tools?: string[] }>;
      };
      const project = (parsed.nodes ?? []).find((node) => node.type === "project");
      if (project) {
        detail = `stack=[${(project.stack ?? []).join(", ")}] tools=[${(project.tools ?? []).join(", ")}] (repo-local, gitignored)`;
      }
    } catch {
      detail = `${graphPath} (unparseable)`;
    }
    checks.push(check("graph", "Project graph", "ok", detail));
  }

  const ignored = await git(projectDir, ["check-ignore", "-q", ".superskill"]);
  const tracked = await git(projectDir, ["ls-files", ".superskill"]);
  const trackedFiles = tracked.stdout.trim();
  const isGitRepo = existsSync(join(projectDir, ".git"));
  if (trackedFiles !== "") {
    checks.push(
      check(
        "graph-sharing",
        "Graph isolation",
        "fail",
        `.superskill/ has tracked files (${trackedFiles.split("\n").length})`,
        "the project graph must never be shared: run `git rm --cached -r .superskill` and keep `.superskill/` in .gitignore"
      )
    );
  } else if (ignored.code === 0) {
    checks.push(check("graph-sharing", "Graph isolation", "ok", ".superskill/ is gitignored (project-local, never shared)"));
  } else if (isGitRepo) {
    checks.push(check("graph-sharing", "Graph isolation", "warn", ".superskill/ is not gitignored", "run `skill init` or add `.superskill/` to .gitignore"));
  } else {
    checks.push(check("graph-sharing", "Graph isolation", "skip", "not a git repository"));
  }

  if (options.skipCatalog === true || args.fast === true) {
    checks.push(check("catalog", "Rules catalog", "skip", "skipped"));
  } else {
    try {
      const outcome = await validateCatalogCached(rulesCatalogRoot());
      const { report } = outcome;
      const age = outcome.cached ? ` (cached ${getTimeAgo(outcome.checkedAt)})` : "";
      checks.push(
        report.errorCount > 0
          ? check(
              "catalog",
              "Rules catalog",
              "fail",
              `${report.ruleCount} rules, ${report.errorCount} error(s), ${report.warningCount} warning(s)${age}`,
              `run: node ${join(root, "dist/rules/cli.js")} validate`
            )
          : check("catalog", "Rules catalog", "ok", `${report.ruleCount} rules, 0 errors, ${report.warningCount} warning(s)${age}`)
      );
    } catch (e) {
      checks.push(check("catalog", "Rules catalog", "warn", `validation failed: ${(e as Error).message}`));
    }
  }

  if (options.skipToolchains === true || args.fast === true) {
    checks.push(check("toolchains", "Compile toolchains", "skip", "skipped"));
  } else {
    const probes = await Promise.all(
      TOOLCHAIN_PROBES.map(async (probe) => ({ ...probe, available: (await probeTool(probe.cmd, probe.cmd, probe.args)).available }))
    );
    const byLang = new Map<string, boolean>();
    for (const probe of probes) {
      byLang.set(probe.lang, (byLang.get(probe.lang) ?? true) && probe.available);
    }
    const missing = [...byLang.entries()].filter(([, ready]) => !ready).map(([lang]) => lang).sort();
    checks.push(
      missing.length === 0
        ? check("toolchains", "Compile toolchains", "ok", `${byLang.size}/${byLang.size} languages ready for compile verification`)
        : check("toolchains", "Compile toolchains", "warn", `missing: ${missing.join(", ")}`, "install these toolchains to make `validate --strict` compile checks meaningful")
    );
  }

  const telemetryEnabled = await isTelemetryEnabled();
  const { events } = await readTelemetryEvents(telemetryPaths().events);
  checks.push(
    check(
      "telemetry",
      "Telemetry",
      "ok",
      telemetryEnabled ? `enabled, ${events.length} local event(s)` : "disabled (opt-in)"
    )
  );

  const clients = detectClients();
  const launchers = launcherStaleness(clients);
  if (clients.length === 0) {
    checks.push(check("clients", "MCP clients", "skip", "no AI clients detected"));
  } else {
    const configured = launchers.stale.length + launchers.current + launchers.custom.length;
    checks.push(
      configured > 0
        ? check("clients", "MCP clients", "ok", `${configured}/${clients.length} detected client(s) have a superskill MCP entry`)
        : check("clients", "MCP clients", "warn", `0/${clients.length} detected client(s) configured`, "run `superskill-cli setup --dry-run` then `setup`")
    );
  }

  checks.push(launcherStatusCheck(launchers));

  const residues = backupResidue(clients);
  checks.push(
    residues.length > 0
      ? check(
          "backup-residue",
          "Backup residue",
          "warn",
          `${residues.length} leftover backup(s): ${residues.slice(0, 3).join(", ")}${residues.length > 3 ? ", …" : ""}`,
          "verify the current config parses, then delete the .bak.superskill copy"
        )
      : check("backup-residue", "Backup residue", "ok", "no .bak.superskill files left behind")
  );

  const lockPaths: Array<{ label: string; path: string }> = [
    { label: "graph lock", path: join(projectDir, ".superskill", "graph.lock") },
  ];
  if (vaultExists) {
    lockPaths.push({ label: "session registry lock", path: join(vaultPath, "coordination", "locks", "session-registry.lock") });
  }
  const commonDir = await git(projectDir, ["rev-parse", "--path-format=absolute", "--git-common-dir"]);
  if (commonDir.code === 0 && commonDir.stdout.trim() !== "") {
    lockPaths.push({ label: "worktree cleanup lock", path: join(commonDir.stdout.trim(), "superskill-worktree-cleanup.lock") });
  }
  const staleLocks: string[] = [];
  const heldLocks: string[] = [];
  for (const lock of lockPaths) {
    const age = lockAge(lock.path);
    if (age === null) continue;
    if (age > STALE_LOCK_MS) staleLocks.push(`${lock.label} (${lock.path}, ${Math.round(age / 60000)}m old)`);
    else heldLocks.push(lock.label);
  }
  const mutationLocks = vaultExists ? await scanVaultMutationLocks(ctx.vaultFs) : null;
  const mutationIssues = mutationLocks === null ? ["vault mutation locks unassessed: no vault"] : [
    ...mutationLocks.paths.map((path) => `vault mutation lock (${path}, owner unverified)`),
    ...(!mutationLocks.assessed ? ["vault mutation locks unassessed or partially assessed"] : []),
    ...(mutationLocks.truncated ? [`vault mutation-lock scan truncated after ${mutationLocks.scanned} entries (entry/depth/time budget)`] : []),
    ...mutationLocks.errors.slice(0, 3).map((error) => `vault lock scan incomplete: ${error}`),
  ];
  checks.push(
    staleLocks.length > 0 || mutationIssues.length > 0
      ? check(
          "locks",
          "Locks",
          "warn",
          [...staleLocks.map((lock) => `old lock, owner unverified: ${lock}`), ...mutationIssues].join("; "),
          "report only: lock age is not proof of abandonment; verify the exact owner has stopped before manual recovery"
        )
      : check("locks", "Locks", "ok", `${heldLocks.length > 0 ? `held (in use): ${heldLocks.join(", ")}` : "no superskill lock files observed"}; mutation scan assessed ${mutationLocks?.scanned ?? 0} entries`)
  );

  if (!vaultExists) {
    checks.push(check("sessions", "Sessions", "skip", "no vault"));
  } else {
    const registryPath = join(vaultPath, "coordination", "session-registry.json");
    if (!existsSync(registryPath)) {
      checks.push(check("sessions", "Sessions", "ok", "no sessions registered"));
    } else {
      let parsed: { sessions?: unknown } | null = null;
      try {
        parsed = JSON.parse(readFileSync(registryPath, "utf-8")) as { sessions?: unknown };
      } catch {
        parsed = null;
      }
      const parsedSessions = parsed?.sessions;
      const sessions = Array.isArray(parsedSessions)
        ? (parsedSessions as Array<{ status?: unknown; last_heartbeat?: unknown }>)
        : null;
      if (sessions === null) {
        checks.push(
          check("sessions", "Sessions", "fail", "session-registry.json is unparseable", "inspect or remove the coordination/session-registry.json file")
        );
      } else {
        const active = sessions.filter((session) => session.status === "active");
        const cutoff = Date.now() - ctx.config.sessionTtlHours * 60 * 60 * 1000;
        const staleActive = active.filter((session) => {
          const heartbeat = typeof session.last_heartbeat === "string" ? Date.parse(session.last_heartbeat) : Number.NaN;
          return Number.isFinite(heartbeat) && heartbeat < cutoff;
        });
        checks.push(
          staleActive.length > 0
            ? check(
                "sessions",
                "Sessions",
                "warn",
                `${active.length} active (${staleActive.length} expired past the ${ctx.config.sessionTtlHours}h TTL), ${sessions.length - active.length} completed`,
                "expired sessions are cleaned up on the next register/heartbeat; complete abandoned sessions if they are yours"
              )
            : check("sessions", "Sessions", "ok", `${active.length} active, ${sessions.length - active.length} completed; heartbeats fresh`)
        );
      }
    }
  }

  if (mappedSlug === null) {
    checks.push(check("index", "Knowledge index", "skip", "no mapped project for this checkout"));
  } else {
    const indexPath = join(vaultPath, "projects", mappedSlug, INDEX_FILENAME);
    if (!existsSync(indexPath)) {
      checks.push(
        check("index", "Knowledge index", "warn", `no ${INDEX_FILENAME} for ${mappedSlug}`, "run a search or `skill init` to build the knowledge index")
      );
    } else {
      let userVersion: number | null = null;
      try {
        const { DatabaseSync } = await import("node:sqlite");
        const db = new DatabaseSync(indexPath, { readOnly: true });
        try {
          const row = db.prepare("PRAGMA user_version").get() as { user_version?: number } | undefined;
          userVersion = Number(row?.user_version ?? 0);
        } finally {
          db.close();
        }
      } catch (e) {
        console.error(`[doctor] index probe failed: ${(e as Error).message}`);
      }
      checks.push(
        userVersion === null
          ? check("index", "Knowledge index", "warn", `cannot read schema version of ${indexPath}`, "it will be rebuilt on the next search")
          : userVersion === EXPECTED_INDEX_USER_VERSION
            ? check("index", "Knowledge index", "ok", `schema v${userVersion} current for ${mappedSlug}`)
            : check(
                "index",
                "Knowledge index",
                "warn",
                `schema v${userVersion} ${userVersion > EXPECTED_INDEX_USER_VERSION ? "newer" : "older"} than v${EXPECTED_INDEX_USER_VERSION} for ${mappedSlug}`,
                userVersion > EXPECTED_INDEX_USER_VERSION ? "upgrade superskill to read this newer index; doctor leaves it unchanged" : "it will be rebuilt on the next search"
              )
      );
    }
  }

  checks.push(...(await worktreeDoctorChecks(process.cwd())));

  const summary = summarizeChecks(checks);
  return { version, healthy: summary.fail === 0, summary, checks };
}

export function renderDoctor(result: DoctorResult): string {
  const lines: string[] = [`superskill doctor — ${result.version}`, ""];
  for (const entry of result.checks) {
    const mark = entry.status === "ok" ? "ok  " : entry.status === "warn" ? "warn" : entry.status === "fail" ? "FAIL" : "skip";
    lines.push(`  [${mark}] ${entry.label.padEnd(22)} ${entry.detail}`);
    if (entry.hint !== undefined) lines.push(`           ↳ ${entry.hint}`);
  }
  lines.push("");
  lines.push(
    `Summary: ${result.summary.ok} ok, ${result.summary.warn} warn, ${result.summary.fail} fail, ${result.summary.skip} skip` +
      (result.healthy ? "" : " — fix the FAIL entries")
  );
  return lines.join("\n");
}
