// SPDX-License-Identifier: Apache-2.0
import { MARKER_START_TOML, MARKER_END_TOML } from "./types.js";

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
  if (!hasBlock && /^\s*\[mcp_servers\.superskill(?:\.env)?\]\s*$/m.test(content)) return null;

  let base = content;
  if (hasBlock && force) {
    base = removeTomlBlock(content).content;
  }

  const trimmed = base.trimEnd();
  const separator = trimmed.length > 0 ? "\n\n" : "";
  return `${trimmed}${separator}${MARKER_START_TOML}\n${block}\n${MARKER_END_TOML}\n`;
}

export function removeTomlBlock(content: string): {
  content: string;
  removed: boolean;
} {
  const regex = new RegExp(
    `\\n?${escapeRegex(MARKER_START_TOML)}[\\s\\S]*?${escapeRegex(MARKER_END_TOML)}\\n?`,
    "g"
  );
  const result = content.replace(regex, "\n");
  return {
    content: result.replace(/\n{3,}/g, "\n\n").trimEnd() + "\n",
    removed: result !== content,
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
