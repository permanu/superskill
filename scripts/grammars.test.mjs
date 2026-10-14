import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { vendorGrammars } from "./vendor-grammars.mjs";
import { verifyGrammarAssets } from "./verify-grammars.mjs";

let root;
let source;
let output;
let manifest;
const name = "tree-sitter-typescript.wasm";
const bytes = Buffer.from("pinned wasm fixture");

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "grammar-integrity-"));
  source = join(root, "src/lib/codegraph/grammars");
  output = join(root, "dist/lib/codegraph/grammars");
  await mkdir(source, { recursive: true });
  await mkdir(join(root, "node_modules/tree-sitter-wasms/out"), { recursive: true });
  await mkdir(output, { recursive: true });
  manifest = { package: "tree-sitter-wasms", version: "0.1.13", sha256: { [name]: createHash("sha256").update(bytes).digest("hex") } };
  await writeFile(join(source, "MANIFEST.json"), JSON.stringify(manifest));
  await writeFile(join(root, "package.json"), JSON.stringify({ devDependencies: { "tree-sitter-wasms": "0.1.13" } }));
  await writeFile(join(root, "node_modules/tree-sitter-wasms/package.json"), JSON.stringify({ name: "tree-sitter-wasms", version: "0.1.13" }));
  await writeFile(join(root, "node_modules/tree-sitter-wasms/out", name), bytes);
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

test("vendors and verifies every source-manifest hash", async () => {
  assert.equal(await vendorGrammars(root), 1);
  assert.equal(await verifyGrammarAssets(root), 1);
  assert.deepEqual(await readFile(join(output, name)), bytes);
});

test("verification rejects tampered dist wasm even if dist manifest is changed too", async () => {
  await vendorGrammars(root);
  await writeFile(join(output, name), "tampered");
  await assert.rejects(verifyGrammarAssets(root), /sha256 mismatch/);
  manifest.sha256[name] = createHash("sha256").update("tampered").digest("hex");
  await writeFile(join(output, "MANIFEST.json"), JSON.stringify(manifest));
  await assert.rejects(verifyGrammarAssets(root), /manifest|sha256 mismatch/i);
});

test("verification rejects missing assets and unmanifested wasm", async () => {
  await vendorGrammars(root);
  await rm(join(output, name));
  await assert.rejects(verifyGrammarAssets(root), /ENOENT|missing/);
  await vendorGrammars(root);
  await writeFile(join(output, "tree-sitter-extra.wasm"), bytes);
  await assert.rejects(verifyGrammarAssets(root), /unmanifested/);
  await rm(join(output, "tree-sitter-extra.wasm"));
  await mkdir(join(output, "nested"));
  await writeFile(join(output, "nested", "tree-sitter-extra.wasm"), bytes);
  await assert.rejects(verifyGrammarAssets(root), /unmanifested/);
});

test("vendoring rejects a wrong installed package version before changing output", async () => {
  await writeFile(join(root, "node_modules/tree-sitter-wasms/package.json"), JSON.stringify({ name: "tree-sitter-wasms", version: "9.0.0" }));
  await assert.rejects(vendorGrammars(root), /version/);
  await assert.rejects(stat(join(output, name)), { code: "ENOENT" });
});

test("vendoring verifies all inputs before writing or cleaning stale generated assets", async () => {
  await writeFile(join(output, "MANIFEST.json"), JSON.stringify({ ...manifest, sha256: { "tree-sitter-json.wasm": manifest.sha256[name] } }));
  await writeFile(join(output, "tree-sitter-json.wasm"), "old generated");
  await writeFile(join(root, "node_modules/tree-sitter-wasms/out", name), "tampered");
  await assert.rejects(vendorGrammars(root), /sha256 mismatch/);
  assert.equal(await readFile(join(output, "tree-sitter-json.wasm"), "utf-8"), "old generated");
  await assert.rejects(stat(join(output, name)), { code: "ENOENT" });
});

test("vendoring removes only stale prior-manifest grammar names and preserves unrelated files", async () => {
  await writeFile(join(output, "MANIFEST.json"), JSON.stringify({ ...manifest, sha256: { "tree-sitter-json.wasm": manifest.sha256[name] } }));
  await writeFile(join(output, "tree-sitter-json.wasm"), "old generated");
  await writeFile(join(output, "unrelated.wasm"), "user bytes");
  await writeFile(join(output, "tree-sitter-custom.wasm"), "untracked generated name");
  await mkdir(join(output, "notes"));
  await writeFile(join(output, "notes", "keep.md"), "user notes");
  await vendorGrammars(root);
  await assert.rejects(stat(join(output, "tree-sitter-json.wasm")), { code: "ENOENT" });
  assert.equal(await readFile(join(output, "unrelated.wasm"), "utf-8"), "user bytes");
  assert.equal(await readFile(join(output, "tree-sitter-custom.wasm"), "utf-8"), "untracked generated name");
  assert.equal(await readFile(join(output, "notes", "keep.md"), "utf-8"), "user notes");
});

test("manifest names cannot escape grammar directories or target unrelated files", async () => {
  for (const invalid of ["../victim.wasm", "notes.md", "tree-sitter-a/b.wasm"]) {
    await writeFile(join(source, "MANIFEST.json"), JSON.stringify({ ...manifest, sha256: { [invalid]: manifest.sha256[name] } }));
    await assert.rejects(vendorGrammars(root), /invalid/);
  }
});
