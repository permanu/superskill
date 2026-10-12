// SPDX-License-Identifier: Apache-2.0
export const LATEST_ARGS = ["-y", "--prefer-online", "superskill@latest"];
export const LATEST_ARRAY = ["npx", "-y", "--prefer-online", "superskill@latest"];

const LAUNCHER_TOKEN = /^superskill(-cli)?(@[0-9A-Za-z._-]+)?$/;

export function isSuperskillLauncherToken(token: string): boolean {
  return LAUNCHER_TOKEN.test(token);
}

function managedArgList(args: unknown): boolean {
  if (!Array.isArray(args)) return false;
  const positional = args.filter(
    (token): token is string => typeof token === "string" && !token.startsWith("-")
  );
  return positional.length === 1 && isSuperskillLauncherToken(positional[0]);
}

export function isManagedLauncher(entry: unknown): boolean {
  if (entry === null || typeof entry !== "object") return false;
  const { command, args } = entry as { command?: unknown; args?: unknown };
  if (typeof command === "string") {
    if (command === "superskill" || command === "superskill-cli") return true;
    return command === "npx" && managedArgList(args);
  }
  if (Array.isArray(command)) {
    if (!command.every((token) => typeof token === "string")) return false;
    const [first, ...rest] = command;
    if (first === "superskill" || first === "superskill-cli") return true;
    return first === "npx" && managedArgList(rest);
  }
  return false;
}

export function isLatestLauncher(entry: unknown): boolean {
  if (entry === null || typeof entry !== "object") return false;
  const { command, args } = entry as { command?: unknown; args?: unknown };
  if (typeof command === "string") {
    return command === "npx" && Array.isArray(args) && args.join(" ") === LATEST_ARGS.join(" ");
  }
  return Array.isArray(command) && command.join(" ") === LATEST_ARRAY.join(" ");
}

export function renderLauncher(commandType: "string" | "array"): string {
  return commandType === "array" ? LATEST_ARRAY.join(" ") : `npx ${LATEST_ARGS.join(" ")}`;
}
