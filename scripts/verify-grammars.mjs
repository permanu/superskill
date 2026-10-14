#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readGrammarManifest } from "./grammar-manifest.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export async function verifyGrammarAssets(workspace = root) {
  const { manifest, entries, bytes } = await readGrammarManifest(join(workspace, "src/lib/codegraph/grammars/MANIFEST.json"));
  const outDir = join(workspace, "dist/lib/codegraph/grammars");
  const vendoredManifest = await readFile(join(outDir, "MANIFEST.json"));
  if (!bytes.equals(vendoredManifest)) throw new Error("vendored grammar manifest differs from the source manifest");
  for (const [name, expected] of entries) {
    const actual = createHash("sha256").update(await readFile(join(outDir, name))).digest("hex");
    if (actual !== expected) throw new Error(`sha256 mismatch for ${name}: expected ${expected}, got ${actual}`);
  }
  for (const name of await readdir(outDir, { recursive: true })) {
    if (name.endsWith(".wasm") && !Object.hasOwn(manifest.sha256, name)) throw new Error(`unmanifested grammar asset: ${name}`);
  }
  return entries.length;
}

async function main() {
  const count = await verifyGrammarAssets();
  const { LANGUAGES } = await import("../dist/lib/codegraph/types.js");
  const { supportedFor } = await import("../dist/lib/codegraph/grammars.js");
  const { manifest } = await readGrammarManifest(join(root, "src/lib/codegraph/grammars/MANIFEST.json"));
  for (const language of LANGUAGES) {
    const support = supportedFor(language);
    if (!support.supported || support.source !== "vendored" || !Object.hasOwn(manifest.sha256, basename(support.wasm ?? ""))) {
      throw new Error(`${language}: no source-pinned vendored grammar resolved (${support.reason ?? support.source})`);
    }
  }
  console.log(`[verify-grammars] ${count} source-pinned assets verified; ${LANGUAGES.length} languages resolve to vendored grammars`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(`[verify-grammars] ${error.message}`);
    process.exitCode = 1;
  });
}
