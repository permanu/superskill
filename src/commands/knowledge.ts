// SPDX-License-Identifier: Apache-2.0

import type { CommandContext } from "../core/types.js";
import { VaultError, type VaultFS } from "../lib/vault-fs.js";
import { rebuildProjectIndex } from "../lib/knowledge-index.js";
import { writeKnowledgeGraphFiles, type KnowledgeVizResult } from "../lib/knowledge-viz.js";

export type { KnowledgeVizResult };

export async function resolveVizOpenTarget(
  vaultFs: VaultFS,
  project: string,
  notes: readonly string[],
): Promise<string | null> {
  const context = `projects/${project}/context.md`;
  if (await vaultFs.exists(context)) return context;
  return notes[0] ?? null;
}

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
): Promise<KnowledgeVizResult> {
  const project = slugOf(args, ctx);
  return writeKnowledgeGraphFiles(ctx.vaultPath, project, { codeRoot: ctx.workspacePath ?? process.cwd() });
}
