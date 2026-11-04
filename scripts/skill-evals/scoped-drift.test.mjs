import assert from "node:assert/strict";
import { test } from "node:test";
import { validateProfile } from "./protocol.mjs";

test("scoped drift fixtures validate without granting scans, commands or writes", async () => {
  const { profile, errors } = await validateProfile(new URL("../../evals/scoped-drift/core.v1.json", import.meta.url).pathname);
  assert.deepEqual(errors, []);
  assert.deepEqual(profile.cases.map(item => item.id), ["current-versus-proposed", "incomplete-and-stale", "bounded-request"]);
  for (const item of profile.cases) {
    assert.deepEqual(item.execution_policy.read_paths, item.fixture_files);
    assert.deepEqual(item.execution_policy.write_paths, []);
    assert.deepEqual(item.execution_policy.commands, []);
    assert.equal(item.execution_policy.network, "deny");
    assert.equal(item.execution_policy.external_paths, "deny");
    assert.deepEqual(item.expected_artifacts, []);
    assert.ok(item.human_review.length >= 2);
  }
});
