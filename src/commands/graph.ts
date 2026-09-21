// SPDX-License-Identifier: AGPL-3.0-or-later
import type { CommandContext } from "../core/types.js";
import { VaultError } from "../lib/vault-fs.js";
import { searchText, type SearchResult } from "../lib/search-engine.js";
import { ensureProjectIndex } from "../lib/knowledge-index.js";

export interface GraphResult {
  note: string;
  outgoing: string[];
  backlinks: string[];
}

function extractWikilinks(content: string): string[] {
  const links: string[] = [];
  const regex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    links.push(match[1]);
  }
  return [...new Set(links)];
}

export async function graphRelatedCommand(
  args: {
    path: string;
    hops?: number;
  } = {} as any,
  ctx: CommandContext,
): Promise<GraphResult> {
  const { path, hops = 1 } = args;
  const vaultFs = ctx.vaultFs;
  const vaultPath = ctx.vaultPath;

  const stored = vaultFs.jailPath(path);
  const content = await vaultFs.read(path);

  if (ctx.projectSlug) {
    const idx = ensureProjectIndex(vaultPath, ctx.projectSlug);
    const depth = hops ?? 1;
    const outgoing = idx.outgoing(stored);
    const backlinks = idx.incoming(stored);
    if (depth > 1) {
      const near = idx.neighbors(stored, depth);
      return {
        note: path,
        outgoing: [...new Set([...outgoing, ...near.filter((p) => !backlinks.includes(p) && p !== stored)])],
        backlinks,
      };
    }
    return { note: path, outgoing, backlinks };
  }

  const outgoing = extractWikilinks(content);
  const noteName = path.replace(/\.md$/, "");
  const backlinks: string[] = [];
  try {
    const results = await searchText(vaultPath, `[[${noteName}`, { limit: 50 });
    for (const result of results) {
      if (result.path !== path) backlinks.push(result.path);
    }
  } catch (e: unknown) {
    if (e instanceof VaultError && e.code === "FILE_NOT_FOUND") { /* expected */ }
    else if (e instanceof Error && e.message.includes("search")) { /* search engine error */ }
    else throw e;
  }
  if (hops > 1) {
    const extra = new Set<string>();
    for (const link of outgoing.slice(0, 10)) {
      const linkPath = link.endsWith(".md") ? link : `${link}.md`;
      try {
        const linkContent = await vaultFs.read(linkPath);
        for (const sub of extractWikilinks(linkContent)) {
          if (sub !== noteName && !outgoing.includes(sub)) extra.add(sub);
        }
      } catch (e: unknown) {
        if (e instanceof VaultError && e.code === "FILE_NOT_FOUND") continue;
        else throw e;
      }
    }
    return { note: path, outgoing: [...outgoing, ...extra], backlinks: [...new Set(backlinks)] };
  }
  return { note: path, outgoing, backlinks: [...new Set(backlinks)] };
}

export async function graphCrossProjectCommand(
  args: {
    query: string;
    limit?: number;
  } = {} as any,
  ctx: CommandContext,
): Promise<Record<string, SearchResult[]>> {
  const slug = ctx.projectSlug;
  if (!slug) {
    throw new VaultError("PERMISSION_DENIED", "graph_cross_project is disabled; search is jailed to one project.");
  }
  const { query, limit = 20 } = args;
  const results = await searchText(ctx.vaultPath, query, { limit, pathFilter: `projects/${slug}` });
  return { [slug]: results };
}
