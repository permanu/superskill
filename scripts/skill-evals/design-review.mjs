import { pathToFileURL } from "node:url";
import { readJson } from "./protocol.mjs";

const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const digest = value => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const safePath = value => typeof value === "string" && value.length <= 512 && !/[\\\u0000-\u001f]/.test(value) && !value.startsWith("/") && !value.includes(":") && value.split("/").every(part => part && part !== "." && part !== "..");
const hashes = value => record(value) && Object.keys(value).length > 0 && Object.keys(value).length <= 64 && Object.entries(value).every(([key, hash]) => safePath(key) && digest(hash));

export function assessDesignReview(result, expected) {
  const finish = (status, reasons) => ({ status, reasons, independence: "not-attested", gate_evidence: false });
  if (!record(expected) || typeof expected.request_id !== "string" || !expected.request_id.trim() || !hashes(expected.input_hashes) || !digest(expected.steering_sha256)) return finish("unverified", ["invalid-expected-inputs"]);
  if (!record(result)) return finish("unverified", ["missing-capture"]);
  if (result.status === "failed" || result.status === "skipped") return finish("failed", ["reviewer-not-completed"]);
  const reasons = [];
  if (typeof expected.parent_marker !== "string" || !/^[A-Za-z0-9_-]{16,128}$/.test(expected.parent_marker)) reasons.push("parent-probe-unobserved");
  else if (typeof result.output?.final_text === "string" && result.output.final_text.includes(expected.parent_marker)) return finish("failed", ["parent-context-leak"]);
  if (result.request_id !== expected.request_id) reasons.push("reviewer-identity-mismatch");
  if (result.status !== "complete" || result.execution_source !== "harness" || typeof result.output?.final_text !== "string" || !result.output.final_text.trim()) reasons.push("completion-unobserved");
  const context = result.context;
  if (!record(context) || context.source !== "harness" || context.complete !== true || context.fresh_conversation !== true || context.parent_inherited !== false || context.memory_enabled !== false) reasons.push("context-unverified");
  if (!hashes(context?.input_hashes) || Object.keys(context.input_hashes).length !== Object.keys(expected.input_hashes).length || Object.entries(expected.input_hashes).some(([key, hash]) => context.input_hashes[key] !== hash)) reasons.push("inputs-changed-or-unobserved");
  const observed = result.observed;
  if (observed?.steering_sha256 !== expected.steering_sha256 || observed?.project_agents_disabled !== true || !Array.isArray(observed?.mcp_server_names) || observed.mcp_server_names.length !== 0) reasons.push("bootstrap-unverified");
  const workspace = result.workspace;
  if (workspace?.isolation !== "verified" || workspace.home_isolated !== true || workspace.vault_isolated !== true || workspace.cross_arm_access !== "blocked") reasons.push("workspace-unverified");
  const trace = result.trace;
  if (!record(trace) || !Array.isArray(trace.events) || trace.events.length > 10000) return finish("unverified", [...reasons, "invalid-trace"]);
  if (trace.source !== "harness" || trace.status !== "complete") reasons.push("trace-incomplete");
  for (const event of trace.events) {
    if (!record(event) || !["read", "write", "network", "command", "approval_request"].includes(event.type)) {
      reasons.push("unknown-action");
    } else if (event.type !== "read" || event.scope !== "fixture" || !safePath(event.path) || !Object.hasOwn(expected.input_hashes, event.path)) {
      return finish("failed", [...reasons, "out-of-scope-action"]);
    } else if (event.success !== true) reasons.push("read-unverified");
  }
  return finish(reasons.length ? "unverified" : "observed", [...new Set(reasons)]);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 4) throw new Error("Usage: node scripts/skill-evals/design-review.mjs EXPECTED.json CAPTURE.json");
    const [expected, capture] = await Promise.all([readJson(process.argv[2]), readJson(process.argv[3])]);
    const result = assessDesignReview(capture, expected);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.status === "observed" ? 0 : 1;
  } catch (error) {
    const code = ["EACCES", "EISDIR", "ENOENT", "EPERM", "EIO"].includes(error?.code) ? error.code : "INVALID_EVIDENCE";
    process.stderr.write(`[design-review] ${code}: expected two bounded regular JSON files with valid capture data.\n`);
    process.exitCode = 1;
  }
}
