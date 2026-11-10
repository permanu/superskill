#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
import { Command } from "commander";
import { registerSetupCommands } from "./index.js";

try {
  const program = new Command();
  registerSetupCommands(program);
  await program.parseAsync(["setup", "--all"], { from: "user" });
  if (process.exitCode) {
    console.error('[setup-postinstall] Some clients could not be configured. Run "superskill setup --all" to retry.');
    process.exitCode = 0;
  }
} catch (error) {
  console.error(`[setup-postinstall] Automatic setup failed: ${error instanceof Error ? error.message : String(error)}. Run "superskill setup --all" to retry.`);
  process.exitCode = 0;
}
