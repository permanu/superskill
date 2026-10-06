// SPDX-License-Identifier: Apache-2.0

/**
 * Standard CLI staples for the `superskill` binary. AI clients launch it with
 * no arguments over pipes (the stdio MCP server); a command or an interactive
 * terminal routes to the full CLI.
 */

export function cliHelpText(version: string): string {
  return `superskill ${version}

Usage:
  superskill               No arguments over piped stdio: start the MCP server (AI clients)
  superskill <command>     Full CLI — read, write, search, skill, graph, setup, worktree, …
  superskill --version     Print the installed version
  superskill --help        Show the CLI help

\`superskill-cli\` remains a permanent alias for the CLI.
Set SUPERSKILL_FORCE_MCP=1 to force MCP server mode.

Docs: https://github.com/permanu/superskill`;
}

/**
 * Print version or help for the standard flags/subcommands and report whether
 * the caller should exit. Returns false for an MCP-client launch (no args).
 */
export function handleInfoFlags(argv: readonly string[], version: string): boolean {
  if (argv.includes("--version") || argv.includes("-V") || argv[0] === "version") {
    console.log(version);
    return true;
  }
  if (argv.includes("--help") || argv.includes("-h") || argv[0] === "help") {
    console.log(cliHelpText(version));
    return true;
  }
  return false;
}
