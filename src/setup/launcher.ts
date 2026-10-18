// SPDX-License-Identifier: Apache-2.0
import { delimiter, dirname, isAbsolute } from "node:path";

export function launcherPath(): string {
  const paths = [dirname(process.execPath), ...(process.env.PATH ?? "").split(delimiter)];
  return [...new Set(paths.filter(isAbsolute))].join(delimiter);
}

export function withLauncherPath(entry: Record<string, any>, envKey: string, path = launcherPath()): Record<string, any> {
  const env = entry[envKey];
  if (env !== undefined && (env === null || typeof env !== "object" || Array.isArray(env))) return entry;
  if (env !== undefined && Object.hasOwn(env, "PATH")) return entry;
  return { ...entry, [envKey]: { ...env, PATH: path } };
}

export const LATEST_ARGS = ["-y", "--prefer-online", "superskill@latest"];
export const LATEST_ARRAY = ["npx", "-y", "--prefer-online", "superskill@latest"];

const LEGACY_ARGS = ["-y", "superskill"];
const LEGACY_ARRAY = ["npx", ...LEGACY_ARGS];
const LAUNCHER_TOKEN = /^superskill(?:-cli)?(?:@[^/\s]+)?$/;
const GIT_LAUNCHER_TOKEN = /^(?:github:permanu\/superskill|permanu\/superskill|(?:git\+)?https?:\/\/github\.com\/permanu\/superskill|git\+ssh:\/\/git@github\.com\/permanu\/superskill|git@github\.com:permanu\/superskill)(?:\.git)?(?:#[^\s]+)?$/i;

export function isSuperskillLauncherToken(token: string): boolean {
  return LAUNCHER_TOKEN.test(token) || GIT_LAUNCHER_TOKEN.test(token);
}

function stringList(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((token) => typeof token === "string")
    ? value
    : null;
}

function npxTargetsSuperskill(args: readonly string[]): boolean {
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (token === "--") return false;
    if (token === "-p" || token === "--package") {
      const packageName = args[i + 1];
      return packageName !== undefined && isSuperskillLauncherToken(packageName);
    }
    if (token.startsWith("--package=")) {
      return isSuperskillLauncherToken(token.slice("--package=".length));
    }
    if (token.startsWith("-")) continue;
    return isSuperskillLauncherToken(token);
  }
  return false;
}

function entryCommand(entry: Record<string, unknown>): { command: string; args: string[] } | null {
  const command = entry.command;
  const args = stringList(entry.args);
  if (typeof command === "string") {
    if (command === "superskill" || command === "superskill-cli") {
      return { command, args: args ?? [] };
    }
    return command === "npx" && args !== null ? { command, args } : null;
  }
  const commandArray = stringList(command);
  if (!commandArray || commandArray.length === 0) return null;
  const [first, ...rest] = commandArray;
  if (first === "superskill" || first === "superskill-cli") {
    return { command: first, args: [...rest, ...(args ?? [])] };
  }
  return first === "npx" ? { command: first, args: [...rest, ...(args ?? [])] } : null;
}

export function isOurTool(entry: unknown): boolean {
  if (entry === null || typeof entry !== "object") return false;
  const parsed = entryCommand(entry as Record<string, unknown>);
  if (!parsed) return false;
  return parsed.command === "superskill" || parsed.command === "superskill-cli"
    ? true
    : npxTargetsSuperskill(parsed.args);
}

export function isManagedLauncher(entry: unknown): boolean {
  if (!isOurTool(entry) || entry === null || typeof entry !== "object") return false;
  const { command, args } = entry as { command?: unknown; args?: unknown };
  if (typeof command === "string") {
    const list = stringList(args);
    return command === "npx" && list !== null &&
      (list.join(" ") === LEGACY_ARGS.join(" ") || list.join(" ") === LATEST_ARGS.join(" "));
  }
  const commandArray = stringList(command);
  return args === undefined && commandArray !== null &&
    (commandArray.join(" ") === LEGACY_ARRAY.join(" ") || commandArray.join(" ") === LATEST_ARRAY.join(" "));
}

export function isLatestLauncher(entry: unknown): boolean {
  if (entry === null || typeof entry !== "object") return false;
  const { command, args } = entry as { command?: unknown; args?: unknown };
  if (typeof command === "string") {
    const list = stringList(args);
    return command === "npx" && list !== null && list.join(" ") === LATEST_ARGS.join(" ");
  }
  const commandArray = stringList(command);
  return args === undefined && commandArray !== null && commandArray.join(" ") === LATEST_ARRAY.join(" ");
}

export function renderLauncher(commandType: "string" | "array"): string {
  return commandType === "array" ? LATEST_ARRAY.join(" ") : `npx ${LATEST_ARGS.join(" ")}`;
}
