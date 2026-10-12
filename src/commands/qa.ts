// SPDX-License-Identifier: Apache-2.0

import type { CommandContext } from "../core/types.js";
import type { QaEvidence } from "../lib/qa-browser.js";
import type { KnowledgeVizResult } from "../lib/knowledge-viz.js";
import { knowledgeVizCommand } from "./knowledge.js";

export async function qaVizCommand(
  args: { project?: string },
  ctx: CommandContext,
): Promise<KnowledgeVizResult & { qa: QaEvidence }> {
  const viz = await knowledgeVizCommand(args, ctx);
  const qa: QaEvidence = {
    ok: false,
    skipped: "Browser QA of the HTML graph was retired with the Obsidian-native visualization.",
    title: "",
    afterClick: "",
    afterBack: "",
    nodes: [],
  };
  return { ...viz, qa };
}
