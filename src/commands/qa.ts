// SPDX-License-Identifier: AGPL-3.0-or-later

import { join } from "node:path";
import type { CommandContext } from "../core/types.js";
import { knowledgeVizCommand } from "./knowledge.js";
import { verifyVizHtml, type QaEvidence } from "../lib/qa-browser.js";

export async function qaVizCommand(
  args: { project?: string },
  ctx: CommandContext,
): Promise<{ html: string; canvas: string; project: string; nodes: number; edges: number; qa: QaEvidence }> {
  const viz = await knowledgeVizCommand(args, ctx);
  const htmlAbs = join(ctx.vaultPath, viz.html);
  const qa = await verifyVizHtml(htmlAbs);
  return { ...viz, qa };
}
