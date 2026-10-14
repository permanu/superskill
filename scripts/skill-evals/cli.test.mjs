import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const cliPath = path.join(repoRoot, "scripts/skill-evals/cli.mjs");
const profilePath = path.join(repoRoot, "evals/skill-authoring/core-entrypoints.v1.json");
const schemaPath = path.join(repoRoot, "evals/skill-authoring/protocol.v1.schema.json");
const tempPrefix = path.join(os.tmpdir(), "skill-evals-cli-test-");
const digest = (letter) => letter.repeat(64);

function runCli(args, cwd = repoRoot) {
  return spawnSync(process.execPath, [cliPath, ...args], { cwd, encoding: "utf8" });
}

function controls() {
  const steering = digest("a");
  return {
    harness: { id: "opencode-cli", version: "2.0.28" },
    permissions: {
      profile: "fixture-only-no-real-vault-no-network",
      network: "disabled",
      vault: "inaccessible",
      home: "isolated-empty",
      fresh_workspace_per_run: true,
      cross_arm_outputs: false,
      project_agents_disabled: true,
      global_steering_sha256: steering,
      permission_rules_sha256: digest("c"),
    },
    mcp: {
      servers: [{ name: "superskill", backend_sha256: digest("b") }],
      storage_root: "isolated-arm-home",
      cwd_policy: "fresh-fixture-repo",
      command_policy: "absolute-node-and-built-server",
      environment_policies: { HOME: "arm-home", VAULT_PATH: "arm-home/vault", SUPERSKILL_CACHE_ROOT: "arm-home/cache", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" },
    },
    available_tools: ["file-read", "file-edit", "node-test", "superskill"],
    steering_sha256: steering,
  };
}

test("protocol JSON Schema is valid JSON and names the request/result/ledger contracts", async () => {
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.ok(schema.$defs.plan);
  assert.ok(schema.$defs.request);
  assert.ok(schema.$defs.result);
  assert.ok(schema.$defs.ledger);
});

test("CLI prepares, validates, grades, aggregates, and exports viewer-compatible outputs without live execution", async (t) => {
  const directory = await mkdtemp(tempPrefix);
  t.after(() => rm(directory, { recursive: true, force: true }));
  const controlsPath = path.join(directory, "controls.json");
  const planPath = path.join(directory, "plan.json");
  const resultsPath = path.join(directory, "results.json");
  const ledgerPath = path.join(directory, "ledger.json");
  const gradesPath = path.join(directory, "grades.json");
  const aggregatePath = path.join(directory, "aggregate.json");
  const reviewPath = path.join(directory, "review");
  await writeFile(controlsPath, JSON.stringify(controls()));
  await writeFile(resultsPath, JSON.stringify({ results: [] }));

  const validateProfile = runCli(["validate-profile", profilePath]);
  assert.equal(validateProfile.status, 0, validateProfile.stderr);
  assert.equal(JSON.parse(validateProfile.stdout).cases.length, 3);

  const prepare = runCli([
    "prepare",
    "--profile", profilePath,
    "--controls", controlsPath,
    "--model", "openai/gpt-6-luna",
    "--variant", "max",
    "--old-skill-sha256", digest("d"),
    "--improved-skill-sha256", digest("e"),
    "--out", planPath,
  ]);
  assert.equal(prepare.status, 0, prepare.stderr);
  assert.equal(JSON.parse(prepare.stdout).requests, 9);

  const validatePlan = runCli(["validate-plan", "--plan", planPath, "--profile", profilePath]);
  assert.equal(validatePlan.status, 0, validatePlan.stderr);
  assert.equal(JSON.parse(validatePlan.stdout).requests, 9);
  const tamperedPlanPath = path.join(directory, "tampered-plan.json");
  const tamperedPlan = JSON.parse(await readFile(planPath, "utf8"));
  tamperedPlan.requests[0].user_prompt = "changed after preparation";
  await writeFile(tamperedPlanPath, JSON.stringify(tamperedPlan));
  const rejectTamperedPlan = runCli(["validate-plan", "--plan", tamperedPlanPath, "--profile", profilePath]);
  assert.notEqual(rejectTamperedPlan.status, 0);
  assert.match(rejectTamperedPlan.stderr, /does not match the source profile/);

  const imported = runCli(["import-results", "--plan", planPath, "--results", resultsPath, "--out", ledgerPath]);
  assert.equal(imported.status, 0, imported.stderr);
  assert.equal(JSON.parse(imported.stdout).missing, 9);

  const validateLedger = runCli(["validate-ledger", "--ledger", ledgerPath]);
  assert.equal(validateLedger.status, 0, validateLedger.stderr);
  assert.equal(JSON.parse(validateLedger.stdout).complete, false);

  const grade = runCli(["grade", "--ledger", ledgerPath, "--profile", profilePath, "--out", gradesPath]);
  assert.equal(grade.status, 0, grade.stderr);
  const gradeOutput = JSON.parse(await readFile(gradesPath, "utf8"));
  assert.ok(gradeOutput.runs.every((run) => run.overall === "incomplete"));
  assert.ok(gradeOutput.runs.every((run) => run.findings.every((finding) => finding.passed === null)));

  const aggregate = runCli(["aggregate", "--ledger", ledgerPath, "--profile", profilePath, "--out", aggregatePath]);
  assert.equal(aggregate.status, 0, aggregate.stderr);
  const aggregateOutput = JSON.parse(await readFile(aggregatePath, "utf8"));
  assert.equal(aggregateOutput.controlled_comparison, false);
  assert.equal(aggregateOutput.by_arm.without_native_skill.outcome.rate, null);

  const review = runCli(["export-review", "--ledger", ledgerPath, "--profile", profilePath, "--out-dir", reviewPath]);
  assert.equal(review.status, 0, review.stderr);
  const runFolders = await (await import("node:fs/promises")).readdir(reviewPath);
  assert.equal(runFolders.length, 9);
  const firstMetadata = JSON.parse(await readFile(path.join(reviewPath, runFolders[0], "eval_metadata.json"), "utf8"));
  assert.equal(firstMetadata.model.reference, "openai/gpt-6-luna#max");
  const firstViewerGrade = JSON.parse(await readFile(path.join(reviewPath, runFolders[0], "grading.json"), "utf8"));
  assert.ok(firstViewerGrade.expectations.every((expectation) => expectation.passed === null));

  const noLiveAdapter = runCli(["prepare", "--live"]);
  assert.notEqual(noLiveAdapter.status, 0);
  assert.match(noLiveAdapter.stderr, /Unknown option|Missing required option/);
});

test("fingerprint-skill CLI emits the raw SHA for one SKILL.md file", async (t) => {
  const directory = await mkdtemp(tempPrefix);
  t.after(() => rm(directory, { recursive: true, force: true }));
  const skillPath = path.join(directory, "SKILL.md");
  await writeFile(skillPath, "skill fixture\n");
  const result = runCli(["fingerprint-skill", skillPath]);
  assert.equal(result.status, 0, result.stderr);
  const fingerprint = JSON.parse(result.stdout);
  assert.equal(fingerprint.kind, "file");
  assert.equal(fingerprint.files, 1);
  assert.equal(fingerprint.sha256.length, 64);
});
