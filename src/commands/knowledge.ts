// SPDX-License-Identifier: Apache-2.0

import type { CommandContext } from "../core/types.js";
import { validateProjectSlug } from "../config.js";
import { VaultError, type VaultFS } from "../lib/vault-fs.js";
import { rebuildProjectIndex } from "../lib/knowledge-index.js";
import { writeKnowledgeGraphFiles, type KnowledgeVizResult } from "../lib/knowledge-viz.js";
import { resolveWorkspaceContext } from "../lib/workspace-context.js";

export type { KnowledgeVizResult };

export async function resolveVizOpenTarget(
  vaultFs: VaultFS,
  project: string,
  notes: readonly string[],
): Promise<string | null> {
  const context = `projects/${project}/context.md`;
  if (await vaultFs.exists(context)) return context;
  const dashboard = `projects/${project}/index.md`;
  if (await vaultFs.exists(dashboard)) return dashboard;
  return notes[0] ?? null;
}

function slugOf(args: { project?: string }, ctx: CommandContext): string {
  const slug = args.project ?? ctx.projectSlug ?? ctx.vaultFs.projectSlug ?? undefined;
  if (!slug || ctx.projectSlug === null || ctx.vaultFs.projectSlug === null) {
    throw new VaultError("PERMISSION_DENIED", "Knowledge index requires a project scope.");
  }
  if ([ctx.projectSlug, ctx.vaultFs.projectSlug].some((scope) => typeof scope === "string" && scope !== slug)) {
    throw new VaultError("PERMISSION_DENIED", `Cross-project access denied: ${slug}`);
  }
  return validateProjectSlug(slug);
}

export async function knowledgeRebuildCommand(
  args: { project?: string },
  ctx: CommandContext,
): Promise<{ notes: number; edges: number; project: string }> {
  const project = slugOf(args, ctx);
  const stats = rebuildProjectIndex(ctx.vaultPath, project);
  return { ...stats, project };
}

export async function knowledgeVizCommand(
  args: { project?: string },
  ctx: CommandContext,
): Promise<KnowledgeVizResult> {
  const project = slugOf(args, ctx);
  const workspace = await resolveWorkspaceContext(ctx.vaultPath, ctx.workspacePath ?? process.cwd(), project);
  return writeKnowledgeGraphFiles(ctx.vaultPath, project, { codeRoot: workspace.workspacePath });
}
