#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
try {
  const { detectClients } = await import("./detect.js");
  const { CLIENT_REGISTRY } = await import("./clients.js");

  if (!process.stdout.isTTY) process.exit(0);

  const detected = detectClients();

  console.log("\n  superskill installed!\n");

  if (detected.length > 0) {
    console.log(`  Detected: ${detected.map((c) => c.config.name).join(", ")}`);
    console.log('  Run "superskill setup" to auto-configure them as your knowledge base.');
  } else {
    console.log("  No AI clients detected.");
  }

  console.log(`  Run "superskill setup --all" to configure all ${CLIENT_REGISTRY.filter(client => client.support === "documented").length} supported clients.\n`);
} catch {
  // Postinstall must never fail the install
  process.exit(0);
}
