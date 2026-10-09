// SPDX-License-Identifier: Apache-2.0
import type { CommandContext } from "../core/types.js";
import { VaultError } from "../lib/vault-fs.js";
import { searchText, type SearchResult } from "../lib/search-engine.js";
import { ensureProjectIndex } from "../lib/knowledge-index.js";
import { openTraverser } from "../lib/graph/traverse.js";
import type {
  TraverseChildrenResult,
  TraverseContent,
  TraverseNodeInfo,
  TraverseResolveResult,
} from "../lib/graph/traverse.js";

export type GraphTraverseAction = "node" | "children" | "resolve" | "open";

export interface GraphTraverseArgs {
  action: GraphTraverseAction;
  id?: string;
  task?: string;
  limit?: number;
  full?: boolean;
}

export type GraphTraverseResult =
  | TraverseNodeInfo
  | TraverseChildrenResult
  | TraverseResolveResult
  | TraverseContent;

export async function graphTraverseCommand(
  args: GraphTraverseArgs,
  ctx: CommandContext,
): Promise<GraphTraverseResult> {
  const traverser = await openTraverser({
    root: ctx.workspacePath ?? process.cwd(),
    vaultPath: ctx.vaultPath,
    projectSlug: ctx.projectSlug ?? undefined,
    vaultFs: ctx.vaultFs,
  });

  switch (args.action) {
    case "node": {
      if (!args.id) throw new VaultError("INVALID_ARGUMENT", "graph_traverse action=node requires id");
      const node = traverser.node(args.id);
      if (!node) throw new VaultError("FILE_NOT_FOUND", `Unknown traverse node: ${args.id}`);
      return node;
    }
    case "children": {
      if (!args.id) throw new VaultError("INVALID_ARGUMENT", "graph_traverse action=children requires id");
      return traverser.children(args.id, { limit: args.limit });
    }
    case "resolve": {
      if (!args.task || args.task.trim() === "") {
        throw new VaultError("INVALID_ARGUMENT", "graph_traverse action=resolve requires task");
      }
      return traverser.resolve(args.task, { limit: args.limit });
    }
    case "open": {
      if (!args.id) throw new VaultError("INVALID_ARGUMENT", "graph_traverse action=open requires id");
      return traverser.open(args.id, { full: args.full });
    }
    default:
      throw new VaultError("INVALID_ARGUMENT", `Unknown graph_traverse action: ${String(args.action)}`);
  }
}

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
