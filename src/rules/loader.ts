// SPDX-License-Identifier: Apache-2.0

import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

export type Severity = "must" | "should" | "prefer";
export type RuleStatus = "draft" | "verified";
export type Enforce = "tool" | "review" | "both";

export interface RuleTriggers {
  keywords: string[];
  files: string[];
  symbols: string[];
}

export interface ParsedRule {
  id: string;
  lang: string;
  prefix: string;
  title: string;
  severity: Severity;
  enforce: Enforce;
  status: RuleStatus;
  triggers: RuleTriggers;
  sourcesCount: number;
  body: string;
  path: string;
}

export interface RuleWarning {
  path: string;
  message: string;
}

export interface LoadResult {
  rules: ParsedRule[];
  warnings: RuleWarning[];
}

const NON_RULE_FILES = new Set(["INDEX.md", "sources.md", "categories.md"]);
const SEVERITIES: ReadonlySet<string> = new Set(["must", "should", "prefer"]);
const STATUSES: ReadonlySet<string> = new Set(["draft", "verified"]);
const ENFORCEMENTS: ReadonlySet<string> = new Set(["tool", "review", "both"]);

export function rulesCatalogRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "../../catalog/rules");
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    const text = asNonEmptyString(item);
    if (text !== undefined) out.push(text);
  }
  return out;
}

function parseSeverity(value: unknown): Severity | undefined {
  const text = asNonEmptyString(value);
  return text !== undefined && SEVERITIES.has(text) ? (text as Severity) : undefined;
}

function parseStatus(value: unknown): RuleStatus | undefined {
  const text = asNonEmptyString(value);
  return text !== undefined && STATUSES.has(text) ? (text as RuleStatus) : undefined;
}

function parseEnforce(value: unknown): Enforce | undefined {
  const text = asNonEmptyString(value);
  return text !== undefined && ENFORCEMENTS.has(text) ? (text as Enforce) : undefined;
}

function derivePrefix(id: string, lang: string): string {
  const stripped = id.startsWith(`${lang}-`) ? id.slice(lang.length + 1) : id;
  const dash = stripped.indexOf("-");
  return dash === -1 ? stripped : stripped.slice(0, dash);
}

function parseTriggers(raw: unknown, relPath: string, warnings: RuleWarning[]): RuleTriggers {
  if (raw === undefined || raw === null) {
    return { keywords: [], files: [], symbols: [] };
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    warnings.push({ path: relPath, message: "triggers must be a mapping with keywords/files/symbols" });
    return { keywords: [], files: [], symbols: [] };
  }
  const triggers = raw as Record<string, unknown>;
  return {
    keywords: [...new Set(asStringArray(triggers.keywords))],
    files: [...new Set(asStringArray(triggers.files))],
    symbols: [...new Set(asStringArray(triggers.symbols))],
  };
}

function countSources(raw: unknown): number {
  if (!Array.isArray(raw)) return 0;
  let count = 0;
  for (const item of raw) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) continue;
    const source = item as Record<string, unknown>;
    if (asNonEmptyString(source.title) !== undefined || asNonEmptyString(source.url) !== undefined) {
      count += 1;
    }
  }
  return count;
}

function isRuleFileName(name: string): boolean {
  return name.endsWith(".md") && !NON_RULE_FILES.has(name);
}

async function readDirSafe(absDir: string, relPath: string, warnings: RuleWarning[]): Promise<Dirent[]> {
  try {
    return await readdir(absDir, { withFileTypes: true });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      warnings.push({ path: relPath, message: `cannot read directory: ${messageOf(error)}` });
    }
    return [];
  }
}

async function collectMarkdownFiles(
  absDir: string,
  root: string,
  warnings: RuleWarning[],
  out: string[],
): Promise<void> {
  const entries = await readDirSafe(absDir, relative(root, absDir) || ".", warnings);
  entries.sort((a, b) => compareIds(a.name, b.name));
  for (const entry of entries) {
    const abs = join(absDir, entry.name);
    if (entry.isDirectory()) {
      await collectMarkdownFiles(abs, root, warnings, out);
    } else if (entry.isFile() && isRuleFileName(entry.name)) {
      out.push(abs);
    }
  }
}

async function parseRuleFile(
  abs: string,
  root: string,
  warnings: RuleWarning[],
): Promise<ParsedRule | undefined> {
  const relPath = relative(root, abs).split(sep).join("/");
  let raw: string;
  try {
    raw = await readFile(abs, "utf8");
  } catch (error) {
    warnings.push({ path: relPath, message: `cannot read file: ${messageOf(error)}` });
    return undefined;
  }

  let data: Record<string, unknown>;
  let body: string;
  try {
    const parsed = matter(raw, {});
    data = parsed.data as Record<string, unknown>;
    body = parsed.content;
  } catch (error) {
    warnings.push({ path: relPath, message: `invalid YAML frontmatter: ${messageOf(error)}` });
    return undefined;
  }

  const id = asNonEmptyString(data.id);
  const lang = asNonEmptyString(data.lang);
  const title = asNonEmptyString(data.title);
  const severity = parseSeverity(data.severity);
  const status = parseStatus(data.status);
  if (id === undefined || lang === undefined || title === undefined || severity === undefined || status === undefined) {
    const problems = [
      ...(id === undefined ? ["id"] : []),
      ...(lang === undefined ? ["lang"] : []),
      ...(title === undefined ? ["title"] : []),
      ...(severity === undefined ? ["severity"] : []),
      ...(status === undefined ? ["status"] : []),
    ];
    warnings.push({ path: relPath, message: `missing or invalid required fields: ${problems.join(", ")}` });
    return undefined;
  }

  const packDir = relPath.includes("/") ? relPath.slice(0, relPath.indexOf("/")) : "";
  if (packDir.length > 0 && packDir !== lang) {
    warnings.push({ path: relPath, message: `lang '${lang}' does not match pack directory '${packDir}'` });
  }

  const enforceRaw = asNonEmptyString(data.enforce);
  const enforce = parseEnforce(data.enforce) ?? "review";
  if (enforceRaw !== undefined && parseEnforce(data.enforce) === undefined) {
    warnings.push({ path: relPath, message: `invalid enforce '${enforceRaw}'; defaulting to 'review'` });
  }

  return {
    id,
    lang,
    prefix: asNonEmptyString(data.prefix) ?? derivePrefix(id, lang),
    title,
    severity,
    enforce,
    status,
    triggers: parseTriggers(data.triggers, relPath, warnings),
    sourcesCount: countSources(data.sources),
    body,
    path: relPath,
  };
}

export async function loadRules(root: string = rulesCatalogRoot()): Promise<LoadResult> {
  const warnings: RuleWarning[] = [];
  const files: string[] = [];

  const rootEntries = await readDirSafe(root, ".", warnings);
  rootEntries.sort((a, b) => compareIds(a.name, b.name));
  for (const entry of rootEntries) {
    const abs = join(root, entry.name);
    if (entry.isDirectory()) {
      await collectMarkdownFiles(abs, root, warnings, files);
    } else if (entry.isFile() && isRuleFileName(entry.name)) {
      files.push(abs);
    }
  }
  files.sort(compareIds);

  const rules: ParsedRule[] = [];
  const seen = new Set<string>();
  for (const abs of files) {
    const rule = await parseRuleFile(abs, root, warnings);
    if (rule === undefined) continue;
    if (seen.has(rule.id)) {
      warnings.push({ path: rule.path, message: `duplicate rule id '${rule.id}'` });
      continue;
    }
    seen.add(rule.id);
    rules.push(rule);
  }
  rules.sort((a, b) => compareIds(a.id, b.id));
  return { rules, warnings };
}
