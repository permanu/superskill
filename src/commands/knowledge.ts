// SPDX-License-Identifier: AGPL-3.0-or-later

import type { CommandContext } from "../core/types.js";
import { VaultError } from "../lib/vault-fs.js";
import { rebuildProjectIndex } from "../lib/knowledge-index.js";
import { writeKnowledgeGraphFiles } from "../lib/knowledge-viz.js";

function slugOf(args: { project?: string }, ctx: CommandContext): string {
  const slug = args.project ?? ctx.projectSlug ?? undefined;
  if (!slug) {
    throw new VaultError("PERMISSION_DENIED", "Knowledge index requires a project scope.");
  }
  if (ctx.projectSlug && args.project && args.project !== ctx.projectSlug) {
    throw new VaultError("PERMISSION_DENIED", `Cross-project access denied: ${args.project}`);
  }
  return slug;
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
): Promise<{ html: string; canvas: string; diagrams: string; project: string; nodes: number; edges: number }> {
  const project = slugOf(args, ctx);
  rebuildProjectIndex(ctx.vaultPath, project);
  const files = writeKnowledgeGraphFiles(ctx.vaultPath, project, { codeRoot: process.cwd() });
  return { ...files, project };
}
