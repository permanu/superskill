import assert from "node:assert/strict";
import { test } from "node:test";
import { verifyPackageFiles } from "./verify-package.mjs";

test("published files allow curated skills, runtime grammars and plugin metadata", () => {
  assert.equal(verifyPackageFiles(["dist/main.js", "dist/lib/codegraph/grammars/tree-sitter-rust.wasm", "catalog/review/architect.md", "skills/superskill/SKILL.md", ".claude-plugin/plugin.json"]), 5);
});

test("published files reject development transcripts, credentials, caches and test artifacts", () => {
  for (const path of ["dist/.superskill/graph.json", "dist/.claude/session.json", "dist/.opencode/history.jsonl", "dist/sessions/run.md", "dist/transcripts/run.json", "dist/cache/data.json", "dist/.cache/data.json", "dist/node_modules/package.json", "dist/.env", "dist/.env.production", "dist/coverage/report.html", "dist/lib/foo.test.js", "dist/lib/foo.test.mjs", "dist/lib/foo.js.map", "dist/__fixtures__/token.txt", "catalog/debug.log"]) {
    assert.throws(() => verifyPackageFiles(["dist/main.js", path]), /forbidden packaged file/);
  }
});
