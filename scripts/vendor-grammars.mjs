#!/usr/bin/env node
// Copies the pinned tree-sitter grammar wasms from the tree-sitter-wasms
// devDependency into dist/lib/codegraph/grammars/ so published packages are
// self-contained (no ~49 MB runtime dependency). Hashes are verified against
// src/lib/codegraph/grammars/MANIFEST.json.

import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(root, "src", "lib", "codegraph", "grammars", "MANIFEST.json");
const packageDir = join(root, "node_modules", "tree-sitter-wasms");
const sourceDir = join(packageDir, "out");
const outDir = join(root, "dist", "lib", "codegraph", "grammars");

const manifest = JSON.parse(await readFile(manifestPath, "utf-8"));
const files = Object.keys(manifest.sha256 ?? {});
if (files.length === 0) {
  console.error("[vendor-grammars] MANIFEST.json has no sha256 entries");
  process.exit(1);
}

try {
  await readFile(join(packageDir, "package.json"));
} catch {
  console.error("[vendor-grammars] tree-sitter-wasms devDependency is not installed — run `npm install` before `npm run build`");
  process.exit(1);
}

await mkdir(outDir, { recursive: true });
for (const name of files) {
  let bytes;
  try {
    bytes = await readFile(join(sourceDir, name));
  } catch {
    console.error(`[vendor-grammars] missing ${name} in tree-sitter-wasms@${manifest.version}`);
    process.exit(1);
  }
  const actual = createHash("sha256").update(bytes).digest("hex");
  const expected = manifest.sha256[name];
  if (actual !== expected) {
    console.error(
      `[vendor-grammars] sha256 mismatch for ${name}: expected ${expected}, got ${actual} (tree-sitter-wasms@${manifest.version} drifted)`,
    );
    process.exit(1);
  }
  await writeFile(join(outDir, name), bytes);
}
await copyFile(manifestPath, join(outDir, "MANIFEST.json"));
console.log(`[vendor-grammars] vendored ${files.length} grammars into dist/lib/codegraph/grammars/`);
