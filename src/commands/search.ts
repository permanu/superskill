// SPDX-License-Identifier: AGPL-3.0-or-later
import type { CommandContext } from "../core/types.js";
import { searchText, searchStructured, type SearchResult } from "../lib/search-engine.js";
import { VaultError } from "../lib/vault-fs.js";
import { ensureProjectIndex } from "../lib/knowledge-index.js";

function resolveSearchSlug(
  argsProject: string | undefined,
  ctx: CommandContext,
): string | undefined {
  if (ctx.projectSlug && argsProject && argsProject !== ctx.projectSlug) {
    throw new VaultError("PERMISSION_DENIED", `Cross-project search denied: ${argsProject}`);
  }
  const slug = argsProject ?? ctx.projectSlug ?? undefined;
  if (!slug) return undefined;
  return slug;
}

export async function searchCommand(
  args: {
    query: string;
    project?: string;
    limit?: number;
    structured?: boolean;
  } = {} as any,
  ctx: CommandContext,
): Promise<SearchResult[]> {
  const { query, project, limit = 10, structured = false } = args;
  const vaultPath = ctx.vaultPath;
  const slug = resolveSearchSlug(project, ctx);
  const pathFilter = slug ? `projects/${slug}` : undefined;

  if (structured) {
    const filters: Record<string, string> = {};
    for (const part of query.split(/\s+/)) {
      const idx = part.indexOf(":");
      if (idx > 0) {
        const key = part.slice(0, idx);
        const value = part.slice(idx + 1);
        if (key && value) {
          filters[key] = value;
        }
      }
    }
    return searchStructured(vaultPath, filters, { limit, pathFilter });
  }

  if (!slug) {
    return searchText(vaultPath, query, { limit });
  }

  const idx = ensureProjectIndex(vaultPath, slug);
  return idx.search(query, limit).map((h) => ({
    path: h.path,
    snippet: h.snippet || h.title,
    line: 1,
  }));
}
