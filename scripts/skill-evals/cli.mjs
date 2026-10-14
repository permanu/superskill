#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  EvalError,
  aggregateGrades,
  fingerprintSkill,
  gradeLedger,
  loadValidatedProfile,
  preparePlan,
  readArtifactForViewer,
  readJson,
  validateLedgerFiles,
  validateLedgerShape,
  validateProfile,
  validatePlanShape,
  writeJsonNew,
} from "./protocol.mjs";

function parseFlags(args, required, optional = []) {
  const accepted = new Set([...required, ...optional]);
  const flags = {};
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (!key.startsWith("--")) throw new EvalError(`Unexpected argument: ${key}`);
    const name = key.slice(2);
    if (!accepted.has(name)) throw new EvalError(`Unknown option: ${key}`);
    if (Object.hasOwn(flags, name)) throw new EvalError(`Option may only be specified once: ${key}`);
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) throw new EvalError(`Missing value for ${key}`);
    flags[name] = value;
    index += 1;
  }
  for (const name of required) if (!Object.hasOwn(flags, name)) throw new EvalError(`Missing required option --${name}`);
  return flags;
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function readLedger(ledgerPath) {
  const ledger = await readJson(ledgerPath);
  const errors = await validateLedgerFiles(ledger, ledgerPath);
  if (errors.length) throw new EvalError(`Invalid ledger:\n- ${errors.join("\n- ")}`);
  return ledger;
}

async function gradeWithProfile(ledger, ledgerPath, profilePath) {
  const profile = await loadValidatedProfile(profilePath, ledger.plan.profile.id, ledger.plan.profile.sha256, ledger.plan);
  return gradeLedger(ledger, ledgerPath, profile);
}

function relativeOutputPath(root, relativePath) {
  if (typeof relativePath !== "string" || relativePath.length === 0 || relativePath.includes("\\") || path.posix.isAbsolute(relativePath)) {
    throw new EvalError(`Unsafe viewer output path: ${relativePath}`);
  }
  const parts = relativePath.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) throw new EvalError(`Unsafe viewer output path: ${relativePath}`);
  const resolved = path.resolve(root, ...parts);
  const relative = path.relative(root, resolved);
  if (relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) throw new EvalError(`Viewer output path escapes its root: ${relativePath}`);
  return resolved;
}

function safeSegment(value) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^[.-]+|[.-]+$/g, "") || "eval";
}

async function exportReview(ledger, ledgerPath, profilePath, outputDirectory) {
  const grades = await gradeWithProfile(ledger, ledgerPath, profilePath);
  const profile = await readJson(profilePath);
  const caseIndexes = new Map(profile.cases.map((item, index) => [item.id, index + 1]));
  const gradeMap = new Map(grades.runs.map((run) => [run.request_id, run]));
  const resultMap = new Map(ledger.results.map((result) => [result.request_id, result]));
  const root = path.resolve(outputDirectory);
  await mkdir(root);
  for (const request of ledger.plan.requests) {
    const slug = `eval-${String(caseIndexes.get(request.case_id)).padStart(2, "0")}-${safeSegment(request.case_id)}-${request.arm_id}`;
    const runDirectory = path.join(root, slug);
    const outputDirectoryPath = path.join(runDirectory, "outputs");
    await mkdir(outputDirectoryPath, { recursive: true });
    const result = resultMap.get(request.request_id);
    const grade = gradeMap.get(request.request_id);
    const artifactManifest = [];
    if (result?.output.final_text !== null && result?.output.final_text !== undefined) {
      await writeJsonNew(path.join(outputDirectoryPath, "final-response.json"), { text: result.output.final_text });
      await writeFile(path.join(outputDirectoryPath, "final-response.md"), result.output.final_text, { flag: "wx", mode: 0o600 });
    }
    for (const [index, file] of (result?.output.files ?? []).entries()) {
      const basename = path.posix.basename(file.workspace_path).replace(/[^a-zA-Z0-9._-]+/g, "-");
      const viewerName = `artifact-${String(index + 1).padStart(3, "0")}-${basename}`;
      const targetPath = relativeOutputPath(outputDirectoryPath, viewerName);
      const sourceBytes = await readArtifactForViewer(ledgerPath, file);
      await writeFile(targetPath, sourceBytes, { flag: "wx", mode: 0o600 });
      artifactManifest.push({ viewer_name: viewerName, workspace_path: file.workspace_path, sha256: file.sha256 });
    }
    if (artifactManifest.length > 0) await writeJsonNew(path.join(outputDirectoryPath, "artifact-manifest.json"), artifactManifest);
    const evalId = caseIndexes.get(request.case_id);
    await writeJsonNew(path.join(runDirectory, "eval_metadata.json"), {
      eval_id: evalId,
      eval_name: request.case_name,
      prompt: request.user_prompt,
      arm_id: request.arm_id,
      model: ledger.plan.model,
      skill_sha256: request.skill.sha256,
    });
    await writeJsonNew(path.join(runDirectory, "grading.json"), {
      expectations: grade.expectations,
      summary: {
        passed: grade.viewer_summary.passed,
        failed: grade.viewer_summary.failed,
        unknown: grade.viewer_summary.unknown,
        total: grade.viewer_summary.total,
        pass_rate: grade.viewer_summary.pass_rate,
        evidence_coverage: grade.viewer_summary.evidence_coverage,
      },
      human_review: grade.manual_review,
      deterministic_overall: grade.overall,
    });
    if (result) await writeJsonNew(path.join(runDirectory, "timing.json"), {
      duration_ms: result.duration_ms,
      total_duration_seconds: result.duration_ms === null ? null : result.duration_ms / 1000,
      total_tokens: result.usage.total_tokens,
      total_tokens_source: result.usage.total_tokens_source,
      input_tokens: result.usage.input_tokens,
      output_tokens: result.usage.output_tokens,
      reasoning_tokens: result.usage.reasoning_tokens,
      cost_usd: result.usage.cost_usd,
      cost_unknown_reason: result.usage.cost_unknown_reason,
    });
  }
  printJson({ output_directory: root, runs: ledger.plan.requests.length, viewer_format: "skill-creator eval-viewer output folders" });
}

export async function runCli(args) {
  const [command, ...rest] = args;
  if (!command || command === "--help" || command === "help") {
    process.stdout.write([
      "Usage:",
      "  node scripts/skill-evals/cli.mjs validate-profile <profile.json>",
      "  node scripts/skill-evals/cli.mjs fingerprint-skill <SKILL.md-or-directory>",
      "  node scripts/skill-evals/cli.mjs prepare --profile FILE --controls FILE --model ID --variant NAME --old-skill-sha256 SHA --improved-skill-sha256 SHA --out FILE",
      "  node scripts/skill-evals/cli.mjs validate-plan --plan FILE --profile FILE",
      "  node scripts/skill-evals/cli.mjs import-results --plan FILE --results FILE --out FILE",
      "  node scripts/skill-evals/cli.mjs validate-ledger --ledger FILE",
      "  node scripts/skill-evals/cli.mjs grade --ledger FILE --profile FILE [--out FILE]",
      "  node scripts/skill-evals/cli.mjs aggregate --ledger FILE --profile FILE [--out FILE]",
      "  node scripts/skill-evals/cli.mjs export-review --ledger FILE --profile FILE --out-dir NEW_DIRECTORY",
      "",
      "This CLI prepares requests and grades imported runs. It never launches a provider or network call.",
    ].join("\n") + "\n");
    return;
  }
  if (command === "validate-profile") {
    if (rest.length !== 1) throw new EvalError("Usage: validate-profile <profile.json>");
    const { profile, errors } = await validateProfile(rest[0]);
    if (errors.length) throw new EvalError(`Invalid profile:\n- ${errors.join("\n- ")}`);
    printJson({ valid: true, profile_id: profile.profile_id, cases: profile.cases.map(({ id, name }) => ({ id, name })) });
    return;
  }
  if (command === "fingerprint-skill") {
    if (rest.length !== 1) throw new EvalError("Usage: fingerprint-skill <SKILL.md-or-directory>");
    printJson(await fingerprintSkill(rest[0]));
    return;
  }
  if (command === "prepare") {
    const flags = parseFlags(rest, ["profile", "controls", "model", "variant", "old-skill-sha256", "improved-skill-sha256", "out"]);
    const plan = await preparePlan({
      profilePath: flags.profile,
      controlsPath: flags.controls,
      modelId: flags.model,
      variant: flags.variant,
      oldSkillSha256: flags["old-skill-sha256"],
      improvedSkillSha256: flags["improved-skill-sha256"],
    });
    await writeJsonNew(flags.out, plan);
    printJson({ plan_id: plan.plan_id, output: path.resolve(flags.out), model: plan.model, requests: plan.requests.length, arms: plan.arms.map((arm) => arm.id), live_calls: 0 });
    return;
  }
  if (command === "validate-plan") {
    const flags = parseFlags(rest, ["plan", "profile"]);
    const plan = await readJson(flags.plan);
    const errors = validatePlanShape(plan);
    if (errors.length) throw new EvalError(`Invalid plan:\n- ${errors.join("\n- ")}`);
    const profile = await loadValidatedProfile(flags.profile, plan.profile.id, plan.profile.sha256, plan);
    printJson({ valid: true, plan_id: plan.plan_id, profile_id: profile.profile_id, model: plan.model, requests: plan.requests.length, arms: plan.arms.map((arm) => arm.id) });
    return;
  }
  if (command === "import-results") {
    const flags = parseFlags(rest, ["plan", "results", "out"]);
    const plan = await readJson(flags.plan);
    const planErrors = validatePlanShape(plan);
    if (planErrors.length) throw new EvalError(`Invalid plan:\n- ${planErrors.join("\n- ")}`);
    const resultInput = await readJson(flags.results);
    const results = Array.isArray(resultInput) ? resultInput : resultInput?.results;
    if (!Array.isArray(results)) throw new EvalError("results file must be an array or an object with a results array");
    const ledger = { protocol_version: 1, plan, results };
    const errors = validateLedgerShape(ledger);
    if (errors.length) throw new EvalError(`Invalid imported results:\n- ${errors.join("\n- ")}`);
    const fileErrors = await validateLedgerFiles(ledger, flags.out);
    if (fileErrors.length) throw new EvalError(`Imported artifact files did not validate:\n- ${fileErrors.join("\n- ")}`);
    await writeJsonNew(flags.out, ledger);
    printJson({ output: path.resolve(flags.out), received: results.length, planned: plan.requests.length, missing: plan.requests.length - results.length });
    return;
  }
  if (command === "validate-ledger") {
    const flags = parseFlags(rest, ["ledger"]);
    const ledger = await readLedger(flags.ledger);
    const received = new Set(ledger.results.map((result) => result.request_id));
    printJson({ valid: true, plan_id: ledger.plan.plan_id, planned: ledger.plan.requests.length, received: received.size, missing: ledger.plan.requests.length - received.size, complete: received.size === ledger.plan.requests.length });
    return;
  }
  if (command === "grade") {
    const flags = parseFlags(rest, ["ledger", "profile"], ["out"]);
    const ledger = await readLedger(flags.ledger);
    const grades = await gradeWithProfile(ledger, flags.ledger, flags.profile);
    if (flags.out) await writeJsonNew(flags.out, grades);
    else printJson(grades);
    if (flags.out) printJson({ output: path.resolve(flags.out), runs: grades.runs.length, grading_method: grades.grading_method });
    return;
  }
  if (command === "aggregate") {
    const flags = parseFlags(rest, ["ledger", "profile"], ["out"]);
    const ledger = await readLedger(flags.ledger);
    const grades = await gradeWithProfile(ledger, flags.ledger, flags.profile);
    const report = aggregateGrades(ledger, grades);
    if (flags.out) await writeJsonNew(flags.out, report);
    else printJson(report);
    if (flags.out) printJson({ output: path.resolve(flags.out), controlled_comparison: report.controlled_comparison, counts: report.counts });
    return;
  }
  if (command === "export-review") {
    const flags = parseFlags(rest, ["ledger", "profile", "out-dir"]);
    const ledger = await readLedger(flags.ledger);
    await exportReview(ledger, flags.ledger, flags.profile, flags["out-dir"]);
    return;
  }
  throw new EvalError(`Unknown command: ${command}`);
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === pathToFileURL(currentFile).href) {
  runCli(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`[skill-evals] ${error.message}\n`);
    process.exitCode = 1;
  });
}
