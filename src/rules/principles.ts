// SPDX-License-Identifier: Apache-2.0

import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { formatMatchClause } from "./explain.js";
import {
  countSymbolOccurrences,
  keywordKeys,
  matchGlob,
  normalizeFilePath,
  normalizeTerms,
  simpleStem,
} from "./index-builder.js";
import type { Enforce } from "./loader.js";
import type { PlannedPrinciple } from "./plan.js";

export type PrincipleStatus = "draft" | "verified";

export interface PrincipleTriggers {
  keywords: string[];
  files: string[];
  symbols: string[];
}

export interface ParsedPrinciple {
  id: string;
  title: string;
  applyWhen: string;
  enforce: Enforce;
  status: PrincipleStatus;
  triggers: PrincipleTriggers;
  related: string[];
  sourcesCount: number;
  body: string;
  path: string;
}

export interface PrincipleWarning {
  path: string;
  message: string;
}

export interface PrincipleLoadResult {
  principles: ParsedPrinciple[];
  warnings: PrincipleWarning[];
}

export interface PrincipleSymbolPosting {
  principleId: string;
  symbol: string;
}

export interface PrinciplesIndex {
  principles: ParsedPrinciple[];
  byId: Map<string, ParsedPrinciple>;
  keywordIndex: Map<string, string[]>;
  gateIndex: Map<string, string[]>;
  symbolIndex: Map<string, PrincipleSymbolPosting[]>;
}

export interface PrincipleSelectInput {
  prompt: string;
  files?: string[];
}

export interface PrincipleSelectOptions {
  cap?: number;
  includeDrafts?: boolean;
}

export interface PrincipleDrop {
  id: string;
  reason: "cap";
  score: number;
}

export interface PrincipleSelection {
  selected: PlannedPrinciple[];
  dropped: PrincipleDrop[];
}

export const DEFAULT_PRINCIPLE_CAP = 3;

export const PRINCIPLE_SCORE_WEIGHT = { file: 100, keyword: 10, gate: 5, symbol: 1 } as const;

const NON_PRINCIPLE_FILES = new Set(["INDEX.md", "sources.md", "categories.md"]);
const STATUSES: ReadonlySet<string> = new Set(["draft", "verified"]);
const ENFORCEMENTS: ReadonlySet<string> = new Set(["tool", "review", "both"]);
const PRINCIPLE_ID_PREFIX = "principle-";
const PROMPT_TOKEN = /[a-z0-9][a-z0-9._#+-]*/g;

const GATE_STOPWORDS: ReadonlySet<string> = new Set(
  [
    "a",
    "after",
    "an",
    "and",
    "any",
    "apply",
    "are",
    "as",
    "at",
    "be",
    "before",
    "but",
    "by",
    "can",
    "do",
    "does",
    "for",
    "from",
    "has",
    "have",
    "if",
    "in",
    "into",
    "is",
    "it",
    "its",
    "not",
    "of",
    "on",
    "onto",
    "or",
    "so",
    "that",
    "the",
    "their",
    "them",
    "then",
    "there",
    "these",
    "this",
    "to",
    "up",
    "use",
    "used",
    "using",
    "was",
    "when",
    "whenever",
    "with",
    "without",
    "you",
    "your",
  ].map((word) => simpleStem(word)),
);

export function principlesCatalogRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "../../catalog/principles");
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

function parseStatus(value: unknown): PrincipleStatus | undefined {
  const text = asNonEmptyString(value);
  return text !== undefined && STATUSES.has(text) ? (text as PrincipleStatus) : undefined;
}

function parseEnforce(value: unknown): Enforce | undefined {
  const text = asNonEmptyString(value);
  return text !== undefined && ENFORCEMENTS.has(text) ? (text as Enforce) : undefined;
}

function parseTriggers(raw: unknown, relPath: string, warnings: PrincipleWarning[]): PrincipleTriggers {
  if (raw === undefined || raw === null) {
    warnings.push({ path: relPath, message: "missing triggers.keywords" });
    return { keywords: [], files: [], symbols: [] };
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    warnings.push({ path: relPath, message: "triggers must be a mapping with keywords/files/symbols" });
    return { keywords: [], files: [], symbols: [] };
  }
  const triggers = raw as Record<string, unknown>;
  const keywords = [...new Set(asStringArray(triggers.keywords))];
  if (keywords.length === 0) {
    warnings.push({ path: relPath, message: "missing triggers.keywords" });
  }
  return {
    keywords,
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

function isPrincipleFileName(name: string): boolean {
  return name.endsWith(".md") && !NON_PRINCIPLE_FILES.has(name);
}

async function parsePrincipleFile(
  abs: string,
  root: string,
  warnings: PrincipleWarning[],
): Promise<ParsedPrinciple | undefined> {
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
  const title = asNonEmptyString(data.title);
  const applyWhen = asNonEmptyString(data.apply_when);
  const status = parseStatus(data.status);
  if (id === undefined || title === undefined || applyWhen === undefined || status === undefined) {
    const problems = [
      ...(id === undefined ? ["id"] : []),
      ...(title === undefined ? ["title"] : []),
      ...(applyWhen === undefined ? ["apply_when"] : []),
      ...(status === undefined ? ["status"] : []),
    ];
    warnings.push({ path: relPath, message: `missing or invalid required fields: ${problems.join(", ")}` });
    return undefined;
  }

  const base = relPath.endsWith(".md") ? relPath.slice(0, -3) : relPath;
  if (id !== `${PRINCIPLE_ID_PREFIX}${base}`) {
    warnings.push({ path: relPath, message: `id '${id}' does not match filename '${base}.md'` });
  }

  const enforceRaw = asNonEmptyString(data.enforce);
  const enforce = parseEnforce(data.enforce) ?? "review";
  if (enforceRaw !== undefined && parseEnforce(data.enforce) === undefined) {
    warnings.push({ path: relPath, message: `invalid enforce '${enforceRaw}'; defaulting to 'review'` });
  }

  return {
    id,
    title,
    applyWhen,
    enforce,
    status,
    triggers: parseTriggers(data.triggers, relPath, warnings),
    related: [...new Set(asStringArray(data.related))],
    sourcesCount: countSources(data.sources),
    body,
    path: relPath,
  };
}

export async function loadPrinciples(root: string = principlesCatalogRoot()): Promise<PrincipleLoadResult> {
  const warnings: PrincipleWarning[] = [];
  let entries: Dirent[];
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      warnings.push({ path: ".", message: `cannot read directory: ${messageOf(error)}` });
    }
    return { principles: [], warnings };
  }
  entries.sort((a, b) => compareIds(a.name, b.name));

  const files: string[] = [];
  for (const entry of entries) {
    if (entry.isFile() && isPrincipleFileName(entry.name)) {
      files.push(join(root, entry.name));
    }
  }

  const principles: ParsedPrinciple[] = [];
  const seen = new Set<string>();
  for (const abs of files) {
    const principle = await parsePrincipleFile(abs, root, warnings);
    if (principle === undefined) continue;
    if (seen.has(principle.id)) {
      warnings.push({ path: principle.path, message: `duplicate principle id '${principle.id}'` });
      continue;
    }
    seen.add(principle.id);
    principles.push(principle);
  }
  principles.sort((a, b) => compareIds(a.id, b.id));
  return { principles, warnings };
}

function sortedUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function gateKeysFromText(text: string): string[] {
  const keys: string[] = [];
  for (const term of normalizeTerms(text.toLowerCase().replace(/[^a-z0-9]+/g, " "))) {
    const key = simpleStem(term);
    if (key.length === 0 || GATE_STOPWORDS.has(key)) continue;
    if (!keys.includes(key)) keys.push(key);
  }
  return keys;
}

function gateKeyFromPromptTerm(term: string): string | undefined {
  const cleaned = term.replace(/[^a-z0-9]+/g, "");
  if (cleaned.length === 0) return undefined;
  const key = simpleStem(cleaned);
  return GATE_STOPWORDS.has(key) ? undefined : key;
}

function addPosting(postings: Map<string, Set<string>>, key: string, id: string): void {
  let ids = postings.get(key);
  if (!ids) {
    ids = new Set();
    postings.set(key, ids);
  }
  ids.add(id);
}

function finalizePostings(postings: Map<string, Set<string>>): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const key of sortedUnique(postings.keys())) {
    index.set(key, sortedUnique(postings.get(key)!));
  }
  return index;
}

export function buildPrincipleIndex(principles: readonly ParsedPrinciple[]): PrinciplesIndex {
  const sorted = [...principles].sort((a, b) => compareIds(a.id, b.id));
  const byId = new Map<string, ParsedPrinciple>();
  const indexPath: ParsedPrinciple[] = [];
  for (const principle of sorted) {
    if (byId.has(principle.id)) continue;
    byId.set(principle.id, principle);
    indexPath.push(principle);
  }

  const keywordPostings = new Map<string, Set<string>>();
  const gatePostings = new Map<string, Set<string>>();
  const symbolPostings = new Map<string, PrincipleSymbolPosting[]>();

  for (const principle of indexPath) {
    for (const keyword of principle.triggers.keywords) {
      for (const key of keywordKeys(keyword)) {
        addPosting(keywordPostings, key, principle.id);
      }
    }
    for (const key of gateKeysFromText(principle.applyWhen)) {
      addPosting(gatePostings, key, principle.id);
    }
    for (const rawSymbol of principle.triggers.symbols) {
      const symbol = rawSymbol.trim();
      if (symbol.length === 0) continue;
      const key = symbol.toLowerCase();
      let postings = symbolPostings.get(key);
      if (!postings) {
        postings = [];
        symbolPostings.set(key, postings);
      }
      if (!postings.some((posting) => posting.principleId === principle.id)) {
        postings.push({ principleId: principle.id, symbol });
      }
    }
  }

  const symbolIndex = new Map<string, PrincipleSymbolPosting[]>();
  for (const key of sortedUnique(symbolPostings.keys())) {
    const postings = [...symbolPostings.get(key)!].sort((a, b) =>
      compareIds(a.principleId, b.principleId),
    );
    symbolIndex.set(key, postings);
  }

  return {
    principles: indexPath,
    byId,
    keywordIndex: finalizePostings(keywordPostings),
    gateIndex: finalizePostings(gatePostings),
    symbolIndex,
  };
}

interface Candidate {
  principle: ParsedPrinciple;
  matched: string[];
  score: number;
}

type HitMap = Map<string, Map<string, number>>;

function tokenizePrompt(prompt: string): string[] {
  return prompt.toLowerCase().match(PROMPT_TOKEN) ?? [];
}

function bump(hits: HitMap, id: string, term: string, amount = 1): void {
  let terms = hits.get(id);
  if (!terms) {
    terms = new Map();
    hits.set(id, terms);
  }
  terms.set(term, (terms.get(term) ?? 0) + amount);
}

function buildCandidates(
  index: PrinciplesIndex,
  eligible: (principle: ParsedPrinciple) => boolean,
  prompt: string,
  files: readonly string[],
): Candidate[] {
  const keywordHits: HitMap = new Map();
  const gateHits: HitMap = new Map();
  const symbolHits: HitMap = new Map();
  const fileHits: HitMap = new Map();

  for (const token of tokenizePrompt(prompt)) {
    for (const term of normalizeTerms(token)) {
      const key = simpleStem(term);
      for (const principleId of index.keywordIndex.get(key) ?? []) {
        const principle = index.byId.get(principleId);
        if (!principle || !eligible(principle)) continue;
        bump(keywordHits, principleId, term);
      }
      const gateKey = gateKeyFromPromptTerm(term);
      if (gateKey === undefined) continue;
      for (const principleId of index.gateIndex.get(gateKey) ?? []) {
        const principle = index.byId.get(principleId);
        if (!principle || !eligible(principle)) continue;
        bump(gateHits, principleId, term.replace(/[^a-z0-9]+/g, ""));
      }
    }
  }

  for (const [symbolKey, postings] of index.symbolIndex) {
    if (postings.length === 0) continue;
    const count = countSymbolOccurrences(prompt, symbolKey);
    if (count === 0) continue;
    for (const posting of postings) {
      const principle = index.byId.get(posting.principleId);
      if (!principle || !eligible(principle)) continue;
      bump(symbolHits, posting.principleId, posting.symbol, count);
    }
  }

  if (files.length > 0) {
    for (const principle of index.principles) {
      if (!eligible(principle)) continue;
      for (const glob of principle.triggers.files) {
        let count = 0;
        for (const file of files) {
          if (matchGlob(glob, file)) count += 1;
        }
        if (count > 0) bump(fileHits, principle.id, glob, count);
      }
    }
  }

  const ids = new Set<string>([...keywordHits.keys(), ...gateHits.keys(), ...symbolHits.keys(), ...fileHits.keys()]);
  const candidates: Candidate[] = [];
  for (const id of ids) {
    const principle = index.byId.get(id);
    if (!principle) continue;
    const matched: string[] = [];
    let score = 0;

    const keywords = keywordHits.get(id);
    if (keywords) {
      for (const term of [...keywords.keys()].sort()) {
        const count = keywords.get(term)!;
        matched.push(`keyword '${term}' (${count}x)`);
        score += count * PRINCIPLE_SCORE_WEIGHT.keyword;
      }
    }
    const gates = gateHits.get(id);
    if (gates) {
      for (const term of [...gates.keys()].sort()) {
        const count = gates.get(term)!;
        matched.push(`apply_when '${term}' (${count}x)`);
        score += count * PRINCIPLE_SCORE_WEIGHT.gate;
      }
    }
    const matchedFiles = fileHits.get(id);
    if (matchedFiles) {
      for (const glob of [...matchedFiles.keys()].sort()) {
        const count = matchedFiles.get(glob)!;
        matched.push(`file ${glob} (${count}x)`);
        score += count * PRINCIPLE_SCORE_WEIGHT.file;
      }
    }
    const symbols = symbolHits.get(id);
    if (symbols) {
      for (const symbol of [...symbols.keys()].sort()) {
        const count = symbols.get(symbol)!;
        matched.push(`symbol '${symbol}' (${count}x)`);
        score += count * PRINCIPLE_SCORE_WEIGHT.symbol;
      }
    }

    candidates.push({ principle, matched, score });
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return compareIds(a.principle.id, b.principle.id);
  });
  return candidates;
}

export function selectPrinciples(
  input: PrincipleSelectInput,
  index: PrinciplesIndex,
  options: PrincipleSelectOptions = {},
): PrincipleSelection {
  const prompt = input.prompt ?? "";
  const files = [...new Set((input.files ?? []).map(normalizeFilePath))].sort();
  const includeDrafts = options.includeDrafts === true;
  const rawCap = options.cap ?? DEFAULT_PRINCIPLE_CAP;
  const cap = Number.isFinite(rawCap) ? Math.max(0, Math.floor(rawCap)) : DEFAULT_PRINCIPLE_CAP;
  const eligible = (principle: ParsedPrinciple): boolean =>
    includeDrafts || principle.status === "verified";

  const candidates = buildCandidates(index, eligible, prompt, files);

  const selected: PlannedPrinciple[] = candidates.slice(0, cap).map((candidate) => ({
    id: candidate.principle.id,
    title: candidate.principle.title,
    reason: formatMatchClause(candidate.matched),
  }));
  const dropped: PrincipleDrop[] = candidates.slice(cap).map((candidate) => ({
    id: candidate.principle.id,
    reason: "cap",
    score: candidate.score,
  }));

  return { selected, dropped };
}

export function formatPrincipleDerivation(entry: PlannedPrinciple, principle?: ParsedPrinciple): string {
  const clauses = [entry.reason];
  if (principle !== undefined && principle.applyWhen.length > 0) clauses.push(principle.applyWhen);
  return `principle ${entry.id} selected: ${clauses.filter((clause) => clause.length > 0).join("; ")}`;
}
