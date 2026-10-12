// SPDX-License-Identifier: Apache-2.0
import { isSuperskillLauncherToken } from "./launcher.js";
import { MARKER_START_TOML, MARKER_END_TOML } from "./types.js";

const TABLE = "mcp_servers.superskill";
const OLD_ARGS = ["-y", "superskill"];
const LATEST_ARGS = ["-y", "--prefer-online", "superskill@latest"];
const LATEST_ARGS_LINE = `args = [${LATEST_ARGS.map((value) => JSON.stringify(value)).join(", ")}]`;
const LATEST_ARRAY_LINE = `command = [${["npx", ...LATEST_ARGS].map((value) => JSON.stringify(value)).join(", ")}]`;

interface TomlSpan {
  start: number;
  end: number;
  text: string;
}

function findTable(content: string, header: string): TomlSpan | null {
  let offset = 0;
  for (const line of content.split("\n")) {
    if (line.trim() === `[${header}]`) {
      const start = offset;
      const headerEnd = content.indexOf("\n", start);
      let end = content.length;
      let pos = headerEnd === -1 ? content.length : headerEnd + 1;
      while (pos < content.length) {
        const nl = content.indexOf("\n", pos);
        const candidate = content.slice(pos, nl === -1 ? content.length : nl);
        if (/^\s*\[/.test(candidate)) {
          end = pos;
          break;
        }
        if (nl === -1) break;
        pos = nl + 1;
      }
      return { start, end, text: content.slice(start, end) };
    }
    offset += line.length + 1;
  }
  return null;
}

function superskillTableSpan(content: string): TomlSpan | null {
  const main = findTable(content, TABLE);
  if (!main) return null;
  const env = findTable(content, `${TABLE}.env`);
  if (env && env.start >= main.end) {
    return { start: main.start, end: env.end, text: content.slice(main.start, env.end) };
  }
  return main;
}

function parseString(body: string, key: string): string | null {
  const match = body.match(new RegExp(`^\\s*${key}\\s*=\\s*"((?:[^"\\\\]|\\\\.)*)"\\s*$`, "m"));
  if (!match) return null;
  try {
    return JSON.parse(`"${match[1]}"`) as string;
  } catch {
    return null;
  }
}

function parseStringArray(body: string, key: string): string[] | null {
  const match = body.match(new RegExp(`^\\s*${key}\\s*=\\s*(\\[[^\\]]*\\])\\s*$`, "m"));
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1].replace(/,\s*\]/g, "]"));
    return Array.isArray(parsed) && parsed.every((value) => typeof value === "string") ? parsed : null;
  } catch {
    return null;
  }
}

function managedArgs(args: readonly string[]): boolean {
  const positional = args.filter((token) => !token.startsWith("-"));
  return positional.length === 1 && isSuperskillLauncherToken(positional[0]);
}

function isOwnedTable(body: string): boolean {
  const command = parseString(body, "command");
  if (command === "superskill" || command === "superskill-cli") return true;
  if (command === "npx") {
    const args = parseStringArray(body, "args");
    return args !== null && managedArgs(args);
  }
  const commandArray = parseStringArray(body, "command");
  if (commandArray !== null) {
    const [first, ...rest] = commandArray;
    if (first === "superskill" || first === "superskill-cli") return true;
    if (first === "npx") return managedArgs(rest);
  }
  return false;
}

function upgradeTable(content: string, span: TomlSpan, force: boolean): string | null {
  const body = span.text;
  if (!isOwnedTable(body)) return null;

  const command = parseString(body, "command");
  const commandArray = parseStringArray(body, "command");
  let updated = body;

  if (command === "npx") {
    const args = parseStringArray(body, "args");
    if (args === null) return null;
    const current = args.join(" ");
    if (current === LATEST_ARGS.join(" ")) return null;
    if (!force && current !== OLD_ARGS.join(" ")) return null;
    updated = updated.replace(/^\s*args\s*=\s*\[[^\]]*\]\s*$/m, LATEST_ARGS_LINE);
  } else if (command === "superskill" || command === "superskill-cli") {
    if (!force) return null;
    updated = updated
      .replace(/^(\s*)command\s*=\s*"superskill(?:-cli)?"\s*$/m, `$1command = "npx"`)
      .replace(/^(\s*)command\s*=\s*"npx"\s*$/m, `$1command = "npx"\n$1${LATEST_ARGS_LINE}`);
  } else if (commandArray !== null) {
    const isOldGenerated = commandArray.join(" ") === ["npx", ...OLD_ARGS].join(" ");
    if (!force && !isOldGenerated) return null;
    updated = updated.replace(/^\s*command\s*=\s*\[[^\]]*\]\s*$/m, LATEST_ARRAY_LINE);
  } else {
    return null;
  }

  if (updated === body) return null;
  return content.slice(0, span.start) + updated + content.slice(span.end);
}

export function insertTomlBlock(
  content: string,
  block: string,
  force = false
): string | null {
  const hasBlock =
    content.includes(MARKER_START_TOML) && content.includes(MARKER_END_TOML);

  if (hasBlock && !force) {
    const blocks = [...content.matchAll(new RegExp(`${escapeRegex(MARKER_START_TOML)}\\n([\\s\\S]*?)\\n${escapeRegex(MARKER_END_TOML)}`, "g"))];
    const oldArgs = 'args = ["-y", "superskill"]';
    const latestArgs = 'args = ["-y", "--prefer-online", "superskill@latest"]';
    const prefix = `[mcp_servers.superskill]\ncommand = "npx"\n${oldArgs}\n\n[mcp_servers.superskill.env]\nVAULT_PATH = `;
    if (blocks.length !== 1 || !blocks[0][1].startsWith(prefix) || !block.includes(latestArgs)) return null;
    const oldBlock = blocks[0];
    const vaultLiteral = oldBlock[1].slice(prefix.length).split("\n")[0];
    try {
      if (typeof JSON.parse(vaultLiteral) !== "string") return null;
    } catch {
      return null;
    }
    const upgraded = oldBlock[0].replace(oldArgs, latestArgs);
    return content.slice(0, oldBlock.index) + upgraded + content.slice(oldBlock.index! + oldBlock[0].length);
  }

  if (!hasBlock) {
    const span = superskillTableSpan(content);
    if (span) return upgradeTable(content, span, force);
  }

  let base = content;
  if (hasBlock && force) {
    base = removeTomlBlock(content).content;
  }

  const trimmed = base.trimEnd();
  const separator = trimmed.length > 0 ? "\n\n" : "";
  return `${trimmed}${separator}${MARKER_START_TOML}\n${block}\n${MARKER_END_TOML}\n`;
}

export function reconcileTomlBlock(content: string, block: string): string | null {
  const marked = content.includes(MARKER_START_TOML) && content.includes(MARKER_END_TOML);
  if (marked || superskillTableSpan(content)) return insertTomlBlock(content, block, false);
  return null;
}

export function removeTomlBlock(content: string): {
  content: string;
  removed: boolean;
} {
  const regex = new RegExp(
    `\\n?${escapeRegex(MARKER_START_TOML)}[\\s\\S]*?${escapeRegex(MARKER_END_TOML)}\\n?`,
    "g"
  );
  const stripped = content.replace(regex, "\n");
  const marked = stripped !== content;
  let result = marked ? stripped.replace(/\n{3,}/g, "\n\n").trimEnd() + "\n" : content;

  const span = superskillTableSpan(result);
  if (span && isOwnedTable(span.text)) {
    const joined = result.slice(0, span.start) + result.slice(span.end);
    result = joined.replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
    return { content: result, removed: true };
  }
  return { content: result, removed: marked };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
