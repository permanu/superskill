// SPDX-License-Identifier: Apache-2.0

import { readFile, readdir } from "node:fs/promises";
import { basename, dirname, join, posix, relative, resolve, sep } from "node:path";
import matter from "../lib/markdown-matter.js";
import { mapConcurrent } from "../lib/concurrency.js";
import { compileSnippet } from "./harness/index.js";
import { collectRuleFiles, isRuleFilename } from "./files.js";
import { keywordKeys } from "./index-builder.js";
import { isLanguageWideGlob } from "./router.js";
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

export { isRuleFilename } from "./files.js";

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
  requireNonEmpty?: boolean;
}

const READ_CONCURRENCY = 12;

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

function analyzeFences(lines: string[]): { blocks: FenceBlock[]; dangling: boolean } {
  const blocks: FenceBlock[] = [];
  let malformed = false;
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
    if (fence[0] === open.marker && fence.length >= open.length && info !== "") malformed = true;
    open.lines.push(line);
  }
  return { blocks, dangling: open !== null || malformed };
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

interface CodeScanState {
  quote: { end: string; escaped: boolean } | null;
  block: number;
}

function scanCodeLine(line: string, state: CodeScanState, lang: RuleLanguage | null): { code: string; comments: string } {
  let code = "";
  let comments = "";
  for (let i = 0; i < line.length;) {
    if (state.quote) {
      if (state.quote.escaped && line[i] === "\\") i += 2;
      else if (line.startsWith(state.quote.end, i)) {
        i += state.quote.end.length;
        state.quote = null;
      } else i += 1;
      continue;
    }
    if (state.block > 0) {
      if (line.startsWith("*/", i)) { state.block -= 1; i += 2; }
      else if (lang === "rust" && line.startsWith("/*", i)) { state.block += 1; i += 2; }
      else comments += line[i++];
      continue;
    }
    if ((lang === "python" && line[i] === "#") || (lang !== "python" && line.startsWith("//", i))) {
      comments += line.slice(i);
      break;
    }
    if (lang !== "python" && line.startsWith("/*", i)) {
      state.block = 1;
      i += 2;
      continue;
    }
    const rawRust = lang === "rust" ? /^(?:br|r)(#*)"/.exec(line.slice(i)) : null;
    const rawCpp = lang === "cpp" ? /^R"([^\s()\\]{0,16})\(/.exec(line.slice(i)) : null;
    const rawSwift = lang === "swift" ? /^(#+)("""|")/.exec(line.slice(i)) : null;
    if (rawRust || rawCpp || rawSwift) {
      const marker = rawRust ?? rawCpp ?? rawSwift!;
      state.quote = { end: rawRust ? `"${rawRust[1]}` : rawCpp ? `)${rawCpp[1]}"` : `${rawSwift![2]}${rawSwift![1]}`, escaped: false };
      code += " ";
      i += marker[0].length;
      continue;
    }
    const char = line[i];
    if (char === '"' || char === "'" || (char === "`" && (lang === "go" || lang === "typescript"))) {
      if (char === "'" && lang === "rust" && !/^'(?:\\(?:u\{[a-f0-9]+\}|x[a-f0-9]{2}|.)|[^'\\])'/i.test(line.slice(i))) {
        code += line[i++];
        continue;
      }
      const triple = (lang === "python" || lang === "java" || lang === "swift") && line.startsWith(char.repeat(3), i);
      const end = triple ? char.repeat(3) : char;
      state.quote = { end, escaped: !(char === "`" && lang === "go") };
      code += " ";
      i += end.length;
      continue;
    }
    code += line[i++];
  }
  return { code, comments };
}

function stripInlineCode(line: string): string {
  return line.replace(/(`+).*?\1(?!`)/g, " ");
}

function validateBody(abs: string, body: string, lang: RuleLanguage | null, issues: ValidationIssue[]): BodyResult {
  const lines = body.split(/\r?\n/);
  const fenced = fenceMask(lines);
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
    if (fenced.has(i)) continue;
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
  const prose = lines.map((line, i) => fenced.has(i) ? "" : stripInlineCode(line));
  const scanState: CodeScanState = { quote: null, block: 0 };
  for (let i = 0; i < lines.length; i += 1) {
    if (!fenced.has(i)) { scanState.quote = null; scanState.block = 0; }
    const scanned = fenced.has(i) ? scanCodeLine(lines[i], scanState, lang) : { code: prose[i], comments: "" };
    const checked = `${scanned.code} ${scanned.comments}`;
    const matches = checked.match(forbidden);
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
    if (isBareElisionLine(scanned.code.trim(), lang) && scanned.comments === "") {
      issues.push(issue("snippet-elision", `bare elision marker "${lines[i].trim()}" on line ${i + 1}`, abs));
    } else if (checked.includes(ELLIPSIS_CHAR)) {
      issues.push(issue("unicode-ellipsis", `unicode ellipsis used as elision on line ${i + 1}`, abs));
    } else if (fenced.has(i) && hasCommentElision(scanned.comments)) {
      issues.push(issue("comment-elision", `elision inside a comment on line ${i + 1}`, abs, "warning"));
    }
    if (!fenced.has(i)) {
      const hedges = prose[i].match(hedging);
      if (hedges) {
        for (const hedge of hedges) {
          const key = hedge.toLowerCase();
          if (seenHedges.has(key)) continue;
          seenHedges.add(key);
          issues.push(issue("hedging", `hedging phrase "${hedge}" on line ${i + 1}`, abs, "warning"));
        }
      }
      if (asNeeded.test(prose[i])) {
        const previous = i > 0 ? prose[i - 1] : "";
        const next = i + 1 < lines.length ? prose[i + 1] : "";
        if (!condition.test(prose[i]) && !condition.test(previous) && !condition.test(next)) {
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
  if (data.baseline !== undefined && data.baseline !== "latest") {
    issues.push(issue("baseline-invalid", '"baseline" must be the literal string "latest"', abs));
    fundamental = false;
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
      if (isRuleLanguage(data.lang) &&
          !(triggers.keywords ?? []).some((value) => keywordKeys(value).length > 0) &&
          !(triggers.symbols ?? []).some((value) => value.trim() !== "") &&
          !(triggers.files ?? []).some((value) => !isLanguageWideGlob(value, data.lang as string))) {
        issues.push(issue("triggers-unreachable", "triggers need a keyword, symbol, or discriminative file glob; language-wide globs only gate language", abs));
      }
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
  const root = rootForRule(abs);
  const parentName = root ? relative(root, abs).split(sep)[0] : basename(dirname(abs));
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
  const root = rootForRule(abs);
  return root ? relative(root, abs).split(sep).join("/") : basename(abs);
}

function rootForRule(abs: string): string | null {
  for (let dir = dirname(abs); dirname(dir) !== dir; dir = dirname(dir)) {
    if (isRuleLanguage(basename(dir))) return dirname(dir);
  }
  return null;
}

async function collectKnownIds(root: string): Promise<Set<string>> {
  const files = await collectRuleFiles(root, (path, error) => {
    const code = (error as NodeJS.ErrnoException).code ?? "unknown";
    if (code !== "ENOENT") console.error(`[rules] cannot scan ${path}: ${code}`);
  });
  const collected = await mapConcurrent(files, READ_CONCURRENCY, async (file) => {
    try {
      const raw = await readFile(file, "utf-8");
      if (!raw.trimStart().startsWith("---")) return null;
      const { data } = matter(raw, {});
      const stem = basename(file, ".md");
      if (!isRuleLanguage(data.lang) || !isNonEmptyString(data.id) ||
          !isNonEmptyString(data.prefix) || !/^[a-z][a-z0-9-]*$/.test(data.prefix) ||
          !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/.test(stem) ||
          !stem.startsWith(`${data.prefix}-`) || data.id !== `${data.lang}-${stem}`) return null;
      return data.id;
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code && code !== "ENOENT") console.error(`[rules] cannot read ${file}: ${code}`);
      return null;
    }
  });
  return new Set(collected.filter((id): id is string => id !== null));
}

async function validateLayout(dir: string): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  for (const name of ["sources", "categories"]) {
    const path = join(dir, `${name}.md`);
    try {
      const text = await readFile(path, "utf-8");
      if (name === "sources" && !/^Baseline:[ \t]*latest[ \t]*$/m.test(text)) {
        issues.push(issue("sources-baseline", 'sources.md must declare "Baseline: latest"', path));
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code ?? "unknown";
      issues.push(code === "ENOENT"
        ? issue(`${name}-file-missing`, `${name}.md is missing`, path)
        : issue("read-failed", `cannot read ${name}.md (${code})`, path));
    }
  }
  return issues;
}

async function validateIndex(dir: string, ruleFiles: string[], verified: number): Promise<ValidationIssue[]> {
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

  if (!/^Baseline:[ \t]*latest[ \t]*$/m.test(text)) {
    issues.push(issue("index-baseline", 'INDEX.md must declare "Baseline: latest"', indexPath));
  }
  const counts = /^Rules:[ \t]*(\d+)[ \t]*\(verified:[ \t]*(\d+)\)[ \t]*$/m.exec(text);
  if (!counts || Number(counts[1]) !== ruleFiles.length || Number(counts[2]) !== verified) {
    issues.push(issue("index-count", `INDEX.md must declare "Rules: ${ruleFiles.length} (verified: ${verified})"`, indexPath));
  }

  const listed = new Set<string>();
  const linkRe = /(?<!!)\[[^\]\n]*\]\(\s*(<[^>\n]+>|[^)\s]+)(?:\s+"[^"\n]*")?\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(text)) !== null) {
    const raw = match[1].replace(/^<|>$/g, "");
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith("//")) continue;
    let target: string;
    try {
      target = decodeURIComponent(raw.split(/[?#]/)[0]);
    } catch {
      issues.push(issue("index-extra", `INDEX.md link has invalid URL escapes: "${raw}"`, indexPath));
      continue;
    }
    if (target === "") continue;
    if (target.startsWith("/") || /[\\\u0000-\u001f]/.test(target) || /^[a-z][a-z0-9+.-]*:/i.test(target) || target.split("/").includes("..")) {
      issues.push(issue("index-extra", `INDEX.md link "${raw}" must stay within this pack`, indexPath));
      continue;
    }
    target = posix.normalize(target);
    if (["INDEX.md", "sources.md", "categories.md"].includes(basename(target))) continue;
    if (!target.endsWith(".md")) {
      issues.push(issue("index-extra", `INDEX.md links non-markdown target "${target}"`, indexPath));
      continue;
    }
    if (listed.has(target)) {
      issues.push(issue("index-duplicate", `INDEX.md lists "${target}" more than once`, indexPath));
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
    const root = rootForRule(abs);
    knownIds = root ? await collectKnownIds(root) : null;
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
    files = await collectRuleFiles(dir);
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code ?? "unknown";
    if (code === "ENOENT") {
      return {
        errors: options.requireNonEmpty ? [issue("pack-missing", `requested rules pack not found: ${dir}`, dir)] : [],
        warnings: options.requireNonEmpty
          ? []
          : [issue("pack-missing", `rules directory not found: ${dir}`, dir, "warning")],
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
    knownIds = await collectKnownIds(isRuleLanguage(basename(dir)) ? dirname(dir) : dir);
  }

  const concurrency = options.compile === false ? READ_CONCURRENCY : 1;
  const results = await mapConcurrent(files, concurrency, (file) =>
    validateFile(file, { compile: options.compile, knownIds }),
  );

  const issues: ValidationIssue[] = [];
  let ruleCount = 0;
  let checkedCount = 0;
  for (const result of results) {
    issues.push(...result.issues);
    ruleCount += 1;
    if (!result.issues.some((entry) => entry.severity === "error")) checkedCount += 1;
  }
  issues.push(...(await validateLayout(dir)));
  issues.push(...(await validateIndex(dir, files.map((file) => relative(dir, file).split(sep).join("/")),
    results.filter((result) => result.rule?.status === "verified").length)));
  if (options.requireNonEmpty && checkedCount === 0) {
    issues.push(issue("no-rules-checked", "no valid rules were checked in this requested pack", dir));
  }

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
        errors: options.requireNonEmpty ? [issue("root-missing", `requested rules root not found: ${base}`, base)] : [],
        warnings: options.requireNonEmpty
          ? []
          : [issue("root-missing", `rules root not found: ${base}`, base, "warning")],
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

  const knownIds = options.knownIds ?? await collectKnownIds(base);
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  let ruleCount = 0;
  let checkedCount = 0;
  const languages = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const languageConcurrency = options.compile === false ? 4 : 1;
  const reports = await mapConcurrent(languages, languageConcurrency, (lang) =>
    validatePack(join(base, lang), { compile: options.compile, knownIds }),
  );
  for (const lang of languages) {
    if (!isRuleLanguage(lang)) errors.push(issue("pack-language", `unknown language pack "${lang}"`, join(base, lang)));
  }
  for (const report of reports) {
    errors.push(...report.errors);
    warnings.push(...report.warnings);
    ruleCount += report.ruleCount;
    checkedCount += report.checkedCount;
  }
  for (const entry of entries.filter((entry) => entry.isFile() && isRuleFilename(entry.name)).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(base, entry.name);
    const result = await validateFile(path, { compile: options.compile, knownIds });
    errors.push(issue("rule-location", "rule files must be inside a language pack", path));
    errors.push(...result.issues.filter((entry) => entry.severity === "error"));
    warnings.push(...result.issues.filter((entry) => entry.severity === "warning"));
    ruleCount += 1;
  }
  if (options.requireNonEmpty && checkedCount === 0) {
    errors.push(issue("no-rules-checked", "no valid rules were checked in the requested rules root", base));
  }
  return { errors, warnings, ruleCount, checkedCount };
}
