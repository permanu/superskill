// SPDX-License-Identifier: Apache-2.0

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import matter from "../lib/markdown-matter.js";
import { estimateTokens } from "../lib/token-estimator.js";
import { loadRules, rulesCatalogRoot } from "./loader.js";
import type { ParsedRule } from "./loader.js";
import { principlesCatalogRoot } from "./principles.js";

export interface RuleContent {
  title: string;
  body: string;
  tokens: number;
}

export type PrincipleContent = RuleContent;

const RULE_ID = /^[a-z][a-z0-9-]*$/;
const PRINCIPLE_ID = /^principle-[a-z0-9][a-z0-9-]*$/;

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function loadRuleContent(
  ids: readonly string[],
  root: string = rulesCatalogRoot(),
): Promise<Map<string, RuleContent>> {
  const contents = new Map<string, RuleContent>();
  if (ids.length === 0) return contents;

  let languages: string[];
  try {
    const entries = await readdir(root, { withFileTypes: true });
    languages = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      console.error(`[rules-content] cannot read rules root ${root}: ${messageOf(error)}`);
    }
    return contents;
  }
  languages.sort((a, b) => b.length - a.length || (a < b ? -1 : a > b ? 1 : 0));

  let parsedRules: ParsedRule[] | undefined;
  const readByIndex = async (id: string): Promise<string | undefined> => {
    if (parsedRules === undefined) {
      parsedRules = (await loadRules(root)).rules;
    }
    const rule = parsedRules.find((candidate) => candidate.id === id);
    if (rule === undefined) return undefined;
    try {
      return await readFile(join(root, rule.path), "utf8");
    } catch (error) {
      console.error(`[rules-content] cannot read rule ${id} at ${rule.path}: ${messageOf(error)}`);
      return undefined;
    }
  };

  for (const id of new Set(ids)) {
    if (!RULE_ID.test(id)) {
      console.error(`[rules-content] invalid rule id: ${id}`);
      continue;
    }
    const lang = languages.find((candidate) => id.startsWith(`${candidate}-`));
    let raw: string | undefined;
    let readError: unknown;
    if (lang !== undefined) {
      try {
        raw = await readFile(join(root, lang, `${id.slice(lang.length + 1)}.md`), "utf8");
      } catch (error) {
        readError = error;
      }
    }
    if (raw === undefined) {
      raw = await readByIndex(id);
    }
    if (raw === undefined) {
      const suffix = readError === undefined ? "" : `: ${messageOf(readError)}`;
      console.error(`[rules-content] cannot read rule ${id}${suffix}`);
      continue;
    }

    let data: Record<string, unknown>;
    let body: string;
    try {
      const parsed = matter(raw, {});
      data = parsed.data as Record<string, unknown>;
      body = parsed.content;
    } catch (error) {
      console.error(`[rules-content] invalid frontmatter in ${id}: ${messageOf(error)}`);
      continue;
    }

    const rawTitle = data.title;
    const title = typeof rawTitle === "string" && rawTitle.trim().length > 0 ? rawTitle.trim() : id;
    contents.set(id, { title, body, tokens: estimateTokens(`${title}\n${body}`) });
  }

  return contents;
}

export async function loadPrincipleContent(
  ids: readonly string[],
  root: string = principlesCatalogRoot(),
): Promise<Map<string, PrincipleContent>> {
  const contents = new Map<string, PrincipleContent>();
  if (ids.length === 0) return contents;

  for (const id of new Set(ids)) {
    if (!PRINCIPLE_ID.test(id)) {
      console.error(`[principles-content] invalid principle id: ${id}`);
      continue;
    }
    const name = id.slice("principle-".length);

    let raw: string;
    try {
      raw = await readFile(join(root, `${name}.md`), "utf8");
    } catch (error) {
      console.error(`[principles-content] cannot read principle ${id}: ${messageOf(error)}`);
      continue;
    }

    let data: Record<string, unknown>;
    let body: string;
    try {
      const parsed = matter(raw, {});
      data = parsed.data as Record<string, unknown>;
      body = parsed.content;
    } catch (error) {
      console.error(`[principles-content] invalid frontmatter in ${id}: ${messageOf(error)}`);
      continue;
    }

    const rawTitle = data.title;
    const title = typeof rawTitle === "string" && rawTitle.trim().length > 0 ? rawTitle.trim() : id;
    contents.set(id, { title, body, tokens: estimateTokens(`${title}\n${body}`) });
  }

  return contents;
}
