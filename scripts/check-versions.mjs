#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
// Release guard: package.json, .claude-plugin/plugin.json and
// .claude-plugin/marketplace.json must advertise the exact same version.

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readJson(relativePath) {
  try {
    return JSON.parse(readFileSync(join(root, relativePath), "utf-8"));
  } catch (error) {
    console.error(`[check-versions] cannot read ${relativePath}: ${error.message}`);
    process.exit(1);
  }
}

function versionOf(value) {
  return typeof value === "string" && value.length > 0 ? value : "<missing>";
}

const packageJson = readJson("package.json");
const pluginJson = readJson(".claude-plugin/plugin.json");
const marketplaceJson = readJson(".claude-plugin/marketplace.json");

const sources = [
  ["package.json", versionOf(packageJson.version)],
  [".claude-plugin/plugin.json", versionOf(pluginJson.version)],
  [".claude-plugin/marketplace.json metadata", versionOf(marketplaceJson?.metadata?.version)],
];
for (const [index, plugin] of (marketplaceJson?.plugins ?? []).entries()) {
  sources.push([`.claude-plugin/marketplace.json plugins[${index}]`, versionOf(plugin?.version)]);
}

const distinct = new Set(sources.map(([, version]) => version));
if (distinct.size !== 1) {
  console.error("[check-versions] version mismatch:");
  for (const [source, version] of sources) console.error(`  - ${source}: ${version}`);
  process.exit(1);
}

console.log(`[check-versions] ok: ${[...distinct][0]} across ${sources.length} source(s)`);
