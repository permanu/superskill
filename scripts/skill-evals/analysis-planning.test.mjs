import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { sha256, validateProfile } from "./protocol.mjs";

const root = new URL("../../evals/analysis-planning/", import.meta.url);

test("analysis/planning scenarios validate through the existing evaluation protocol", async () => {
  const { profile, errors } = await validateProfile(new URL("core.v1.json", root).pathname);
  assert.deepEqual(errors, []);
  assert.deepEqual(profile.cases.map(item => item.id), [
    "component-contract", "incomplete-evidence", "implementation-plan", "simple-retrieval",
  ]);
  for (const item of profile.cases) {
    assert.deepEqual(item.execution_policy.write_paths, []);
    assert.deepEqual(item.execution_policy.commands, []);
    assert.deepEqual(item.expected_artifacts, []);
    assert.equal(item.execution_policy.network, "deny");
    assert.equal(item.execution_policy.external_paths, "deny");
    assert.ok(item.human_review.length > 0);
    assert.ok(item.rubrics.some(rubric => rubric.check.kind === "trace_no_external_scope"));
  }
});

test("the pre-change planning baseline remains fingerprinted independently of the current pack", async () => {
  const manifest = JSON.parse(await readFile(new URL("baseline/manifest.json", root), "utf8"));
  assert.match(manifest.revision, /^[a-f0-9]{40}$/);
  assert.equal(manifest.analysis_pack, "absent");
  const bytes = await readFile(new URL("baseline/plan.md", root));
  assert.equal(sha256(bytes), manifest.plan_sha256);
});
