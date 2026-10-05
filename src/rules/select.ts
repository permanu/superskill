// SPDX-License-Identifier: Apache-2.0

import { estimateTokens } from "../lib/token-estimator.js";

export type DropReason = "oversized" | "budget";

export interface BudgetItem {
  id: string;
  tokens: number;
}

export interface BudgetDrop {
  id: string;
  reason: DropReason;
  tokens: number;
}

export interface PackResult<T extends BudgetItem> {
  picked: T[];
  dropped: BudgetDrop[];
  allocated: number;
  used: number;
}

export function estimateRuleTokens(rule: { title: string; body: string }): number {
  return estimateTokens(`${rule.title}\n${rule.body}`);
}

export function packBudget<T extends BudgetItem>(items: readonly T[], budgetTokens: number): PackResult<T> {
  const allocated = Number.isFinite(budgetTokens) ? Math.max(0, Math.floor(budgetTokens)) : 0;
  const picked: T[] = [];
  const dropped: BudgetDrop[] = [];
  let used = 0;

  for (const item of items) {
    const tokens = Number.isFinite(item.tokens) ? Math.max(0, Math.floor(item.tokens)) : 0;
    if (tokens > allocated) {
      dropped.push({ id: item.id, reason: "oversized", tokens });
      continue;
    }
    if (used + tokens > allocated) {
      dropped.push({ id: item.id, reason: "budget", tokens });
      continue;
    }
    picked.push(item);
    used += tokens;
  }

  return { picked, dropped, allocated, used };
}
