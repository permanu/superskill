// SPDX-License-Identifier: Apache-2.0
import { isManagedLauncher, isOurTool } from "./launcher.js";
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
  if (env && env.start === main.end) {
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

function tableLauncher(body: string): Record<string, unknown> | null {
  const command = parseString(body, "command");
  if (command !== null) {
    const args = parseStringArray(body, "args");
    return { command, ...(args === null ? {} : { args }) };
  }
  const commandArray = parseStringArray(body, "command");
  return commandArray === null ? null : { command: commandArray };
}

function isOwnedTable(body: string): boolean {
  const launcher = tableLauncher(body);
  return launcher !== null && isOurTool(launcher);
}

function upgradeTable(content: string, span: TomlSpan, force: boolean, block: string): string | null {
  const body = span.text;
  const launcher = tableLauncher(body);
  if (launcher === null || !isOurTool(launcher)) return null;
  if (!force && !isManagedLauncher(launcher)) return null;

  const command = parseString(body, "command");
  const commandArray = parseStringArray(body, "command");
  let updated = body;

  if (command === "npx") {
    const args = parseStringArray(body, "args");
    if (args === null) return null;
    const current = args.join(" ");
    if (!force && current !== OLD_ARGS.join(" ") && current !== LATEST_ARGS.join(" ")) return null;
    if (current !== LATEST_ARGS.join(" ")) updated = updated.replace(/^[ \t]*args[ \t]*=[ \t]*\[[^\]]*\][ \t]*$/m, LATEST_ARGS_LINE);
  } else if (command === "superskill" || command === "superskill-cli") {
    if (!force) return null;
    updated = updated.replace(/^([ \t]*)command[ \t]*=[ \t]*"superskill(?:-cli)?"[ \t]*$/m, "$1command = \"npx\"");
    if (/^[ \t]*args[ \t]*=[ \t]*\[[^\]]*\][ \t]*$/m.test(updated)) {
      updated = updated.replace(/^[ \t]*args[ \t]*=[ \t]*\[[^\]]*\][ \t]*$/m, LATEST_ARGS_LINE);
    } else {
      updated = updated.replace(/^([ \t]*)command[ \t]*=[ \t]*"npx"[ \t]*$/m, `$1command = "npx"\n$1${LATEST_ARGS_LINE}`);
    }
  } else if (commandArray !== null) {
    const isNpx = commandArray[0] === "npx";
    if (!force && (!isNpx || ![["npx", ...OLD_ARGS].join(" "), ["npx", ...LATEST_ARGS].join(" ")].includes(commandArray.join(" ")))) return null;
    updated = updated.replace(/^[ \t]*command[ \t]*=[ \t]*\[[^\]]*\][ \t]*$/m, LATEST_ARRAY_LINE);
  } else {
    return null;
  }

  const desiredEnv = findTable(block, `${TABLE}.env`);
  const path = desiredEnv && parseString(desiredEnv.text, "PATH");
  const env = findTable(updated, `${TABLE}.env`);
  if (path !== null && desiredEnv && env && !/^[ \t]*(?:PATH|"PATH"|'PATH')[ \t]*=/m.test(env.text)) {
    const header = `[${TABLE}.env]`;
    updated = updated.replace(header, `${header}\nPATH = ${JSON.stringify(path).replace(/\x7f/g, "\\u007f")}`);
  } else if (path !== null && desiredEnv && !env && !findTable(content, `${TABLE}.env`) && !/^[ \t]*(?:env|"env"|'env')[ \t]*[.=]/m.test(body)) {
    updated = `${updated.trimEnd()}\n\n[${TABLE}.env]\nPATH = ${JSON.stringify(path).replace(/\x7f/g, "\\u007f")}\n\n`;
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

  if (hasBlock && force) {
    const blocks = [...content.matchAll(new RegExp(`${escapeRegex(MARKER_START_TOML)}\\n([\\s\\S]*?)\\n${escapeRegex(MARKER_END_TOML)}`, "g"))];
    if (blocks.length !== 1) return null;
    const launcher = tableLauncher(blocks[0][1]);
    if (launcher !== null && !isOurTool(launcher)) return null;
  }

  if (hasBlock && !force) {
    const blocks = [...content.matchAll(new RegExp(`${escapeRegex(MARKER_START_TOML)}\\n([\\s\\S]*?)\\n${escapeRegex(MARKER_END_TOML)}`, "g"))];
    if (blocks.length !== 1) return null;
    const span = superskillTableSpan(blocks[0][1]);
    if (!span) return null;
    const upgraded = upgradeTable(blocks[0][1], span, false, block);
    if (upgraded === null) return null;
    const replacement = `${MARKER_START_TOML}\n${upgraded}\n${MARKER_END_TOML}`;
    return content.slice(0, blocks[0].index) + replacement + content.slice(blocks[0].index! + blocks[0][0].length);
  }

  if (!hasBlock) {
    const span = superskillTableSpan(content);
    if (span) return upgradeTable(content, span, force, block);
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
    let joined = result.slice(0, span.start) + result.slice(span.end);
    const env = findTable(joined, `${TABLE}.env`);
    if (env) joined = joined.slice(0, env.start) + joined.slice(env.end);
    result = joined.replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
    return { content: result, removed: true };
  }
  return { content: result, removed: marked };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
