// SPDX-License-Identifier: Apache-2.0

import { escapeRegex } from "../lib/escape-regex.js";
import type { ParsedRule } from "./loader.js";

export interface SymbolPosting {
  ruleId: string;
  symbol: string;
}

export interface RulesIndex {
  rules: ParsedRule[];
  byId: Map<string, ParsedRule>;
  keywordIndex: Map<string, string[]>;
  symbolIndex: Map<string, SymbolPosting[]>;
  langs: string[];
}

const TERM_SPLIT = /[-_\s]+/;
const PROSE_WORDS = new Set([
  "a", "an", "the", "this", "that", "these", "those", "is", "are", "was", "were",
  "be", "been", "being", "for", "and", "or", "of", "to", "in", "on", "at", "by",
  "with", "from", "as", "it", "its", "we", "you", "your", "our", "i", "me", "my",
  "do", "does", "did", "have", "has", "had", "can", "could", "should", "would",
  "will", "may", "might", "so", "than", "then", "there", "here", "when", "where",
]);

export function isProseWord(value: string): boolean {
  return PROSE_WORDS.has(value.toLowerCase());
}

const REGEX_SPECIALS = "\\^$.*+?()[]{}|/";
const globCache = new Map<string, RegExp>();

export function simpleStem(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ing") && word.length > 5) return word.slice(0, -3);
  if (word.endsWith("es") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) return word.slice(0, -1);
  return word;
}

export function normalizeTerms(value: string): string[] {
  const parts = value.toLowerCase().split(TERM_SPLIT);
  const out: string[] = [];
  for (const part of parts) {
    if (part.length > 0) out.push(part);
  }
  return out;
}

export function keywordKeys(value: string): string[] {
  const keys: string[] = [];
  for (const term of normalizeTerms(value)) {
    if (isProseWord(term)) continue;
    const key = simpleStem(term);
    if (!keys.includes(key)) keys.push(key);
  }
  return keys;
}

function sortedUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

export function buildIndex(rules: readonly ParsedRule[]): RulesIndex {
  const sorted = [...rules].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const byId = new Map<string, ParsedRule>();
  const indexPath: ParsedRule[] = [];
  for (const rule of sorted) {
    if (byId.has(rule.id)) continue;
    byId.set(rule.id, rule);
    indexPath.push(rule);
  }

  const keywordPostings = new Map<string, Set<string>>();
  const symbolPostings = new Map<string, SymbolPosting[]>();
  const langs = new Set<string>();

  for (const rule of indexPath) {
    langs.add(rule.lang);
    for (const keyword of rule.triggers.keywords) {
      for (const key of keywordKeys(keyword)) {
        let ids = keywordPostings.get(key);
        if (!ids) {
          ids = new Set();
          keywordPostings.set(key, ids);
        }
        ids.add(rule.id);
      }
    }
    for (const rawSymbol of rule.triggers.symbols) {
      const symbol = rawSymbol.trim();
      if (symbol.length === 0) continue;
      const key = symbol.toLowerCase();
      let postings = symbolPostings.get(key);
      if (!postings) {
        postings = [];
        symbolPostings.set(key, postings);
      }
      if (!postings.some((posting) => posting.ruleId === rule.id)) {
        postings.push({ ruleId: rule.id, symbol });
      }
    }
  }

  const keywordIndex = new Map<string, string[]>();
  for (const key of sortedUnique(keywordPostings.keys())) {
    keywordIndex.set(key, sortedUnique(keywordPostings.get(key)!));
  }
  const symbolIndex = new Map<string, SymbolPosting[]>();
  for (const key of sortedUnique(symbolPostings.keys())) {
    const postings = [...symbolPostings.get(key)!].sort((a, b) =>
      a.ruleId < b.ruleId ? -1 : a.ruleId > b.ruleId ? 1 : 0,
    );
    symbolIndex.set(key, postings);
  }

  return {
    rules: indexPath,
    byId,
    keywordIndex,
    symbolIndex,
    langs: sortedUnique(langs),
  };
}

export function normalizeFilePath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^(\.\/)+/, "");
}

function compileGlob(glob: string): RegExp {
  const normalized = normalizeFilePath(glob);
  let pattern = "";
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    if (char === "*") {
      if (normalized[i + 1] === "*") {
        if (normalized[i + 2] === "/") {
          pattern += "(?:[^/]+/)*";
          i += 2;
        } else {
          pattern += ".*";
          i += 1;
        }
      } else {
        pattern += "[^/]*";
      }
    } else if (char === "?") {
      pattern += "[^/]";
    } else if (REGEX_SPECIALS.includes(char)) {
      pattern += `\\${char}`;
    } else {
      pattern += char;
    }
  }
  return new RegExp(`^${pattern}$`);
}

export function globToRegExp(glob: string): RegExp {
  const cached = globCache.get(glob);
  if (cached) return cached;
  const compiled = compileGlob(glob);
  globCache.set(glob, compiled);
  return compiled;
}

export function matchGlob(pattern: string, filePath: string): boolean {
  return globToRegExp(pattern).test(normalizeFilePath(filePath));
}

export function countSymbolOccurrences(prompt: string, symbol: string): number {
  const needle = symbol.trim();
  if (needle.length === 0) return 0;
  const re = new RegExp(`(?:^|[^A-Za-z0-9_])${escapeRegex(needle)}(?![A-Za-z0-9_])`, "gi");
  let count = 0;
  for (const _match of prompt.matchAll(re)) count += 1;
  return count;
}
