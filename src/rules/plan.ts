// SPDX-License-Identifier: Apache-2.0

export type RulePhase = "explore" | "implement" | "review" | "ship";

export interface PlannedRule {
  id: string;
  title: string;
  reason: string;
}

export interface PlannedPrinciple {
  id: string;
  title: string;
  reason: string;
}

export interface PlanFlow {
  id: string;
  title?: string;
}

export interface PlanGate {
  name: string;
  passed: boolean;
  detail?: string;
}

export interface PlanDrop {
  id: string;
  reason: string;
  tokens: number;
}

export interface PlanBudget {
  allocated: number;
  used: number;
  dropped: PlanDrop[];
}

export interface ExplainEntry {
  id: string;
  matched: string[];
  score: number;
}

export interface Plan {
  phase: RulePhase;
  langs: string[];
  flows: PlanFlow[];
  rules: PlannedRule[];
  principles: PlannedPrinciple[];
  gates: PlanGate[];
  budget: PlanBudget;
  explain: ExplainEntry[];
}
