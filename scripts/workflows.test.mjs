import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import matter from "gray-matter";

async function workflow(name) {
  return matter(`---\n${await readFile(new URL(`../.github/workflows/${name}.yml`, import.meta.url), "utf-8")}\n---`).data;
}

test("workflows pin every external action and do not persist checkout credentials", async () => {
  for (const name of ["ci", "release"]) {
    const config = await workflow(name);
    assert.deepEqual(config.permissions, { contents: "read" });
    for (const job of Object.values(config.jobs)) {
      for (const step of job.steps) {
        if (step.uses) assert.match(step.uses, /^[\w-]+\/[\w-]+@[a-f0-9]{40}$/);
        if (step.uses?.startsWith("actions/checkout@")) assert.equal(step.with["persist-credentials"], false);
        if (step.run) assert.equal(step.run.includes("${{"), false, "runtime expressions belong in env, not shell source");
      }
    }
  }
});

test("only the publishing job can write release contents and release tags enter through env", async () => {
  const release = await workflow("release");
  assert.equal(release.jobs.ci.permissions, undefined);
  assert.deepEqual(release.jobs["github-release"].permissions, { contents: "write" });
  const publish = release.jobs["github-release"].steps.find((step) => step.name === "Create GitHub Release");
  assert.equal(publish.env.RELEASE_TAG, "${{ github.ref_name }}");
  assert.match(publish.run, /^node scripts\/release-notes\.mjs\n/);
  assert.match(publish.run, /gh release create "\$RELEASE_TAG"/);
  assert.match(publish.run, /--verify-tag/);
  assert.match(publish.run, /--notes-file "\$RUNNER_TEMP\/release-body\.md"/);
});
