// SPDX-License-Identifier: Apache-2.0
import type { CommandContext } from "../core/types.js";
import { VaultError, VaultFS } from "../lib/vault-fs.js";
import { validateProjectSlug } from "../config.js";
import { resolveWorkspaceContext } from "../lib/workspace-context.js";
import { searchText, type SearchResult } from "../lib/search-engine.js";
import { ensureProjectIndex } from "../lib/knowledge-index.js";
import { MAX_OPEN_BYTES, openTraverser } from "../lib/graph/traverse.js";
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
  offsetBytes?: number;
  maxBytes?: number;
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
  if (ctx.projectSlug === null) throw new VaultError("PERMISSION_DENIED", "Graph traversal requires a resolved project scope.");
  if (args.limit !== undefined && (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 1000)) {
    throw new VaultError("INVALID_ARGUMENT", "limit must be an integer between 1 and 1000");
  }
  if (args.offsetBytes !== undefined && (!Number.isSafeInteger(args.offsetBytes) || args.offsetBytes < 0 || args.offsetBytes > MAX_OPEN_BYTES)) {
    throw new VaultError("INVALID_ARGUMENT", `offsetBytes must be an integer between 0 and ${MAX_OPEN_BYTES}`);
  }
  if (args.maxBytes !== undefined && (!Number.isSafeInteger(args.maxBytes) || args.maxBytes < 1 || args.maxBytes > MAX_OPEN_BYTES)) {
    throw new VaultError("INVALID_ARGUMENT", `maxBytes must be an integer between 1 and ${MAX_OPEN_BYTES}`);
  }
  const workspace = await resolveWorkspaceContext(ctx.vaultPath, ctx.workspacePath ?? process.cwd(), ctx.projectSlug ?? undefined);
  const traverser = await openTraverser({
    root: workspace.workspacePath,
    vaultPath: ctx.vaultPath,
    projectSlug: workspace.projectSlug,
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
      return traverser.open(args.id, { full: args.full, offsetBytes: args.offsetBytes, maxBytes: args.maxBytes });
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

export async function graphRelatedCommand(
  args: {
    path: string;
    hops?: number;
  } = {} as any,
  ctx: CommandContext,
): Promise<GraphResult> {
  const { path, hops = 1 } = args;
  if (!ctx.projectSlug) throw new VaultError("PERMISSION_DENIED", "Related notes require a resolved project scope.");
  const slug = validateProjectSlug(ctx.projectSlug);
  if (ctx.vaultFs.projectSlug !== undefined && ctx.vaultFs.projectSlug !== slug) throw new VaultError("PERMISSION_DENIED", "Graph project does not match vault scope.");
  if (!Number.isInteger(hops) || hops < 1 || hops > 8) throw new VaultError("INVALID_ARGUMENT", "hops must be an integer between 1 and 8");
  if (typeof path !== "string" || path.length === 0) throw new VaultError("INVALID_ARGUMENT", "path is required");
  const vaultFs = new VaultFS(ctx.vaultPath, { projectSlug: slug });
  const stored = vaultFs.jailPath(path);
  if (!await vaultFs.exists(path)) throw new VaultError("FILE_NOT_FOUND", `Not found: ${path}`);
  const allowed = (target: string): boolean => target !== stored && target.startsWith(`projects/${slug}/`) && !target.split(/[\\/]/).some(part => part === ".." || part === ".");
  const idx = ensureProjectIndex(ctx.vaultPath, slug);
  const outgoing = idx.outgoing(stored).filter(allowed);
  const backlinks = idx.incoming(stored).filter(allowed);
  if (hops > 1) {
    const incoming = new Set(backlinks);
    const near = idx.neighbors(stored, hops).filter(p => allowed(p) && !incoming.has(p));
    return { note: path, outgoing: [...new Set([...outgoing, ...near])].slice(0, 1000), backlinks };
  }
  return { note: path, outgoing, backlinks };
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
  validateProjectSlug(slug);
  if (ctx.vaultFs.projectSlug !== undefined && ctx.vaultFs.projectSlug !== slug) throw new VaultError("PERMISSION_DENIED", "Graph project does not match vault scope.");
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new VaultError("INVALID_ARGUMENT", "limit must be an integer between 1 and 1000");
  const results = await searchText(ctx.vaultPath, query, { limit, pathFilter: `projects/${slug}` });
  return { [slug]: results };
}
