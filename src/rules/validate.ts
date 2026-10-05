// SPDX-License-Identifier: Apache-2.0

import { readFile, readdir } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import matter from "gray-matter";
import { compileSnippet } from "./harness/index.js";
import {
  RULE_ENFORCEMENTS,
  RULE_LANGUAGES,
  RULE_SEVERITIES,
  RULE_STATUSES,
  isRuleLanguage,
  type HarnessResult,
  type RuleEnforce,
  type RuleFile,
  type RuleLanguage,
  type RuleSeverity,
  type RuleSource,
  type RuleStatus,
  type RuleTriggers,
  type ValidationIssue,
  type ValidationReport,
} from "./types.js";

const RESERVED_FILES = new Set(["INDEX.md", "sources.md", "categories.md"]);

const FENCE_TAGS: Record<RuleLanguage, string[]> = {
  rust: ["rust"],
  typescript: ["typescript", "ts"],
  python: ["python", "py"],
  go: ["go"],
  swift: ["swift"],
  java: ["java"],
  c: ["c"],
  cpp: ["cpp", "c++", "cxx"],
};

export interface ValidateOptions {
  compile?: boolean;
  knownIds?: ReadonlySet<string>;
}

export interface SnippetCheck {
  section: "bad" | "good";
  result: HarnessResult;
}

export interface FileValidationResult {
  path: string;
  rule: RuleFile | null;
  issues: ValidationIssue[];
  compile: SnippetCheck[];
}

interface FenceBlock {
  tag: string;
  lines: string[];
}

interface BodyResult {
  summary: string;
  snippets: { bad: string | null; good: string | null };
}

interface ParsedRule {
  rule: RuleFile | null;
  issues: ValidationIssue[];
  body: BodyResult;
}

function issue(
  code: string,
  message: string,
  path: string,
  severity: "error" | "warning" = "error",
): ValidationIssue {
  return { code, message, path, severity };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHttpUrl(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname !== "";
  } catch {
    return false;
  }
}

function truncate(text: string, max = 600): string {
  return text.length <= max ? text : `${text.slice(0, max)}[...]`;
}

export function isRuleFilename(name: string): boolean {
  return name.endsWith(".md") && !RESERVED_FILES.has(name);
}

function analyzeFences(lines: string[]): { blocks: FenceBlock[]; dangling: boolean } {
  const blocks: FenceBlock[] = [];
  let open: { marker: string; length: number; tag: string; lines: string[] } | null = null;
  for (const line of lines) {
    const match = /^ {0,3}(`{3,}|~{3,})[ \t]*(.*)$/.exec(line);
    if (!match) {
      if (open) open.lines.push(line);
      continue;
    }
    const fence = match[1];
    const info = match[2].trim();
    if (!open) {
      open = { marker: fence[0], length: fence.length, tag: info.split(/\s+/)[0] ?? "", lines: [] };
      continue;
    }
    if (fence[0] === open.marker && fence.length >= open.length && info === "") {
      blocks.push({ tag: open.tag, lines: open.lines });
      open = null;
      continue;
    }
    open.lines.push(line);
  }
  return { blocks, dangling: open !== null };
}

const ELLIPSIS_CHAR = "\u2026";

function fenceMask(lines: string[]): Set<number> {
  const mask = new Set<number>();
  let open: { marker: string; length: number } | null = null;
  for (let i = 0; i < lines.length; i += 1) {
    const match = /^ {0,3}(`{3,}|~{3,})[ \t]*(.*)$/.exec(lines[i]);
    if (match) {
      const fence = match[1];
      const info = match[2].trim();
      if (!open) {
        open = { marker: fence[0], length: fence.length };
        continue;
      }
      if (fence[0] === open.marker && fence.length >= open.length && info === "") {
        open = null;
        continue;
      }
    }
    if (open) mask.add(i);
  }
  return mask;
}

function isBareElisionLine(trimmed: string, lang: RuleLanguage | null): boolean {
  if (trimmed === "..") return true;
  return trimmed === "..." && lang !== "python";
}

function hasCommentElision(text: string): boolean {
  if (text.includes("...") || text.includes(ELLIPSIS_CHAR)) return true;
  return /(^|\s)\.\.(\s|$)/.test(text);
}

function commentHasElision(line: string, state: { block: boolean }, lang: RuleLanguage | null): boolean {
  if (state.block) {
    const end = line.indexOf("*/");
    const content = end >= 0 ? line.slice(0, end) : line;
    if (end >= 0) state.block = false;
    return hasCommentElision(content);
  }
  const slash = line.indexOf("//");
  if (slash >= 0 && line[slash - 1] !== ":" && hasCommentElision(line.slice(slash + 2))) return true;
  // `#` starts comments in Python only; in C/C++ it starts preprocessor lines,
  // where `...` is variadic macro syntax rather than an elision.
  if (lang === "python") {
    const trimmed = line.trimStart();
    if (trimmed.startsWith("#") && hasCommentElision(trimmed.slice(1))) return true;
  }
  const start = line.indexOf("/*");
  if (start >= 0) {
    const end = line.indexOf("*/", start + 2);
    const content = end >= 0 ? line.slice(start + 2, end) : line.slice(start + 2);
    if (end < 0) state.block = true;
    return hasCommentElision(content);
  }
  return false;
}

function validateBody(abs: string, body: string, lang: RuleLanguage | null, issues: ValidationIssue[]): BodyResult {
  const lines = body.split(/\r?\n/);
  const summaryIndex = lines.findIndex((line) => line.trim() !== "");
  const summaryLine = summaryIndex >= 0 ? lines[summaryIndex] : "";
  let summary = "";
  let summaryValid = true;
  if (!/^>\s+\S/.test(summaryLine)) {
    summaryValid = false;
    issues.push(issue("summary-missing", 'body must begin with a "> " summary line', abs));
  } else {
    summary = summaryLine.replace(/^>\s+/, "").trim();
    const words = summary.split(/\s+/).filter(Boolean).length;
    if (words > 30) {
      issues.push(issue("summary-too-long", `summary is ${words} words (maximum 30)`, abs));
    }
  }

  const canonical = new Map<string, string>([
    ["why", "Why"],
    ["bad", "Bad"],
    ["good", "Good"],
    ["see also", "See Also"],
  ]);
  const sequence = ["Why", "Bad", "Good", "See Also"];
  const sections: { title: string; index: number }[] = [];
  const counts = new Map<string, number>();
  for (let i = summaryValid ? summaryIndex + 1 : Math.max(summaryIndex, 0); i < lines.length; i += 1) {
    const match = /^##\s+(.+?)\s*$/.exec(lines[i]);
    if (!match) continue;
    const title = canonical.get(match[1].trim().toLowerCase());
    if (!title) {
      issues.push(issue("section-unknown", `unexpected section "## ${match[1].trim()}"`, abs));
      continue;
    }
    const count = (counts.get(title) ?? 0) + 1;
    counts.set(title, count);
    if (count > 1) {
      issues.push(issue("section-duplicate", `duplicate "## ${title}" section`, abs));
      continue;
    }
    sections.push({ title, index: i });
  }
  for (const required of ["Why", "Bad", "Good"]) {
    if (!counts.has(required)) {
      issues.push(issue("section-missing", `missing "## ${required}" section`, abs));
    }
  }
  const order = sections.map((section) => sequence.indexOf(section.title));
  for (let i = 1; i < order.length; i += 1) {
    if (order[i] <= order[i - 1]) {
      issues.push(issue("section-order", "sections must appear in order: Why, Bad, Good, See Also", abs));
      break;
    }
  }

  const snippets: BodyResult["snippets"] = { bad: null, good: null };
  for (let s = 0; s < sections.length; s += 1) {
    const section = sections[s];
    if (section.title !== "Bad" && section.title !== "Good") continue;
    const end = s + 1 < sections.length ? sections[s + 1].index : lines.length;
    const content = lines.slice(section.index + 1, end);
    const { blocks, dangling } = analyzeFences(content);
    if (dangling || blocks.length !== 1) {
      issues.push(issue("fence-count", `"## ${section.title}" must contain exactly one fenced code block`, abs));
      continue;
    }
    const block = blocks[0];
    snippets[section.title === "Bad" ? "bad" : "good"] = block.lines.join("\n");
    if (block.lines.length > 25) {
      issues.push(
        issue(
          "snippet-too-long",
          `"## ${section.title}" snippet is ${block.lines.length} lines (maximum 25)`,
          abs,
          "warning",
        ),
      );
    }
    if (lang) {
      const accepted = FENCE_TAGS[lang];
      if (!accepted.includes(block.tag.toLowerCase())) {
        const found = block.tag === "" ? "no tag" : `"${block.tag}"`;
        issues.push(
          issue("fence-language", `"## ${section.title}" code block must be tagged "${accepted[0]}" (found ${found})`, abs),
        );
      }
    }
  }

  const forbidden = /\b(todo|fixme|xxx|tbd|placeholder|lorem)\b/gi;
  const blockingTokens = new Set(["todo", "fixme", "xxx", "tbd"]);
  const hedging = /\b(consider|might|often)\b/gi;
  const asNeeded = /\bas needed\b/i;
  const condition = /\b(if|when|unless|before|after|once|whenever|only)\b/i;
  const seenTokens = new Set<string>();
  const seenHedges = new Set<string>();
  const fenced = fenceMask(lines);
  const blockComment = { block: false };
  for (let i = 0; i < lines.length; i += 1) {
    const matches = lines[i].match(forbidden);
    if (matches) {
      for (const match of matches) {
        const token = match.toLowerCase();
        if (seenTokens.has(token)) continue;
        seenTokens.add(token);
        issues.push(
          issue(
            "forbidden-token",
            `forbidden token "${match}" on line ${i + 1}`,
            abs,
            blockingTokens.has(token) ? "error" : "warning",
          ),
        );
      }
    }
    if (isBareElisionLine(lines[i].trim(), lang)) {
      issues.push(issue("snippet-elision", `bare elision marker "${lines[i].trim()}" on line ${i + 1}`, abs));
    } else if (lines[i].includes(ELLIPSIS_CHAR)) {
      issues.push(issue("unicode-ellipsis", `unicode ellipsis used as elision on line ${i + 1}`, abs, "warning"));
    } else if (fenced.has(i) && commentHasElision(lines[i], blockComment, lang)) {
      issues.push(issue("comment-elision", `elision inside a comment on line ${i + 1}`, abs, "warning"));
    }
    if (!fenced.has(i)) {
      const hedges = lines[i].match(hedging);
      if (hedges) {
        for (const hedge of hedges) {
          const key = hedge.toLowerCase();
          if (seenHedges.has(key)) continue;
          seenHedges.add(key);
          issues.push(issue("hedging", `hedging phrase "${hedge}" on line ${i + 1}`, abs, "warning"));
        }
      }
      if (asNeeded.test(lines[i])) {
        const previous = i > 0 ? lines[i - 1] : "";
        const next = i + 1 < lines.length ? lines[i + 1] : "";
        if (!condition.test(lines[i]) && !condition.test(previous) && !condition.test(next)) {
          issues.push(issue("vague-condition", `"as needed" without a condition on line ${i + 1}`, abs, "warning"));
        }
      }
    }
  }

  return { summary, snippets };
}

function parseRule(abs: string, raw: string, knownIds: ReadonlySet<string> | null): ParsedRule {
  const issues: ValidationIssue[] = [];
  const emptyBody: BodyResult = { summary: "", snippets: { bad: null, good: null } };
  if (!raw.trimStart().startsWith("---")) {
    issues.push(issue("fm-missing", "file does not start with a YAML frontmatter block", abs));
    return { rule: null, issues, body: emptyBody };
  }

  let data: Record<string, unknown>;
  let content: string;
  try {
    // Passing options bypasses gray-matter's global cache, which retains failed parses.
    const parsed = matter(raw, {});
    data = (parsed.data ?? {}) as Record<string, unknown>;
    content = parsed.content;
  } catch (e) {
    const message = e instanceof Error ? e.message.split("\n")[0] : String(e);
    issues.push(issue("fm-parse", `invalid YAML frontmatter: ${message}`, abs));
    return { rule: null, issues, body: emptyBody };
  }

  let fundamental = true;
  for (const key of ["id", "lang", "prefix", "title", "baseline"] as const) {
    if (!isNonEmptyString(data[key])) {
      issues.push(issue("field-required", `missing or empty required field "${key}"`, abs));
      fundamental = false;
    }
  }

  const severity = data.severity;
  if (!isNonEmptyString(severity)) {
    issues.push(issue("field-required", 'missing or empty required field "severity"', abs));
    fundamental = false;
  } else if (!(RULE_SEVERITIES as readonly string[]).includes(severity)) {
    issues.push(issue("enum", `invalid severity "${severity}" (expected: ${RULE_SEVERITIES.join(", ")})`, abs));
    fundamental = false;
  }

  const enforce = data.enforce;
  if (!isNonEmptyString(enforce)) {
    issues.push(issue("field-required", 'missing or empty required field "enforce"', abs));
    fundamental = false;
  } else if (!(RULE_ENFORCEMENTS as readonly string[]).includes(enforce)) {
    issues.push(issue("enum", `invalid enforce "${enforce}" (expected: ${RULE_ENFORCEMENTS.join(", ")})`, abs));
    fundamental = false;
  }

  const status = data.status;
  if (!isNonEmptyString(status)) {
    issues.push(issue("field-required", 'missing or empty required field "status"', abs));
    fundamental = false;
  } else if (!(RULE_STATUSES as readonly string[]).includes(status)) {
    issues.push(issue("enum", `invalid status "${status}" (expected: ${RULE_STATUSES.join(", ")})`, abs));
    fundamental = false;
  }

  if (isNonEmptyString(data.lang) && !isRuleLanguage(data.lang)) {
    issues.push(issue("enum", `invalid lang "${data.lang}" (expected: ${RULE_LANGUAGES.join(", ")})`, abs));
    fundamental = false;
  }

  if (isNonEmptyString(data.prefix) && !/^[a-z][a-z0-9-]*$/.test(data.prefix)) {
    issues.push(issue("prefix-format", `prefix "${data.prefix}" must be lowercase kebab-case`, abs));
    fundamental = false;
  }

  if (data.tool !== undefined && !isNonEmptyString(data.tool)) {
    issues.push(issue("field-type", '"tool" must be a non-empty string when present', abs));
  }
  if (data.compile_exempt !== undefined && !isNonEmptyString(data.compile_exempt)) {
    issues.push(issue("field-type", '"compile_exempt" must be a non-empty string when present', abs));
  }
  if ((enforce === "tool" || enforce === "both") && !isNonEmptyString(data.tool)) {
    issues.push(issue("tool-required", `enforce "${enforce}" requires a non-empty "tool" id`, abs));
  }

  let triggers: RuleTriggers | undefined;
  if (data.triggers !== undefined) {
    if (!isPlainObject(data.triggers)) {
      issues.push(issue("field-type", '"triggers" must be a mapping with keywords/files/symbols', abs));
    } else {
      const parsedTriggers: RuleTriggers = {};
      for (const key of ["keywords", "files", "symbols"] as const) {
        const value = data.triggers[key];
        if (value === undefined) continue;
        if (!Array.isArray(value) || !value.every((entry) => isNonEmptyString(entry))) {
          issues.push(issue("field-type", `"triggers.${key}" must be an array of non-empty strings`, abs));
          continue;
        }
        parsedTriggers[key] = value as string[];
      }
      triggers = parsedTriggers;
    }
  }

  let related: string[] | undefined;
  if (data.related !== undefined) {
    if (!Array.isArray(data.related) || !data.related.every((entry) => isNonEmptyString(entry))) {
      issues.push(issue("field-type", '"related" must be an array of rule ids or "external:<url>" entries', abs));
    } else {
      related = data.related as string[];
      for (const entry of related) {
        if (entry.startsWith("external:")) {
          if (!isHttpUrl(entry.slice("external:".length).trim())) {
            issues.push(issue("related-external", `"${entry}" must carry a valid http(s) URL after "external:"`, abs));
          }
        } else if (knownIds === null) {
          issues.push(issue("related-unchecked", `cannot resolve related id "${entry}" without a catalog scan`, abs, "warning"));
        } else if (!knownIds.has(entry)) {
          issues.push(issue("related-unresolved", `related id "${entry}" does not match any rule in the catalog`, abs));
        }
      }
    }
  }

  let sources: RuleSource[] = [];
  let sourcesOk = false;
  if (!Array.isArray(data.sources) || data.sources.length === 0) {
    issues.push(issue("source-missing", "at least one primary source is required", abs));
  } else {
    sourcesOk = true;
    const entries = data.sources as unknown[];
    entries.forEach((entry, index) => {
      if (!isPlainObject(entry)) {
        issues.push(issue("source-title", `source #${index + 1} must be a mapping with title and url`, abs));
        sourcesOk = false;
        return;
      }
      if (!isNonEmptyString(entry.title)) {
        issues.push(issue("source-title", `source #${index + 1} is missing a non-empty title`, abs));
        sourcesOk = false;
      }
      if (!isHttpUrl(entry.url)) {
        issues.push(issue("source-url", `source #${index + 1} needs a valid http(s) URL`, abs));
        sourcesOk = false;
      }
      sources.push({
        title: typeof entry.title === "string" ? entry.title : "",
        url: typeof entry.url === "string" ? entry.url : "",
      });
    });
  }

  const fileStem = basename(abs).replace(/\.md$/, "");
  if (isNonEmptyString(data.lang) && isRuleLanguage(data.lang) && isNonEmptyString(data.id)) {
    const expectedId = `${data.lang}-${fileStem}`;
    if (data.id !== expectedId) {
      issues.push(issue("id-mismatch", `id "${data.id}" must equal "${expectedId}" (lang + file stem)`, abs));
    }
  }
  if (isNonEmptyString(data.prefix) && !fileStem.startsWith(`${data.prefix}-`)) {
    issues.push(issue("prefix-mismatch", `file stem "${fileStem}" must start with prefix "${data.prefix}-"`, abs));
  }
  const parentName = basename(dirname(abs));
  if (isRuleLanguage(parentName) && isRuleLanguage(data.lang) && data.lang !== parentName) {
    issues.push(issue("lang-dir-mismatch", `lang "${data.lang}" does not match directory "${parentName}"`, abs));
  }

  const lang = isRuleLanguage(data.lang) ? data.lang : null;
  const body = validateBody(abs, content, lang, issues);

  let rule: RuleFile | null = null;
  if (fundamental && sourcesOk) {
    rule = {
      path: abs,
      relPath: relativeToCatalog(abs),
      id: data.id as string,
      lang: data.lang as RuleLanguage,
      prefix: data.prefix as string,
      title: data.title as string,
      severity: severity as RuleSeverity,
      enforce: enforce as RuleEnforce,
      tool: isNonEmptyString(data.tool) ? data.tool : undefined,
      compile_exempt: isNonEmptyString(data.compile_exempt) ? data.compile_exempt : undefined,
      baseline: data.baseline as string,
      status: status as RuleStatus,
      triggers,
      related,
      sources,
      body: content,
      summary: body.summary,
    };
  }
  return { rule, issues, body };
}

function relativeToCatalog(abs: string): string {
  const parent = dirname(abs);
  if (isRuleLanguage(basename(parent))) return join(basename(parent), basename(abs));
  return basename(abs);
}

function rootForRule(abs: string): string {
  const parent = dirname(abs);
  return isRuleLanguage(basename(parent)) ? dirname(parent) : parent;
}

async function collectPackIds(dir: string, ids: Set<string>, lang: RuleLanguage): Promise<void> {
  let files: string[];
  try {
    files = (await readdir(dir)).filter(isRuleFilename).sort();
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code ?? "unknown";
    if (code !== "ENOENT") console.error(`[rules] cannot scan ${dir}: ${code}`);
    return;
  }
  for (const file of files) {
    const fallback = `${lang}-${file.replace(/\.md$/, "")}`;
    try {
      const raw = await readFile(join(dir, file), "utf-8");
      const { data } = matter(raw, {});
      const id = (data as Record<string, unknown> | undefined)?.id;
      ids.add(isNonEmptyString(id) ? id.trim() : fallback);
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code && code !== "ENOENT") console.error(`[rules] cannot read ${join(dir, file)}: ${code}`);
      ids.add(fallback);
    }
  }
}

async function collectKnownIds(root: string): Promise<Set<string>> {
  const ids = new Set<string>();
  if (isRuleLanguage(basename(root))) {
    await collectPackIds(root, ids, basename(root) as RuleLanguage);
  }
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code && code !== "ENOENT") console.error(`[rules] cannot scan ${root}: ${code}`);
    return ids;
  }
  for (const entry of entries) {
    const name = entry.name;
    if (!entry.isDirectory() || !isRuleLanguage(name)) continue;
    await collectPackIds(join(root, name), ids, name);
  }
  return ids;
}

async function validateIndex(dir: string, ruleFiles: string[]): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const indexPath = join(dir, "INDEX.md");
  let text: string;
  try {
    text = await readFile(indexPath, "utf-8");
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code ?? "unknown";
    if (code === "ENOENT") {
      issues.push(issue("index-file-missing", "INDEX.md is missing", indexPath));
    } else {
      issues.push(issue("read-failed", `cannot read INDEX.md (${code})`, indexPath));
    }
    return issues;
  }

  const listed = new Set<string>();
  const linkRe = /^\s*[-*]\s+\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/gm;
  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(text)) !== null) {
    const target = match[1].replace(/^<|>$/g, "").split("#")[0].trim();
    if (target === "" || /^[a-z][a-z0-9+.-]*:\/\//i.test(target)) continue;
    if (!target.endsWith(".md")) {
      issues.push(issue("index-extra", `INDEX.md links non-markdown target "${target}"`, indexPath));
      continue;
    }
    if (target.includes("/")) {
      issues.push(issue("index-extra", `INDEX.md link "${target}" must reference a file in this directory`, indexPath));
      continue;
    }
    listed.add(target);
  }

  const files = new Set(ruleFiles);
  for (const file of [...files].sort()) {
    if (!listed.has(file)) {
      issues.push(issue("index-missing", `rule "${file}" is not listed in INDEX.md`, join(dir, file)));
    }
  }
  for (const target of [...listed].sort()) {
    if (!files.has(target)) {
      issues.push(issue("index-extra", `INDEX.md lists "${target}" which is not a rule file in this directory`, join(dir, target)));
    }
  }
  return issues;
}

export async function validateFile(filePath: string, options: ValidateOptions = {}): Promise<FileValidationResult> {
  const abs = resolve(filePath);
  let raw: string;
  try {
    raw = await readFile(abs, "utf-8");
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code ?? "unknown";
    return {
      path: abs,
      rule: null,
      issues: [issue("read-failed", `cannot read rule file (${code})`, abs)],
      compile: [],
    };
  }

  let knownIds: ReadonlySet<string> | null;
  if (options.knownIds) {
    knownIds = options.knownIds;
  } else {
    const discovered = await collectKnownIds(rootForRule(abs));
    knownIds = discovered.size > 0 ? discovered : null;
  }

  const parsed = parseRule(abs, raw, knownIds);
  const issues = parsed.issues;
  const compile: SnippetCheck[] = [];
  const hasError = issues.some((entry) => entry.severity === "error");
  if (parsed.rule && !hasError) {
    if (parsed.rule.compile_exempt) {
      issues.push(issue("compile-exempt", `compile check skipped: ${parsed.rule.compile_exempt}`, abs, "warning"));
    } else if (options.compile !== false) {
      for (const section of ["bad", "good"] as const) {
        const code = parsed.body.snippets[section];
        if (code === null) continue;
        const result = await compileSnippet(parsed.rule.lang, code);
        compile.push({ section, result });
        if (result.skipped) {
          issues.push(issue("compile-skipped", `${section} snippet compile skipped: ${result.output}`, abs, "warning"));
        } else if (!result.ok) {
          issues.push(
            issue("compile-failed", `${section} snippet failed to compile (${result.compiler}): ${truncate(result.output)}`, abs),
          );
        }
      }
    }
  }
  return { path: abs, rule: parsed.rule, issues, compile };
}

export async function validatePack(langDir: string, options: ValidateOptions = {}): Promise<ValidationReport> {
  const dir = resolve(langDir);
  let files: string[];
  try {
    files = (await readdir(dir)).filter(isRuleFilename).sort();
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code ?? "unknown";
    if (code === "ENOENT") {
      return {
        errors: [],
        warnings: [issue("pack-missing", `rules directory not found: ${dir}`, dir, "warning")],
        ruleCount: 0,
        checkedCount: 0,
      };
    }
    return {
      errors: [issue("read-failed", `cannot read rules directory (${code})`, dir)],
      warnings: [],
      ruleCount: 0,
      checkedCount: 0,
    };
  }

  let knownIds = options.knownIds;
  if (!knownIds) {
    const fromParent = await collectKnownIds(dirname(dir));
    knownIds = fromParent.size > 0 ? fromParent : await collectKnownIds(dir);
  }

  const issues: ValidationIssue[] = [];
  let ruleCount = 0;
  let checkedCount = 0;
  for (const file of files) {
    const result = await validateFile(join(dir, file), { compile: options.compile, knownIds });
    issues.push(...result.issues);
    ruleCount += 1;
    if (!result.issues.some((entry) => entry.severity === "error")) checkedCount += 1;
  }
  issues.push(...(await validateIndex(dir, files)));

  return {
    errors: issues.filter((entry) => entry.severity === "error"),
    warnings: issues.filter((entry) => entry.severity === "warning"),
    ruleCount,
    checkedCount,
  };
}

export async function validateAll(root = "catalog/rules", options: ValidateOptions = {}): Promise<ValidationReport> {
  const base = resolve(root);
  let entries;
  try {
    entries = await readdir(base, { withFileTypes: true });
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code ?? "unknown";
    if (code === "ENOENT") {
      return {
        errors: [],
        warnings: [issue("root-missing", `rules root not found: ${base}`, base, "warning")],
        ruleCount: 0,
        checkedCount: 0,
      };
    }
    return {
      errors: [issue("read-failed", `cannot read rules root (${code})`, base)],
      warnings: [],
      ruleCount: 0,
      checkedCount: 0,
    };
  }

  const knownIds = await collectKnownIds(base);
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  let ruleCount = 0;
  let checkedCount = 0;
  const languages = entries
    .filter((entry) => entry.isDirectory() && isRuleLanguage(entry.name))
    .map((entry) => entry.name)
    .sort();
  for (const lang of languages) {
    const report = await validatePack(join(base, lang), { compile: options.compile, knownIds });
    errors.push(...report.errors);
    warnings.push(...report.warnings);
    ruleCount += report.ruleCount;
    checkedCount += report.checkedCount;
  }
  return { errors, warnings, ruleCount, checkedCount };
}
