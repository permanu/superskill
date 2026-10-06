// SPDX-License-Identifier: Apache-2.0
import { formatBytes as formatBytesImpl } from "../format-bytes.js";
import { estimateTokens, truncateToTokenBudget } from "../token-estimator.js";
import type { SessionTrace, TraceToolCall } from "./types.js";

export interface ToolCensus {
  total: number;
  errors: number;
  byName: Array<{ name: string; count: number; errors: number }>;
}

export function toolCensus(trace: SessionTrace): ToolCensus {
  const map = new Map<string, { count: number; errors: number }>();
  let errors = 0;
  for (const call of trace.toolCalls) {
    const entry = map.get(call.name) ?? { count: 0, errors: 0 };
    entry.count += 1;
    if (call.status === "error") {
      entry.errors += 1;
      errors += 1;
    }
    map.set(call.name, entry);
  }
  const byName = [...map.entries()]
    .map(([name, entry]) => ({ name, ...entry }))
    .sort((a, b) => b.count - a.count);
  return { total: trace.toolCalls.length, errors, byName };
}

export function formatBytes(bytes: number): string {
  return formatBytesImpl(bytes, { maxUnit: "GB" });
}

export function formatDuration(startedAt: number, endedAt?: number): string {
  if (!endedAt || endedAt <= startedAt) return "unknown duration";
  const minutes = Math.round((endedAt - startedAt) / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function callLabel(call: TraceToolCall): string {
  const summary = call.inputSummary ? ` \`${call.inputSummary}\`` : "";
  const error = call.status === "error" ? " (error)" : "";
  return `#${call.index} ${call.name}${error}${summary}`;
}

export function renderDigest(trace: SessionTrace, maxTokens = 2400): string {
  const lines: string[] = [];
  const ref = trace.ref;
  const title = ref.title ? ` — ${ref.title}` : "";
  lines.push(`## ${ref.tool}:${ref.id.slice(-8)}${title}`);
  lines.push("");

  const meta: string[] = [];
  if (ref.project) meta.push(`project: ${ref.project}`);
  if (trace.model) meta.push(`model: ${trace.model}${trace.provider ? ` (${trace.provider})` : ""}`);
  meta.push(`started: ${new Date(ref.startedAt).toISOString().slice(0, 16).replace("T", " ")}`);
  meta.push(`duration: ${formatDuration(ref.startedAt, ref.updatedAt)}`);
  lines.push(`- ${meta.join(" · ")}`);

  if (trace.tokens) {
    const t = trace.tokens;
    const parts = [`in ${t.input}`, `out ${t.output}`];
    if (t.cacheRead > 0) parts.push(`cache read ${t.cacheRead}`);
    if (t.cacheWrite > 0) parts.push(`cache write ${t.cacheWrite}`);
    if (t.reasoning > 0) parts.push(`reasoning ${t.reasoning}`);
    const cost = trace.cost !== undefined && trace.cost > 0 ? ` · cost $${trace.cost.toFixed(4)}` : "";
    lines.push(`- tokens: ${parts.join(" / ")}${cost}`);
  }
  if (trace.diff) {
    lines.push(`- diff: +${trace.diff.additions}/-${trace.diff.deletions} across ${trace.diff.files} files`);
  }
  if (trace.sessionNotes?.outcome) {
    lines.push(`- outcome: ${trace.sessionNotes.outcome.slice(0, 160)}`);
  }

  const census = toolCensus(trace);
  const censusText = census.byName
    .slice(0, 8)
    .map((entry) => `${entry.name} ${entry.count}${entry.errors > 0 ? ` (${entry.errors} err)` : ""}`)
    .join(", ");
  lines.push(`- tools: ${census.total} calls, ${census.errors} errors — ${censusText}`);
  lines.push(`- files: ${trace.filesRead.length} read, ${trace.filesWritten.length} written`);
  if (trace.truncated) lines.push("- ⚠ trace truncated by reader caps");

  if (trace.userTurns.length > 0) {
    lines.push("");
    lines.push(`### Prompts (${trace.userTurns.length} shown, first ${Math.min(5, trace.userTurns.length)})`);
    for (const prompt of trace.userTurns.slice(0, 5)) {
      lines.push(`- ${prompt.slice(0, 220)}`);
    }
  }

  const failures = trace.toolCalls.filter((call) => call.status === "error").slice(0, 8);
  if (failures.length > 0) {
    lines.push("");
    lines.push("### Failures");
    for (const call of failures) {
      lines.push(`- ${callLabel(call)}${call.errorText ? `: ${call.errorText.slice(0, 160)}` : ""}`);
    }
  }

  if (trace.commands.length > 0) {
    const unique = [...new Set(trace.commands)].slice(0, 12);
    lines.push("");
    lines.push("### Commands");
    for (const command of unique) lines.push(`- \`${command.slice(0, 180)}\``);
  }

  const rendered = lines.join("\n");
  if (estimateTokens(rendered) <= maxTokens) return rendered;
  return truncateToTokenBudget(rendered, maxTokens).text;
}
