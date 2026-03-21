#!/usr/bin/env node
try {
  const { teardownAll } = await import("./teardown.js");
  await teardownAll({ silent: true });
} catch {
  // never block uninstall
}
process.exit(0);
