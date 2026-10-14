// SPDX-License-Identifier: Apache-2.0

import { VaultError } from "./vault-fs.js";

export interface NativeSkillIssue {
  code: string;
  field?: string;
  severity: "error" | "warning";
  message: string;
}

export type NativeSkillProfile = "anthropic" | "portable";

const XML_MARKUP = /<\/?[A-Za-z][\w:.-]*(?:\s[^<>]*)?\s*\/?>|<!--|-->|<!\[CDATA\[|<!DOCTYPE\b/i;
const NON_THIRD_PERSON_DESCRIPTION = /^(?:i|we|you|your|use|create|build|run|install|configure|check|write|read|generate|make|analyze|analyse|manage|learn|design|test|review|validate|fix|help|add|remove|update|convert|search|find|summarize|summarise|explain|compare|deploy|debug|inspect|refactor|implement|answer|draft|translate)\b/i;
const CONTEXT_CUE = /\b(?:when|whenever|during|before|after|while|if|upon|in response to)\b/i;

export function validateNativeSkillMetadata(
  value: Record<string, unknown>,
  profile: NativeSkillProfile = "anthropic",
): NativeSkillIssue[] {
  const issues: NativeSkillIssue[] = [];
  const name = value.name;
  const description = value.description;

  if (typeof name !== "string" || name.length === 0) {
    issues.push({ code: "name.required", field: "name", severity: "error", message: "Provide a non-empty native skill name." });
  } else {
    if (name.length > 64) {
      issues.push({ code: "name.length", field: "name", severity: "error", message: "Native skill names must be 1 to 64 characters long." });
    }
    if (!/^[a-z0-9-]+$/.test(name)) {
      issues.push({ code: "name.characters", field: "name", severity: "error", message: "Use only lowercase letters, digits, and hyphens in a native skill name." });
    }
    if (XML_MARKUP.test(name)) {
      issues.push({ code: "name.xml", field: "name", severity: "error", message: "Native skill names must not contain XML markup." });
    }
    if (profile === "anthropic" && (name.includes("claude") || name.includes("anthropic"))) {
      issues.push({ code: "name.reserved", field: "name", severity: "error", message: "Anthropic skill names must not contain the reserved terms claude or anthropic." });
    }
  }

  if (typeof description !== "string" || description.trim().length === 0) {
    issues.push({ code: "description.required", field: "description", severity: "error", message: "Provide a non-empty native skill description." });
  } else {
    if (description.length > 1024) {
      issues.push({ code: "description.length", field: "description", severity: "error", message: "Native skill descriptions must be no more than 1024 characters long." });
    }
    if (XML_MARKUP.test(description)) {
      issues.push({ code: "description.xml", field: "description", severity: "error", message: "Native skill descriptions must not contain XML markup." });
    }
    if (NON_THIRD_PERSON_DESCRIPTION.test(description.trim())) {
      issues.push({ code: "description-third-person", field: "description", severity: "warning", message: "Prefer a third-person description that states what the skill does." });
    }
    if (!CONTEXT_CUE.test(description)) {
      issues.push({ code: "description-what-when", field: "description", severity: "warning", message: "Consider explaining what the skill does and when it applies." });
    }
  }

  return issues;
}

export function assertNativeSkillMetadata(
  value: Record<string, unknown>,
  profile: NativeSkillProfile = "anthropic",
): void {
  const errors = validateNativeSkillMetadata(value, profile).filter((issue) => issue.severity === "error");
  if (errors.length === 0) return;
  const details = errors.map((issue) => `${issue.field ?? "metadata"}: ${issue.message}`).join(" ");
  throw new VaultError("INVALID_ARGUMENT", `Native skill metadata is invalid. ${details} Correct SKILL.md frontmatter before exporting or installing this skill.`);
}
