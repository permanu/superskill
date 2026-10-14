import { readFile } from "node:fs/promises";

export async function readGrammarManifest(path) {
  const bytes = await readFile(path);
  const manifest = JSON.parse(bytes.toString("utf-8"));
  const entries = Object.entries(manifest.sha256 ?? {});
  if (manifest.package !== "tree-sitter-wasms" || typeof manifest.version !== "string" || entries.length === 0) {
    throw new Error(`invalid grammar manifest: ${path}`);
  }
  for (const [name, digest] of entries) {
    if (!/^tree-sitter-[a-z0-9_-]+\.wasm$/.test(name) || typeof digest !== "string" || !/^[a-f0-9]{64}$/.test(digest)) {
      throw new Error(`invalid grammar manifest entry: ${name}`);
    }
  }
  return { manifest, entries, bytes };
}
