// SPDX-License-Identifier: Apache-2.0

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import matter from "gray-matter";
import { estimateTokens } from "../lib/token-estimator.js";
import { rulesCatalogRoot } from "./loader.js";
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

  for (const id of new Set(ids)) {
    if (!RULE_ID.test(id)) {
      console.error(`[rules-content] invalid rule id: ${id}`);
      continue;
    }
    const lang = languages.find((candidate) => id.startsWith(`${candidate}-`));
    if (lang === undefined) {
      console.error(`[rules-content] no language pack for rule id: ${id}`);
      continue;
    }

    let raw: string;
    try {
      raw = await readFile(join(root, lang, `${id.slice(lang.length + 1)}.md`), "utf8");
    } catch (error) {
      console.error(`[rules-content] cannot read rule ${id}: ${messageOf(error)}`);
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
