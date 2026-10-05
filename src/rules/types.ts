// SPDX-License-Identifier: Apache-2.0

export const RULE_LANGUAGES = [
  "rust",
  "typescript",
  "python",
  "go",
  "swift",
  "java",
  "c",
  "cpp",
] as const;

export type RuleLanguage = (typeof RULE_LANGUAGES)[number];

export const RULE_SEVERITIES = ["must", "should", "prefer"] as const;

export type RuleSeverity = (typeof RULE_SEVERITIES)[number];

export const RULE_ENFORCEMENTS = ["tool", "review", "both"] as const;

export type RuleEnforce = (typeof RULE_ENFORCEMENTS)[number];

export const RULE_STATUSES = ["draft", "verified"] as const;

export type RuleStatus = (typeof RULE_STATUSES)[number];

export interface RuleSource {
  title: string;
  url: string;
}

export interface RuleTriggers {
  keywords?: string[];
  files?: string[];
  symbols?: string[];
}

export interface RuleFrontmatter {
  id: string;
  lang: RuleLanguage;
  prefix: string;
  title: string;
  severity: RuleSeverity;
  enforce: RuleEnforce;
  tool?: string;
  compile_exempt?: string;
  baseline: string;
  status: RuleStatus;
  triggers?: RuleTriggers;
  related?: string[];
  sources: RuleSource[];
}

export interface RuleFile extends RuleFrontmatter {
  path: string;
  relPath: string;
  body: string;
  summary: string;
}

export interface ValidationIssue {
  code: string;
  message: string;
  path: string;
  severity: "error" | "warning";
}

export interface HarnessResult {
  ok: boolean;
  skipped: boolean;
  compiler: string;
  output: string;
}

export interface ValidationReport {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  ruleCount: number;
  checkedCount: number;
}

export function isRuleLanguage(value: unknown): value is RuleLanguage {
  return typeof value === "string" && (RULE_LANGUAGES as readonly string[]).includes(value);
}
