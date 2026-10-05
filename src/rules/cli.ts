#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0

import { Command } from "commander";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { RULE_LANGUAGES, type ValidationIssue, type ValidationReport } from "./types.js";
import { validateAll, validatePack } from "./validate.js";

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
        report = await validatePack(langDir, { compile: options.compile });
        label = `Validated ${options.lang} rules in ${langDir}`;
      } else {
        report = await validateAll(root, { compile: options.compile });
        label = `Validated rules in ${root}`;
      }
      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        printReport(report, label);
      }
      const skipped = report.warnings.filter((entry) => entry.code === "compile-skipped");
      if (options.strict && skipped.length > 0) {
        console.error(
          `[strict] ${skipped.length} snippet compile(s) skipped because a toolchain was missing; ` +
            `install the toolchain or drop --strict.`
        );
        process.exitCode = 1;
      }
      if (report.errors.length > 0) process.exitCode = 1;
    });

  await program.parseAsync(process.argv);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
