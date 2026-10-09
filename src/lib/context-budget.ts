// SPDX-License-Identifier: Apache-2.0

import type { ProjectPhase } from "./graph/schema.js";
import { estimateTokens } from "./token-estimator.js";

const DEFAULT_CONTEXT_WINDOW = 128_000;
const MIN_BUDGET_TOKENS = 2_000;
const MAX_BUDGET_TOKENS = 50_000;

const PHASE_BUDGET_RATIOS: Record<ProjectPhase, number> = {
  explore: 0.10,
  implement: 0.15,
  review: 0.08,
  ship: 0.05,
};

export interface BudgetResult {
  totalBudget: number;
  contextWindow: number;
  phase?: ProjectPhase;
}

export function getPhaseBudget(phase: ProjectPhase, contextWindow = DEFAULT_CONTEXT_WINDOW): BudgetResult {
  const ratio = PHASE_BUDGET_RATIOS[phase];
  const raw = Math.floor(contextWindow * ratio);
  const totalBudget = Math.max(MIN_BUDGET_TOKENS, Math.min(MAX_BUDGET_TOKENS, raw));
  return { totalBudget, contextWindow, phase };
}

export function getSkillBudget(contextWindow = DEFAULT_CONTEXT_WINDOW): BudgetResult {
  const raw = Math.floor(contextWindow * 0.15);
  const totalBudget = Math.max(MIN_BUDGET_TOKENS, Math.min(MAX_BUDGET_TOKENS, raw));
  return { totalBudget, contextWindow };
}

export interface BudgetItem {
  id: string;
  content: string;
}

export interface FittedItem {
  id: string;
  content: string;
  tokens: number;
}

export interface DroppedItem {
  id: string;
  reason: string;
  tokens: number;
}

export interface FitResult {
  items: FittedItem[];
  dropped: DroppedItem[];
  usedTokens: number;
}

export function fitSkillsToBudget(items: BudgetItem[], budget: number, separator = ""): FitResult {
  const fitted: FittedItem[] = [];
  const dropped: DroppedItem[] = [];
  let usedTokens = 0;

  for (const item of items) {
    const tokens = estimateTokens(item.content);
    const nextTokens = separator.length > 0
      ? estimateTokens([...fitted.map((entry) => entry.content), item.content].join(separator))
      : usedTokens + tokens;
    if (nextTokens <= budget) {
      fitted.push({ id: item.id, content: item.content, tokens });
      usedTokens = nextTokens;
      continue;
    }
    const remaining = budget - usedTokens;
    const reason = tokens > budget
      ? `exceeds total budget (${tokens} > ${budget} tokens)`
      : `exceeds remaining budget (${tokens} > ${remaining} tokens)`;
    dropped.push({ id: item.id, reason, tokens });
  }

  return { items: fitted, dropped, usedTokens };
}
