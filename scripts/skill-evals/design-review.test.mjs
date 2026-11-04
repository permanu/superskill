import assert from "node:assert/strict";
import { test } from "node:test";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { assessDesignReview } from "./design-review.mjs";

const digest = "a".repeat(64);
const expected = { request_id: "child-1", input_hashes: { "spec.md": digest }, steering_sha256: digest, parent_marker: "PARENT_ONLY_SYNTHETIC_9471" };
function capture() {
  return {
    request_id: "child-1", status: "complete", execution_source: "harness",
    observed: { steering_sha256: digest, project_agents_disabled: true, mcp_server_names: [] },
    workspace: { isolation: "verified", home_isolated: true, vault_isolated: true, cross_arm_access: "blocked" },
    context: { source: "harness", complete: true, fresh_conversation: true, parent_inherited: false, memory_enabled: false, input_hashes: { "spec.md": digest } },
    trace: { source: "harness", status: "complete", events: [{ type: "read", scope: "fixture", path: "spec.md", success: true }] },
    output: { final_text: "The proposal leaves failure behavior unspecified." },
  };
}

test("complete host evidence is observable, not an approval or an isolation attestation", () => {
  const result = assessDesignReview(capture(), expected);
  assert.equal(result.status, "observed");
  assert.equal(result.independence, "not-attested");
  assert.equal(result.gate_evidence, false);
});

for (const status of ["failed", "skipped", "incomplete"]) test(`a ${status} reviewer cannot count as completed`, () => {
  const result = capture();
  result.status = status;
  assert.notEqual(assessDesignReview(result, expected).status, "observed");
});

for (const mutate of [
  value => { value.context = undefined; },
  value => { value.context.fresh_conversation = false; },
  value => { value.context.parent_inherited = true; },
  value => { value.context.memory_enabled = true; },
  value => { value.context.complete = false; },
  value => { value.context.source = "manual"; },
  value => { value.trace.status = "partial"; },
  value => { value.trace.source = "manual"; },
  value => { value.execution_source = "manual"; },
  value => { value.workspace.home_isolated = false; },
  value => { value.workspace.vault_isolated = null; },
  value => { value.observed.project_agents_disabled = false; },
  value => { value.observed.mcp_server_names = ["superskill"]; },
  value => { value.observed.steering_sha256 = "b".repeat(64); },
  value => { value.context.input_hashes["spec.md"] = "b".repeat(64); },
  value => { value.context.input_hashes["author-notes.md"] = digest; },
  value => { value.output.final_text = ""; },
  value => { value.request_id = "parent"; },
]) test(`missing or contaminated scope is not accepted: ${mutate}`, () => {
  const value = capture();
  mutate(value);
  assert.notEqual(assessDesignReview(value, expected).status, "observed");
});

for (const event of [
  { type: "read", scope: "fixture", path: "author-notes.md", success: true },
  { type: "read", scope: "external", path: "spec.md", success: true },
  { type: "read", scope: "fixture", path: "spec.md", success: null },
  { type: "write", scope: "fixture", path: "spec.md", success: true },
  { type: "network", scope: "external" },
  { type: "command", scope: "fixture", argv: ["cat", "spec.md"], effect: "read", exit_code: 0 },
  { type: "unrecognized" },
]) test(`unexpected or unobservable action is rejected: ${JSON.stringify(event)}`, () => {
  const value = capture();
  value.trace.events.push(event);
  assert.notEqual(assessDesignReview(value, expected).status, "observed");
});

test("changed full document bytes invalidate the capture without relying on HEAD", () => {
  assert.notEqual(assessDesignReview(capture(), { ...expected, input_hashes: { "spec.md": "b".repeat(64) } }).status, "observed");
});

test("a parent-only marker leak fails without echoing the marker", () => {
  const value = capture();
  value.output.final_text += expected.parent_marker;
  const result = assessDesignReview(value, expected);
  assert.equal(result.status, "failed");
  assert.ok(result.reasons.includes("parent-context-leak"));
  assert.ok(!JSON.stringify(result).includes(expected.parent_marker));
});

test("a missing parent-context probe cannot support an observed context result", () => {
  const { parent_marker, ...withoutProbe } = expected;
  assert.equal(assessDesignReview(capture(), withoutProbe).status, "unverified");
});

test("missing, malformed and oversized evidence remains unverified", () => {
  for (const value of [null, {}, "done", { ...capture(), trace: { events: Array(10001).fill({}) } }]) {
    assert.equal(assessDesignReview(value, expected).status, "unverified");
  }
  for (const input_hashes of [{}, { "../spec.md": digest }, { "spec.md": "HEAD" }]) {
    assert.equal(assessDesignReview(capture(), { ...expected, input_hashes }).status, "unverified");
  }
});

test("the offline CLI reports only evidence status and leaves its inputs unchanged", async () => {
  const root = await mkdtemp(join(tmpdir(), "design-review-check-"));
  const expectedPath = join(root, "expected.json");
  const capturePath = join(root, "capture.json");
  const run = promisify(execFile);
  const script = fileURLToPath(new URL("design-review.mjs", import.meta.url));
  try {
    const value = capture();
    value.output.final_text = "PRIVATE_SYNTHETIC_REVIEW_TEXT";
    const original = JSON.stringify(value);
    await writeFile(expectedPath, JSON.stringify(expected));
    await writeFile(capturePath, original);
    const result = await run(process.execPath, [script, expectedPath, capturePath]);
    assert.equal(JSON.parse(result.stdout).status, "observed");
    assert.ok(!result.stdout.includes(value.output.final_text));
    assert.equal(await readFile(capturePath, "utf8"), original);
    value.trace.status = "partial";
    await writeFile(capturePath, JSON.stringify(value));
    await assert.rejects(run(process.execPath, [script, expectedPath, capturePath]), error => error.code === 1 && JSON.parse(error.stdout).status === "unverified");
    await writeFile(capturePath, "PRIVATE_INVALID_JSON");
    await assert.rejects(run(process.execPath, [script, expectedPath, capturePath]), error => error.code === 1 && !error.stderr.includes("PRIVATE_INVALID_JSON"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
