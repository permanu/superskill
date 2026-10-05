// SPDX-License-Identifier: Apache-2.0

import { readFile } from "node:fs/promises";
import type { ActivationEvent } from "./types.js";

export interface ReadEventsResult {
  events: ActivationEvent[];
  malformed: number;
}

export async function readTelemetryEvents(eventsPath: string): Promise<ReadEventsResult> {
  let raw: string;
  try {
    raw = await readFile(eventsPath, "utf-8");
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return { events: [], malformed: 0 };
    console.error("[telemetry] cannot read events:", (e as Error).message);
    return { events: [], malformed: 0 };
  }
  const events: ActivationEvent[] = [];
  let malformed = 0;
  for (const line of raw.split("\n")) {
    if (line.trim() === "") continue;
    try {
      const parsed = JSON.parse(line) as ActivationEvent;
      if (parsed && parsed.type === "activation" && Array.isArray(parsed.selected)) {
        events.push(parsed);
      } else {
        malformed += 1;
      }
    } catch {
      malformed += 1;
    }
  }
  return { events, malformed };
}

export interface RuleSelectionStat {
  id: string;
  count: number;
}

export interface TelemetryReport {
  activations: number;
  malformed: number;
  firstAt: string | null;
  lastAt: string | null;
  tools: Record<string, number>;
  phases: Record<string, number>;
  langs: Record<string, number>;
  selectedTotals: { distinct: number; total: number };
  topSelected: RuleSelectionStat[];
  neverSelected: string[];
  dropped: RuleSelectionStat[];
  budget: { allocatedAvg: number; usedAvg: number; dropRate: number };
}

function countBy(values: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const value of values) out[value] = (out[value] ?? 0) + 1;
  return out;
}

function topCounts(counts: Map<string, number>, limit?: number): RuleSelectionStat[] {
  const entries = [...counts.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => (b.count - a.count) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return limit === undefined ? entries : entries.slice(0, limit);
}

export function buildTelemetryReport(
  events: readonly ActivationEvent[],
  knownRuleIds: readonly string[],
  topLimit = 20
): TelemetryReport {
  const selectedCounts = new Map<string, number>();
  const droppedCounts = new Map<string, number>();
  let allocatedSum = 0;
  let usedSum = 0;
  let droppedTotal = 0;
  let selectedTotal = 0;

  for (const event of events) {
    for (const id of event.selected) {
      selectedCounts.set(id, (selectedCounts.get(id) ?? 0) + 1);
      selectedTotal += 1;
    }
    for (const id of event.dropped) {
      droppedCounts.set(id, (droppedCounts.get(id) ?? 0) + 1);
      droppedTotal += 1;
    }
    allocatedSum += event.budget?.allocated ?? 0;
    usedSum += event.budget?.used ?? 0;
  }

  const known = new Set(knownRuleIds);
  const neverSelected = [...known]
    .filter((id) => !selectedCounts.has(id) && !droppedCounts.has(id))
    .sort();
  const times = events.map((event) => event.at).filter((at) => typeof at === "string").sort();
  const activations = events.length;

  return {
    activations,
    malformed: 0,
    firstAt: times[0] ?? null,
    lastAt: times[times.length - 1] ?? null,
    tools: countBy(events.map((event) => event.tool ?? "unknown")),
    phases: countBy(events.map((event) => event.phase ?? "unknown")),
    langs: countBy(events.flatMap((event) => event.langs ?? [])),
    selectedTotals: { distinct: selectedCounts.size, total: selectedTotal },
    topSelected: topCounts(selectedCounts, topLimit),
    neverSelected,
    dropped: topCounts(droppedCounts, topLimit),
    budget: {
      allocatedAvg: activations === 0 ? 0 : Math.round(allocatedSum / activations),
      usedAvg: activations === 0 ? 0 : Math.round(usedSum / activations),
      dropRate: selectedTotal + droppedTotal === 0 ? 0 : droppedTotal / (selectedTotal + droppedTotal),
    },
  };
}

function formatCounts(counts: Record<string, number>): string {
  const entries = Object.entries(counts).sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]));
  if (entries.length === 0) return "none";
  return entries.map(([key, value]) => `${key} ${value}`).join(", ");
}

export function renderTelemetryReport(report: TelemetryReport): string {
  const lines: string[] = [];
  lines.push("Telemetry report — rule selection effectiveness");
  lines.push(`Activations: ${report.activations}`);
  if (report.firstAt && report.lastAt) lines.push(`Window: ${report.firstAt} → ${report.lastAt}`);
  lines.push(`Tools: ${formatCounts(report.tools)}`);
  lines.push(`Phases: ${formatCounts(report.phases)}`);
  lines.push(`Languages: ${formatCounts(report.langs)}`);
  lines.push(
    `Selected: ${report.selectedTotals.total} slots across ${report.selectedTotals.distinct} distinct rules` +
      ` (avg budget used ${report.budget.usedAvg}/${report.budget.allocatedAvg})`
  );
  lines.push(`Budget drop rate: ${(report.budget.dropRate * 100).toFixed(1)}%`);
  lines.push("");
  lines.push(`Top selected rules (${report.topSelected.length}):`);
  if (report.topSelected.length === 0) lines.push("  (none)");
  for (const stat of report.topSelected) lines.push(`  ${stat.count.toString().padStart(5)}  ${stat.id}`);
  lines.push("");
  lines.push(`Most dropped for budget (${report.dropped.length}):`);
  if (report.dropped.length === 0) lines.push("  (none)");
  for (const stat of report.dropped.slice(0, 10)) lines.push(`  ${stat.count.toString().padStart(5)}  ${stat.id}`);
  lines.push("");
  lines.push(`Never triggered (${report.neverSelected.length}) — revisit triggers or retire:`);
  if (report.neverSelected.length === 0) lines.push("  (none)");
  for (const id of report.neverSelected.slice(0, 30)) lines.push(`  ${id}`);
  if (report.neverSelected.length > 30) lines.push(`  … and ${report.neverSelected.length - 30} more`);
  return lines.join("\n");
}
