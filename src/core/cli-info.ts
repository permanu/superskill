// SPDX-License-Identifier: Apache-2.0

/**
 * Standard CLI staples for the `superskill` binary (the stdio MCP server).
 * MCP clients launch it with no arguments; humans get --version/--help.
 */

export function cliHelpText(version: string): string {
  return `superskill ${version} — MCP server (stdio)

Usage:
  superskill              Start the MCP server (configure your AI client to run this)
  superskill --version    Print the installed version
  superskill --help       Show this help

This binary is the MCP server. The full command-line interface is the
superskill-cli binary:

  superskill-cli --help   read, write, search, context, skill, spec, tickets,
                          evidence, gate, impact, claims, telemetry, setup, ...

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
