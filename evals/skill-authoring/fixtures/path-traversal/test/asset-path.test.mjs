import assert from "node:assert/strict";
import { test } from "node:test";
import { resolve } from "node:path";
import { resolveAssetPath } from "../src/asset-path.mjs";

test("resolves a direct child asset", () => {
  assert.equal(resolveAssetPath("/workspace/assets", "safe.txt"), resolve("/workspace/assets", "safe.txt"));
});

test("rejects a name that escapes the asset root", () => {
  assert.throws(() => resolveAssetPath("/workspace/assets", "../outside.txt"));
});

test("rejects absolute asset names", () => {
  assert.throws(() => resolveAssetPath("/workspace/assets", "/outside.txt"));
});
