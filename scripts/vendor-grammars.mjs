#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readGrammarManifest } from "./grammar-manifest.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export async function vendorGrammars(workspace = root) {
  const manifestPath = join(workspace, "src/lib/codegraph/grammars/MANIFEST.json");
  const packageDir = join(workspace, "node_modules/tree-sitter-wasms");
  const outDir = join(workspace, "dist/lib/codegraph/grammars");
  const { manifest, entries, bytes: manifestBytes } = await readGrammarManifest(manifestPath);
  const installed = JSON.parse(await readFile(join(packageDir, "package.json"), "utf-8"));
  const project = JSON.parse(await readFile(join(workspace, "package.json"), "utf-8"));
  if (installed.name !== manifest.package || installed.version !== manifest.version || project.devDependencies?.[manifest.package] !== manifest.version) {
    throw new Error(`tree-sitter-wasms version mismatch: expected ${manifest.version}, installed ${installed.version}`);
  }
  const verified = [];
  for (const [name, expected] of entries) {
    const bytes = await readFile(join(packageDir, "out", name));
    const actual = createHash("sha256").update(bytes).digest("hex");
    if (actual !== expected) throw new Error(`sha256 mismatch for ${name}: expected ${expected}, got ${actual}`);
    verified.push([name, bytes]);
  }
  let previous = [];
  try {
    previous = (await readGrammarManifest(join(outDir, "MANIFEST.json"))).entries;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await mkdir(outDir, { recursive: true });
  for (const [name, bytes] of verified) await writeFile(join(outDir, name), bytes);
  for (const [name] of previous) {
    if (Object.hasOwn(manifest.sha256, name)) continue;
    await unlink(join(outDir, name)).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
  await writeFile(join(outDir, "MANIFEST.json"), manifestBytes);
  return verified.length;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  vendorGrammars().then((count) => {
    console.log(`[vendor-grammars] vendored ${count} verified grammars into dist/lib/codegraph/grammars/`);
  }).catch((error) => {
    console.error(`[vendor-grammars] ${error.message}`);
    process.exitCode = 1;
  });
}
