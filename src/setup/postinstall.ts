#!/usr/bin/env node
try {
  const { detectClients } = await import("./detect.js");

  if (!process.stdout.isTTY) process.exit(0);

  const detected = detectClients();

  console.log("\n  obsidian-mcp installed!\n");

  if (detected.length > 0) {
    console.log(`  Detected: ${detected.map((c) => c.config.name).join(", ")}`);
    console.log('  Run "obsidian-mcp-cli setup" to auto-configure them as your knowledge base.');
  } else {
    console.log("  No AI clients detected.");
  }

  console.log('  Run "obsidian-mcp-cli setup --all" to configure all 8 supported clients.\n');
} catch {
  process.exit(0);
}
