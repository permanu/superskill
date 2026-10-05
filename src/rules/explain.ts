// SPDX-License-Identifier: Apache-2.0

import type { Severity } from "./loader.js";
import type { ExplainEntry, Plan } from "./plan.js";

export interface ExplainableRule {
  id: string;
  severity: Severity;
}

export function formatMatchClause(matched: readonly string[]): string {
  return matched.join(", ");
}

export function formatRuleDerivation(entry: ExplainEntry, rule: ExplainableRule): string {
  const clauses = [...entry.matched, `severity ${rule.severity}`];
  return `rule ${entry.id} selected: ${clauses.join(", ")}`;
}

export function formatPlanDerivation(plan: Plan, rulesById: ReadonlyMap<string, ExplainableRule>): string {
  const lines: string[] = [];
  for (const entry of plan.explain) {
    const rule = rulesById.get(entry.id);
    lines.push(
      rule
        ? formatRuleDerivation(entry, rule)
        : `rule ${entry.id} selected: ${formatMatchClause(entry.matched)}`,
    );
  }
  const dropped = plan.budget.dropped.length;
  lines.push(`budget: ${plan.budget.used}/${plan.budget.allocated} tokens${dropped > 0 ? `, ${dropped} dropped` : ""}`);
  return lines.join("\n");
}
