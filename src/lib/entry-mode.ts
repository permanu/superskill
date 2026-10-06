// SPDX-License-Identifier: Apache-2.0

export type EntryMode = "cli" | "mcp";

export interface EntryModeInput {
  args: readonly string[];
  stdinIsTTY: boolean;
  forceMcp?: boolean;
}

/**
 * `superskill` is both the CLI and the MCP server. AI clients spawn it with no
 * arguments over pipes; humans run it with a command or from a terminal.
 */
export function resolveEntryMode(input: EntryModeInput): EntryMode {
  if (input.forceMcp) return "mcp";
  if (input.args.length > 0) return "cli";
  return input.stdinIsTTY ? "cli" : "mcp";
}
