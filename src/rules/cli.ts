#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0

import { Command } from "commander";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { RULE_LANGUAGES, type ValidationIssue, type ValidationReport } from "./types.js";
import { validateAll, validatePack } from "./validate.js";

export function applyValidationExitGates(
  report: ValidationReport,
  options: { strict?: boolean } = {},
): ValidationReport {
  const errors = [...report.errors];
  if (report.checkedCount === 0 && errors.length === 0) {
    errors.push({
      code: "no-rules-checked",
      message: "no valid rules were checked; verify the requested rules root or pack contains rule files",
      path: report.warnings[0]?.path ?? "catalog/rules",
      severity: "error",
    });
  }
  if (options.strict) {
    const skipped = report.warnings.filter((entry) => entry.code === "compile-skipped");
    if (skipped.length > 0) {
      errors.push({
        code: "compile-skipped-strict",
        message: `${skipped.length} snippet compile(s) were skipped because a toolchain was missing; install the toolchain or drop --strict`,
        path: skipped[0].path,
        severity: "error",
      });
    }
  }
  return { ...report, errors };
}

function defaultCatalogRoot(): string {
  return resolve(join(dirname(fileURLToPath(import.meta.url)), "..", "..", "catalog", "rules"));
}

function formatIssue(entry: ValidationIssue): string {
  return `${entry.severity} [${entry.code}] ${entry.path}: ${entry.message}`;
}

function printReport(report: ValidationReport, label: string): void {
  console.log(label);
  console.log(`Rules: ${report.ruleCount} (clean: ${report.checkedCount})`);
  for (const warning of report.warnings) console.log(formatIssue(warning));
  for (const error of report.errors) console.log(formatIssue(error));
  console.log(`${report.errors.length} error(s), ${report.warnings.length} warning(s)`);
}

async function main(): Promise<void> {
  const program = new Command();
  program
    .name("rules-validator")
    .description("Deterministic validator for the atomic rule packs in catalog/rules");

  program
    .command("validate")
    .description("Validate rule files against docs/authoring/CONTRACT.md")
    .option("--lang <lang>", `validate a single language pack (${RULE_LANGUAGES.join(", ")})`)
    .option("--json", "print the validation report as JSON")
    .option("--no-compile", "skip compiling Bad/Good snippets")
    .option("--strict", "exit non-zero when a snippet compile was skipped (missing toolchain)")
    .action(async (options: { lang?: string; json?: boolean; compile: boolean; strict?: boolean }) => {
      const root = defaultCatalogRoot();
      let report: ValidationReport;
      let label: string;
      if (options.lang) {
        if (!(RULE_LANGUAGES as readonly string[]).includes(options.lang)) {
          console.error(`Unknown language "${options.lang}". Valid languages: ${RULE_LANGUAGES.join(", ")}`);
          process.exitCode = 1;
          return;
        }
        const langDir = join(root, options.lang);
        report = await validatePack(langDir, { compile: options.compile, requireNonEmpty: true });
        label = `Validated ${options.lang} rules in ${langDir}`;
      } else {
        report = await validateAll(root, { compile: options.compile, requireNonEmpty: true });
        label = `Validated rules in ${root}`;
      }
      report = applyValidationExitGates(report, { strict: options.strict });
      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        printReport(report, label);
      }
      if (report.errors.length > 0) process.exitCode = 1;
    });

  await program.parseAsync(process.argv);
}

const entryPath = process.argv[1];
if (entryPath && resolve(entryPath) === resolve(fileURLToPath(import.meta.url))) {
  main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  });
}
