// SPDX-License-Identifier: Apache-2.0

import { formatMatchClause } from "./explain.js";
import {
  countSymbolOccurrences,
  isProseWord,
  matchGlob,
  normalizeFilePath,
  normalizeTerms,
  simpleStem,
} from "./index-builder.js";
import type { RulesIndex } from "./index-builder.js";
import type { ParsedRule, Severity } from "./loader.js";
import type { ExplainEntry, Plan, PlanDrop, PlannedRule, RulePhase } from "./plan.js";
import { selectPrinciples } from "./principles.js";
import type { PrinciplesIndex } from "./principles.js";
import { estimateRuleTokens, packBudget } from "./select.js";

export const DEFAULT_BUDGET_TOKENS = 2000;

const SCORE_WEIGHT = { file: 100, keyword: 10, symbol: 1 } as const;

const SEVERITY_RANK: Record<Severity, number> = { must: 0, should: 1, prefer: 2 };

const LANG_ALIASES: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  typescript: "typescript",
  js: "typescript",
  jsx: "typescript",
  javascript: "typescript",
  node: "typescript",
  nodejs: "typescript",
  rs: "rust",
  rust: "rust",
  py: "python",
  python: "python",
  python3: "python",
  go: "go",
  golang: "go",
  swift: "swift",
  java: "java",
  c: "c",
  cpp: "cpp",
  "c++": "cpp",
  cplusplus: "cpp",
};

const EXTENSION_LANGS: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  mts: "typescript",
  cts: "typescript",
  js: "typescript",
  jsx: "typescript",
  mjs: "typescript",
  cjs: "typescript",
  rs: "rust",
  py: "python",
  go: "go",
  swift: "swift",
  java: "java",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  hh: "cpp",
  hxx: "cpp",
};

const PROMPT_TOKEN = /[a-z0-9][a-z0-9._#+-]*/g;

const PHASE_KEYWORDS: ReadonlyArray<{ phase: RulePhase; words: readonly string[] }> = [
  { phase: "ship", words: ["deploy", "release", "ship", "publish", "bump", "tag", "version"] },
  { phase: "review", words: ["review", "refactor", "audit", "diff", "verify", "validate", "check", "inspect", "defect", "critique"] },
  {
    phase: "implement",
    words: [
      "add",
      "build",
      "create",
      "implement",
      "write",
      "develop",
      "feature",
      "integrate",
      "fix",
      "debug",
      "test",
      "optimize",
      "migrate",
      "update",
      "change",
      "modify",
      "remove",
      "rename",
      "patch",
      "improve",
      "enhance",
    ],
  },
  {
    phase: "explore",
    words: [
      "brainstorm",
      "explore",
      "research",
      "investigate",
      "discover",
      "plan",
      "design",
      "prototype",
      "spike",
      "analyze",
      "evaluate",
      "understand",
      "assess",
    ],
  },
];

/**
 * Word-boundary matcher with common inflections (fixed, fixing, fixes...) and
 * consonant doubling (shipping, debugging). Prevents substring false positives
 * such as "fixture" matching "fix" or "stage" matching "tag".
 */
function phasePattern(word: string): RegExp {
  const escaped = word.replace(/[\\^$.*+?()[\]{}|/]/g, "\\$&");
  const last = escaped[escaped.length - 1];
  return new RegExp(`\\b${escaped}(?:${last}(?:ing|ed)|(?:ing|ed|es|s|d))?\\b`);
}

const PHASE_MATCHERS: ReadonlyArray<{ phase: RulePhase; patterns: readonly RegExp[] }> = PHASE_KEYWORDS.map(
  ({ phase, words }) => ({ phase, patterns: words.map(phasePattern) })
);

export interface RouteInput {
  prompt: string;
  stack: string[];
  files?: string[];
  phase?: RulePhase;
}

export interface RouteOptions {
  budgetTokens?: number;
  includeDrafts?: boolean;
  principlesIndex?: PrinciplesIndex;
  principlesCap?: number;
}

interface Candidate {
  rule: ParsedRule;
  matched: string[];
  score: number;
}

type HitMap = Map<string, Map<string, number>>;

function tokenizePrompt(prompt: string): string[] {
  return prompt.toLowerCase().match(PROMPT_TOKEN) ?? [];
}

function normalizeLang(value: string): string | undefined {
  return LANG_ALIASES[value.toLowerCase()];
}

function languageScope(stack: readonly string[], prompt: string, files: readonly string[]): Set<string> {
  const scope = new Set<string>();
  for (const item of stack) {
    const lang = normalizeLang(item);
    if (lang !== undefined) scope.add(lang);
  }
  for (const token of tokenizePrompt(prompt)) {
    const lang = normalizeLang(token);
    if (lang !== undefined) scope.add(lang);
  }
  for (const file of files) {
    const base = file.split("/").pop() ?? "";
    const dot = base.lastIndexOf(".");
    if (dot <= 0) continue;
    const lang = EXTENSION_LANGS[base.slice(dot + 1).toLowerCase()];
    if (lang !== undefined) scope.add(lang);
  }
  return scope;
}

export function inferPhase(prompt: string): RulePhase {
  const lower = prompt.toLowerCase();
  for (const { phase, patterns } of PHASE_MATCHERS) {
    if (patterns.some((pattern) => pattern.test(lower))) return phase;
  }
  return "explore";
}

function bump(hits: HitMap, ruleId: string, term: string, amount = 1): void {
  let terms = hits.get(ruleId);
  if (!terms) {
    terms = new Map();
    hits.set(ruleId, terms);
  }
  terms.set(term, (terms.get(term) ?? 0) + amount);
}

function buildCandidates(
  index: RulesIndex,
  eligible: (rule: ParsedRule) => boolean,
  prompt: string,
  files: readonly string[],
): Candidate[] {
  const keywordHits: HitMap = new Map();
  const symbolHits: HitMap = new Map();
  const fileHits: HitMap = new Map();

  const promptTerms = tokenizePrompt(prompt).flatMap(normalizeTerms).map(simpleStem);
  const candidateIds = new Set<string>();
  for (const term of promptTerms) {
    if (isProseWord(term)) continue;
    for (const ruleId of index.keywordIndex.get(term) ?? []) candidateIds.add(ruleId);
  }
  for (const ruleId of candidateIds) {
    const rule = index.byId.get(ruleId);
    if (!rule || !eligible(rule)) continue;
    for (const keyword of new Set(rule.triggers.keywords)) {
      const terms = normalizeTerms(keyword).map(simpleStem);
      if (terms.length === 0 || terms.every(isProseWord)) continue;
      let count = 0;
      for (let i = 0; i <= promptTerms.length - terms.length; i++) {
        if (terms.every((term, j) => promptTerms[i + j] === term)) count++;
      }
      if (count > 0) bump(keywordHits, ruleId, keyword.toLowerCase(), count);
    }
  }

  for (const [symbolKey, postings] of index.symbolIndex) {
    if (postings.length === 0) continue;
    const symbolPrompt = isProseWord(symbolKey)
      ? [...prompt.matchAll(/`+([^`]+)`+|\b([a-z]+)\.[a-z_$][\w$]*/gi)].map((match) => match[1] ?? match[2]).join("\n")
      : prompt;
    const count = countSymbolOccurrences(symbolPrompt, symbolKey);
    if (count === 0) continue;
    for (const posting of postings) {
      const rule = index.byId.get(posting.ruleId);
      if (!rule || !eligible(rule)) continue;
      bump(symbolHits, posting.ruleId, posting.symbol, count);
    }
  }

  if (files.length > 0) {
    for (const rule of index.rules) {
      if (!eligible(rule)) continue;
      for (const glob of rule.triggers.files) {
        let count = 0;
        for (const file of files) {
          if (matchGlob(glob, file)) count += 1;
        }
        if (count > 0) bump(fileHits, rule.id, glob, count);
      }
    }
  }

  const ids = new Set<string>([...keywordHits.keys(), ...symbolHits.keys(), ...fileHits.keys()]);
  const candidates: Candidate[] = [];
  for (const id of ids) {
    const rule = index.byId.get(id);
    if (!rule) continue;
    const matched: string[] = [];
    let score = 0;

    const keywords = keywordHits.get(id);
    if (keywords) {
      for (const term of [...keywords.keys()].sort()) {
        const count = keywords.get(term)!;
        matched.push(`keyword '${term}' (${count}x)`);
        score += count * SCORE_WEIGHT.keyword;
      }
    }
    const matchedFiles = fileHits.get(id);
    if (matchedFiles) {
      for (const glob of [...matchedFiles.keys()].sort()) {
        const count = matchedFiles.get(glob)!;
        matched.push(`file ${glob} (${count}x)`);
        score += count * SCORE_WEIGHT.file;
      }
    }
    const symbols = symbolHits.get(id);
    if (symbols) {
      for (const symbol of [...symbols.keys()].sort()) {
        const count = symbols.get(symbol)!;
        matched.push(`symbol '${symbol}' (${count}x)`);
        score += count * SCORE_WEIGHT.symbol;
      }
    }

    candidates.push({ rule, matched, score });
  }

  candidates.sort((a, b) => {
    const severity = SEVERITY_RANK[a.rule.severity] - SEVERITY_RANK[b.rule.severity];
    if (severity !== 0) return severity;
    if (b.score !== a.score) return b.score - a.score;
    return a.rule.id < b.rule.id ? -1 : a.rule.id > b.rule.id ? 1 : 0;
  });
  return candidates;
}

export function route(input: RouteInput, index: RulesIndex, options: RouteOptions = {}): Plan {
  const prompt = input.prompt ?? "";
  const files = [...new Set((input.files ?? []).map(normalizeFilePath))].sort();
  const scope = languageScope(input.stack, prompt, files);
  const includeDrafts = options.includeDrafts === true;
  const eligible = (rule: ParsedRule): boolean =>
    (includeDrafts || rule.status === "verified") && (scope.size === 0 || scope.has(rule.lang));

  const candidates = buildCandidates(index, eligible, prompt, files);
  const items = candidates.map((candidate) => ({
    id: candidate.rule.id,
    tokens: estimateRuleTokens(candidate.rule),
    candidate,
  }));
  const packed = packBudget(items, options.budgetTokens ?? DEFAULT_BUDGET_TOKENS);

  const principleSelection =
    options.principlesIndex === undefined
      ? { selected: [], dropped: [] }
      : selectPrinciples({ prompt, files }, options.principlesIndex, {
          cap: options.principlesCap,
          includeDrafts,
        });

  const rules: PlannedRule[] = packed.picked.map(({ candidate }) => ({
    id: candidate.rule.id,
    title: candidate.rule.title,
    reason: formatMatchClause(candidate.matched),
  }));
  const explain: ExplainEntry[] = packed.picked.map(({ candidate }) => ({
    id: candidate.rule.id,
    matched: candidate.matched,
    score: candidate.score,
  }));
  const dropped: PlanDrop[] = packed.dropped.map(({ id, reason, tokens }) => ({ id, reason, tokens }));
  const langs = scope.size > 0 ? [...scope].sort() : [...index.langs];

  return {
    phase: input.phase ?? inferPhase(prompt),
    langs,
    flows: [],
    rules,
    principles: principleSelection.selected,
    gates: [],
    budget: { allocated: packed.allocated, used: packed.used, dropped },
    explain,
  };
}
