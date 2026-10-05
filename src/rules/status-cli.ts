#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
import { Command } from "commander";
import { resolve } from "node:path";
import { generateStatus, defaultCatalogRulesDir, scanCatalogRules } from "./status.js";
import {
  loadPlan,
  planFile,
  readState,
  resolveWorkstreamsDir,
  stateFile,
  writePlanFile,
  writeStateFile,
} from "./queue.js";
import { loadPrefixTitles, reconcileState, revisePlan } from "./reconcile.js";

const program = new Command();

program
  .name("rules-status")
  .description("Atomic rules campaign tracker — STATUS.md, plan revision and reconciliation");

program
  .command("generate")
  .description("Regenerate STATUS.md from plan.json, state.json and catalog/rules/**/*.md")
  .option("--workstreams <dir>", "workstreams directory (default: <repo>/workstreams)")
  .option("--catalog <dir>", "catalog/rules directory (default: <repo>/catalog/rules)")
  .option("--out <path>", "output file (default: <workstreams>/STATUS.md)")
  .option("--next <n>", "number of pending batches to list", "20")
  .option("--json", "print the report as JSON instead of a summary")
  .action(async (opts: { workstreams?: string; catalog?: string; out?: string; next: string; json?: boolean }) => {
    try {
      const next = parseInt(opts.next, 10);
      if (Number.isNaN(next) || next < 0) {
        throw new Error("--next must be a non-negative integer");
      }
      const result = await generateStatus({
        workstreamsDir: opts.workstreams,
        catalogRulesDir: opts.catalog,
        statusPath: opts.out,
        nextLimit: next,
      });
      if (opts.json) {
        console.log(JSON.stringify(result.report, null, 2));
      } else {
        const { report } = result;
        console.log(
          `Wrote ${result.statusPath}\n` +
            `  rules on disk: ${report.onDiskTotal}/${report.targetTotal} (${report.percentOnDisk.toFixed(1)}%)\n` +
            `  batches: ${report.batchTotals.done} done, ${report.batchTotals.claimed} claimed, ${report.batchTotals.pending} pending, ` +
            `${report.batchTotals.failed} failed, ${report.batchTotals.blocked} blocked, ${report.batchTotals.superseded} superseded`
        );
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`Error: ${msg}`);
      process.exit(1);
    }
  });

program
  .command("revise-plan")
  .description(
    "Append a batch for every delivered prefix plan.json is missing and reset language targets to delivered verified counts"
  )
  .option("--workstreams <dir>", "workstreams directory (default: <repo>/workstreams)")
  .option("--catalog <dir>", "catalog/rules directory (default: <repo>/catalog/rules)")
  .action(async (opts: { workstreams?: string; catalog?: string }) => {
    try {
      const workstreamsDir = resolveWorkstreamsDir({ workstreamsDir: opts.workstreams });
      const catalogDir = opts.catalog ? resolve(opts.catalog) : defaultCatalogRulesDir();
      const plan = await loadPlan(workstreamsDir);
      const rules = await scanCatalogRules(catalogDir, plan.languages.map((l) => l.lang));
      const titles = await loadPrefixTitles(catalogDir, plan.languages.map((l) => l.lang));
      const { plan: revised, added } = revisePlan(plan, rules, titles, new Date().toISOString());
      await writePlanFile(workstreamsDir, revised);
      console.log(`Revised ${planFile(workstreamsDir)}: +${added.length} delivered batch(es)`);
      for (const id of added) console.log(`  + ${id}`);
      console.log(`  targetTotal: ${revised.targetTotal}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`Error: ${msg}`);
      process.exit(1);
    }
  });

program
  .command("reconcile")
  .description("Derive batch state from the catalog (done/superseded) and write state.json")
  .option("--workstreams <dir>", "workstreams directory (default: <repo>/workstreams)")
  .option("--catalog <dir>", "catalog/rules directory (default: <repo>/catalog/rules)")
  .action(async (opts: { workstreams?: string; catalog?: string }) => {
    try {
      const workstreamsDir = resolveWorkstreamsDir({ workstreamsDir: opts.workstreams });
      const catalogDir = opts.catalog ? resolve(opts.catalog) : defaultCatalogRulesDir();
      const plan = await loadPlan(workstreamsDir);
      const existing = await readState(workstreamsDir);
      const rules = await scanCatalogRules(catalogDir, plan.languages.map((l) => l.lang));
      const state = reconcileState(plan, rules, { workstreams: existing?.workstreams ?? {} });
      await writeStateFile(workstreamsDir, state);
      const entries = Object.values(state.batches);
      const done = entries.filter((entry) => entry.status === "done").length;
      const superseded = entries.filter((entry) => entry.status === "superseded").length;
      console.log(
        `Reconciled ${stateFile(workstreamsDir)}: ${entries.length} batch(es) — ${done} done, ${superseded} superseded`
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`Error: ${msg}`);
      process.exit(1);
    }
  });

program.parse();

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  process.exit(1);
});
