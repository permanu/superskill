// SPDX-License-Identifier: AGPL-3.0-or-later

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

export function fitSkillsToBudget(
  contents: string[],
  budget: number
): { included: number[]; excluded: number[]; usedTokens: number } {
  const included: number[] = [];
  const excluded: number[] = [];
  let usedTokens = 0;

  for (let i = 0; i < contents.length; i++) {
    const tokens = estimateTokens(contents[i]);
    if (usedTokens + tokens <= budget) {
      included.push(i);
      usedTokens += tokens;
    } else {
      for (let j = i; j < contents.length; j++) {
        excluded.push(j);
      }
      break;
    }
  }

  return { included, excluded, usedTokens };
}
