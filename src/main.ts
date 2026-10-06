#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0

import { resolveEntryMode } from "./lib/entry-mode.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const mode = resolveEntryMode({
    args,
    stdinIsTTY: Boolean(process.stdin.isTTY),
    forceMcp: process.env.SUPERSKILL_FORCE_MCP === "1",
  });

  if (mode === "mcp") {
    await import("./mcp-server.js");
    return;
  }

  const { createProgram } = await import("./cli.js");
  const program = createProgram();
  if (args.length === 0) {
    program.outputHelp();
    return;
  }
  await program.parseAsync();
}

main().catch((e: unknown) => {
  console.error("superskill failed to start:", e);
  process.exit(1);
});
