#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later OR Commercial
try {
  const { detectClients } = await import("./detect.js");

  if (!process.stdout.isTTY) process.exit(0);

  const detected = detectClients();

  console.log("\n  superskill installed!\n");

  if (detected.length > 0) {
    console.log(`  Detected: ${detected.map((c) => c.config.name).join(", ")}`);
    console.log('  Run "superskill-cli setup" to auto-configure them as your knowledge base.');
  } else {
    console.log("  No AI clients detected.");
  }

  console.log('  Run "superskill-cli setup --all" to configure all 8 supported clients.\n');
} catch {
  process.exit(0);
}
