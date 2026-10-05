#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
try {
  const { teardownAll } = await import("./teardown.js");
  await teardownAll({ silent: true });
} catch {
  // never block uninstall
}
process.exit(0);
